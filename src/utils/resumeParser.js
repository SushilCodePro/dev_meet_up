// Curated tech skill dictionary for deterministic fallback extraction
const KNOWN_SKILLS = [
  "JavaScript", "TypeScript", "Node.js", "Express", "React", "Next.js",
  "Redux", "HTML", "CSS", "Tailwind CSS", "MongoDB", "Mongoose", "PostgreSQL",
  "MySQL", "Redis", "BullMQ", "GraphQL", "REST API", "Docker", "Kubernetes",
  "AWS", "EC2", "S3", "ALB", "VPC", "IAM", "Lambda", "SQS", "SNS", "CloudWatch",
  "CI/CD", "Git", "GitHub Actions", "Nginx", "PM2", "Python", "Java", "Go",
  "Microservices", "System Design", "JWT", "OAuth", "Pinecone", "RAG", "LLM", "Gemini"
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Deterministic fallback: matches known tech skills & builds a short summary.
 */
function extractDeterministically(rawText) {
  const normalized = rawText.replace(/\s+/g, " ").trim();
  const skills = [];

  for (const skill of KNOWN_SKILLS) {
    const pattern = new RegExp(`(^|[^a-zA-Z0-9])${escapeRegex(skill)}([^a-zA-Z0-9]|$)`, "i");
    if (pattern.test(normalized)) {
      skills.push(skill);
    }
  }

  const summary =
    normalized.length > 0
      ? normalized.slice(0, 280) + (normalized.length > 280 ? "..." : "")
      : "Resume processed.";

  return {
    skills: skills.slice(0, 20),
    summary,
    engine: "deterministic",
  };
}

/**
 * Optional Gemini structured extraction when GEMINI_API_KEY is configured.
 * Falls back cleanly to deterministic extraction on missing key or API error.
 */
export async function extractResumeInsights(rawText) {
  const trimmedText = (rawText || "").trim();
  if (!trimmedText) {
    return { skills: [], summary: "No selectable text found in PDF.", engine: "empty" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return extractDeterministically(trimmedText);
  }

  try {
    const prompt = [
      "Extract developer skills and a concise 2-sentence professional summary from this resume text.",
      'Return strict JSON only in this exact shape: {"skills":["string"],"summary":"string"}',
      "Max 15 skills. Only include skills explicitly supported by the resume text.",
      "",
      trimmedText.slice(0, 12000),
    ].join("\n");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const data = await response.json();
    const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(jsonText);

    const skills = Array.isArray(parsed?.skills)
      ? parsed.skills
          .filter((s) => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim())
          .slice(0, 20)
      : [];

    const summary =
      typeof parsed?.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 500)
        : extractDeterministically(trimmedText).summary;

    return { skills, summary, engine: "gemini" };
  } catch (err) {
    console.warn("Gemini extraction failed, falling back to deterministic parser:", err.message);
    return extractDeterministically(trimmedText);
  }
}
