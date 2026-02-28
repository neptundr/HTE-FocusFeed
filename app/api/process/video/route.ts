import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, readFile, readdir, copyFile, mkdir, unlink } from "fs/promises";
import path from "path";

const CONTENT_GEN_ROOT = path.join(process.cwd(), "app", "api", "content_generation");
const PIPELINE_CWD = path.join(process.cwd(), "app", "api");
const INPUT_DIR = path.join(CONTENT_GEN_ROOT, "input");
const OUTPUT_JSON = path.join(CONTENT_GEN_ROOT, "output", "pipeline_result.json");
const OUTPUT_REELS = path.join(CONTENT_GEN_ROOT, "output", "reels");
const PUBLIC_REELS = path.join(process.cwd(), "public", "uploads", "reels");
const PUBLIC_UPLOADS = path.join(process.cwd(), "public", "uploads");

const TYPE_TO_FORMAT: Record<string, string> = {
  SLICED_LECTURE: "video",
  SLIDES_VOICEOVER: "slides-only",
  AI_TEACHER: "character",
};

function runPython(args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const py = spawn("python3", args, {
      cwd,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let stdout = "";
    let stderr = "";
    py.stdout.on("data", (d) => { stdout += d.toString(); });
    py.stderr.on("data", (d) => { stderr += d.toString(); });
    py.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    py.on("error", (err) => resolve({ code: 1, stdout, stderr: err.message }));
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;
    const slidesFile = formData.get("slides") as File | null;
    const optionsRaw = formData.get("options") as string | null;

    if (!optionsRaw) {
      return NextResponse.json({ error: "options field is required" }, { status: 400 });
    }

    const options = JSON.parse(optionsRaw);
    const { title, userId, courseId, videoType, duration } = options as {
      title: string;
      userId: string;
      courseId: string;
      videoType: string;
      duration: number;
    };

    if (!userId || !courseId || !title) {
      return NextResponse.json({ error: "title, userId, and courseId are required" }, { status: 400 });
    }

    await mkdir(PUBLIC_UPLOADS, { recursive: true });
    await mkdir(PUBLIC_REELS, { recursive: true });

    // ── OTHER: just save the file, no pipeline ──
    if (videoType === "OTHER") {
      if (!videoFile) {
        return NextResponse.json({ error: "Video file required for OTHER type" }, { status: 400 });
      }
      const filename = `${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const dest = path.join(PUBLIC_UPLOADS, filename);
      const buf = Buffer.from(await videoFile.arrayBuffer());
      await writeFile(dest, buf);

      const { prisma } = await import("@/lib/prisma");
      const video = await prisma.video.create({
        data: {
          title,
          videoUrl: `/uploads/${filename}`,
          userId,
          courseId,
          type: "OTHER",
          duration: duration || 30,
        },
      });

      return NextResponse.json({ videos: [video] });
    }

    // ── Pipeline types: SLICED_LECTURE, SLIDES_VOICEOVER, AI_TEACHER ──
    const format = TYPE_TO_FORMAT[videoType];
    if (!format) {
      return NextResponse.json({ error: `Unknown videoType: ${videoType}` }, { status: 400 });
    }

    // Save uploaded files to input/
    await mkdir(INPUT_DIR, { recursive: true });

    let videoPath: string | null = null;
    let slidesPath: string | null = null;

    if (videoFile) {
      const vName = `${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      videoPath = path.join(INPUT_DIR, vName);
      await writeFile(videoPath, Buffer.from(await videoFile.arrayBuffer()));
    }

    if (slidesFile) {
      const sName = `${Date.now()}-${slidesFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      slidesPath = path.join(INPUT_DIR, sName);
      await writeFile(slidesPath, Buffer.from(await slidesFile.arrayBuffer()));
    }

    if (videoType === "SLICED_LECTURE" && !videoPath) {
      return NextResponse.json({ error: "Video file required for Sliced Lecture" }, { status: 400 });
    }
    if ((videoType === "SLIDES_VOICEOVER" || videoType === "AI_TEACHER") && !slidesPath) {
      return NextResponse.json({ error: "Slides PDF required for this video type" }, { status: 400 });
    }

    // ── Stage 1: Run content pipeline ──
    const pipelineArgs = [
      "-m", "content_generation.scripts.test_pipeline",
      "--formats", format,
      "--transcriber", "aws",
      "--output", OUTPUT_JSON,
      "--no-print-scripts",
      "--max-reels", "10",
      "--length", "mix",
    ];
    if (videoPath) pipelineArgs.push("--video", videoPath);
    if (slidesPath) pipelineArgs.push("--slides", slidesPath);

    const pipelineResult = await runPython(pipelineArgs, PIPELINE_CWD);

    if (pipelineResult.code !== 0) {
      const stderr = pipelineResult.stderr.slice(-2000);
      const bucket = process.env.S3_BUCKET_AWS || "doonlearn-audio";
      if (/NoSuchBucket|The specified bucket does not exist/i.test(stderr)) {
        return NextResponse.json({
          error: "AWS S3 bucket not found",
          detail: `Create an S3 bucket named "${bucket}" in AWS (region ${process.env.REGION_AWS || "us-east-1"}), or set S3_BUCKET_AWS in .env to an existing bucket. The pipeline uses AWS Transcribe and needs a bucket for temporary audio uploads.`,
        }, { status: 500 });
      }
      return NextResponse.json({
        error: "Pipeline failed",
        detail: stderr,
      }, { status: 500 });
    }

    // ── Stage 2: Produce reel videos ──
    await mkdir(OUTPUT_REELS, { recursive: true });
    const produceArgs = [
      "-m", "content_generation.scripts.produce_reels",
      "-i", OUTPUT_JSON,
      "-o", OUTPUT_REELS,
    ];
    if (slidesPath) produceArgs.push("--slides", slidesPath);
    if (videoPath) produceArgs.push("--video", videoPath);

    const produceResult = await runPython(produceArgs, PIPELINE_CWD);

    if (produceResult.code !== 0) {
      const stderr = produceResult.stderr.slice(-4000);
      if (/character mode requires at least one image|characters\//.test(stderr)) {
        return NextResponse.json({
          error: "Character reels need reference images",
          detail: "Add at least one image (PNG/JPG) to app/api/content_generation/input/characters/ for AI Teacher reels, or use only “Slides + Voiceover” / “Sliced Lecture” in Create Video.",
        }, { status: 500 });
      }
      if (/No such file|FileNotFoundError|does not exist/.test(stderr)) {
        return NextResponse.json({
          error: "Reel production failed: missing file",
          detail: "Slides or video path may be wrong. " + stderr.slice(-1500),
        }, { status: 500 });
      }
      if (/MINIMAX|TTS generation failed|MiniMax/.test(stderr)) {
        return NextResponse.json({
          error: "MiniMax TTS/API error",
          detail: "Check MINIMAX_API_KEY in app/api/content_generation/.env. " + stderr.slice(-1500),
        }, { status: 500 });
      }
      return NextResponse.json({
        error: "Reel production failed",
        detail: stderr,
      }, { status: 500 });
    }

    // ── Stage 3: Read pipeline JSON for reel metadata + quiz data ──
    let pipelineData: {
      reel_scripts: Array<{
        topic: string;
        narration_text: string;
        target_duration_sec: number;
        quiz_question: string;
        quiz_choices: string[];
        quiz_answer_index: number;
        format: string;
        length: string;
      }>;
    };
    try {
      const raw = await readFile(OUTPUT_JSON, "utf-8");
      pipelineData = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Could not read pipeline output" }, { status: 500 });
    }

    // ── Stage 4: Copy reels to public/ and create DB records ──
    let reelFiles: string[] = [];
    try {
      const all = await readdir(OUTPUT_REELS);
      reelFiles = all.filter((f) => f.endsWith(".mp4")).sort();
    } catch {
      reelFiles = [];
    }

    const { prisma } = await import("@/lib/prisma");
    const createdVideos = [];

    for (let i = 0; i < reelFiles.length; i++) {
      const reelFilename = reelFiles[i];
      const src = path.join(OUTPUT_REELS, reelFilename);
      const publicName = `${Date.now()}-${i}-${reelFilename}`;
      const dest = path.join(PUBLIC_REELS, publicName);

      await copyFile(src, dest);

      const script = pipelineData.reel_scripts?.[i];
      const reelTitle = script
        ? `${title} — ${script.topic.split(">").pop()?.trim() || `Reel ${i + 1}`}`
        : `${title} — Reel ${i + 1}`;

      const dbType = videoType as "SLICED_LECTURE" | "SLIDES_VOICEOVER" | "AI_TEACHER";
      const reelDuration = script?.target_duration_sec || duration || 30;

      const video = await prisma.video.create({
        data: {
          title: reelTitle,
          videoUrl: `/uploads/reels/${publicName}`,
          userId,
          courseId,
          type: dbType,
          duration: reelDuration,
        },
      });

      if (script?.quiz_question && script?.quiz_choices?.length >= 2) {
        const cleanChoices = script.quiz_choices.map((c: string) =>
          c.replace(/^[A-D]\)\s*/, "")
        );
        await prisma.quiz.create({
          data: {
            videoId: video.id,
            question: script.quiz_question,
            options: cleanChoices,
            correctAnswer: script.quiz_answer_index ?? 0,
          },
        });
      }

      createdVideos.push(video);
    }

    // Clean up input files
    if (videoPath) await unlink(videoPath).catch(() => {});
    if (slidesPath) await unlink(slidesPath).catch(() => {});

    return NextResponse.json({
      videos: createdVideos,
      reelCount: reelFiles.length,
      pipelineStdout: pipelineResult.stdout.slice(-1000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
