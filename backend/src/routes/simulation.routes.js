const router = require("express").Router();
const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controllers/simulation.controller");

router.use(requireAuth);

router.get("/", controller.listSessions);
router.post("/start", controller.startSimulation);
router.get("/:id", controller.getSession);
router.post("/:id/turn", controller.submitTurn);
router.post("/:id/hint", controller.requestHint);
router.post("/:id/complete", controller.completeSimulation);
router.post("/:id/sync-to-graph", controller.syncToGraph);

module.exports = router;
