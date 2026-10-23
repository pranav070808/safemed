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

const candidate = {
  type: "contradictory_status",
  evidence: documents.map(doc => ({
    doc: doc.source_doc,
    excerpt: doc.text.trim()
  })),
  records: [
    {
      generic: "StudyMed A",
      status: "active",
      date: "2026-10-18",
      source_doc: 2
    },
    {
      generic: "StudyMed A",
      status: "discontinued",
      date: "2026-10-18",
      source_doc: 3
    }
  ]
};

const result = validateCandidateConflict(candidate, documents);

assert.equal(result.accepted, false);

console.log(
  "PASS: Unsupported medication statuses rejected despite genuine excerpts."
);
