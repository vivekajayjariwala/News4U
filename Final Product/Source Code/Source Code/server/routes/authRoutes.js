const express = require("express");
const {
  register,
  verifyEmail,
  login,
  refreshSession,
  logout,
} = require("../controllers/authController");
const { validateRequest } = require("../middleware/validateRequest");
const {
  registerValidationRules,
  loginValidationRules,
  verifyValidationRules,
  refreshValidationRules,
  logoutValidationRules,
} = require("../validation/authValidation");

const router = express.Router();

router.post("/register", registerValidationRules, validateRequest, register);
router.post("/verify", verifyValidationRules, validateRequest, verifyEmail);
router.post("/login", loginValidationRules, validateRequest, login);
router.post("/refresh", refreshValidationRules, validateRequest, refreshSession);
router.post("/logout", logoutValidationRules, validateRequest, logout);

module.exports = router;
