const pool = require("../db");

/**
 * Record an article as read by the user
 */
const markArticleAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id; // Provided by auth middleware
        const { articleId } = req.body;

        if (!articleId) {
            return res.status(400).json({ status: "error", error: "Article ID is required." });
        }

        // Check if interaction already exists to avoid duplicates
        const checkQuery = `
      SELECT id FROM user_interactions
      WHERE user_id = $1 AND article_id = $2 AND action = 'read'
    `;
        const checkResult = await pool.query(checkQuery, [userId, articleId]);

        if (checkResult.rows.length > 0) {
            // Already marked as read, update the created_at timestamp to bring it to top of history
            const updateQuery = `
        UPDATE user_interactions 
        SET created_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
            await pool.query(updateQuery, [checkResult.rows[0].id]);

            return res.status(200).json({
                status: "success",
                message: "Article reading history updated."
            });
        }

        // Insert new read interaction
        const insertQuery = `
      INSERT INTO user_interactions (user_id, article_id, action)
      VALUES ($1, $2, 'read')
      RETURNING *
    `;
        const result = await pool.query(insertQuery, [userId, articleId]);

        res.status(201).json({
            status: "success",
            message: "Article marked as read.",
            interaction: result.rows[0],
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get all articles read by the user
 */
const getReadingHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const query = `
      SELECT 
        a.id, 
        a.guardian_id, 
        a.title, 
        a.author, 
        a.published_at, 
        a.topic, 
        a.url, 
        a.image, 
        ui.created_at as read_at
      FROM user_interactions ui
      JOIN articles a ON ui.article_id = a.id
      WHERE ui.user_id = $1 AND ui.action = 'read'
      ORDER BY ui.created_at DESC
    `;

        const result = await pool.query(query, [userId]);

        res.status(200).json({
            status: "success",
            count: result.rows.length,
            history: result.rows,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    markArticleAsRead,
    getReadingHistory,
};
