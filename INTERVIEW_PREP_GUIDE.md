# Senior Fullstack AI / Node.js (5-6 YOE) Interview Preparation Guide

---

## 🎯 Executive Summary & Senior Framing Strategy

When presenting your projects (**DevMeetup** + **RAG Engine**) in a senior-level interview, frame them as a **Unified Enterprise Platform**:

> *"I designed and built a Fullstack AI Developer Platform (`DevMeetup`) integrated with an Intelligent RAG-powered Knowledge Base. The architecture combines a Node.js/Express backend with Redis asynchronous job queuing (BullMQ), MongoDB query optimizations, and a LangChain + Pinecone + Gemini vector retrieval pipeline."*

---

## 1. Authentication & Security Core

### A. Authentication (AuthN) vs Authorization (AuthZ)
* **AuthN (Who are you?):** Identity verification via login credentials or OAuth.
* **AuthZ (What can you do?):** Permission checks (e.g., admin vs developer roles).

### B. Stateful (Sessions) vs Stateless (JWT)

| Feature | Stateful (Sessions) | Stateless (JWT) |
| :--- | :--- | :--- |
| **Storage** | Server RAM / Database / Redis session store. | Encoded in client payload. |
| **Identifier** | `sessionId` stored in browser cookie. | Signed JSON Web Token (JWT). |
| **Scalability** | Harder to scale (requires sticky sessions / central cache). | Highly scalable (verified statelessly via secret key). |

### C. Step-by-Step Standard JWT Flow
1. **Password Hashing:** Hash raw passwords with `bcrypt` (salt rounds: `10`).
2. **Credential Verification:** Look up user in DB and compare via `bcrypt.compare()`.
3. **Token Generation:** Sign payload (`userId`, `role`) with `process.env.JWT_SECRET` and expiration (`15m`).
4. **Delivery:** Send via `httpOnly`, `secure`, `sameSite` cookies to prevent XSS.
5. **Middleware Verification:** Intercept incoming request, call `jwt.verify(token, secret)`, attach decoded user to `req.user`.

---

## 2. Dual-Token Architecture & Redis Session Control

### A. Why Dual Tokens? (Access + Refresh)
* **Access Token (Short-lived: ~15 mins):** Used for fast, stateless API route authorization.
* **Refresh Token (Long-lived: ~7–30 days):** Used exclusively to request a new Access Token. Stored in Redis or HttpOnly cookie.

```
Client                      Server                    Redis / DB
  │                           │                           │
  ├── 1. POST /login ────────>│                           │
  │                           ├── 2. Sign Access & ──────>│ Store Refresh Token
  │                           │      Refresh Tokens       │ (Key: refresh:userId:id)
  │<── 3. Return Tokens ──────│                           │
  │                           │                           │
  ├── 4. POST /refresh ──────>│                           │
  │    (Refresh Cookie)       ├── 5. Verify & Check DB ──>│ Is token active & valid?
  │                           │<── 6. Valid ──────────────│
  │<── 7. New Access Token ───│                           │
```

### B. Redis Token Blacklisting (Instant Logout / Kill-Switch)
Because JWT access tokens are stateless, logging out normally doesn't prevent an attacker from using a stolen token before it expires.

**Redis Blacklist Pattern:**
1. On Logout, extract remaining TTL of current Access Token: `remainingTime = decoded.exp - Math.floor(Date.now() / 1000)`.
2. Save token signature in Redis: `redis.set(`bl:${token}`, 'true', 'EX', remainingTime)`.
3. In `authMiddleware`, perform a fast (~1ms) check: `await redis.get(`bl:${token}`)`. If found, reject with `401 Unauthorized`.

---

## 3. Deep-Dive into `dev-meet-up` Core APIs

### API 1: Connection Request (`POST /request/send/:status/:toUserId`)

* **Endpoint Goal:** Allows developers to express interest or ignore profiles.
* **Controller File:** `src/controllers/connectionController.js`

#### Key Architectural Highlights to Explain:
1. **Self-Request Prevention:** Rejects if `fromUserId.toString() === toUserId`.
2. **Status Whitelisting:** Enforces allowed values (`interested`, `ignored`).
3. **Mutual Duplicate Check (Double-Directional Query):**
   ```javascript
   const existingRequest = await ConnectionRequest.findOne({
     $or: [
       { fromUserId, toUserId },
       { fromUserId: toUserId, toUserId: fromUserId }
     ]
   });
   ```
4. **Asynchronous Background Job Queue (BullMQ + Redis):**
   * Sending SMTP emails synchronously blocks the HTTP thread (~1–2s delay).
   * **Solution:** Push email metadata to `emailQueue.add('connectionRequest', { ... })` and return `201 Created` immediately. Worker thread handles email delivery out-of-band.

---

### API 2: Developer Feed (`GET /feed`)

