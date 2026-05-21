const express = require("express");
const { promoteUserToAdmin, demoteAdminToUser, getAllUsers, deleteUserByEmail } = require("../controllers/adminController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validateRequest");
const {
  promoteUserValidationRules,
  deleteUserValidationRules,
} = require("../validation/adminValidation");

const router = express.Router();

router.use(authenticate, requireAdmin);

router.post("/users/promote", promoteUserValidationRules, validateRequest, promoteUserToAdmin);
router.post("/users/demote", promoteUserValidationRules, validateRequest, demoteAdminToUser);
router.get("/users/all", getAllUsers);
router.delete("/users/:email", deleteUserValidationRules, validateRequest, deleteUserByEmail);

module.exports = router;
