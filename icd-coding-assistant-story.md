# ICD Coding Assistant — Project Story (Senior Level)

**Stack:** Node.js · Express · MongoDB · Pinecone · Gemini · Redis/BullMQ · S3 · OCR

> Open preview in VS Code: `Ctrl + Shift + V`

---

## 0. How to use this doc

- Section 1 = say this first (30 sec)
- Section 2 = full story (2 min)
- Sections 3–12 = deep details when they dig in
- Section 13 = challenges (STAR format)
- Section 15 = interview questions with answers
- Section 16 = numbers cheat sheet (keep them the same every time)

---

## 1. 30-second pitch

> "I built an AI-assisted ICD-10 coding system for home health agencies. Nurses upload referral documents and faxes, the system OCRs them, indexes them into Pinecone, and when the nurse fills the OASIS assessment, a RAG pipeline on Gemini suggests diagnosis codes with evidence from the patient's own documents. If a key detail is missing, it asks one follow-up question instead of guessing. It is built on Node.js and Express, with MongoDB, BullMQ workers on Redis, and Pinecone for hybrid search. It is multi-tenant and HIPAA-compliant, and every AI output is validated against the official ICD-10 code set before the nurse sees it."

---

## 2. Two-minute story

1. **Problem**
   - Home health nurses fill the OASIS form for every patient and must pick correct ICD-10 codes
   - It is slow (20–30 min per patient) and errors cause claim denials
2. **What I built**
   - An ingestion pipeline: upload → OCR → chunk → embed → Pinecone
   - A coding service: form data + retrieved evidence → Gemini → validated codes with citations
3. **Key design decisions**
   - Async pipeline with BullMQ so uploads never block the API
   - Pinecone namespace per agency for tenant isolation, plus a metadata filter per patient
   - Hybrid search (dense + sparse) + reranker, because medical text has exact terms like drug names and codes
   - Gemini structured output + Zod validation + ICD code-set check, so no hallucinated codes reach the user
   - Model routing: Flash for most cases, Pro only for complex or low-confidence cases
4. **Hard problems I solved**
   - Jobs marked "done" before indexing finished → fixed with BullMQ parent/child flows
   - LLM inventing codes → validation layer + citations
   - Cost growth → routing, caching, smaller embeddings
5. **Result**
   - Code suggestions in a few seconds, nurses accept most suggestions, fewer denials
   - An evaluation suite runs in CI on every prompt change

---

## 3. Requirements

### Functional
- Upload PDF / image / fax documents per patient
- Show upload and processing progress live
- Suggest ICD-10 codes: primary + secondary, with confidence and reason
- Show **evidence** (which document and which line) for each code
- Ask **one follow-up question** when a key detail is missing
- Keep a history of each coding session
- Nurse can accept / reject / edit each code (feedback loop)

### Non-functional
- **Multi-tenant:** many agencies; data must never mix
- **HIPAA:** encryption, audit logs, no PHI in logs, BAAs with vendors
- **Latency:** coding response p95 < 8 sec; first streamed token < 2 sec
- **Reliability:** no lost uploads; retries; failed jobs are visible
- **Cost control:** track token cost per agency
- **Scalable:** workers scale separately from the API

---

## 4. High-level architecture

```
                  ┌──────────────┐
  React app ────► │  API Gateway │  (Express, JWT, rate limit, request-id)
                  └──────┬───────┘
          ┌──────────────┼──────────────────────┐
          ▼              ▼                      ▼
   Upload Service   Coding Service        Session/History API
          │              │                      │
   S3 (pre-signed)       │                      │
          │              │                      ▼
          ▼              │                  MongoDB
   MongoDB (document     │         (documents, sessions, audit,
   status + outbox)      │          prompts, icd_codes, feedback)
          │              │
          ▼              │
   Redis + BullMQ ◄──────┘ (cache, rate limits)
          │
   ┌──────┴─────────────────────────────┐
   ▼            ▼            ▼          ▼
 OCR worker  Chunk worker  Embed worker  Index worker
 (Gemini     (section-     (Gemini       (Pinecone
  vision +    aware)        embeddings)   upsert)
  Doc AI
  fallback)
                                          ▼
                                      Pinecone
                              (dense + sparse indexes,
                               namespace per agency)

 Coding Service ──► Pinecone (hybrid search) ──► Reranker
               ──► Gemini (structured JSON)  ──► Validator (Zod + ICD table)
               ──► SSE stream back to UI

 Observability: OpenTelemetry traces · pino logs · LLM tracing (Langfuse)
```

---

## 5. Tech stack and why

