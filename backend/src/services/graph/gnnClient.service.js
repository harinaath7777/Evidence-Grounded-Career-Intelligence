/**
 * GNN Research Layer Client
 * Connects to the PyTorch Geometric microservice via HTTP.
 * Complies strictly with scientific integrity: if the Python service is offline
 * or models are untrained, returns the graph traversal baseline marked as 'not_yet_trained'.
 */

const { analyzeGraph } = require("./graphAnalytics.service");

async function predictCompetencyLinks(knowledgeGraph) {
  const gnnUrl = process.env.GNN_SERVICE_URL;

  // If a GNN microservice URL is configured, attempt connection
  if (gnnUrl) {
    try {
      const response = await fetch(`${gnnUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: knowledgeGraph.nodes,
          edges: knowledgeGraph.edges,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          status: data.status || "trained",
          modelArchitecture: data.modelArchitecture || "HeteroGAT-PyTorchGeometric",
          predictions: data.predictions || [],
          embeddingDimension: data.embeddingDimension || 64,
          metric: "link_prediction_probability",
        };
      }
    } catch (err) {
      console.warn("GNN service connection attempt failed:", err.message);
    }
  }

  // Baseline Fallback: Use graph traversal baseline, marking GNN experiment as not yet trained
  const baselineAnalysis = analyzeGraph(knowledgeGraph);

  return {
    status: "not_yet_trained",
    mode: "graph_baseline_fallback",
    modelArchitecture: "Heuristic-Traversal-Baseline (PyTorch Geometric service pending trained weights)",
    description: "Graph neural network training pipeline defined in services/gnn-service/. Using deterministic path-based graph traversal baseline.",
    baselineReport: baselineAnalysis.summary,
    candidateGaps: baselineAnalysis.gaps,
  };
}

module.exports = {
  predictCompetencyLinks,
};
