import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FitStatus =
  | "Strong alignment"
  | "Transferable"
  | "Needs investigation"
  | "Not demonstrated";

type Priority = "High" | "Medium" | "Low";
type Importance = "high" | "medium" | "low";
type Confidence = "high" | "medium" | "low";

interface AnalysisOutput {
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
    status: string;
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
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

async function getAvailableGeminiModels(key: string): Promise<string[]> {
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": key },
    });
    if (res.ok) {
      const data = await res.json();
      const list = (data.models || [])
        .filter((m: { name?: string; supportedGenerationMethods?: string[] }) => {
          const name = (m.name || "").replace(/^models\//, "");
          // Strictly exclude legacy 1.5 models per requirements
          if (name.includes("1.5") || name.includes("legacy")) return false;
          // Must support generateContent
          const methods = m.supportedGenerationMethods || [];
          return methods.includes("generateContent");
        })
        .map((m: { name?: string }) => (m.name || "").replace(/^models\//, ""));

      console.log("[analyze-role] Models available for API key:", list);

      if (list.length > 0) {
        // Prioritize Flash-Lite models first, then other Flash models
        list.sort((a: string, b: string) => {
          const score = (name: string) => {
            if (name === "gemini-2.5-flash-lite") return 1;
            if (name === "gemini-2.5-flash") return 2;
            if (name.includes("flash-lite")) return 3;
            if (name.includes("flash")) return 4;
            return 10;
          };
          return score(a) - score(b);
        });
        return list;
      }
    } else {
      console.warn(`[analyze-role] Models list request returned status ${res.status}`);
    }
  } catch (err) {
    console.warn("[analyze-role] Error querying available models list:", err);
  }

  // Curated supported fallback models (strictly excluding 1.5):
  return ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];
}

