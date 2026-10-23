
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
      source_excerpt: ""
    },
    {
      brand: "StudyMed A",
      generic: "studymed-a",
      status: "active",
      date: "2026-10-18",
      source_doc: 3,
      source_excerpt: ""
    }
  ],
  conflicts: []
};

context.enrichConflicts(result);

const conflicts = result.conflicts.filter(
  c => c.type === "contradictory_status"
);

const conflict = conflicts[0];

const passed =
  conflicts.length === 1 &&
  conflict.evidence.length === 2 &&
  conflict.evidence.every(e => e.excerpt === null);

console.log("Conflicts detected:", conflicts.length);
console.log(
  "Evidence:",
  JSON.stringify(conflict?.evidence ?? [])
);

if (passed) {
  console.log("PASS: Missing excerpts are not fabricated.");
} else {
  console.error("FAIL: Evidence integrity violation.");
  process.exitCode = 1;
}