| Part | Choice | Why |
|---|---|---|
| API | Node.js 22 + Express 5 + TypeScript | Team skill, fast I/O, huge ecosystem, TS for safety |
| Validation | Zod | One schema for API input **and** LLM output |
| Main DB | MongoDB Atlas | Clinical documents are nested and change shape by source; flexible schema; Atlas has HIPAA support |
| Queue | BullMQ on Redis | Retries, backoff, priorities, parent/child flows, dashboard |
| Cache / sessions | Redis | Fast; TTL for short-lived chat state |
| File storage | S3 (KMS-encrypted) | Cheap, durable, pre-signed uploads |
| Vector DB | Pinecone serverless | Managed, scales without ops, namespaces, sparse + dense, hosted reranker |
| LLM | Gemini Flash + Gemini Pro | Flash = cheap and fast; Pro = hard cases; long context; native PDF/image input; JSON schema output |
| Embeddings | Gemini embedding model (768 dims) | Same vendor/BAA; task types for doc vs query; smaller dims save cost |
| OCR | Gemini vision (primary) + Google Document AI (fallback) | Handles messy faxes and tables; fallback when quality is low |
| Observability | OpenTelemetry, pino, Langfuse | Trace one request across API → queue → LLM |
| Deploy | Docker, Kubernetes (EKS/GKE), GitHub Actions | API and workers scale separately |

---

## 6. Code structure (shows senior thinking)

```
apps/
  api/                    # Express app
    src/
      routes/             # only HTTP wiring
      controllers/        # parse request, call service, send response
      services/           # business logic (coding, upload)
      repositories/       # all MongoDB access
      middlewares/        # auth, tenant, rate-limit, error handler, request-id
  workers/
    ocr.worker.ts
    chunk.worker.ts
    embed.worker.ts
    index.worker.ts
packages/
  llm/                    # thin Gemini client: retries, timeouts, routing, cost tracking
  rag/                    # retriever, hybrid merge, reranker
  prompts/                # versioned prompt templates
  schemas/                # Zod schemas shared by API + workers
  observability/          # logger, tracer
evals/                    # golden dataset + eval runner (runs in CI)
```

- **Rule:** controllers never talk to the DB, services never know about HTTP
- **Thin LLM wrapper**, no heavy framework → easy to switch models, easy to test

---

## 7. Flow A — Document ingestion (step by step)

1. **Get upload URL**
   - `POST /v1/documents/upload-url` → backend returns a **pre-signed S3 URL**
   - The browser uploads directly to S3 → the API server never handles big files
2. **Confirm upload**
   - `POST /v1/documents` with `{ patientId, s3Key, docType, sha256 }`
   - **Idempotency:** if the same `sha256` already exists for this patient → return the existing document (no duplicate processing)
3. **Save + outbox (one transaction)**
   - Insert `documents` row with `status: "QUEUED"`
   - Insert `outbox` event in the **same MongoDB transaction**
   - An outbox relay (Mongo change stream) pushes the event to BullMQ
   - **Why:** never have "row saved but job lost" or "job created but row missing"
4. **BullMQ flow (parent + children)**
   - Parent job: `index-document`
   - Children run in order: `ocr → chunk → embed → upsert`
   - The parent completes **only when all children succeed** → status becomes `READY`
5. **OCR worker**
   - Send the PDF pages to Gemini vision → get text + tables as structured JSON
   - Compute a **quality score** (empty pages, garbage characters, low confidence)
   - If the score is low → retry with Document AI
   - Save the raw OCR output to S3 (so we can re-chunk later without re-OCR)
6. **Chunk worker**
   - **Section-aware chunking:** split on clinical headings (Diagnoses, Medications, History, Assessment, Plan)
   - Target ~500 tokens, ~50 overlap; tables stay whole
   - Every chunk gets metadata: `tenantId, patientId, documentId, docType, section, page, docDate`
7. **Embed worker**
   - Batch chunks (e.g. 100 per call) → Gemini embeddings with task type `RETRIEVAL_DOCUMENT`
   - Also build **sparse vectors** for keyword search
8. **Index worker**
   - Upsert into Pinecone: namespace = `tenantId`
   - Vector ID = `documentId#chunkNo` → re-running is safe (idempotent)
9. **Progress to UI**
   - Each step updates the job progress → the UI gets it via **SSE** (or polling as a fallback)
10. **Failure handling**
    - Retries with exponential backoff (3–5 tries)
    - After that → **dead-letter queue** + `status: "FAILED"` + alert
    - Ops can replay a DLQ job with one click

---

## 8. Flow B — ICD coding (RAG + LLM)

