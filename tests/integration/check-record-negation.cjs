"use strict";

const assert = require("node:assert/strict");

const {
  validateMedicationRecord
} = require("../../engine/evidence/validate-records.cjs");

const record = {
  generic: "StudyMed A",
  date: "2026-10-18",
  status: "discontinued"
};

const misleadingExcerpt =
  "StudyMed A was not discontinued on 18 October 2026.";

const result = validateMedicationRecord(
  record,
  misleadingExcerpt
);

assert.equal(result.valid, false);

console.log(
  "PASS: Negated medication status rejected."
);
