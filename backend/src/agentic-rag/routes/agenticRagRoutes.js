const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { ingest, query } = require('../controllers/agenticRagController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024,
  },
});

function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearer || req.cookies?.accessToken;
    if (token && process.env.JWT_SECRET) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.sub, email: payload.email, name: payload.name };
    }
  } catch {}
  next();
}

router.post('/ingest', optionalAuth, upload.single('file'), ingest);
router.post('/query', optionalAuth, query);

module.exports = router;
