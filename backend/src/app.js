const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const resumeRoutes = require("./routes/resume.routes");
const chatRoutes = require("./routes/chat.routes");
const agenticRagRoutes = require("./agentic-rag/routes/agenticRagRoutes");
const graphRoutes = require("./routes/graph.routes");
const simulationRoutes = require("./routes/simulation.routes");
const { errorHandler, notFound } = require("./middleware/error.middleware");

const app = express();
app.disable("x-powered-by");
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "resume-ai-api" }));
app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/rag", agenticRagRoutes);
app.use("/api/graph", graphRoutes);
app.use("/api/simulations", simulationRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
