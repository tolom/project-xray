import { NextRequest, NextResponse } from "next/server";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = "grok-4.3";

interface GeneratePromptRequest {
  riskType?: string;
  context?: string;
  filePath?: string;
  severity?: string;
}

/**
 * POST /api/generate-prompt
 *
 * Serverless endpoint that uses Grok 4.3 (xAI) to generate
 * extremely high-quality, strictly isolated repair prompts
 * for Cursor / Claude Code / Windsurf.
 *
 * The LLM is heavily constrained so it never produces dangerous or over-broad instructions.
 */
export async function POST(req: NextRequest) {
  let body: GeneratePromptRequest = {};

  try {
    body = await req.json();
    const { riskType, context, filePath, severity } = body;

    if (!riskType || !filePath) {
      return NextResponse.json(
        { error: "Missing required fields: riskType, filePath" },
        { status: 400 }
      );
    }

    const apiKey = process.env.XAI_API_KEY;

    // Fallback to excellent deterministic prompt if no key configured
    if (!apiKey) {
      const fallback = buildDeterministicPrompt(riskType, context, filePath, severity);
      return NextResponse.json({ prompt: fallback, source: "deterministic" });
    }

    const systemPrompt = `Generate a short repair task for an LLM coder (Cursor, Claude Code, Codex, Windsurf).

Rules:
1. Output only the task text, with no intro and no markdown wrapper.
2. The task must be narrow: fix the specified risk in the specified file.
3. Do not ask for style, UI, migrations, config, dependency, or architecture changes unless the risk requires them.
4. Include: problem, product risk, expected fix, constraints, and checks after the change.
5. Write the task in English.

You receive:
- riskType: rule name
- filePath: full path to the file
- context: problem description and consequences
- severity: low | medium | high | critical
`;

    const userMessage = `riskType: ${riskType}
filePath: ${filePath}
severity: ${severity || "high"}
context: ${context || "Structural fragility in a critical module"}

Generate a repair task according to the rules above.`;

    const response = await fetch(XAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3, // low temperature for precision and safety
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("xAI API error:", response.status, errText);

      // Graceful fallback
      const fallback = buildDeterministicPrompt(riskType, context, filePath, severity);
      return NextResponse.json({
        prompt: fallback,
        source: "deterministic_fallback",
        warning: "Grok API is unavailable; using the deterministic prompt",
      });
    }

    const data = await response.json();
    let prompt = data.choices?.[0]?.message?.content?.trim() || "";

    // Safety: if the model added any wrapper text, strip it
    prompt = prompt
      .replace(/^```[\s\S]*?\n/, "")
      .replace(/```$/, "")
      .replace(/^(Here is|Here's|Prompt:)\s*/i, "")
      .trim();

    if (!prompt || prompt.length < 40) {
      // If Grok returned garbage, fall back
      prompt = buildDeterministicPrompt(riskType, context, filePath, severity);
    }

    return NextResponse.json({ prompt, source: "grok-4.3" });
  } catch (e: unknown) {
    console.error("generate-prompt error:", e);

    const fallback = buildDeterministicPrompt(body.riskType, body.context, body.filePath, body.severity);

    return NextResponse.json({
      prompt: fallback,
      source: "deterministic_fallback",
      warning: "An error occurred while contacting Grok",
    });
  }
}

function buildDeterministicPrompt(
  riskType?: string,
  context?: string,
  filePath?: string,
  severity?: string
): string {
  return `Task: fix the risk "${riskType || "Project X-Ray risk"}" in the file ${filePath || "the specified file"}.

Problem: ${context || "Structural fragility identified by Project X-Ray"}
${severity ? `Risk level: ${severity}` : ""}

Constraints:
- Read the file first and find the smallest possible area to change.
- Change only this file and only the code related to the specified risk.
- Do not change styles, UI components, database schema, migrations, config, or public APIs unless it is clearly necessary.
- Do not add new dependencies.
- Preserve the current code style and naming.

After the change:
- Run the available project checks or explain why they were not run.
- Briefly list the changed areas and the remaining risks.`;
}
