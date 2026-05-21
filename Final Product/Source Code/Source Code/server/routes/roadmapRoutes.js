const express = require("express");
const controller = require("../controllers/roadmapController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticate, controller.createRoadmap);
router.get("/", authenticate, controller.listRoadmaps);
router.get("/progress/:id", authenticate, controller.getRoadmapProgress);
router.get("/for-article/:articleId", authenticate, controller.getRoadmapForArticle);
router.get("/share/:publicId", controller.getRoadmapByPublicId);
router.get("/:id", authenticate, controller.getRoadmap);
router.delete("/:id", authenticate, controller.deleteRoadmap);

module.exports = router;
