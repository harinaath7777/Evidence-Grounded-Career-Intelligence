const mongoose = require('mongoose');

const ragChunkSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true, index: true },
    ownerId: { type: String, default: null, index: true },
    source: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ragChunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });

module.exports = mongoose.model('RagChunk', ragChunkSchema);
