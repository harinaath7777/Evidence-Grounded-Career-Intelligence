"""
Graph Dataset Converter
Transforms JSON-formatted Knowledge Graph dumps into PyTorch Geometric HeteroData objects.
"""

from typing import Dict, Any, List

def convert_json_to_hetero_data(graph_json: Dict[str, Any]):
    """
    Converts MongoDB Knowledge Graph JSON structure into PyTorch Geometric HeteroData.
    """
    try:
        import torch  # type: ignore
        from torch_geometric.data import HeteroData  # type: ignore
    except ImportError:
        # Graceful fallback representation if torch is not installed in the local environment
        return {"error": "torch and torch_geometric are required for PyG conversions."}

    data = HeteroData()
    nodes = graph_json.get("nodes", [])
    edges = graph_json.get("edges", [])

    # Group nodes by type
    nodes_by_type: Dict[str, List[Dict[str, Any]]] = {}
    id_to_type_idx: Dict[str, tuple[str, int]] = {}

    for node in nodes:
        ntype = node.get("type", "Skill")
        if ntype not in nodes_by_type:
            nodes_by_type[ntype] = []
        idx = len(nodes_by_type[ntype])
        nodes_by_type[ntype].append(node)
        id_to_type_idx[node["id"]] = (ntype, idx)

    # Initialize dummy node features (dim=64) if raw embeddings are not precomputed
    for ntype, nlist in nodes_by_type.items():
        count = len(nlist)
        # Create deterministic pseudo-features based on label hashes and confidence
        features = torch.zeros((count, 64), dtype=torch.float32)
        for i, n in enumerate(nlist):
            label_hash = abs(hash(n.get("label", ""))) % 64
            features[i, label_hash] = 1.0
            features[i, 0] = float(n.get("confidence", 0.7))
        data[ntype].x = features

    # Group edges by relation triple (src_type, relation, dst_type)
    edges_by_triple: Dict[tuple, List[tuple]] = {}
    for edge in edges:
        src_id = edge.get("source")
        dst_id = edge.get("target")
        rel = edge.get("type", "CONNECTED_TO")

        if src_id in id_to_type_idx and dst_id in id_to_type_idx:
            src_type, src_idx = id_to_type_idx[src_id]
            dst_type, dst_idx = id_to_type_idx[dst_id]
            triple = (src_type, rel, dst_type)
            if triple not in edges_by_triple:
                edges_by_triple[triple] = []
            edges_by_triple[triple].append((src_idx, dst_idx))

    # Convert edge index lists to PyTorch tensors
    for (src_type, rel, dst_type), edge_pairs in edges_by_triple.items():
        if edge_pairs:
            src_indices = [p[0] for p in edge_pairs]
            dst_indices = [p[1] for p in edge_pairs]
            edge_index = torch.tensor([src_indices, dst_indices], dtype=torch.long)
            data[src_type, rel, dst_type].edge_index = edge_index

    return data
