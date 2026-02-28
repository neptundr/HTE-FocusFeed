import { NextResponse } from "next/server";
import { getMockFeed } from "@/lib/mock-data";

function durationCategory(seconds: number): string {
  if (seconds < 30) return "short";
  if (seconds <= 50) return "medium";
  return "long";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const videoLengthParam = searchParams.get("videoLength");
  const contentTypesParam = searchParams.get("contentTypes");
  const courseIdsParam = searchParams.get("courseIds");

  const allowedLengths = videoLengthParam ? videoLengthParam.split(",") : null;
  const allowedContentTypes = contentTypesParam ? contentTypesParam.split(",") : null;
  const allowedCourseIds = courseIdsParam ? courseIdsParam.split(",") : null;

  if (process.env.USE_MOCK_DATA === "true") {
    const feed = getMockFeed();
    const start = (page - 1) * limit;
    const items = feed.slice(start, start + limit);
    return NextResponse.json({ items, page, totalItems: feed.length });
  }

  const { prisma } = await import("@/lib/prisma");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoWhere: any = {};

  if (allowedContentTypes) {
    const videoTypes = allowedContentTypes.filter((t) => t !== "QUIZ");
    if (videoTypes.length > 0) {
      videoWhere.type = { in: videoTypes };
    }
  }

  if (allowedCourseIds) {
    videoWhere.courseId = { in: allowedCourseIds };
  }

  const [videos, quizzes] = await Promise.all([
    prisma.video.findMany({
      where: videoWhere,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        course: {
          include: {
            topics: { orderBy: { order: "asc" }, select: { name: true } },
          },
        },
        reactions: { where: { type: "LIKE" }, select: { id: true } },
        comments: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.quiz.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const showQuizzes = !allowedContentTypes || allowedContentTypes.includes("QUIZ");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = [];
  let quizIndex = 0;

  const filteredVideos = allowedLengths
    ? videos.filter((v) => allowedLengths.includes(durationCategory(v.duration)))
    : videos;

  for (let i = 0; i < filteredVideos.length; i++) {
    const video = filteredVideos[i];
    const course = video.course
      ? {
          id: video.course.id,
          name: video.course.name,
          description: video.course.description,
          userId: video.course.userId,
          topics: video.course.topics.map((t) => t.name),
        }
      : null;

    items.push({
      type: "video",
      data: {
        id: video.id,
        title: video.title,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        userId: video.userId,
        courseId: video.courseId,
        type: video.type,
        duration: video.duration,
        user: video.user,
        course: course || { id: "", name: "Unknown", description: "", userId: "", topics: [] },
        likesCount: video.reactions.length,
        commentsCount: video.comments.length,
      },
    });

    if (showQuizzes && (i + 1) % 3 === 0 && quizIndex < quizzes.length) {
      const quiz = quizzes[quizIndex++];
      const quizVideo = videos.find((v) => v.id === quiz.videoId);
      const quizCourse = quizVideo?.course;
      items.push({
        type: "quiz",
        data: {
          id: quiz.id,
          videoId: quiz.videoId,
          question: quiz.question,
          options: quiz.options as string[],
          correctAnswer: quiz.correctAnswer,
          course: quizCourse
            ? { id: quizCourse.id, name: quizCourse.name, description: quizCourse.description || "", userId: quizCourse.userId, topics: quizCourse.topics.map((t) => t.name) }
            : { id: "", name: "Unknown", description: "", userId: "", topics: [] },
        },
      });
    }
  }

  if (showQuizzes) {
    while (quizIndex < quizzes.length) {
      const quiz = quizzes[quizIndex++];
      const quizVideo = videos.find((v) => v.id === quiz.videoId);
      const quizCourse = quizVideo?.course;
      items.push({
        type: "quiz",
        data: {
          id: quiz.id,
          videoId: quiz.videoId,
          question: quiz.question,
          options: quiz.options as string[],
          correctAnswer: quiz.correctAnswer,
          course: quizCourse
            ? { id: quizCourse.id, name: quizCourse.name, description: quizCourse.description || "", userId: quizCourse.userId, topics: quizCourse.topics.map((t) => t.name) }
            : { id: "", name: "Unknown", description: "", userId: "", topics: [] },
        },
      });
    }
  }

  const totalItems = items.length;
  const start = (page - 1) * limit;
  const paginatedItems = items.slice(start, start + limit);

  return NextResponse.json({
    items: paginatedItems,
    page,
    totalItems,
  });
}
