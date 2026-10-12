# GNN Research Layer: Heterogeneous Graph Competency Intelligence

## 1. Problem Formulation & Prediction Task
In the AI Career Hub Knowledge Graph, the candidate competencies, projects, and target role requirements form a directed heterogeneous graph:
$$G = (\mathcal{V}, \mathcal{E}, \mathcal{T}_v, \mathcal{T}_e)$$

Where:
- Entity Types $\mathcal{T}_v \in \{\text{Candidate}, \text{Skill}, \text{Project}, \text{Technology}, \text{JobRequirement}, \text{Evidence}, \text{Repository}\}$
- Relation Types $\mathcal{T}_e \in \{\text{CLAIMS\_SKILL}, \text{WORKED\_ON}, \text{USES\_TECH}, \text{DEMONSTRATES}, \text{MATCHES\_REQ}, \text{SUPPORTS\_COMPETENCY}, \text{SIMULATION\_OBSERVED}\}$

### Prediction Tasks:
1. **Link Prediction (Competency Gap & Match Prediction):**
   Predict the existence and probability of an unobserved edge $e = (v_{\text{Skill}}, \text{MATCHES\_REQ}, v_{\text{JobRequirement}})$ or $(v_{\text{Candidate}}, \text{OBSERVED\_COMPETENCE}, v_{\text{Skill}})$.
2. **Node Classification (Verification Scoring):**
   Classify each Skill node into verification confidence classes: $\{0: \text{Unverified Claim}, 1: \text{Partially Supported}, 2: \text{Empirically Verified}\}$.

---

## 2. Dataset Construction & Annotation Protocol
- **Nodes & Initial Embeddings:**
  - Initial feature vectors $\mathbf{x}_v \in \mathbb{R}^{d}$ are extracted using 768-dimensional text embeddings of entity labels, categories, and evidence passages.
- **Data Splitting:**
  - Inductive graph split: 80% resumes for training, 10% validation, 10% test. Resumes in the test set have never been observed during training to measure generalization to new candidates.
- **Negative Sampling:**
  - Uniform negative sampling at a 1:3 positive-to-negative ratio for link prediction.

---

## 3. GNN Model Architecture (HeteroGAT)
We deploy a **Heterogeneous Graph Attention Network (HeteroGAT)**:
$$\mathbf{h}_v^{(l+1)} = \sigma \left( \sum_{r \in \mathcal{R}} \sum_{u \in \mathcal{N}_r(v)} \alpha_{uv}^r \mathbf{W}_r \mathbf{h}_u^{(l)} \right)$$

Where $\alpha_{uv}^r$ is the attention weight computed across relationship type $r$.

### Link Prediction Head:
$$P(e=(u, v)) = \sigma \left( \text{MLP} \left( [\mathbf{h}_u^{(L)} \,\|\, \mathbf{h}_v^{(L)} \,\|\, \mathbf{h}_u^{(L)} \odot \mathbf{h}_v^{(L)}] \right) \right)$$

---

## 4. Evaluation Protocol & Baselines
We benchmark across 4 paradigms:
1. **Keyword-Based Matching (BM25 / Jaccard):** String overlap between resume skills and job requirements.
2. **Embedding-Based Cosine Similarity:** Dense cosine distance between isolated sentence embeddings (e.g. text-embedding-004).
3. **Graph Traversal Baseline (Ours - Production Default):** Deterministic multi-hop path analysis, evidence depth scoring, and provenance chain verification.
4. **HeteroGAT (Research Layer):** Trained edge link prediction on heterogeneous multi-relational graphs.

### Evaluation Metrics:
- **Link Prediction ROC-AUC** and **Mean Reciprocal Rank (MRR)**
- **Precision@3, Precision@5**
- **Evidence Provenance Precision** (fraction of retrieved links backed by verbatim source passages)
- **Latency (ms)** and **Inference Cost ($/query)**

---

## 5. Deployment & Execution
```bash
# Setup virtual environment
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Run the HTTP microservice
python app.py
```

*Note: In production environments without trained checkpoint weights, the system automatically runs the deterministic Graph Traversal Baseline, explicitly marking the GNN output status as `not_yet_trained`.*
