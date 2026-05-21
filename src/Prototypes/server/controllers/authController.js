const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const config = require("../config/env");
const { createAccessToken, createVerificationToken } = require("../utils/token");
const { sendVerificationEmail } = require("../services/emailService");
const {
  createRefreshToken,
  revokeRefreshTokenByValue,
  consumeRefreshToken,
} = require("../utils/refreshTokenStore");

async function issueSessionTokens({ userId, email, isVerified, isAdmin }) {
  const accessToken = createAccessToken({
    userId,
    email,
    isVerified,
    isAdmin,
  });

  const { tokenValue: refreshToken } = await createRefreshToken(userId);

  return {
    accessToken,
    refreshToken,
  };
}

async function register(req, res, next) {
  const {
    name,
    email,
    password,
    interests = [],
    understandingLevel = "intermediate",
  } = req.body;

  const normalizedEmail = email.toLowerCase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT user_id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Email already registered" });
    }

    const userId = uuidv4();
    const profileId = uuidv4();
    const passwordHash = await bcrypt.hash(
      password,
      config.auth.bcryptSaltRounds
    );

    await client.query(
      `INSERT INTO users (user_id, email, password_hash, is_verified, is_active, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, normalizedEmail, passwordHash, false, true, false]
    );

    await client.query(
      `INSERT INTO user_profiles (profile_id, user_id, full_name, preferred_topics, complexity_preference)
       VALUES ($1, $2, $3, $4, $5)`,
      [profileId, userId, name, interests, understandingLevel]
    );

    await client.query("COMMIT");

    const token = createAccessToken({
      userId,
      email: normalizedEmail,
      isVerified: false,
      isAdmin: false,
    });
    const verificationToken = createVerificationToken({
      userId,
      email: normalizedEmail,
    });

    res.status(201).json({
      message: "Registration successful. Please check your email to verify your account.",
      token,
      verificationToken,
      user: {
        id: userId,
        email: normalizedEmail,
        isVerified: false,
        name,
        interests,
        understandingLevel,
        fullName: name,
        isAdmin: false,
      },
    });

    // Send verification email asynchronously after response
    setImmediate(async () => {
      console.log('About to send verification email to:', normalizedEmail);
      try {
        await sendVerificationEmail(normalizedEmail, verificationToken);
        console.log('Verification email sent successfully to:', normalizedEmail);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    next(error);
  } finally {
    client.release();
  }
}

async function verifyEmail(req, res, next) {
  const { token } = req.body;

  try {
    const payload = jwt.verify(token, config.auth.verifySecret);

    if (payload.purpose !== "verify-email") {
      return res.status(400).json({ error: "Invalid verification token" });
    }

    const { rows } = await pool.query(
      `UPDATE users SET is_verified = TRUE
       WHERE user_id = $1
       RETURNING user_id, email, is_verified, is_admin`,
      [payload.sub]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    const profileResult = await pool.query(
      `SELECT full_name
       FROM user_profiles
       WHERE user_id = $1`,
      [user.user_id]
    );
    const profile = profileResult.rows[0] || { full_name: "" };
    const { accessToken, refreshToken } = await issueSessionTokens({
      userId: user.user_id,
      email: user.email,
      isVerified: user.is_verified,
      isAdmin: user.is_admin,
    });

    res.json({
      message: "Email verified successfully.",
      token: accessToken,
      refreshToken,
      user: {
        id: user.user_id,
        email: user.email,
        isVerified: user.is_verified,
        fullName: profile.full_name,
        isAdmin: user.is_admin,
      },
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ error: "Verification token has expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ error: "Invalid verification token" });
    }
    next(error);
  }
}

async function login(req, res, next) {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  try {
    const { rows } = await pool.query(
            `SELECT u.user_id,
              u.email,
              u.password_hash,
              u.is_verified,
              u.is_active,
              u.is_admin,
              COALESCE(up.full_name, '') AS full_name
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.user_id
       WHERE u.email = $1`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: "Account is disabled" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.is_verified) {
      // Resend verification email
      const verificationToken = createVerificationToken({
        userId: user.user_id,
        email: user.email,
      });

      // Send verification email asynchronously
      setImmediate(async () => {
        console.log('Resending verification email to:', user.email);
        try {
          await sendVerificationEmail(user.email, verificationToken);
          console.log('Verification email resent successfully to:', user.email);
        } catch (emailError) {
          console.error('Failed to resend verification email:', emailError);
        }
      });

      return res.status(403).json({ error: "Please verify your email before logging in. A new verification email has been sent." });
    }

    await pool.query("UPDATE users SET last_login_at = NOW() WHERE user_id = $1", [
      user.user_id,
    ]);

    const { accessToken, refreshToken } = await issueSessionTokens({
      userId: user.user_id,
      email: user.email,
      isVerified: user.is_verified,
      isAdmin: user.is_admin,
    });

    res.json({
      message: "Login successful",
      token: accessToken,
      refreshToken,
      user: {
        id: user.user_id,
        email: user.email,
        isVerified: user.is_verified,
        fullName: user.full_name,
        isAdmin: user.is_admin,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function refreshSession(req, res, next) {
  const { refreshToken } = req.body;

  try {
    const consumed = await consumeRefreshToken(refreshToken);

    if (!consumed) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const { rows } = await pool.query(
      `SELECT u.user_id,
              u.email,
              u.is_verified,
              u.is_active,
              u.is_admin,
              COALESCE(up.full_name, '') AS full_name
         FROM users u
         LEFT JOIN user_profiles up ON up.user_id = u.user_id
        WHERE u.user_id = $1`,
      [consumed.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: "Account is disabled" });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: "Email verification required" });
    }

    const { accessToken, refreshToken: newRefreshToken } = await issueSessionTokens({
      userId: user.user_id,
      email: user.email,
      isVerified: user.is_verified,
      isAdmin: user.is_admin,
    });

    res.json({
      message: "Session refreshed",
      token: accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.user_id,
        email: user.email,
        isVerified: user.is_verified,
        fullName: user.full_name,
        isAdmin: user.is_admin,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res) {
  const { refreshToken } = req.body;

  if (refreshToken) {
    try {
      await revokeRefreshTokenByValue(refreshToken);
    } catch (error) {
      console.error("Failed to revoke refresh token during logout", error);
    }
  }

  res.status(204).send();
}

module.exports = {
  register,
  verifyEmail,
  login,
  refreshSession,
  logout,
};
