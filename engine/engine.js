// SafeMed AI Engine — Person 3
// Google Gemini powered medical document extraction + conflict detection
// FREE API — get key at https://aistudio.google.com/apikey

const GEMINI_MODEL = "gemini-2.0-flash";

// ============================================
// STEP 1: The extraction prompt
// This is the brain of SafeMed
// ============================================

const EXTRACTION_PROMPT = `You are SafeMed's Evidence Trust Engine — a careful medical records analyst for India.

You receive medical documents (prescriptions, lab reports, discharge summaries) numbered as Document 1, Document 2, etc.

Read ALL of them carefully, including handwriting, and return ONE JSON object.

CRITICAL RULES:
1. Every fact you extract MUST have "source_doc" (which document number) and "source_excerpt" (the exact words from that document that support this fact).
2. If something is unclear or missing, mark status as "unverified" — NEVER guess or invent.
3. Map every Indian brand name to its generic salt (e.g., Dolo 650 → Paracetamol, Crocin → Paracetamol, Ecosprin → Aspirin).
4. After extracting all documents, CROSS-CHECK for conflicts across documents.

Return this exact JSON structure:

{
  "patient": {
    "name": "",
    "age": "",
    "gender": "",
    "blood_group": "",
    "confidence": "verified|unverified"
  },
  "medicines": [
    {
      "brand": "",
      "generic": "",
      "dose": "",
      "frequency": "",
      "prescribed_by": "",
      "date": "",
      "status": "active|discontinued|unknown",
      "confidence": "verified|unverified|conflicting",
      "source_doc": 1,
      "source_excerpt": "exact words from document"
    }
  ],
  "allergies": [
    {
      "allergy": "",
      "confidence": "verified|unverified",
      "source_doc": 1,
      "source_excerpt": ""
    }
  ],
  "conditions": [
    {
      "condition": "",
      "confidence": "verified|unverified",
      "source_doc": 1,
      "source_excerpt": ""
    }
  ],
  "tests": [
    {
      "name": "",
      "value": "",
      "unit": "",
      "normal_range": "",
      "date": "",
      "status": "normal|high|low|unknown",
      "confidence": "verified|unverified",
      "source_doc": 1,
      "source_excerpt": ""
    }
  ],
  "timeline": [
    {
      "date": "",
      "event": "",
      "source_doc": 1
    }
  ],
  "conflicts": [
    {
      "type": "duplicate_medicine|contradictory_status|drug_interaction|allergy_conflict|worsening_trend",
      "severity": "high|medium|low",
      "title": "",
      "detail": "",
      "docs_involved": [1, 2],
      "evidence": [
        {"doc": 1, "excerpt": "exact words"},
        {"doc": 2, "excerpt": "exact words"}
      ],
      "recommendation": ""
    }
  ]
}

CONFLICT DETECTION RULES — check ALL of these across documents:

1. DUPLICATE MEDICINE: Same generic/salt prescribed under different brand names by different doctors. This is the #1 risk in India. Example: Dolo 650 (Doc A) + Calpol 650 (Doc B) = both Paracetamol = overdose risk.

2. CONTRADICTORY STATUS: One document says a medicine is active, another says discontinued. Flag with both sources.

3. DRUG INTERACTION: Known dangerous combinations (e.g., blood thinners + NSAIDs, certain antibiotics + antacids).

4. ALLERGY CONFLICT: A prescribed medicine conflicts with a documented allergy.

5. WORSENING TREND: A lab value (blood sugar, BP, creatinine etc.) getting worse across documents over time.

For each conflict, quote the EXACT excerpts from both documents so clinicians can verify.

UNCERTAINTY RULES:
- "verified" = clearly stated in the document, you can quote it
- "unverified" = partially readable, implied but not explicit, or only mentioned once
- "conflicting" = two documents disagree

If a document says "No known allergies" — mark confidence as "verified".
If a document simply doesn't mention allergies — do NOT write "no allergies", leave it out.

Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;


// ============================================
// STEP 2: Call Gemini API (text documents)
// ============================================

async function extractFromDocuments(apiKey, documents) {
  const userMessage = buildUserMessage(documents);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: EXTRACTION_PROMPT + "\n\n" + userMessage }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Gemini API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const raw = data.candidates[0].content.parts[0].text;
  const result = JSON.parse(raw.replace(/```json|```/g, "").trim());

  // Post-process: run our own conflict detection as a safety net
  enrichConflicts(result);

  return result;
}


// ============================================
// STEP 3: Build the message with documents
// ============================================

function buildUserMessage(documents) {
  let parts = ["Analyze these medical documents:\n"];

  for (let i = 0; i < documents.length; i++) {
    parts.push(`--- Document ${i + 1}: ${documents[i].name} ---`);
    if (documents[i].content) {
      parts.push(documents[i].content);
    } else if (documents[i].base64) {
      parts.push("[Image document — see attached]");
    }
    parts.push("");
  }

  return parts.join("\n");
}


// ============================================
// STEP 4: Image support (Gemini vision)
// ============================================

async function extractWithImages(apiKey, documents) {
  const parts = [
    { text: EXTRACTION_PROMPT + "\n\nAnalyze these medical documents:\n" }
  ];

  for (let i = 0; i < documents.length; i++) {
    parts.push({
      text: `\n--- Document ${i + 1}: ${documents[i].name} ---\n`
    });

    if (documents[i].base64) {
      parts.push({
        inlineData: {
          mimeType: documents[i].mimeType,
          data: documents[i].base64
        }
      });
    } else if (documents[i].content) {
      parts.push({
        text: documents[i].content
      });
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Gemini API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const raw = data.candidates[0].content.parts[0].text;
  const result = JSON.parse(raw.replace(/```json|```/g, "").trim());

  enrichConflicts(result);
  return result;
}


// ============================================
// STEP 5: Local conflict detection (safety net)
// The AI prompt catches most conflicts, but
// this function double-checks programmatically
// ============================================

function enrichConflicts(result) {
  if (!result.conflicts) result.conflicts = [];
  if (!result.medicines) return;

  // Build a map: generic name -> list of entries
  const genericMap = {};
  for (const med of result.medicines) {
    const key = (med.generic || "").toLowerCase().trim();
    if (!key) continue;
    if (!genericMap[key]) genericMap[key] = [];
    genericMap[key].push(med);
  }

  // Check for duplicates the AI might have missed
  for (const [generic, entries] of Object.entries(genericMap)) {
    if (entries.length < 2) continue;

    const brands = [...new Set(entries.map(e => (e.brand || "").toLowerCase().trim()).filter(Boolean))];
    const docs = [...new Set(entries.map(e => e.source_doc))];

    if (brands.length > 1 && docs.length > 1) {
      const alreadyFlagged = result.conflicts.some(c =>
        c.type === "duplicate_medicine" &&
        c.detail?.toLowerCase().includes(generic)
      );

      if (!alreadyFlagged) {
        result.conflicts.push({
          type: "duplicate_medicine",
          severity: "high",
          title: `Possible duplicate: ${generic}`,
          detail: `${generic} appears under different brand names: ${brands.join(", ")} — prescribed in documents ${docs.join(", ")}. Risk of double dosing.`,
          docs_involved: docs,
          evidence: entries.map(e => ({
            doc: e.source_doc,
            excerpt: e.source_excerpt || null
          })),
          recommendation: "Verify with both prescribing doctors whether both prescriptions should be active."
        });
      }
    }

    // Check contradictory statuses on the same valid date.
    const entriesByDate = new Map();

    for (const entry of entries) {
      const date = entry.date;

      if (typeof date !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        continue;
      }

      const parsed = new Date(`${date}T00:00:00Z`);

      if (Number.isNaN(parsed.getTime()) ||
          parsed.toISOString().slice(0, 10) !== date) {
        continue;
      }

      if (!entriesByDate.has(date)) {
        entriesByDate.set(date, []);
      }

      entriesByDate.get(date).push(entry);
    }

    for (const [date, sameDateEntries] of entriesByDate) {
      const active = sameDateEntries.filter(
        e => e.status === "active"
      );

      const discontinued = sameDateEntries.filter(
        e => e.status === "discontinued"
      );

      if (!active.length || !discontinued.length) {
        continue;
      }

      const alreadyFlagged = result.conflicts.some(c =>
        c.type === "contradictory_status" &&
        c.medication_key === generic &&
        c.record_date === date
      );

      if (alreadyFlagged) continue;

      const conflictingEntries = [...active, ...discontinued];

      result.conflicts.push({
        type: "contradictory_status",
        severity: "high",
        title: `Conflicting status: ${generic}`,
        medication_key: generic,
        record_date: date,
        detail:
          `${generic} has active and discontinued statuses ` +
          `recorded on ${date}. Clinician review required.`,
        docs_involved: [
          ...new Set(conflictingEntries.map(e => e.source_doc))
        ],
        evidence: conflictingEntries.map(e => ({
          doc: e.source_doc,
          excerpt: e.source_excerpt || null
        })),
        recommendation:
          "Review the original records and confirm the " +
          "current medication status with the clinician."
      });
    }
  }

  // Sort conflicts: high severity first
  const order = { high: 0, medium: 1, low: 2 };
  result.conflicts.sort((a, b) => (order[a.severity] ?? 1) - (order[b.severity] ?? 1));
}


// ============================================
// STEP 6: Helper to read a file as base64
// ============================================

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


// ============================================
// STEP 7: Main function your frontend calls
// ============================================

async function processDocuments(apiKey, fileList) {
  // fileList = array of File objects from <input type="file">
  const documents = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (file.type.startsWith("image/") || file.type === "application/pdf") {
      documents.push({
        name: file.name,
        base64: await fileToBase64(file),
        mimeType: file.type
      });
    } else {
      // Text file
      const text = await file.text();
      documents.push({
        name: file.name,
        content: text
      });
    }
  }

  // Use vision endpoint if any images, otherwise text-only
  const hasImages = documents.some(d => d.base64);
  if (hasImages) {
    return await extractWithImages(apiKey, documents);
  } else {
    return await extractFromDocuments(apiKey, documents);
  }
}


// ============================================
// Export for use by Person 1 (frontend) and
// Person 2 (backend)
// ============================================

// If using ES modules:
// export { processDocuments, extractFromDocuments, extractWithImages, enrichConflicts };

// If using script tag in HTML:
window.SafeMedEngine = { processDocuments, enrichConflicts };
