"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  validateMedicationCandidates
} = require("../../engine/evidence/medication-adapter.cjs");

const fixtureDir = path.join(__dirname, "../fixtures");

const documents = [
  "hospital_a.txt",
  "hospital_b.txt",
  "clinic_c.txt"
].map((filename, index) => ({
  source_doc: index + 1,
  text: fs.readFileSync(
    path.join(fixtureDir, filename),
    "utf8"
  )
}));

function medication(doc, date, status) {
  return {
    generic: "StudyMed A",
    date,
    status,
    source_doc: doc,
    source_excerpt: documents[doc - 1].text.trim()
  };
}

// Test 1: Historical change
const historical = validateMedicationCandidates(
  {
    medicines: [
      medication(1, "2026-10-12", "active"),
      medication(2, "2026-10-18", "discontinued")
    ]
  },
  documents
);

assert.equal(historical.accepted.length, 0);
assert.equal(historical.rejected.length, 1);
assert.equal(
  historical.rejected[0].result.reason,
  "different_dates"
);

console.log("PASS: Historical change not flagged as same-day conflict.");

// Test 2: Same-day disagreement
const sameDay = validateMedicationCandidates(
  {
    medicines: [
      medication(2, "2026-10-18", "discontinued"),
      medication(3, "2026-10-18", "active")
    ]
  },
  documents
);

assert.equal(sameDay.accepted.length, 1);
assert.equal(sameDay.rejected.length, 0);

console.log("PASS: Same-day disagreement detected.");

// Test 3: Fabricated evidence
const fabricated = medication(
  3, "2026-10-18", "active"
);

fabricated.source_excerpt =
  "StudyMed A cures every disease permanently";

const fabricatedResult = validateMedicationCandidates(
  {
    medicines: [
      medication(2, "2026-10-18", "discontinued"),
      fabricated
    ]
  },
  documents
);

assert.equal(fabricatedResult.accepted.length, 0);
assert.equal(fabricatedResult.rejected.length, 1);
assert.equal(
  fabricatedResult.rejected[0].result.reason,
  "unsupported_evidence"
);

console.log("PASS: Fabricated medication evidence rejected.");
