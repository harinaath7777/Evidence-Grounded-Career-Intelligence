const router = require("express").Router();
const multer = require("multer");
const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controllers/resume.controller");

const maxBytes = Number(process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/pdf" && !file.originalname.toLowerCase().endsWith(".pdf")) {
      return callback(new Error("Only PDF resumes are supported."));
    }
    callback(null, true);
  },
});

router.use(requireAuth);
router.get("/", controller.listResumes);
router.post("/", controller.createResume);
router.post("/analyze", upload.single("resume"), controller.uploadAndAnalyze);
router.get("/:id", controller.getResume);
router.put("/:id", controller.updateResume);
router.post("/:id/analyze", controller.reanalyzeResume);
router.get("/:id/interview/questions", controller.getInterviewQuestions);
router.post("/:id/interview/questions", controller.getInterviewQuestions);
router.post("/:id/interview/evaluate", controller.evaluateInterview);
router.get("/:id/export.pdf", controller.exportPdf);
router.delete("/:id", controller.deleteResume);

module.exports = router;
