# SafeMed architecture (proposal)

```text
React + TypeScript
      │ Supabase client (anon key; authenticated user)
      ├── Auth + row-scoped PostgreSQL access
      ├── Private Storage bucket (documents)
      └── Edge Function (server-only xAI key)
               │
               ├── parse supported text / PDF input
               ├── extract candidate facts with source excerpts
               └── validate structured output before persistence

Deterministic conflict engine
      ├── normalize fact type/value/status
      ├── compare dates and source statements
      └── return chronology, possible conflicts, and unknowns

Review UI → reviews + append-only audit events
```

## Trust boundaries

- Browser: publishable Supabase key only. Never include xAI or service-role credentials.
- Edge Function: validate authenticated user and patient/document access before reading records; call xAI; validate response schema; reject unsupported claims; keep logs free of document contents and secrets.
- Database and Storage: enable RLS and private buckets. Read access must require patient ownership or an explicitly modeled authorization. Service-role access bypasses RLS and stays server-side.
- Audit: write review actions as append-only events. Do not let a client edit or delete prior audit entries.
- Records: retain source documents and excerpts. Store AI output as unverified candidate facts, not clinical truth.

## Proposed data model

See [`../supabase/migrations/202610230001_initial_schema.sql`](../supabase/migrations/202610230001_initial_schema.sql). Confirm policies against the final auth and sharing model before using real data (real data is outside this demo scope).

## Extraction contract

See [`api-contract.md`](api-contract.md). Every fact must carry a document ID and exact excerpt; page and offsets are optional when the source format provides them. Missing fields stay null/unknown; the model must not infer them.