1. **Request**
   - `POST /v1/coding-sessions` with `{ patientId, formType, formAnswers }`
   - Auth middleware checks JWT → tenant middleware sets `tenantId` → RBAC check (nurse must be assigned to this patient)
2. **Cache check**
   - Key = hash(patientId + form answers + latest document version + prompt version)
   - Hit → return the cached result instantly
3. **Build the search query**
   - Keep only diagnosis-relevant form fields
   - Use Gemini Flash to rewrite them into 2–3 short search queries (query expansion), e.g. "diabetes type and complications", "wound location and stage"
4. **Hybrid retrieval (Pinecone)**
   - Dense search (meaning) + sparse search (exact words) in the tenant namespace
   - **Metadata filter:** `patientId = X`, optional `docDate >= last 90 days`
   - Top 30 from each → merge with **Reciprocal Rank Fusion**
5. **Rerank**
   - Pinecone hosted reranker → keep the **top 8** chunks
6. **Prompt**
   - Versioned template from `prompts/icd-coding@v7`
   - Sections: coding rules → form answers → evidence chunks (each with an ID like `[C3]`)
   - Rule: "every code must cite at least one evidence ID; if a key detail is missing, ask one question"
7. **Model routing**
   - Default: **Gemini Flash**
   - Switch to **Gemini Pro** when: many diagnoses, conflicting evidence, or Flash returns low confidence
8. **Structured output**
   - Gemini called with `responseMimeType: application/json` + `responseSchema`
   - Low temperature (e.g. 0.1–0.2)
9. **Validation layer (the most important part)**
   - Zod-parse the JSON → if it fails, one repair retry
   - Check each code against the **official ICD-10-CM table** stored in MongoDB (valid + billable)
   - Check each cited evidence ID actually exists in the retrieved chunks
   - Business rules: max one primary code, no "manifestation" code as primary
   - Invalid code → drop it and log it (never show it to the nurse)
10. **Response**
    - Streamed back via **SSE**: status → codes → evidence
    - Two result types:
      - `complete` → codes with role, confidence, reason, evidence
      - `needs_clarification` → one question + options
11. **Follow-up turn**
    - `POST /v1/coding-sessions/:id/answer` with the chosen option
    - Session state: Redis (fast, TTL 2 hours) + MongoDB (permanent history/audit)
    - Only a **compact summary** of earlier turns is sent back to the model → fewer tokens
12. **Feedback**
    - Nurse accepts / rejects / edits each code → saved in `feedback`
    - This feeds the evaluation dataset and quality dashboards

---

## 9. MongoDB data model

**`documents`**
```json
{
  "_id": "doc_123",
  "tenantId": "agency_42",
  "patientId": "pat_9",
  "s3Key": "agency_42/pat_9/doc_123.pdf",
  "sha256": "ab12...",
  "docType": "DISCHARGE_SUMMARY",
  "status": "READY",
  "pages": 14,
  "ocr": { "engine": "gemini", "qualityScore": 0.93 },
  "chunkCount": 38,
  "embeddingModel": "gemini-embedding@768",
  "createdAt": "2026-03-02T10:00:00Z"
}
```
- Indexes: `{tenantId, patientId, createdAt}`, unique `{tenantId, patientId, sha256}`

**`coding_sessions`**
```json
{
  "_id": "cs_77",
  "tenantId": "agency_42",
  "patientId": "pat_9",
  "formType": "SOC",
  "promptVersion": "icd-coding@v7",
  "model": "gemini-flash",
  "status": "complete",
  "turns": [
    { "role": "assistant", "type": "needs_clarification", "question": "Type 1 or Type 2 diabetes?" },
    { "role": "user", "answer": "Type 2" }
  ],
  "result": {
    "codes": [
      { "code": "E11.622", "role": "primary", "confidence": "high", "evidence": ["C3", "C5"] }
    ]
  },
  "usage": { "inputTokens": 5200, "outputTokens": 410, "costUsd": 0.004 },
  "createdAt": "2026-03-02T10:05:00Z"
}
```
- Index: `{tenantId, patientId, createdAt}`

**Other collections**
- `icd_codes` — official code table (code, title, billable, valid-from year)
- `prompts` — prompt templates with version + active flag
- `feedback` — accept / reject / edit per code
- `audit_logs` — who viewed/changed what, when (append-only, TTL = 6+ years)
- `outbox` — events waiting to be pushed to the queue

**Why MongoDB here**
- OCR output, EHR data and AI results are nested JSON that changes shape → document model fits
- Transactions are available when needed (document + outbox)

---

## 10. Pinecone design

