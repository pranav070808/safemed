
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
      brand: "Brand Alpha",
      generic: "studymed-a",
      dose: "10 mg",
      status: "active",
      date: "2026-10-18",
      source_doc: 1,
      source_excerpt: ""
    },
    {
      brand: "Brand Beta",
      generic: "studymed-a",
      dose: "10 mg",
      status: "active",
      date: "2026-10-18",
      source_doc: 2,
      source_excerpt: ""
    }
  ],
  conflicts: []
};

context.enrichConflicts(result);

const duplicates = result.conflicts.filter(
  c => c.type === "duplicate_medicine"
);

const passed =
  duplicates.length === 1 &&
  duplicates[0].evidence.length === 2 &&
  duplicates[0].evidence.every(
    e => e.excerpt === null
  );

console.log("Duplicate warnings:", duplicates.length);
console.log(
  "Evidence:",
  JSON.stringify(duplicates[0]?.evidence ?? [])
);

if (passed) {
  console.log("PASS: Duplicate warning does not fabricate evidence.");
} else {
  console.error("FAIL: Duplicate warning contains fabricated evidence.");
  process.exitCode = 1;
}
