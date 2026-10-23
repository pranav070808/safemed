"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  validateCandidateConflict
} = require("../../engine/evidence/conflict-gateway.cjs");

const fixtureDir = path.join(__dirname, "../fixtures");

const documents = [
  {
    source_doc: 1,
    text: fs.readFileSync(
      path.join(fixtureDir, "hospital_a.txt"), "utf8"
    )
  },
  {
    source_doc: 2,
    text: fs.readFileSync(
      path.join(fixtureDir, "hospital_b.txt"), "utf8"
    )
  },
  {
    source_doc: 3,
    text: fs.readFileSync(
      path.join(fixtureDir, "clinic_c.txt"), "utf8"
    )
  }
];

function makeCandidate(docA, docB, dateA, dateB) {
  return {
    type: "contradictory_status",
    evidence: [
      {
        doc: docA,
        excerpt: documents[docA - 1].text.trim()
      },
      {
        doc: docB,
        excerpt: documents[docB - 1].text.trim()
      }
    ],
    records: [
      {
        generic: "StudyMed A",
        status: docA === 2 ? "discontinued" : "active",
        date: dateA,
        source_doc: docA
      },
      {
        generic: "StudyMed A",
        status: docB === 2 ? "discontinued" : "active",
        date: dateB,
        source_doc: docB
      }
    ]
  };
}

// Test 1: Same-day disagreement
const sameDay = makeCandidate(
  2, 3, "2026-10-18", "2026-10-18"
);

const sameDayResult = validateCandidateConflict(
  sameDay, documents
);

assert.equal(sameDayResult.accepted, true);
assert.equal(
  sameDayResult.classification,
  "same_time_disagreement"
);

console.log("PASS: Same-day disagreement accepted for review.");

// Test 2: Historical change
const historical = makeCandidate(
  1, 2, "2026-10-12", "2026-10-18"
);

const historicalResult = validateCandidateConflict(
  historical, documents
);

assert.equal(historicalResult.accepted, false);
assert.equal(historicalResult.reason, "different_dates");

console.log("PASS: Historical change rejected as same-day conflict.");

// Test 3: Fabricated evidence
const fabricated = makeCandidate(
  2, 3, "2026-10-18", "2026-10-18"
);

fabricated.evidence[0].excerpt =
  "StudyMed A permanently cures every disease";

const fabricatedResult = validateCandidateConflict(
  fabricated, documents
);

assert.equal(fabricatedResult.accepted, false);
assert.equal(
  fabricatedResult.reason,
  "unsupported_evidence"
);

console.log("PASS: Fabricated evidence rejected.");
