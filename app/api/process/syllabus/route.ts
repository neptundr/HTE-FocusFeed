import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (process.env.USE_MOCK_DATA === "true") {
    return NextResponse.json({
      course_name: "Sample Course",
      topics: [
        { topic: "Introduction and Overview", subtopics: ["Syllabus review"], weight: 0.1 },
        { topic: "Core Concepts and Fundamentals", subtopics: ["Key principles"], weight: 0.25 },
        { topic: "Advanced Theory", subtopics: ["Models", "Frameworks"], weight: 0.25 },
        { topic: "Practical Applications", subtopics: ["Case studies"], weight: 0.25 },
        { topic: "Review and Assessment", subtopics: ["Final exam prep"], weight: 0.15 },
      ],
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Import from lib/ directly to avoid the test-file loader in index.js
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;

    if (!pdfText.trim()) {
      return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 422 });
    }

    const { extractTopicsFromPdf } = await import("@/lib/api/aws-bedrock");
    const result = await extractTopicsFromPdf(pdfText);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process syllabus";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
