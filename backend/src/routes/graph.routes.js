const router = require("express").Router();
const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controllers/graph.controller");

router.use(requireAuth);

router.get("/resume/:id", controller.getGraph);
router.post("/resume/:id/rebuild", controller.rebuildGraph);
router.get("/resume/:id/analysis", controller.getGraphAnalysis);
router.post("/resume/:id/enrich-github", controller.enrichWithGitHub);
router.get("/resume/:id/gnn-predict", controller.getGnnPredictions);

module.exports = router;
