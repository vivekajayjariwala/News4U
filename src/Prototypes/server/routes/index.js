const express = require("express");
const authRoutes = require("./authRoutes");
const profileRoutes = require("./profileRoutes");
const adminRoutes = require("./adminRoutes");
const newsRoutes = require('./newsRoutes');
const roadmapRoutes = require("./roadmapRoutes");
const clippingRoutes = require("./clippingRoutes");
const historyRoutes = require("./historyRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/admin", adminRoutes);
router.use("/news", newsRoutes)
router.use("/roadmaps", roadmapRoutes);
router.use("/clippings", clippingRoutes);
router.use("/history", historyRoutes);

module.exports = router;
