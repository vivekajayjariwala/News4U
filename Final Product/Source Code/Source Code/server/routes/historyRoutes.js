const express = require("express");
const { markArticleAsRead, getReadingHistory } = require("../controllers/historyController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

// All history routes require authentication
router.use(authenticate);

router.post("/", markArticleAsRead);
router.get("/", getReadingHistory);

module.exports = router;
