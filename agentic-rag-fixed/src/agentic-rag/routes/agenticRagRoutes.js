const express = require('express');
const multer = require('multer');
const { ingest, query } = require('../controllers/agenticRagController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024,
  },
});

router.post('/ingest', upload.single('file'), ingest);
router.post('/query', query);

module.exports = router;
