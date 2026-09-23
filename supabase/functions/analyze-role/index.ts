import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FitStatus =
  | "strong_alignment"
  | "transferable"
  | "needs_investigation"
  | "not_demonstrated";

type Priority = "high" | "medium" | "low";
type Importance = "high" | "medium" | "low";
type Confidence = "high" | "medium" | "low";

type Analysis = {
  role: {
    job_title: string;
    company: string | null;
    location: string | null;
    work_model: string | null;
  };
  requirements: Array<{
    requirement: string;
    importance: Importance;
    category: string;
  }>;
  fit_analysis: Array<{
    requirement: string;
    status: FitStatus;
    evidence: string | null;
    explanation: string;
    confidence: Confidence;
  }>;
  preparation: Array<{
    requirement: string;
    title: string;
    description: string;
    priority: Priority;
  }>;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabaseClient(req: Request) {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  let secretKey = serviceRoleKey;
  if (!secretKey && secretKeysRaw) {
    try {
      const parsed = JSON.parse(secretKeysRaw);
      secretKey = parsed.default;
    } catch {
      // ignore JSON parse error
    }
  }

  if (secretKey) {
    return createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  // Fallback to anon client with request auth header
  const authHeader = req.headers.get("Authorization");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  return createClient(url, anonKey, {
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.slice("Bearer ".length);
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) return null;

  let anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey) {
    const pubKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    if (pubKeys) {
      try {
        anonKey = JSON.parse(pubKeys).default;
      } catch {
        // ignore
      }
    }
  }

  if (!anonKey) {
    // Try service role key if available
    anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!anonKey) return null;

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    console.error("Auth user retrieval failed:", error);
    return null;
  }
  return data.user.id;
}

function cleanJsonText(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

async function callOpenRouter(
  openrouterKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string; status: number; modelUsed: string }> {
  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  const candidateModels = [
    "openrouter/free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
  ];

  let lastStatus = 500;
  let lastErrorMsg = "OpenRouter request failed";

  for (const model of candidateModels) {
    console.log(`[analyze-role] Calling OpenRouter model: ${model}`);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://rolewise.app",
          "X-Title": "Rolewise Role Analysis",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });

      lastStatus = res.status;

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[analyze-role] Model ${model} returned error status ${res.status}:`, errorText);
        try {
          const parsed = JSON.parse(errorText);
          lastErrorMsg = parsed.error?.message || parsed.message || errorText;
        } catch {
          lastErrorMsg = errorText;
        }
        // If 429 or 503, try next candidate model
        if (res.status === 429 || res.status === 503 || res.status === 502) {
          continue;
        }
        // For other client errors (like auth), break early
        break;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        console.warn(`[analyze-role] Model ${model} returned empty content choices`);
        lastErrorMsg = "OpenRouter returned empty choices in completion response";
        continue;
      }

      return { content, status: 200, modelUsed: model };
    } catch (err: unknown) {
      console.warn(`[analyze-role] Network error with model ${model}:`, err);
      lastErrorMsg = err instanceof Error ? err.message : String(err);
    }
  }

  throw { status: lastStatus, message: lastErrorMsg };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Verify user authentication
    const userId = await getUserId(req);
    if (!userId) {
      return json({ error: "Unauthorized: Missing or invalid Supabase user session." }, 401);
    }

    // 2. Validate input payload
    const body = await req.json().catch(() => ({}));
    const jobDescription = String(body?.jobDescription ?? "").trim();
    const resumeText = String(body?.resumeText ?? "").trim();
    const resumeFileName = body?.resumeFileName ? String(body.resumeFileName) : "resume.txt";
    const resumeMimeType = body?.resumeMimeType ? String(body.resumeMimeType) : "text/plain";

    if (!jobDescription) return json({ error: "Job description is required." }, 400);
    if (!resumeText) return json({ error: "Resume or experience text is required." }, 400);

    if (jobDescription.length > 60000) {
      return json({ error: "Job description is too long. Please provide a shorter version." }, 400);
    }

    if (resumeText.length > 60000) {
      return json({ error: "Resume text is too long. Please provide a shorter version." }, 400);
    }

    // 3. Read OpenRouter API key from Edge Function secrets
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey || !openrouterKey.trim()) {
      console.error("[analyze-role] OPENROUTER_API_KEY is not configured in Supabase Edge Function secrets");
      return json(
        {
          error: "AI_PROVIDER_ERROR",
          provider: "openrouter",
          status: 500,
          message: "OPENROUTER_API_KEY is not configured",
        },
        500
      );
    }

    // 4. Construct prompt for OpenRouter
    const systemPrompt = `You are the role analysis engine for ROLEWISE, an AI interview preparation product.

Goal:
Connect one candidate's supplied experience to one specific job opportunity and produce evidence-grounded role fit plus a preparation plan.

EVIDENCE RULES:
- Use ONLY evidence explicitly present in the supplied resume/experience text.
- Never invent employers, projects, years of experience, tools, responsibilities, outcomes, certifications, or skills.
- A requirement can be "strong_alignment" only when the supplied experience clearly demonstrates it.
- Use "transferable" when the experience does not exactly match the requirement but clearly supports a reasonable adjacent capability.
- Use "needs_investigation" when the supplied evidence is insufficient to determine whether the candidate has the capability. This is NOT a negative judgment; it signifies missing evidence.
- Use "not_demonstrated" only when the supplied experience clearly fails to demonstrate the requirement after considering reasonable transferable evidence.
- Evidence must quote or faithfully summarize only what the candidate supplied.
- Keep requirements specific and deduplicate overlapping requirements.
- Focus on requirements that materially affect interview preparation.
- Do NOT produce numeric fit scores, hiring probabilities, or readiness scores.
- Preparation items must be derived from the actual requirements and fit analysis.
- Return concise, useful explanations suitable for a product UI.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure:
{
  "role": {
    "job_title": "string",
    "company": "string or null",
    "location": "string or null",
    "work_model": "string or null"
  },
  "requirements": [
    {
      "requirement": "string",
      "importance": "high" | "medium" | "low",
      "category": "string"
    }
  ],
  "fit_analysis": [
    {
      "requirement": "string",
      "status": "strong_alignment" | "transferable" | "needs_investigation" | "not_demonstrated",
      "evidence": "string or null",
      "explanation": "string",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "preparation": [
    {
      "requirement": "string",
      "title": "string",
      "description": "string",
      "priority": "high" | "medium" | "low"
    }
  ]
}`;

    const userPrompt = `JOB DESCRIPTION:
${jobDescription}

CANDIDATE EXPERIENCE / RESUME:
${resumeText}`;

    // 5. Call OpenRouter
    let rawContent: string;
    try {
      const openRouterResult = await callOpenRouter(openrouterKey, systemPrompt, userPrompt);
      rawContent = openRouterResult.content;
    } catch (err: any) {
      console.error("[analyze-role] OpenRouter invocation error:", err);
      return json(
        {
          error: "AI_PROVIDER_ERROR",
          provider: "openrouter",
          status: err.status || 502,
          message: err.message || "Failed to communicate with OpenRouter",
        },
        err.status >= 400 && err.status < 600 ? err.status : 502
      );
    }

    // 6. Parse structured JSON analysis
    let analysis: Analysis;
    try {
      const cleaned = cleanJsonText(rawContent);
      analysis = JSON.parse(cleaned);
      if (!analysis.role || !Array.isArray(analysis.requirements) || !Array.isArray(analysis.fit_analysis)) {
        throw new Error("Missing required top-level analysis keys");
      }
      if (!analysis.role.job_title) {
        analysis.role.job_title = "Role Specialist";
      }
    } catch (parseError) {
      console.error("[analyze-role] Invalid structured output from OpenRouter:", rawContent, parseError);
      return json(
        {
          error: "AI_PROVIDER_ERROR",
          provider: "openrouter",
          status: 502,
          message: `AI returned an invalid structured JSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        },
        502
      );
    }

    // 7. Save into Supabase Database
    const supabase = getSupabaseClient(req);

    // 7a. Insert resume record first (resumes table has NO role_id column)
    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .insert({
        user_id: userId,
        file_name: resumeFileName,
        file_path: null,
        mime_type: resumeMimeType,
        resume_text: resumeText,
      })
      .select("id")
      .single();

    if (resumeError || !resume) {
      console.error("[analyze-role] Resume insert failed:", resumeError);
      return json(
        {
          error: "Could not save resume record",
          detail: resumeError?.message ?? "Database error",
        },
        500
      );
    }

    // 7b. Insert role record linked to resume via roles.resume_id
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .insert({
        user_id: userId,
        job_title: analysis.role.job_title,
        company: analysis.role.company,
        location: analysis.role.location,
        work_model: analysis.role.work_model,
        job_description: jobDescription,
        status: "ready",
        resume_id: resume.id,
      })
      .select("id")
      .single();

    if (roleError || !role) {
      console.error("[analyze-role] Role insert failed:", roleError);
      // Clean up orphaned resume record
      await supabase.from("resumes").delete().eq("id", resume.id);
      return json(
        {
          error: "Could not save role record",
          detail: roleError?.message ?? "Database error",
        },
        500
      );
    }

    // 7d. Insert role requirements
    const requirementRows = analysis.requirements.map((r) => ({
      role_id: role.id,
      requirement: r.requirement,
      importance: r.importance,
      category: r.category,
    }));

    const { data: insertedRequirements, error: reqError } = await supabase
      .from("role_requirements")
      .insert(requirementRows)
      .select("id, requirement");

    if (reqError || !insertedRequirements) {
      console.error("[analyze-role] Requirements insert failed:", reqError);
      return json(
        {
          error: "Could not save role requirements",
          detail: reqError?.message ?? "Database error",
        },
        500
      );
    }

    const requirementByText = new Map(
      insertedRequirements.map((r: { id: string; requirement: string }) => [r.requirement, r.id])
    );
    const requirementByNormalized = new Map(
      insertedRequirements.map((r: { id: string; requirement: string }) => [r.requirement.trim().toLowerCase(), r.id])
    );

    function resolveRequirementId(reqText: string | undefined, index: number): string {
      if (reqText) {
        const exact = requirementByText.get(reqText);
        if (exact) return exact;

        const lower = reqText.trim().toLowerCase();
        const norm = requirementByNormalized.get(lower);
        if (norm) return norm;

        for (const [key, id] of requirementByNormalized.entries()) {
          if (key.includes(lower) || lower.includes(key)) {
            return id;
          }
        }
      }
      if (insertedRequirements[index]?.id) {
        return insertedRequirements[index].id;
      }
      return insertedRequirements[0]?.id;
    }

    function normalizeFitStatus(status: string | undefined): string {
      const s = (status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
      if (s === "strong_alignment" || s === "strong") return "strong_alignment";
      if (s === "transferable") return "transferable";
      if (s === "needs_investigation" || s === "investigation") return "needs_investigation";
      if (s === "not_demonstrated" || s === "none") return "not_demonstrated";
      return "needs_investigation";
    }

    function normalizeConfidence(confidence: string | undefined): string {
      const c = (confidence || "").toLowerCase().trim();
      if (c === "high" || c === "medium" || c === "low") return c;
      return "medium";
    }

    // 7e. Insert fit analysis (NO requirement_title column in public.fit_analysis)
    const fitRows = analysis.fit_analysis.map((f, idx) => ({
      role_id: role.id,
      requirement_id: resolveRequirementId(f.requirement, idx),
      status: normalizeFitStatus(f.status),
      evidence: f.evidence || null,
      explanation: f.explanation || "",
      confidence: normalizeConfidence(f.confidence),
    }));

    const { error: fitError } = await supabase.from("fit_analysis").insert(fitRows);
    if (fitError) {
      console.error("[analyze-role] Fit analysis insert failed:", fitError);
      return json(
        {
          error: "Could not save role fit analysis",
          detail: fitError?.message ?? "Database error",
        },
        500
      );
    }

    // 7f. Insert preparation items
    const prepRows = (analysis.preparation || []).map((p, idx) => ({
      role_id: role.id,
      requirement_id: resolveRequirementId(p.requirement, idx),
      title: p.title,
      description: p.description,
      priority: p.priority || "medium",
      status: "not_started",
      order_index: idx,
    }));

    if (prepRows.length > 0) {
      const { error: prepError } = await supabase.from("preparation_items").insert(prepRows);
      if (prepError) {
        console.error("[analyze-role] Preparation plan insert failed:", prepError);
        return json(
          {
            error: "Could not save preparation plan",
            detail: prepError?.message ?? "Database error",
          },
          500
        );
      }
    }

    // 8. Return successful response
    return json({
      success: true,
      role_id: role.id,
      resume_id: resume.id,
      role: {
        id: role.id,
        job_title: analysis.role.job_title,
        company: analysis.role.company,
      },
      requirements: analysis.requirements,
      fit_analysis: analysis.fit_analysis,
      preparation: analysis.preparation,
      analysis,
    });
  } catch (error) {
    console.error("[analyze-role] Unexpected error:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Unexpected server error.",
      },
      500
    );
  }
});
