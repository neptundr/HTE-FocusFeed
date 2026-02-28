export interface SyllabusTopic {
  topic: string;
  subtopics: string[];
  weight: number;
}

export interface SyllabusParseResult {
  course_name: string;
  topics: SyllabusTopic[];
}

const SYLLABUS_PROMPT_TEMPLATE = `You are a syllabus expert. Analyze this course syllabus PDF text and extract:

1. Course name/title
2. Main topics and their subtopics/sections
3. Optional: estimated weight/importance (0.0-1.0) per topic

Return ONLY valid JSON with this exact schema:
{
  "course_name": "string",
  "topics": [
    {
      "topic": "string",
      "subtopics": ["string"],
      "weight": number
    }
  ]
}

PDF TEXT: {extracted_text}

Be precise with technical course terms. Group related subtopics logically.`;

export async function extractTopicsFromPdf(
  pdfText: string
): Promise<SyllabusParseResult> {
  if (process.env.USE_MOCK_DATA === "true") {
    return {
      course_name: "Sample Course",
      topics: [
        { topic: "Introduction and Course Overview", subtopics: ["Syllabus review", "Course objectives"], weight: 0.1 },
        { topic: "Fundamental Principles", subtopics: ["Key theories", "Historical context"], weight: 0.2 },
        { topic: "Core Theory and Models", subtopics: ["Analytical frameworks", "Mathematical models"], weight: 0.25 },
        { topic: "Applied Techniques", subtopics: ["Lab exercises", "Case analysis"], weight: 0.25 },
        { topic: "Case Studies and Examples", subtopics: ["Industry examples", "Research papers"], weight: 0.1 },
        { topic: "Assessment and Review", subtopics: ["Final exam prep", "Project presentations"], weight: 0.1 },
      ],
    };
  }

  const prompt = SYLLABUS_PROMPT_TEMPLATE.replace("{extracted_text}", pdfText);

  const mod = await import("@aws-sdk/client-bedrock-runtime");

  const client = new mod.BedrockRuntimeClient({
    region: process.env.REGION_AWS || "us-east-1",
      credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID_AWS!,
        secretAccessKey: process.env.SECRET_ACCESS_KEY_AWS!,
    },
  });

  const response = await client.send(
    new mod.InvokeModelCommand({
      modelId: "amazon.nova-pro-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        inferenceConfig: { maxTokens: 4096, temperature: 0.2 },
        messages: [{ role: "user", content: [{ text: prompt }] }],
      }),
    })
  );

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const rawText: string = responseBody.output?.message?.content?.[0]?.text || "{}";

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Nova did not return valid JSON");
  }

  const parsed: SyllabusParseResult = JSON.parse(jsonMatch[0]);

  if (!parsed.topics || !Array.isArray(parsed.topics)) {
    throw new Error("Nova response missing topics array");
  }

  return parsed;
}
