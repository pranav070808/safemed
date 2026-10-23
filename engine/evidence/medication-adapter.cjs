"use strict";

const {
  validateCandidateConflict
} = require("./conflict-gateway.cjs");

function validateMedicationCandidates(extraction, documents) {
  const medicines = Array.isArray(extraction?.medicines)
    ? extraction.medicines
    : [];

  const grouped = new Map();

  for (const medicine of medicines) {
    if (
      !medicine ||
      typeof medicine.generic !== "string" ||
      !medicine.generic.trim()
    ) {
      continue;
    }

    const key = medicine.generic.trim().toLowerCase();

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(medicine);
  }

  const accepted = [];
  const rejected = [];

  for (const entries of grouped.values()) {
    // Evaluate pairs rather than treating all dates
    // for one medicine as a single conflict.
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const first = entries[i];
        const second = entries[j];

        if (first.status === second.status) {
          continue;
        }

        const candidate = {
          type: "contradictory_status",
          evidence: [
            {
              doc: first.source_doc,
              excerpt: first.source_excerpt
            },
            {
              doc: second.source_doc,
              excerpt: second.source_excerpt
            }
          ],
          records: [
            {
              generic: first.generic,
              status: first.status,
              date: first.date,
              source_doc: first.source_doc
            },
            {
              generic: second.generic,
              status: second.status,
              date: second.date,
              source_doc: second.source_doc
            }
          ]
        };

        const result = validateCandidateConflict(
          candidate,
          documents
        );

        const entry = {
          candidate,
          result
        };

        if (result.accepted) {
          accepted.push(entry);
        } else {
          rejected.push(entry);
        }
      }
    }
  }

  return {
    accepted,
    rejected
  };
}

module.exports = {
  validateMedicationCandidates
};