* **Endpoint Goal:** Returns recommended profiles for the logged-in user.
* **Controller File:** `src/controllers/feedController.js`

#### Key Architectural Highlights to Explain:
1. **Graph-Like Exclusion (`Set` + `$nin`):**
   * Fetches all existing connections/requests for `userId` (both `fromUserId` and `toUserId`).
   * Builds a `Set` of IDs to hide.
   * Queries MongoDB with `$nin` (Not In) and `$ne` (Not Equal):
     ```javascript
     const query = {
       _id: { $nin: [...hideUsersSet], $ne: userId }
     };
     ```
2. **Dynamic Search & Filtering:** Case-insensitive regex search on names (`$regex`) and skills array matching (`$in`).
3. **Offset Pagination:** Calculates `skip = (page - 1) * limit` and returns `hasMore` flag.

---

## 4. RAG Architecture & LLM Integration (`Lect12&13_RAG`)

### A. What is RAG?
Retrieval-Augmented Generation bridges external domain documents with LLMs to prevent hallucinations and eliminate outdated knowledge cutoff limitations without re-training models.

```
 INGESTION PIPELINE (indexing.js):
 Docs ──> Recursive Splitter ──> Gemini Embedding ──> Pinecone Vector Store
          (500 char chunks)     (gemini-embedding-001) (3072 dimensions)

 RETRIEVAL & GENERATION PIPELINE (query.js):
 Question ──> Vector Search ──> Top-K Chunks ──> Augment Prompt ──> Gemini LLM ──> Answer
```

### B. Two-Pipeline Implementation Details

1. **Ingestion & Indexing (`src/indexing.js`):**
   * Uses `RecursiveCharacterTextSplitter` with chunk overlap to preserve semantic context across boundaries.
   * Embeds chunks via `@google/genai` using model `gemini-embedding-001` with `taskType: 'RETRIEVAL_DOCUMENT'`.
   * Indexes vectors into **Pinecone** using `@langchain/pinecone` (`PineconeStore`).

2. **Query & Generation (`src/query.js`):**
   * Embeds user query with `taskType: 'RETRIEVAL_QUERY'`.
   * Runs similarity search via `PineconeStore.similaritySearch()` to pull Top $K$ ($K=3$) text chunks.
   * Injects chunks into `PromptTemplate` with anti-hallucination instructions.
   * Executes pipeline via **LangChain LCEL (`RunnableSequence`)**:
     ```javascript
     const chain = RunnableSequence.from([
       promptTemplate,
       chatModel,              // ChatGoogleGenerativeAI (Gemini)
       new StringOutputParser()
     ]);
     ```

### C. What Problem Did LangChain Solve?
1. **Automated Chunking:** `RecursiveCharacterTextSplitter` avoids manual text splitting bugs.
2. **Vector Store Abstraction:** `PineconeStore` automatically handles embedding + querying under one clean interface.
3. **LCEL Pipeline Composition:** `RunnableSequence` replaces nested callbacks with clean, declarative async pipelines.
4. **Model Agnosticism:** Easily swap Gemini for OpenAI without rewriting application logic.

---

## 5. Enterprise 2026 Senior Interview Blueprint (5-6 YOE)

Interview questions for a 5-6 YOE engineer at Big 4 / Service MNCs focus on 3 core pillars:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SENIOR INTERVIEW BREAKDOWN                      │
├──────────────────────────────┬──────────────────────────┬──────────────┤
│ 1. Core Backend & Node.js    │ 2. System Design & Scale │ 3. AI & RAG  │
│          (40%)               │          (30%)           │    (30%)     │
└──────────────────────────────┴──────────────────────────┴──────────────┘
```

### Pillar 1: Core Backend & Node.js (40%)
* **Event Loop:** Microtask Queue (`Promise`, `process.nextTick`) vs Macrotask Queue (`setTimeout`, `setImmediate`, `I/O`).
* **Concurrency:** Worker Threads (CPU-bound) vs Event Loop (I/O-bound) vs Clustering (Multi-process master/worker).
* **Database Performance:** MongoDB compound index optimization, aggregation pipelines, `$facet` for pagination + counting in 1 query.

### Pillar 2: System Design & Scalability (30%)
* **Asynchronous Offloading:** BullMQ + Redis for background queue processing and decoupling APIs from slow side-effects.
* **Session Revocation:** Redis blacklist with TTL for immediate access token invalidation.
* **Rate Limiting:** Sliding Window algorithm in Redis to prevent API abuse.

### Pillar 3: Production RAG & AI Engineering (30%)
* **Semantic Caching:** Redis vector cache layer to intercept identical queries ($0 cost, ~10ms latency).
* **Hybrid Search + Re-ranking:** BM25 keyword search + Dense Vector search combined with Cohere Re-ranker.
* **Prompt Guardrails:** System prompt constraints + evaluation metrics to eliminate hallucinations.
