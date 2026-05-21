const express = require("express");
const { getProfile, updateProfileTopics, getAlerts, createAlert, updateAlerts, deleteAlert } = require("../controllers/profileController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, getProfile);
// PATCH allows partial updates; client sends only the fields that changed.
router.patch("/", authenticate, updateProfileTopics);

router.get('/alerts', authenticate, getAlerts);
router.post('/alerts', authenticate, createAlert);
router.patch('/alerts/:alertId', authenticate, updateAlerts);
router.delete('/alerts/:alertId', authenticate, deleteAlert);

module.exports = router;
