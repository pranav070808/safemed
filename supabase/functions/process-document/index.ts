import { withSupabase } from "npm:@supabase/server";

import { extractFromDocuments } from "../_shared/engine.js";

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

    const { data: file, error: downloadError } = await ctx.supabase.storage
      .from("medical-records")
      .download(document.storage_path);

    if (downloadError || !file) {
      return Response.json({ error: "Could not access document file" }, { status: 404 });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return Response.json({ error: "Document processing is not configured" }, { status: 503 });
    }

    // The shared extraction engine accepts text content (or base64 image data),
    // not a Storage Blob. For this first MVP path, process text files only.
    if (document.mime_type !== "text/plain") {
      return Response.json(
        { error: "This first processing version supports text files only" },
        { status: 415 },
      );
    }

    const content = await file.text();
    if (!content.trim()) {
      return Response.json({ error: "The document is empty" }, { status: 422 });
    }

    const extraction = await extractFromDocuments(apiKey, [
      {
        name: document.storage_path.split("/").pop() ?? "record.txt",
        content,
      },
    ]);

    return Response.json({
      documentId: document.id,
      patientId: document.patient_id,
      status: "review_required",
      extraction,
    });
  }),
};
