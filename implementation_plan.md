# Implementation Plan: Semantic Networking Assistant (RAG Integration)

This document outlines the step-by-step plan to integrate an industry-level RAG pipeline into the `dev_meet_up` application. The goal is to build a "Semantic Profile Matcher" that allows users to find connections using natural language, complete with token tracking and RAG evaluation.

## ⚠️ User Review Required
Please review the proposed folder structure and the 4 phases below. If this aligns with your vision for the interview showcase, click **Proceed** to begin execution.

## ❓ Open Questions
1. **Database Sync:** Should we index *all* existing users right now, or just build the system so that new/updated profiles are indexed going forward?
2. **Token Tracking Storage:** Should we store token usage logs in MongoDB (for billing/analytics) or just log them to the console/file for now?

---

## 🏗️ Proposed AI Folder Structure
We will encapsulate all AI logic within a dedicated module in `dev_meet_up/src/` to maintain clean architecture.

```text
dev_meet_up/src/
 ├── ai/
 │    ├── config/           # Setup for Gemini, Pinecone, and LangChain callbacks
 │    ├── prompts/          # Externalized PromptTemplates (e.g., matchingPrompt.js)
 │    ├── services/         # Core business logic
 │    │    ├── indexer.js   # Logic to embed profiles and upsert to Pinecone
 │    │    └── matcher.js   # Logic to query Pinecone and generate responses
 │    ├── tracking/         # Token usage trackers (LangChain Callbacks)
 │    └── evaluation/       # Scripts/utils to evaluate RAG performance
 ├── controllers/
 │    └── aiController.js   # Express controller for the new AI endpoint
 └── routes/
      └── aiRoutes.js       # Defines POST /api/ai/match
```

---

## 🚀 Phase-Wise Implementation

### Phase 1: Foundation & Configuration
**Goal:** Set up the required packages, folder structure, and basic connections in `dev_meet_up`.
- [ ] Install AI dependencies (`@google/genai`, `@langchain/google-genai`, `@pinecone-database/pinecone`, `@langchain/core`).
- [ ] Create the `src/ai/` folder structure.
- [ ] Initialize the Pinecone client and Gemini model configuration.
- [ ] Create a custom LangChain Callback Handler in `src/ai/tracking/` to intercept LLM calls and log **Token Usage** (prompt tokens, completion tokens, total cost).

### Phase 2: The Indexing Pipeline (Data Ingestion)
**Goal:** Convert developer profiles into embeddings and store them in Pinecone.
- [ ] Create `src/ai/services/indexer.js`.
- [ ] Write a function `indexUserProfile(user)` that takes a user's skills and bio, converts them to text, and creates a LangChain `Document`.
- [ ] Generate embeddings using Gemini and upsert them to Pinecone, attaching the `userId` as metadata.
- *(Note: In a full production system, this function would be triggered by a BullMQ background job whenever a user updates their profile).*

### Phase 3: The Querying Pipeline & API (Retrieval + Generation)
**Goal:** Build the user-facing API that handles semantic search and generates recommendations.
- [ ] Create `src/ai/prompts/matchingPrompt.js` to store the instructions for the AI (e.g., "Given these user profiles, explain why they are a good match for the query").
- [ ] Create `src/ai/services/matcher.js`.
  - Step A: Embed the user's natural language query.
  - Step B: Perform a similarity search on Pinecone to get the top 5 matching profiles.
  - Step C: Send the context and query to Gemini (with the Token Tracking callback attached).
- [ ] Create `aiController.js` and `aiRoutes.js` to expose `POST /api/ai/match`.
- [ ] Wire the route into the main Express `app.js`.

### Phase 4: RAG Evaluation Setup
**Goal:** Prove the system's reliability by implementing evaluation scripts (a massive plus for senior interviews).
- [ ] Create an evaluation utility `src/ai/evaluation/evaluator.js`.
- [ ] Implement a **Context Precision Check**: A function that manually reviews if the retrieved Pinecone documents actually contain the keywords related to the user's query.
- [ ] Implement an **Answer Faithfulness Check**: A small secondary LLM call that asks: *"Did the generated answer hallucinate any skills that are not present in the provided context?"*
- [ ] Write a sample script to run these evaluations on a test dataset.

---

## 🧪 Verification Plan
1. **Unit Test:** Manually run the indexer on 3 dummy profiles.
2. **API Test:** Use Postman or curl to hit `POST /api/ai/match` and verify it returns a valid AI response.
3. **Telemetry Check:** Verify that the console outputs the exact token count and estimated cost for the request.
4. **Evaluation Run:** Run the evaluation script to ensure the AI gets a passing score on faithfulness.
