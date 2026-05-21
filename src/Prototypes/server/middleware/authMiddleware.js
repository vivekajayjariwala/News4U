const jwt = require("jsonwebtoken");
const config = require("../config/env");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret);

    if (!payload.isVerified) {
      return res.status(403).json({ error: "Email verification required" });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      isVerified: payload.isVerified,
      isAdmin: payload.isAdmin || false,
    };
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Optional authentication: attach req.user if a valid token is present, otherwise continue unauthenticated
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret);
    if (!payload.isVerified) {
      return next();
    }
    req.user = {
      id: payload.sub,
      email: payload.email,
      isVerified: payload.isVerified,
      isAdmin: payload.isAdmin || false,
    };
  } catch (error) {
    // Ignore token errors for optional auth
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: "Admin privileges required" });
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireAdmin,
};