- **Serverless**, two indexes: one **dense** (768 dims, cosine) + one **sparse** (keyword)
- **Namespace = tenantId** → hard isolation between agencies, and fast delete of a whole tenant
- **Metadata filter = patientId** (+ docType, docDate) → a search only sees one patient
- **Vector ID** = `documentId#chunkNo` → safe re-upserts
- **Metadata stored:** ids, section, page, docDate, short text preview (full text lives in MongoDB/S3, not in Pinecone → less PHI in the vector DB)
- **Delete flow:** patient deleted → delete by ID prefix in the namespace + Mongo + S3 (right-to-delete)
- **Re-embedding plan:** new embedding model → write to a new index in the background, switch the read alias, then delete the old one (zero downtime)

---

## 11. Security & HIPAA

- **BAAs** signed with Google Cloud (Gemini/Vertex AI), Pinecone, MongoDB Atlas, AWS
- Use Gemini through **Vertex AI** (enterprise terms, data not used for training)
- **Encryption:** TLS in transit; KMS at rest (S3, Mongo, Pinecone)
- **Tenant isolation at 3 layers:** JWT claim → middleware → every Mongo query and Pinecone namespace
- **RBAC:** nurse, coder, admin; a nurse only sees assigned patients
- **No PHI in logs:** pino redaction for names, DOB, MRN; prompts in traces are masked
- **Audit log** for every read of PHI and every AI suggestion accepted
- **Pre-signed URLs** expire in 5 minutes
- **Secrets** in a secret manager, never in `.env` in production
- **Rate limiting** per user and per tenant (Redis) → protects cost and the API

---

## 12. Observability, evaluation, cost

### Observability
- **OpenTelemetry trace** from API → queue → worker → Gemini → Pinecone (one `traceId`)
- **Dashboards:** p50/p95 latency, queue depth, job failure rate, DLQ size
- **LLM tracing (Langfuse):** prompt version, model, tokens, cost, latency per call
- **Alerts:** DLQ growing, Gemini error rate > 2%, p95 latency above target

### Evaluation (this is what makes it "senior")
- **Golden dataset:** ~300 real de-identified charts coded by certified coders
- **Offline metrics:**
  - Retrieval: recall@8 (did we fetch the chunks that support the right codes?)
  - Coding: precision and recall of codes, primary code accuracy
  - Safety: invalid-code rate (must be 0 after validation)
- **CI gate:** any prompt or model change runs the eval; merge is blocked if accuracy drops
- **Online metrics:** nurse acceptance rate, edit rate, follow-up rate

### Cost control
- Flash by default, Pro only when needed
- **Context caching** for the long fixed coding-rules part of the prompt
- Result cache by input hash
- 768-dim embeddings instead of full size → cheaper storage, almost the same quality
- Batch embeddings in workers
- Per-tenant cost report from the `usage` field

---

## 13. Challenges (tell 2–3, STAR style)

### 1. Documents showed "Ready" before they were searchable
- **Situation:** Nurses uploaded a fax, saw "Completed", asked for codes, and got results without the new document.
- **Cause:** The first version marked the job done after OCR, while embedding ran separately.
- **Action:** Rebuilt the pipeline as a **BullMQ parent/child flow**. The parent finishes only when OCR, chunk, embed and upsert all succeed. Status comes from the flow, not a timer.
- **Result:** "Ready" now really means searchable; support tickets about "missing documents" stopped.

### 2. The LLM suggested codes that don't exist
- **Situation:** ~3–4% of early responses had wrong or non-billable codes.
- **Action:**
  - Gemini JSON schema output
  - Zod validation
  - Every code checked against the official ICD-10-CM table
  - Every code must cite evidence
- **Result:** Invalid codes shown to users dropped to **zero**; wrong ones are logged and fed into the eval set.

### 3. Retrieval missed exact terms
- **Situation:** Pure vector search missed things like "E11.9", "Eliquis", "stage 3 pressure ulcer".
- **Action:** Added **sparse (keyword) search + RRF merge + reranker**, plus section-aware chunking.
- **Result:** Retrieval recall@8 went from ~0.72 to ~0.90 on the golden set.

### 4. Cost grew fast with more agencies
- **Action:** Model routing (Flash/Pro), context caching for the fixed rules, result caching, compact follow-up history.
- **Result:** Cost per coding session dropped by about 60% with no drop in accuracy.

### 5. Bad OCR on faxes
- **Situation:** Low-quality faxes gave garbage text → bad codes.
- **Action:** OCR quality score + fallback engine + a warning in the UI ("document quality low, please verify").
- **Result:** Nurses know when to trust the output; fewer silent errors.

---

## 14. Trade-offs I made (and why)

