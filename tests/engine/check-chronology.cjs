
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
      status: "active",
      date: "2026-10-12",
      source_doc: 1,
      source_excerpt: "StudyMed A — active"
    },
    {
      brand: "StudyMed A",
      generic: "studymed-a",
      status: "discontinued",
      date: "2026-10-18",
      source_doc: 2,
      source_excerpt: "StudyMed A — discontinued"
    }
  ],
  conflicts: []
};

context.enrichConflicts(result);

const statusConflicts = result.conflicts.filter(
  c => c.type === "contradictory_status"
);

console.log("Chronological status conflicts:", statusConflicts.length);
console.log("Expected: 0");
console.log("Actual:", statusConflicts.length);

if (statusConflicts.length !== 0) {
  console.error("FAIL: Historical change incorrectly flagged.");
  process.exitCode = 1;
} else {
  console.log("PASS: Chronology respected.");
}
