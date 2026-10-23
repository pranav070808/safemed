import { withSupabase } from "npm:@supabase/server";
import { extractFromDocuments } from "../_shared/engine.js";

type CandidateFact = {
  fact_type: string;
  normalized_key: string;
  value: Record<string, unknown>;
  event_date: string | null;
  page_number: number | null;
  evidence_excerpt: string;
  verification_status: "unverified";
  uncertainty: unknown[];
};

function normalizeText(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function normalizedKey(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 120) || null;
}

function safeDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

function makeFact(
  factType: string,
  keyValue: unknown,
  value: Record<string, unknown>,
  dateValue: unknown,
  excerptValue: unknown,
  sourceText: string,
): CandidateFact | null {
  const key = normalizedKey(keyValue);
  if (!key || typeof excerptValue !== "string" || !excerptValue.trim()) return null;
  const excerpt = excerptValue.trim().slice(0, 1200);
  if (!normalizeText(sourceText).includes(normalizeText(excerpt))) return null;

  return {
    fact_type: factType,
    normalized_key: key,
    value,
    event_date: safeDate(dateValue),
    page_number: 1,
    evidence_excerpt: excerpt,
    verification_status: "unverified",
    uncertainty: [],
  };
}

function mapFacts(extraction: Record<string, unknown>, sourceText: string): CandidateFact[] {
  const facts: CandidateFact[] = [];
  const addList = (field: string, mapper: (item: Record<string, unknown>) => CandidateFact | null) => {
    const items = extraction[field];
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const fact = mapper(item as Record<string, unknown>);
        if (fact) facts.push(fact);
      }
    }
  };

  addList("medicines", (item) => makeFact(
    "medication", item.generic || item.brand, item,
    item.date, item.source_excerpt, sourceText,
  ));
  addList("allergies", (item) => makeFact(
    "allergy", item.allergy, item,
    null, item.source_excerpt, sourceText,
  ));
  addList("conditions", (item) => makeFact(
    "condition", item.condition, item,
    null, item.source_excerpt, sourceText,
  ));
  addList("tests", (item) => makeFact(
    "test_result", item.name, item,
    item.date, item.source_excerpt, sourceText,
  ));

  return facts;
}

function mapConflicts(extraction: Record<string, unknown>, patientId: string) {
  if (!Array.isArray(extraction.conflicts)) return [];
  const allowedTypes = new Set([
    "same_time_disagreement", "chronology_candidate", "duplicate_candidate", "ambiguous",
  ]);
  const typeMap: Record<string, string> = {
    duplicate_medicine: "duplicate_candidate",
    contradictory_status: "same_time_disagreement",
    allergy_conflict: "same_time_disagreement",
    worsening_trend: "chronology_candidate",
    drug_interaction: "ambiguous",
  };

  return extraction.conflicts.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const conflict = item as Record<string, unknown>;
    const title = typeof conflict.title === "string" ? conflict.title : `Potential conflict ${index + 1}`;
    const key = normalizedKey(title) ?? `potential_conflict_${index + 1}`;
    const rawType = typeof conflict.type === "string" ? conflict.type : "ambiguous";
    const candidateType = typeMap[rawType] ?? rawType;
    const conflictType = allowedTypes.has(candidateType) ? candidateType : "ambiguous";
    const detail = typeof conflict.detail === "string" ? conflict.detail : "Potential discrepancy needs review.";
    const recommendation = typeof conflict.recommendation === "string" ? conflict.recommendation : "";
    return [{
      patient_id: patientId,
      normalized_key: key,
      conflict_type: conflictType,
      status: "needs_review",
      explanation: [title, detail, recommendation].filter(Boolean).join(" — ").slice(0, 4000),
    }];
  });
}

export default {
  fetch: withSupabase({ auth: ["user"] }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    let body: { documentId?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const documentId = body.documentId?.trim();
    if (!documentId) {
      return Response.json({ error: "documentId is required" }, { status: 400 });
    }

    const { data: document, error: documentError } = await ctx.supabase
      .from("documents")
      .select("id, patient_id, storage_path, mime_type")
      .eq("id", documentId)
      .single();

    if (documentError || !document) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }
    if (document.mime_type !== "text/plain") {
      return Response.json({ error: "This version supports plain text files only" }, { status: 415 });
    }

    const { data: file, error: downloadError } = await ctx.supabase.storage
      .from("medical-records")
      .download(document.storage_path);
    if (downloadError || !file) {
      return Response.json({ error: "Could not access document file" }, { status: 404 });
    }

    const sourceText = await file.text();
    if (!sourceText.trim()) {
      return Response.json({ error: "The document is empty" }, { status: 422 });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "Document processing is not configured" }, { status: 503 });
    }

    try {
      const extraction = await extractFromDocuments(apiKey, [{
        name: document.storage_path.split("/").pop() ?? "record.txt",
        content: sourceText,
      }]);
      const facts = mapFacts(extraction as Record<string, unknown>, sourceText);
      const conflicts = mapConflicts(extraction as Record<string, unknown>, document.patient_id);

      if (facts.length > 0) {
        const { error: insertError } = await ctx.supabaseAdmin
          .from("medical_facts")
          .insert(facts.map((fact) => ({
            patient_id: document.patient_id,
            document_id: document.id,
            ...fact,
          })));
        if (insertError) throw insertError;
      }

      if (conflicts.length > 0) {
        const { error: conflictError } = await ctx.supabaseAdmin
          .from("conflicts")
          .insert(conflicts);
        if (conflictError) throw conflictError;
      }

      const { error: statusError } = await ctx.supabaseAdmin
        .from("documents")
        .update({ processing_status: "needs_review" })
        .eq("id", document.id);
      if (statusError) throw statusError;

      return Response.json({
        documentId: document.id,
        patientId: document.patient_id,
        processingStatus: "needs_review",
        savedFactCount: facts.length,
        savedConflictCount: conflicts.length,
        skippedUnsupportedFactCount:
          ["medicines", "allergies", "conditions", "tests"].reduce((total, field) => {
            const list = extraction[field];
            return total + (Array.isArray(list) ? list.length : 0);
          }, 0) - facts.length,
        extraction,
      });
    } catch {
      await ctx.supabaseAdmin
        .from("documents")
        .update({ processing_status: "failed" })
        .eq("id", document.id);
      return Response.json({ error: "Document processing failed" }, { status: 502 });
    }
  }),
};
