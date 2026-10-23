const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { validateConflictEvidence } = require(
  "../../engine/evidence/validate-conflicts.cjs"
);

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
  }
];

const inventedConflict = {
  type: "contradictory_status",
  evidence: [
    {
      doc: 1,
      excerpt: "StudyMed A causes permanent organ damage"
    },
    {
      doc: 2,
      excerpt: "StudyMed A was discontinued"
    }
  ]
};

const result = validateConflictEvidence(
  inventedConflict,
  documents
);

assert.equal(result.valid, false);
assert.equal(result.reason, "unsupported_evidence");

console.log("PASS: Fabricated conflict evidence rejected.");

const sourceA = documents[0].text;
const sourceB = documents[1].text;

const genuineConflict = {
  type: "contradictory_status",
  evidence: [
    { doc: 1, excerpt: sourceA.trim() },
    { doc: 2, excerpt: sourceB.trim() }
  ]
};

const genuineResult = validateConflictEvidence(
  genuineConflict,
  documents
);

assert.equal(genuineResult.valid, true);
console.log("PASS: Genuine source evidence accepted.");

const wrongSourceConflict = {
  type: "contradictory_status",
  evidence: [
    { doc: 2, excerpt: sourceA.trim() },
    { doc: 1, excerpt: sourceB.trim() }
  ]
};

const wrongSourceResult = validateConflictEvidence(
  wrongSourceConflict,
  documents
);

assert.equal(wrongSourceResult.valid, false);
assert.equal(wrongSourceResult.reason, "unsupported_evidence");
console.log("PASS: Incorrect source attribution rejected.");

const missingEvidenceConflict = {
  type: "contradictory_status",
  evidence: [
    { doc: 1, excerpt: null },
    { doc: 2, excerpt: sourceB.trim() }
  ]
};

const missingResult = validateConflictEvidence(
  missingEvidenceConflict,
  documents
);

assert.equal(missingResult.valid, false);
assert.equal(missingResult.reason, "missing_evidence");
console.log("PASS: Missing conflict evidence rejected.");
