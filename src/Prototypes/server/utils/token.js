const jwt = require("jsonwebtoken");
const config = require("../config/env");

function createAccessToken({ userId, email, isVerified, isAdmin = false }) {
  return jwt.sign(
    {
      sub: userId,
      email,
      isVerified,
      isAdmin,
    },
    config.auth.jwtSecret,
    {
      expiresIn: config.auth.jwtExpiresIn,
    }
  );
}

function createVerificationToken({ userId, email }) {
  return jwt.sign(
    {
      sub: userId,
      email,
      purpose: "verify-email",
    },
    config.auth.verifySecret,
    {
      expiresIn: config.auth.verifyExpiresIn,
    }
  );
}

module.exports = {
  createAccessToken,
  createVerificationToken,
};
