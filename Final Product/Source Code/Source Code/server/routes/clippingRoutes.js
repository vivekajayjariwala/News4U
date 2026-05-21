const express = require("express");
const controller = require("../controllers/clippingController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticate, controller.createClipping);
router.get("/", authenticate, controller.listClippings);
router.get("/share/:publicId", controller.getClippingByPublicId);
router.get("/:id/recommendations", authenticate, controller.getClippingRecommendations);
router.get("/:id", authenticate, controller.getClipping);
router.post("/:id/articles", authenticate, controller.addArticleToClipping);
router.delete("/:id/articles/:articleId", authenticate, controller.removeArticleFromClipping);
router.delete("/:id", authenticate, controller.deleteClipping);

module.exports = router;
