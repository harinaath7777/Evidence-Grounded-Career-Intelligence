"""
Heterogeneous Graph Attention Network (HeteroGAT) Architecture
For Skill-to-Requirement Link Prediction and Competency Node Classification.
"""

try:
    import torch  # type: ignore
    import torch.nn as nn  # type: ignore
    import torch.nn.functional as F  # type: ignore
    from torch_geometric.nn import HeteroConv, GATConv, Linear  # type: ignore

    class HeteroGATCompetencyModel(nn.Module):
        def __init__(self, metadata, in_channels=64, hidden_channels=64, out_channels=32):
            super().__init__()
            # Initial projection layers
            self.lins = nn.ModuleDict()
            for node_type in metadata[0]:
                self.lins[node_type] = Linear(in_channels, hidden_channels)

            # 2-layer HeteroConv using Graph Attention
            conv_dict_1 = {}
            for edge_type in metadata[1]:
                conv_dict_1[edge_type] = GATConv(hidden_channels, hidden_channels, heads=2, concat=False, add_self_loops=False)
            self.conv1 = HeteroConv(conv_dict_1, aggr="sum")

            conv_dict_2 = {}
            for edge_type in metadata[1]:
                conv_dict_2[edge_type] = GATConv(hidden_channels, out_channels, heads=1, concat=False, add_self_loops=False)
            self.conv2 = HeteroConv(conv_dict_2, aggr="sum")

            # Link predictor head for (Skill, MATCHES_REQUIREMENT, JobRequirement)
            self.link_predictor = nn.Sequential(
                nn.Linear(out_channels * 2, 32),
                nn.ReLU(),
                nn.Linear(32, 1),
            )

        def forward(self, x_dict, edge_index_dict):
            # 1. Project input features
            h_dict = {
                node_type: F.relu(self.lins[node_type](x))
                for node_type, x in x_dict.items()
            }

            # 2. Layer 1 Graph Attention
            h_dict = self.conv1(h_dict, edge_index_dict)
            h_dict = {k: F.elu(v) for k, v in h_dict.items()}

            # 3. Layer 2 Graph Attention
            h_dict = self.conv2(h_dict, edge_index_dict)
            return h_dict

        def predict_link(self, skill_emb, req_emb):
            cat = torch.cat([skill_emb, req_emb], dim=-1)
            logits = self.link_predictor(cat)
            return torch.sigmoid(logits)

except ImportError:
    class HeteroGATCompetencyModel:
        def __init__(self, *args, **kwargs):
            pass
