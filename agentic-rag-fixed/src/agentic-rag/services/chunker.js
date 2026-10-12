function normalize(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunkText(input, options = {}) {
  const text = normalize(input);
  const size = options.size || 1200;
  const overlap = options.overlap || 180;
  const chunks = [];

  if (!text) return chunks;
  if (overlap >= size) throw new Error('Chunk overlap must be smaller than chunk size');

  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);

    if (end < text.length) {
      const paragraph = text.lastIndexOf('\n\n', end);
      const sentence = text.lastIndexOf('. ', end);
      const boundary = Math.max(paragraph, sentence);
      if (boundary > start + size * 0.55) end = boundary + (paragraph === boundary ? 2 : 1);
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

module.exports = { chunkText };
