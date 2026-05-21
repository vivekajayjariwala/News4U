const pool = require("../db");

async function getProfile(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id,
              u.email,
              u.is_verified,
              u.is_active,
              u.is_admin,
              u.created_at,
              u.last_login_at,
              up.profile_id,
              up.full_name,
              up.preferred_topics,
              up.complexity_preference,
              up.high_contrast_mode,
              up.font_size,
              up.screen_reader_enabled,
              up.updated_at
       FROM users u
       JOIN user_profiles up ON up.user_id = u.user_id
       WHERE u.user_id = $1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = rows[0];

    res.json({
      user: {
        id: profile.user_id,
        email: profile.email,
        isVerified: profile.is_verified,
        isActive: profile.is_active,
        isAdmin: profile.is_admin,
        createdAt: profile.created_at,
        lastLoginAt: profile.last_login_at,
      },
      profile: {
        id: profile.profile_id,
        fullName: profile.full_name,
        preferredTopics: profile.preferred_topics,
        complexityPreference: profile.complexity_preference,
        highContrastMode: profile.high_contrast_mode,
        fontSize: profile.font_size,
        screenReaderEnabled: profile.screen_reader_enabled,
        updatedAt: profile.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update one or more fields of the authenticated user's profile.
 *
 * The request body may include any of the following keys:
 *   fullName, preferredTopics, complexityPreference,
 *   highContrastMode, fontSize, screenReaderEnabled
 *
 * Clients can send an entire topics array when they add/remove items; this
 * single PATCH endpoint avoids having to maintain separate add/remove routes.
 */
async function updateProfileTopics(req, res, next) {
  try {
    const userId = req.user.id;
    const allowed = {
      fullName: "full_name",
      preferredTopics: "preferred_topics",
      complexityPreference: "complexity_preference",
      highContrastMode: "high_contrast_mode",
      fontSize: "font_size",
      screenReaderEnabled: "screen_reader_enabled",
    };

    const fields = [];
    const values = [];
    let idx = 1;

    for (const [bodyKey, column] of Object.entries(allowed)) {
      if (req.body[bodyKey] !== undefined) {
        fields.push(`${column} = $${idx++}`);
        values.push(req.body[bodyKey]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No profile fields provided" });
    }

    // always bump the updated_at timestamp
    fields.push(`updated_at = NOW()`);

    values.push(userId);
    const query = `UPDATE user_profiles
                   SET ${fields.join(", ")}
                   WHERE user_id = $${idx}
                   RETURNING *`;

    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const p = rows[0];

    res.json({
      id: p.profile_id,
      fullName: p.full_name,
      preferredTopics: p.preferred_topics,
      complexityPreference: p.complexity_preference,
      highContrastMode: p.high_contrast_mode,
      fontSize: p.font_size,
      screenReaderEnabled: p.screen_reader_enabled,
      updatedAt: p.updated_at,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update topics for a specific alert belonging to the authenticated user.
 *
 * The request body may include:
 *   topics: TEXT[] array of topic strings
 *
 * Requires alertId in the URL params.
 */
async function updateAlerts(req, res, next) {
  try {
    const userId = req.user.id;
    const { alertId } = req.params;

    if (!alertId) {
      return res.status(400).json({ error: "Alert ID is required" });
    }

    const allowed = {
      topics: "topics",
    };

    const fields = [];
    const values = [];
    let idx = 1;

    for (const [bodyKey, column] of Object.entries(allowed)) {
      if (req.body[bodyKey] !== undefined) {
        fields.push(`${column} = $${idx++}`);
        values.push(req.body[bodyKey]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No alert fields provided" });
    }

    // always bump the updated_at timestamp
    fields.push(`updated_at = NOW()`);

    values.push(alertId, userId);
    const query = `UPDATE alerts
                   SET ${fields.join(", ")}
                   WHERE alert_id = $${idx++} AND user_id = $${idx}
                   RETURNING *`;

    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Alert not found or access denied" });
    }

    const alert = rows[0];

    res.json({
      id: alert.alert_id,
      userId: alert.user_id,
      topics: alert.topics,
      updatedAt: alert.updated_at,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all alerts for the authenticated user.
 */
async function getAlerts(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT alert_id, user_id, topics, created_at, updated_at
       FROM alerts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(rows.map(alert => ({
      id: alert.alert_id,
      userId: alert.user_id,
      topics: alert.topics,
      createdAt: alert.created_at,
      updatedAt: alert.updated_at,
    })));
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new alert for the authenticated user.
 * Expects { topics: TEXT[] } in body.
 */
async function createAlert(req, res, next) {
  try {
    const { topics } = req.body;
    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({ error: "Topics array is required" });
    }

    const { rows } = await pool.query(
      `INSERT INTO alerts (alert_id, user_id, topics)
       VALUES (gen_random_uuid(), $1, $2)
       RETURNING alert_id, user_id, topics, created_at, updated_at`,
      [req.user.id, topics]
    );

    const alert = rows[0];
    res.status(201).json({
      id: alert.alert_id,
      userId: alert.user_id,
      topics: alert.topics,
      createdAt: alert.created_at,
      updatedAt: alert.updated_at,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete an alert by ID, if it belongs to the authenticated user.
 */
async function deleteAlert(req, res, next) {
  try {
    const { alertId } = req.params;
    if (!alertId) {
      return res.status(400).json({ error: "Alert ID is required" });
    }

    const { rowCount } = await pool.query(
      `DELETE FROM alerts
       WHERE alert_id = $1 AND user_id = $2`,
      [alertId, req.user.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "Alert not found or access denied" });
    }

    res.status(204).send(); // No content
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfileTopics,
  getAlerts,
  createAlert,
  updateAlerts,
  deleteAlert,
};
