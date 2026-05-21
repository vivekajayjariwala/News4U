const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const config = require("../config/env");

function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString("hex");
}

function hashRefreshToken(tokenValue) {
  return crypto
    .createHmac("sha256", config.auth.refreshSecret)
    .update(tokenValue)
    .digest("hex");
}

function parseDurationToMs(duration) {
  if (!duration) {
    return 24 * 60 * 60 * 1000;
  }

  const trimmed = duration.toString().trim();
  const match = trimmed.match(/^([0-9]+)([smhd])$/i);

  if (match) {
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] || 60 * 60 * 1000);
  }

  const numeric = Number(trimmed);

  if (!Number.isNaN(numeric)) {
    return numeric * 60 * 60 * 1000;
  }

  return 24 * 60 * 60 * 1000;
}

async function createRefreshToken(userId) {
  const tokenValue = generateRefreshTokenValue();
  const tokenHash = hashRefreshToken(tokenValue);
  const tokenId = uuidv4();
  const expiresAt = new Date(
    Date.now() + parseDurationToMs(config.auth.refreshExpiresIn)
  );

  await pool.query(
    `INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [tokenId, userId, tokenHash, expiresAt]
  );

  return {
    tokenId,
    tokenValue,
  };
}

async function revokeRefreshTokenByValue(tokenValue) {
  const tokenHash = hashRefreshToken(tokenValue);
  await pool.query(
    `UPDATE refresh_tokens
       SET revoked_at = NOW()
     WHERE token_hash = $1
       AND revoked_at IS NULL`,
    [tokenHash]
  );
}

async function consumeRefreshToken(tokenValue) {
  const tokenHash = hashRefreshToken(tokenValue);
  const { rows } = await pool.query(
    `SELECT token_id, user_id, expires_at, revoked_at
       FROM refresh_tokens
      WHERE token_hash = $1`,
    [tokenHash]
  );

  if (rows.length === 0) {
    return null;
  }

  const record = rows[0];

  if (record.revoked_at || new Date(record.expires_at) <= new Date()) {
    return null;
  }

  await pool.query(
    `UPDATE refresh_tokens
       SET revoked_at = NOW()
     WHERE token_id = $1
       AND revoked_at IS NULL`,
    [record.token_id]
  );

  return {
    tokenId: record.token_id,
    userId: record.user_id,
  };
}

module.exports = {
  createRefreshToken,
  revokeRefreshTokenByValue,
  consumeRefreshToken,
};
