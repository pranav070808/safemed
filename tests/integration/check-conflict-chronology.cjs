"use strict";

const assert = require("node:assert/strict");

const {
  validateMedicationStatusConflict
} = require("../../engine/evidence/validate-conflicts.cjs");

const historicalRecords = [
  {
    generic: "StudyMed A",
    status: "active",
    date: "2026-10-12",
    source_doc: 1
  },
  {
    generic: "StudyMed A",
    status: "discontinued",
    date: "2026-10-18",
    source_doc: 2
  }
];

const historicalResult =
  validateMedicationStatusConflict(historicalRecords);

assert.equal(historicalResult.valid, false);
assert.equal(historicalResult.reason, "different_dates");

console.log("PASS: Historical change is not a same-day conflict.");

const sameDayRecords = [
  {
    generic: "StudyMed A",
    status: "discontinued",
    date: "2026-10-18",
    source_doc: 2
  },
  {
    generic: "StudyMed A",
    status: "active",
    date: "2026-10-18",
    source_doc: 3
  }
];

const sameDayResult =
  validateMedicationStatusConflict(sameDayRecords);

assert.equal(sameDayResult.valid, true);

console.log("PASS: Same-day opposing statuses detected.");
