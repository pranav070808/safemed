# SafeMed frontend plan

## Product approach
A plain-local React + TypeScript Vite MVP presents a synthetic medication reconciliation workspace for patient SM001. It uses local component state only; there is no backend, AI call, persistence, or external integration.

## Design direction
- **Selected movement:** Quiet clinical operations console: calm, high-trust, information-dense, and approachable.
- **Principles:** clear hierarchy, evidence before interpretation, explicit uncertainty, and fast human review.
- **Color philosophy:** deep navy anchors trust and navigation; teal marks verified workflow progress; amber/coral reserve attention for conflicts and missing evidence.
- **Layout paradigm:** left rail + airy workbench with a persistent patient context band and stacked evidence panels.
- **Signature elements:** stage rail, evidence lineage chips, and review-state ribbons.
- **Interaction:** reversible demo actions update visible state and append a local audit event; no data is saved.
- **Typography:** Inter/system sans for operational UI, compact uppercase labels for metadata, generous numeric spacing.
- **Brand essence:** SafeMed makes medication history review legible before it becomes actionable; calm, explicit, accountable.

## Structure
`src/App.tsx` owns the demo data and orchestration. Reusable UI is composed through `StageRail`, `EvidenceCard`, `ReviewPanel`, `AuditTimeline`, and `StatusPill` components in the same source module for easy transfer. `src/styles.css` contains responsive layout and theme tokens. `public/manus-routes.json` declares the two supported page routes.
