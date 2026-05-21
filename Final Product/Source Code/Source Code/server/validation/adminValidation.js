const { body, param } = require("express-validator");

const promoteUserValidationRules = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail({ gmail_remove_dots: false }),
];

const deleteUserValidationRules = [
  param("email")
    .isEmail()
    .withMessage("Valid email is required")
    .bail()
    .customSanitizer((value) => value.toLowerCase()),
];

module.exports = {
  promoteUserValidationRules,
  deleteUserValidationRules,
};