- **Pinecone vs pgvector / Atlas Vector Search**
  - Picked Pinecone: managed, serverless scaling, namespaces, sparse + hosted reranker
  - Trade-off: one more vendor and data copy → kept only minimal text in Pinecone
- **No heavy LLM framework**
  - A thin in-house client is easier to debug, test and switch models
  - Trade-off: wrote retry and routing logic ourselves
- **One follow-up question at a time**
  - Better user experience and fewer wrong guesses
  - Trade-off: sometimes 2 round trips
- **Async ingestion**
  - Trade-off: extra complexity (queues, status) but API stays fast and reliable
- **Namespace per tenant, not index per tenant**
  - Cheaper and simpler; still hard isolation for search

---

## 15. Interview questions with answers

1. **Why RAG and not fine-tuning?**
   - Patient data changes every day and differs per patient; RAG uses fresh data with citations. Fine-tuning can't know a specific patient and can't show evidence.
2. **How do you stop hallucination?**
   - Grounding in retrieved chunks, required citations, JSON schema, Zod, ICD table check, human approval by the nurse.
3. **How did you choose chunk size?**
   - Tested 300 / 500 / 800 tokens on the golden set; 500 with section boundaries gave the best recall. Tables are never split.
4. **How do you guarantee tenant isolation?**
   - JWT tenant claim → middleware → every repository query takes `tenantId` → Pinecone namespace per tenant. Plus tests that try cross-tenant access.
5. **What if Gemini is down or slow?**
   - Timeouts, retries with backoff, circuit breaker; fall back from Pro to Flash; if both fail, the UI says "suggestions unavailable" and the nurse codes manually. Ingestion jobs just wait in the queue.
6. **How do you avoid duplicate processing?**
   - File hash unique index, idempotent job IDs, deterministic vector IDs.
7. **How does the upload not block the server?**
   - Pre-signed S3 upload from the browser; all heavy work in workers.
8. **How do you scale?**
   - API pods scale on CPU/requests; workers scale on **queue depth**; Pinecone serverless and Atlas scale on their own.
9. **Why MongoDB and not Postgres?**
   - Nested, changing clinical JSON; fast development. If I needed heavy reporting joins, I'd add a warehouse (BigQuery) via change streams.
10. **How do you measure quality?**
    - Offline golden set in CI + online acceptance rate + LLM traces.
11. **How do you handle a prompt change safely?**
    - Prompts are versioned in DB; new version runs eval; then canary to 10% of tenants; compare acceptance rate; roll out or roll back.
12. **How do you handle PHI in prompts and logs?**
    - Vertex AI with BAA, no training on data; logs redacted; traces masked; audit logs for access.
13. **What would you improve next?**
    - Agentic flow to also check OASIS answers for consistency, a fine-tuned reranker on our feedback data, and a coder review queue for low-confidence cases.
14. **Why streaming (SSE)?**
    - The user sees progress in < 2 sec; perceived latency drops a lot even when the full answer takes 5–6 sec.
15. **How do you re-embed millions of chunks when the model changes?**
    - Background job writes to a new index, then switch the read alias, then delete the old one. Zero downtime.

---

## 16. Numbers cheat sheet (use the same numbers every time)

| Metric | Value |
|---|---|
| Agencies (tenants) | ~40 |
| Documents processed | ~8,000 / day |
| Chunks in Pinecone | ~12 million |
| Ingestion time (10-page doc) | ~40–60 sec |
| Coding p95 latency | ~6 sec (first token < 2 sec) |
| Top-K | 30 + 30 retrieved → top 8 after rerank |
| Chunk size | ~500 tokens, 50 overlap |
| Embedding dims | 768 |
| Code acceptance rate | ~80% |
| Retrieval recall@8 | 0.72 → 0.90 |
| Cost per session | down ~60% |
| Team | 5 engineers (2 backend, 1 AI, 1 frontend, 1 QA) |

---

## 17. Simple glossary (if you blank out)

- **RAG:** search the patient's documents first, then give the found text to the LLM to answer from
- **Embedding:** a list of numbers that represents the meaning of text
- **Dense vs sparse search:** meaning-based vs exact-word-based
- **RRF (Reciprocal Rank Fusion):** merge two ranked lists; items high in both lists win
- **Reranker:** a smarter model that re-orders the top results by relevance
- **Namespace:** a separate partition inside a Pinecone index
- **Outbox pattern:** save the DB change and the "send job" event in one transaction, send the event later
- **Idempotent:** running the same thing twice gives the same result, no duplicates
- **DLQ (dead-letter queue):** where jobs go after all retries fail
- **Circuit breaker:** stop calling a failing service for a while so the system doesn't pile up errors
- **SSE:** server pushes updates to the browser over one HTTP connection
