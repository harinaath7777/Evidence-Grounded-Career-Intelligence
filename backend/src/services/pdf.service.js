async function extractPdfText(buffer) {
  // pdf-parse v2 exposes PDFParse; older versions expose a function.
  const pdfParse = require("pdf-parse");
  if (typeof pdfParse === "function") {
    const result = await pdfParse(buffer);
    return result.text || "";
  }
  if (pdfParse.PDFParse) {
    const parser = new pdfParse.PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text || "";
    } finally {
      if (typeof parser.destroy === "function") await parser.destroy();
    }
  }
  throw new Error("PDF text extraction is unavailable. Check the installed pdf-parse version.");
}

module.exports = { extractPdfText };
