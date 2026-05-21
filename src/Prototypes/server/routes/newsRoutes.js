const express = require("express");
const controller = require("../controllers/newsController");
const { optionalAuthenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/headlines", optionalAuthenticate, controller.getHeadlines);
router.get("/search", controller.searchArticles);
router.post("/rewrite", controller.rewriteArticle);
router.post("/interaction", controller.recordInteraction);
router.get("/:id/terms", controller.getArticleTerms);
router.get("/:id/rewrite", controller.getArticleRewrite);
router.get("/current/:id", controller.getArticleById);
router.get("/top-topics", controller.getTopTopics);

// Legacy/Compatibility routes mapping
router.get("/", controller.getHeadlines);

module.exports = router;