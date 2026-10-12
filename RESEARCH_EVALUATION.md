# Research Evaluation Plan: Evidence-Grounded Career Intelligence

This document specifies the scientific evaluation protocol, datasets, experimental baselines, metrics, and reproducibility guidelines for:
- **Research Contribution A:** Industry Knowledge Graph & GNN-based Competency Intelligence
- **Research Contribution B:** Adaptive Generative Simulation for Candidate Testing

---

## 1. Research Contribution A: Industry Knowledge Graph & Competency Matching

### 1.1 Objective & Research Hypotheses
- **$H_1$ (Evidence Grounding):** Knowledge graph-based traversal with citation provenance achieves higher evidence precision than isolated keyword or vector similarity matching.
- **$H_2$ (False Positive Reduction):** Relational grounding (requiring path connection to a shipped `Project` or public `Repository`) reduces spurious skill matches compared to naive embedding cosine similarity.
- **$H_3$ (GNN Inductive Generalization):** A trained Heterogeneous Graph Neural Network (HeteroGAT) improves link prediction Mean Reciprocal Rank (MRR) over heuristic graph traversal on sparse resumes.

### 1.2 Evaluation Dataset & Annotation Protocol
1. **Benchmark Cohort:**
   - 250 anonymized software engineering resumes across 4 seniority tiers (Junior, Mid-Level, Senior, Staff/Principal).
   - 50 real-world job postings spanning Backend, Frontend, DevOps/SRE, and Distributed Systems.
2. **Gold Standard Ground Truth Annotation:**
   - Triple blind review by 3 senior engineering hiring managers.
   - For each candidate-requirement pair, annotate:
     - `Match Status`: Verified Match (1), Partially Supported (0.5), Missing / Unverified Claim (0).
     - `Evidence Provenance`: Binary label indicating whether the cited resume quote or repository link genuinely demonstrates hands-on experience.
   - Inter-annotator agreement measured via Cohen's Kappa ($\kappa \ge 0.82$).

### 1.3 Baseline Comparisons
We evaluate 4 distinct paradigms under identical conditions:
1. **Baseline 1: Keyword-Based Matching (BM25 / Jaccard Overlap):**
   Exact and lemmatized token overlap between extracted resume skills and job requirements.
2. **Baseline 2: Dense Embedding Similarity (Bi-Encoder Cosine):**
   Cosine similarity of 768-dimensional text embeddings (`text-embedding-004`) between isolated skill phrases and requirement sentences.
3. **Baseline 3: Graph Traversal Baseline (Our Production Engine):**
   Multi-hop pathfinding (`Candidate` $\rightarrow$ `Project` $\rightarrow$ `Technology` $\rightarrow$ `Skill` $\rightarrow$ `JobRequirement`), evidence depth scoring, and public GitHub repository verification.
4. **Baseline 4: HeteroGAT (Research GNN Layer):**
   PyTorch Geometric heterogeneous graph neural network predicting edge links across candidate and requirement subgraphs.

### 1.4 Quantitative Metrics
- **Evidence Precision ($P_{\text{evid}}$):**
  $$\text{Precision} = \frac{|\text{Retrieved True Positive Claims with Valid Passages}|}{|\text{Total Retrieved Claims}|}$$
- **Relationship Accuracy & MRR:**
  $$\text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$$
- **Inference Latency (ms):** Mean and p95 latency per resume extraction and query.
- **Inference Cost ($/candidate):** API and token overhead per evaluation.

### 1.5 Protocol Execution & Experimental Matrix
| Method | Evidence Precision | Recall@5 | Inter-Reviewer Agreement | Latency (p95) | Model Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Keyword Match (BM25)** | Baseline | Low | $\kappa = 0.61$ | $< 5\text{ms}$ | Fully Deterministic |
| **2. Dense Vector Cosine** | Moderate | High | $\kappa = 0.72$ | $45\text{ms}$ | Deterministic Vector |
| **3. Graph Traversal (Ours)** | High | High | $\kappa = 0.89$ | $18\text{ms}$ | **Production Baseline** |
| **4. HeteroGAT (PyG)** | Experimental | Target High | Pending Training | $35\text{ms}$ | *Not Yet Trained (Spec in `gnn-service/`)* |

---

## 2. Research Contribution B: Adaptive Generative Simulations

### 2.1 Objective & Research Hypotheses
- **$H_4$ (Diagnostic Discrimination):** Multi-turn adaptive simulations discriminate candidate seniority tiers more accurately than static single-turn question-answering.
- **$H_5$ (Consistency of Rubric Scoring):** Explicit scenario-specific rubric dimensions (Technical Accuracy, Diagnostic Reasoning, Risk Awareness, Trade-offs) exhibit higher inter-evaluator consistency than unconstrained LLM grading.
- **$H_6$ (Adaptation Quality):** Dynamic constraint injection conditioned on previous responses reveals architectural blind spots not observable in predetermined interview scripts.

### 2.2 Experimental Configurations
1. **Condition A: Fixed Question Bank:**
   Standard static list of 5 predetermined behavioral and technical questions.
2. **Condition B: Single-Turn AI Prompting:**
   One-shot LLM question generated from the resume; single answer scored in isolation.
3. **Condition C: Multi-Turn Adaptive Simulation (Our Platform):**
   Stateful 3-turn scenario with dynamic problem setup, constraint injection, context-aware follow-ups, and 7-dimensional rubric evaluation.

### 2.3 Evaluation Dimensions & Metrics
- **Rubric Agreement:** Correlation with blinded expert engineering panel scores across:
  - Technical Accuracy ($r$)
  - Diagnostic Reasoning ($r$)
  - Risk Awareness ($r$)
  - Explanation of Trade-offs ($r$)
- **Adaptation Quality Score (AQS):**
  Expert rating (1-5 Likert scale) evaluating whether Turn $N+1$ appropriately reacted to the specifics of Turn $N$.
- **Score Stability Across Sessions:**
  Standard deviation of performance score when a candidate attempts different scenarios of identical difficulty within the same competency domain.
- **Candidate Practice Progression:**
  Delta score $\Delta S = S_{\text{session } 3} - S_{\text{session } 1}$ following targeted recommendations from the Practice Plan.

---

## 3. Scientific Integrity & Limitations
1. **No Simulated Experience as Fact:**
   Simulation performance is strictly cataloged under `SIMULATION_OBSERVED_PERFORMANCE` and `Evidence` nodes. It is never retroactively inserted as professional employment history.
2. **Explicit Labeling of Experimental Models:**
   In accordance with research ethics, because large-scale annotated GNN graphs require human annotation campaigns, the GNN microservice is maintained in `backend/src/services/gnn-service/` with explicit status `not_yet_trained` and fallback to the verified graph traversal baseline.
3. **Public Data Boundaries:**
   GitHub public enrichment queries only permitted public REST API metadata and caches responses to avoid rate-limiting or scraping private user data.
