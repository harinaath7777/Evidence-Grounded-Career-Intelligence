const router = require("express").Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { chat } = require("../controllers/chat.controller");

router.post("/", requireAuth, chat);

module.exports = router;