async function callGemini(key: string, systemPrompt: string, userPrompt: string): Promise<any> {
  const candidateModels = [
    { name: "gemini-3.6-flash", tb: 0 },
    { name: "gemini-3-flash-preview", tb: undefined },
    { name: "gemini-flash-lite-latest", tb: undefined },
  ];
  let lastStatus = 503;
  let lastMessage = "Gemini service is temporarily unavailable.";
  const attempts: Array<{ model: string; status: number; message: string; elapsedMs: number }> = [];

  for (const candidate of candidateModels) {
    const model = candidate.name;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const modelStart = Date.now();
      try {
        console.log(`[analyze-role] Calling Gemini model: ${model} (attempt ${attempt})`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const genConfig: any = {
          responseMimeType: "application/json",
          temperature: 0.2,
        };
        if (candidate.tb !== undefined) {
          genConfig.thinkingConfig = { thinkingBudget: candidate.tb };
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              generationConfig: genConfig,
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        const elapsed = Date.now() - modelStart;
        const raw = await res.text();
        lastStatus = res.status;

        if (!res.ok) {
          let msg = raw;
          try {
            const parsed = JSON.parse(raw);
            msg = parsed.error?.message || parsed.message || raw;
          } catch {}
          console.warn(`[analyze-role] Model ${model} returned error status ${res.status} (${elapsed}ms):`, msg);
          lastMessage = msg;
          attempts.push({ model, status: res.status, message: msg, elapsedMs: elapsed });

          if (res.status === 401 || res.status === 403) {
            throw new Error(`API/auth configuration error (${res.status}): ${msg}`);
          }

          if (res.status === 503 && attempt === 1) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }

          break;
        }

        const data = JSON.parse(raw);
        const content = data.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text ?? "")
          .join("")
          .trim();

        if (!content) {
          lastStatus = 502;
          lastMessage = "Gemini returned an empty response.";
          attempts.push({ model, status: 502, message: lastMessage, elapsedMs: elapsed });
          break;
        }

        const parsedJson = JSON.parse(cleanJsonText(content));
        console.log(`[analyze-role] Model ${model} succeeded in ${elapsed}ms`);
        return parsedJson;
      } catch (err: unknown) {
        const elapsed = Date.now() - modelStart;
        console.warn(`[analyze-role] Error with model ${model} (${elapsed}ms):`, err);
        if (err instanceof Error && err.message.includes("API/auth configuration error")) {
          throw err;
        }
        lastMessage = err instanceof Error ? err.message : String(err);
        attempts.push({ model, status: lastStatus || 500, message: lastMessage, elapsedMs: elapsed });
        break;
      }
    }
  }

  throw new Error(`All models failed: ${JSON.stringify(attempts)}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized: Missing Authorization header." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Client for auth check
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) {
      console.error("[analyze-role] Auth user retrieval failed:", userError);
      return json({ error: "Unauthorized: Invalid Supabase user session." }, 401);
    }
    const userId = user.id;

    // Database client (using service role key if available for safe schema operations)
    const db = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : authClient;

    // 2. Validate input payload
    const body = await req.json().catch(() => ({}));
    if (body?.action === "list_models") {
      const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim() || "";
      const available = await getAvailableGeminiModels(geminiKey);
      return json({ availableModels: available });
    }
    const existingRoleId = body?.roleId ? String(body.roleId).trim() : null;
    const jobDescription = String(body?.jobDescription ?? "").trim();
    const resumeText = String(body?.resumeText ?? "").trim();
    const resumeFileName = body?.resumeFileName ? String(body.resumeFileName) : "resume.pdf";
    const resumeMimeType = body?.resumeMimeType ? String(body.resumeMimeType) : "application/pdf";

    const userJobTitle = body?.jobTitle ? String(body.jobTitle).trim() : "";
    const userCompany = body?.company ? String(body.company).trim() : "";
    const userLocation = body?.location ? String(body.location).trim() : "";
    const userWorkModel = body?.workModel ? String(body.workModel).trim() : "";

    if (!jobDescription) return json({ error: "Job description is required." }, 400);
    if (!resumeText) return json({ error: "Resume or experience text is required." }, 400);

    if (jobDescription.length > 60000) {
      return json({ error: "Job description is too long. Please provide a shorter version." }, 400);
    }
    if (resumeText.length > 60000) {
      return json({ error: "Resume text is too long. Please provide a shorter version." }, 400);
    }

    // 3. Read Gemini API key
    const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!geminiKey) {
      console.error("[analyze-role] GEMINI_API_KEY is not configured in Supabase Edge Function secrets");
      return json(
        {
          error: "AI_PROVIDER_ERROR",
          message: "GEMINI_API_KEY is not configured in Edge Function secrets.",
        },
        503
      );
    }

    // Safe logging before Gemini request (Requirement 3)
    console.log("[Rolewise] analyze-role context", {
      hasJobDescription: Boolean(jobDescription && jobDescription.length > 0),
      jobDescriptionLength: jobDescription.length,
      hasResumeText: Boolean(resumeText && resumeText.length > 0),
      resumeTextLength: resumeText.length,
    });

    // 4. Construct Gemini prompt for full role analysis (Requirement 4)
    const systemPrompt = `You are the role analysis engine for ROLEWISE, an AI career preparation platform.

GOAL:
Read the FULL submitted job description and compare it against the candidate's actual resume/experience text.
Produce a tailored, evidence-grounded role fit analysis and a preparation plan.

CRITICAL INSTRUCTIONS:
1. EVALUATION RULES:
   - Use only the supplied candidate resume/experience as evidence.
   - Do not infer skills that are not supported by the resume.
   - Do not treat missing evidence as lack of ability.
   - "Needs investigation" means insufficient evidence.
   - "Not demonstrated" means the supplied experience does not demonstrate the requirement after considering transferable capabilities.
   - "Strong alignment" means the supplied resume clearly demonstrates relevant, direct experience.
   - "Transferable" means the supplied experience is related or adjacent, but not an exact match.

2. REQUIREMENTS MUST COME DIRECTLY FROM THE SUBMITTED JOB DESCRIPTION:
   - Do NOT use generic predefined Product Designer requirements unless they are explicitly present in the submitted JD.
   - Extract 5 to 8 concrete requirements that reflect the role's actual demands (e.g., domain expertise, technical skills, ownership level, B2B/consumer focus, collaboration, tools, system complexity).
   - Only include requirements supported by the submitted JD. Do not invent requirements.

3. EVIDENCE & EXPLANATIONS:
   - Every "Strong alignment" or "Transferable" result MUST include evidence grounded in the supplied candidate resume.
   - Quote or faithfully summarize ONLY what is explicitly stated in the candidate's resume. If no evidence exists, provide null.
   - Explain clearly and objectively how the candidate's background connects (or where information is needed).
   - Never invent candidate companies, years of experience, metrics, tools, or accomplishments.

4. PREPARATION PLAN DERIVATION:
   - Generate 3 to 5 actionable preparation items directly tied to the analyzed requirements and fit findings.
   - If an area is "Needs investigation": focus on clarifying or articulating experience in that domain.
   - If an area is "Strong alignment": focus on preparing a standout, structured project story.
   - If an area is "Transferable": focus on effectively framing related experience.
   - If an area is "Not demonstrated": focus on addressing domain gaps thoughtfully without claiming impossible qualifications.
   - Set priority to "High", "Medium", or "Low".

5. NO NUMERICAL SCORES:
   - Do NOT produce numerical match scores, hiring percentages, or readiness ratings.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure:
{
  "role": {
    "job_title": "Extracted or confirmed role title",
    "company": "Company name or null",
    "location": "Location or null",
    "work_model": "Work model (e.g. Remote, Hybrid, On-site) or null"
  },
  "requirements": [
    {
      "requirement": "Specific requirement text from the JD",
      "importance": "high" | "medium" | "low",
      "category": "Domain Expertise" | "Technical Execution" | "Leadership & Ownership" | "Collaboration" | "Strategy"
    }
  ],
  "fit_analysis": [
    {
      "requirement": "Must match the exact text of one requirement from the requirements list",
      "status": "Strong alignment" | "Transferable" | "Needs investigation" | "Not demonstrated",
      "evidence": "Actual candidate experience quote/summary, or null",
      "explanation": "Clear rationale connecting candidate experience to requirement",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "preparation": [
    {
      "requirement": "Must match the exact text of one requirement from the requirements list",
      "title": "Clear actionable preparation action",
      "description": "Specific guidance on what to prepare or practice",
      "priority": "High" | "Medium" | "Low"
    }
  ]
}`;

    const userPrompt = `JOB DESCRIPTION
${jobDescription}

CANDIDATE EXPERIENCE / RESUME
${resumeText}

Candidate and Role Metadata:
Target Job Title: ${userJobTitle || "Not specified"}
Company: ${userCompany || "Not specified"}
Location: ${userLocation || "Not specified"}
Work Model: ${userWorkModel || "Not specified"}`;

    console.log("[analyze-role] Sending prompt to Gemini...");
    const analysis: AnalysisOutput = await callGemini(geminiKey, systemPrompt, userPrompt);

    if (!analysis || !Array.isArray(analysis.requirements) || !Array.isArray(analysis.fit_analysis)) {
      console.error("[analyze-role] Invalid structured output from Gemini:", analysis);
      return json(
        {
          error: "AI_PROVIDER_ERROR",
          message: "Gemini returned incomplete analysis structure.",
        },
        502
      );
    }

    console.log("[analyze-role] Gemini analysis completed successfully.", {
      requirementsCount: analysis.requirements.length,
      fitCount: analysis.fit_analysis.length,
      prepCount: (analysis.preparation || []).length,
    });

    // 5. Finalize role metadata prioritizing user-provided details
    const finalJobTitle = userJobTitle || analysis.role?.job_title || "Target Role";
    const finalCompany = userCompany || analysis.role?.company || "Target Company";
    const finalLocation = userLocation || analysis.role?.location || null;
    const finalWorkModel = userWorkModel || analysis.role?.work_model || null;

    // 6. Save Resume record
    const { data: resume, error: resumeError } = await db
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
      return json({ error: "Could not save resume record", detail: resumeError?.message }, 500);
    }

    // Safe logging after resume extraction saved (Requirement 1)
    console.log("[Rolewise] resume extraction", {
      resumeId: resume.id,
      resumeFileName: resumeFileName,
      hasResumeText: Boolean(resumeText && resumeText.trim().length > 0),
      resumeTextLength: resumeText ? resumeText.length : 0,
    });

    // 7. Save Role record (Update if re-running for existing roleId, else Insert new)
    let roleId = existingRoleId;
    if (existingRoleId) {
      // Re-run: verify ownership first
      const { data: existingRole, error: roleCheckError } = await db
        .from("roles")
        .select("id")
        .eq("id", existingRoleId)
        .eq("user_id", userId)
        .maybeSingle();

      if (roleCheckError || !existingRole) {
        return json({ error: "Existing role not found or access denied." }, 404);
      }

      // Clean up previous requirements, fit analysis, and preparation items for re-analysis
      await db.from("fit_analysis").delete().eq("role_id", existingRoleId);
      await db.from("preparation_items").delete().eq("role_id", existingRoleId);
      await db.from("role_requirements").delete().eq("role_id", existingRoleId);

      const { error: roleUpdateError } = await db
        .from("roles")
        .update({
          job_title: finalJobTitle,
          company: finalCompany,
          location: finalLocation,
          work_model: finalWorkModel,
          job_description: jobDescription,
          status: "analyzing",
          resume_id: resume.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRoleId);

      if (roleUpdateError) {
        console.error("[analyze-role] Role update failed:", roleUpdateError);
        return json({ error: "Could not update role record", detail: roleUpdateError.message }, 500);
      }
    } else {
      // New role creation
      const { data: newRole, error: roleInsertError } = await db
        .from("roles")
        .insert({
          user_id: userId,
          job_title: finalJobTitle,
          company: finalCompany,
          location: finalLocation,
          work_model: finalWorkModel,
          job_description: jobDescription,
          status: "analyzing",
          resume_id: resume.id,
        })
        .select("id")
        .single();

      if (roleInsertError || !newRole) {
        console.error("[analyze-role] Role insert failed:", roleInsertError);
        await db.from("resumes").delete().eq("id", resume.id);
        return json({ error: "Could not save role record", detail: roleInsertError?.message }, 500);
      }
      roleId = newRole.id;
    }

    // 8. Insert role requirements
    const requirementRows = analysis.requirements.map((r) => ({
      role_id: roleId,
      requirement: r.requirement,
      importance: r.importance || "medium",
      category: r.category || "Core Responsibility",
    }));

    const { data: insertedRequirements, error: reqError } = await db
      .from("role_requirements")
      .insert(requirementRows)
      .select("id, requirement");

    if (reqError || !insertedRequirements) {
      console.error("[analyze-role] Requirements insert failed:", reqError);
      await db.from("roles").update({ status: "analysis_failed" }).eq("id", roleId);
      return json({ error: "Could not save role requirements", detail: reqError?.message, role_id: roleId }, 500);
    }

    // Map requirement text to database UUID
    const requirementByText = new Map(
      insertedRequirements.map((r: { id: string; requirement: string }) => [r.requirement.trim().toLowerCase(), r.id])
    );

    function resolveRequirementId(reqText: string | undefined, index: number): string {
      if (reqText) {
        const lower = reqText.trim().toLowerCase();
        const exact = requirementByText.get(lower);
        if (exact) return exact;

        for (const [key, id] of requirementByText.entries()) {
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
      const s = (status || "").toLowerCase().trim();
      if (s.includes("strong")) return "strong_alignment";
      if (s.includes("transferable")) return "transferable";
      if (s.includes("investigation")) return "needs_investigation";
      if (s.includes("not demonstrated") || s.includes("not_demonstrated") || s.includes("not")) return "not_demonstrated";
      return "needs_investigation";
    }

    function normalizeConfidence(confidence: string | undefined): string {
      const c = (confidence || "").toLowerCase().trim();
      if (c.includes("high")) return "high";
      if (c.includes("low")) return "low";
      return "medium";
    }

    function normalizePriority(priority: string | undefined): string {
      const p = (priority || "").toLowerCase().trim();
      if (p.includes("high")) return "high";
      if (p.includes("low")) return "low";
      return "medium";
    }

    // 9. Insert fit analysis respecting UNIQUE (role_id, requirement_id) constraint
    const usedRequirementIds = new Set<string>();
    const fitRows = [];

    for (let idx = 0; idx < analysis.fit_analysis.length; idx++) {
      const f = analysis.fit_analysis[idx];
      let reqId = resolveRequirementId(f.requirement, idx);
      if (usedRequirementIds.has(reqId)) {
        const unused = insertedRequirements.find((r) => !usedRequirementIds.has(r.id));
        if (unused) {
          reqId = unused.id;
        } else {
          continue;
        }
      }
      usedRequirementIds.add(reqId);

      fitRows.push({
        role_id: roleId,
        requirement_id: reqId,
        status: normalizeFitStatus(f.status),
        evidence: f.evidence || null,
        explanation: f.explanation || "",
        confidence: normalizeConfidence(f.confidence),
      });
    }

    // Guarantee all requirements have a fit analysis record
    for (const req of insertedRequirements) {
      if (!usedRequirementIds.has(req.id)) {
        usedRequirementIds.add(req.id);
        fitRows.push({
          role_id: roleId,
          requirement_id: req.id,
          status: "needs_investigation",
          evidence: null,
          explanation: "Candidate evidence requires further review during role preparation.",
          confidence: "medium",
        });
      }
    }

    const { error: fitError } = await db.from("fit_analysis").insert(fitRows);
    if (fitError) {
      console.error("[analyze-role] Fit analysis insert failed:", fitError);
      await db.from("roles").update({ status: "draft" }).eq("id", roleId);
      return json({ error: "Could not save role fit analysis", detail: fitError.message, role_id: roleId }, 500);
    }

    // 10. Insert preparation items (strictly adhering to schema: id, role_id, requirement_id, title, description, priority, status)
    const prepRows = (analysis.preparation || []).map((p, idx) => ({
      role_id: roleId,
      requirement_id: resolveRequirementId(p.requirement, idx),
      title: p.title,
      description: p.description,
      priority: normalizePriority(p.priority),
      status: "not_started",
    }));

    if (prepRows.length > 0) {
      const { error: prepError } = await db.from("preparation_items").insert(prepRows);
      if (prepError) {
        console.error("[analyze-role] Preparation items insert failed:", prepError);
        await db.from("roles").update({ status: "draft" }).eq("id", roleId);
        return json({ error: "Could not save preparation items", detail: prepError.message, role_id: roleId }, 500);
      }
    }

    // 11. Mark role as ready now that all downstream items are successfully saved
    await db
      .from("roles")
      .update({
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", roleId);

    // 12. Return successful response
    return json({
      success: true,
      role_id: roleId,
      resume_id: resume.id,
      role: {
        id: roleId,
        job_title: finalJobTitle,
        company: finalCompany,
        location: finalLocation,
        work_model: finalWorkModel,
      },
      requirements: analysis.requirements,
      fit_analysis: analysis.fit_analysis,
      preparation: analysis.preparation,
    });
  } catch (error) {
    console.error("[analyze-role] Unexpected error:", error);
    return json(
      {
        error: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "Unexpected server error during role analysis.",
      },
      500
    );
  }
});
