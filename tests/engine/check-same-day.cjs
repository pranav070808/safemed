
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(
  "engine/engine.js",
  "utf8"
);

const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const result = {
  medicines: [
    {
      brand: "StudyMed A",
      generic: "studymed-a",
      status: "discontinued",
      date: "2026-10-18",
      source_doc: 2,
      source_excerpt: "StudyMed A discontinued"
    },
    {
      brand: "StudyMed A",
      generic: "studymed-a",
      status: "active",
      date: "2026-10-18",
      source_doc: 3,
      source_excerpt: "StudyMed A active"
    }
  ],
  conflicts: []
};

context.enrichConflicts(result);

const conflicts = result.conflicts.filter(
  c => c.type === "contradictory_status"
);

console.log("Same-day conflicts:", conflicts.length);
console.log("Expected: 1");

const conflict = conflicts[0];

const passed =
  conflicts.length === 1 &&
  conflict.record_date === "2026-10-18" &&
  conflict.evidence.length === 2 &&
  conflict.evidence.some(
    e => e.doc === 2 &&
    e.excerpt === "StudyMed A discontinued"
  ) &&
  conflict.evidence.some(
    e => e.doc === 3 &&
    e.excerpt === "StudyMed A active"
  );

if (passed) {
  console.log("PASS: Same-day discrepancy detected with evidence.");
} else {
  console.error("FAIL: Conflict detection or evidence incorrect.");
  process.exitCode = 1;
}
