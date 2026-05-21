const { body } = require("express-validator");

const understandingLevels = ["beginner", "intermediate", "expert"];

const registerValidationRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail({ gmail_remove_dots: false }),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Password must contain at least one special character"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
  body("interests")
    .isArray({ min: 3 })
    .withMessage("Select at least three interests"),
  body("interests.*")
    .isString()
    .withMessage("Each interest must be a string"),
  body("understandingLevel")
    .isIn(understandingLevels)
    .withMessage(
      `understandingLevel must be one of: ${understandingLevels.join(", ")}`
    ),
];

const loginValidationRules = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail({ gmail_remove_dots: false }),
  body("password").notEmpty().withMessage("Password is required"),
];

const verifyValidationRules = [
  body("token").isString().notEmpty().withMessage("Verification token is required"),
];

const refreshValidationRules = [
  body("refreshToken")
    .isString()
    .notEmpty()
    .withMessage("Refresh token is required"),
];

const logoutValidationRules = [
  body("refreshToken")
    .isString()
    .notEmpty()
    .withMessage("Refresh token is required"),
];

module.exports = {
  registerValidationRules,
  loginValidationRules,
  verifyValidationRules,
  refreshValidationRules,
  logoutValidationRules,
};
