const { v4: uuidv4 } = require("uuid");
const pool = require("../db");

async function createClipping(req, res, next) {
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  const clippingId = uuidv4();
  const publicId = uuidv4();

  try {
    const result = await pool.query(
      `INSERT INTO clippings (clipping_id, user_id, title, public_id)
       VALUES ($1, $2, $3, $4)
       RETURNING clipping_id, title, public_id, created_at`,
      [clippingId, req.user.id, title.trim(), publicId]
    );

    return res.status(201).json({ clipping: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function listClippings(req, res, next) {
  const { articleId } = req.query;
  const params = [req.user.id];
  let containsSelect = "";

  if (articleId) {
    params.push(articleId);
    containsSelect = ", COALESCE(BOOL_OR(ci.article_id = $2), FALSE) AS contains_article";
  }

  try {
    const result = await pool.query(
      `SELECT c.clipping_id, c.title, c.public_id, c.created_at,
              COUNT(ci.article_id) AS article_count,
              ARRAY_AGG(a.image ORDER BY ci.created_at DESC) FILTER (WHERE a.image IS NOT NULL) AS preview_images
              ${containsSelect}
       FROM clippings c
       LEFT JOIN clipping_items ci ON ci.clipping_id = c.clipping_id
       LEFT JOIN articles a ON a.id = ci.article_id
       WHERE c.user_id = $1
       GROUP BY c.clipping_id
       ORDER BY c.created_at DESC`,
      params
    );

    return res.json({ clippings: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function getClipping(req, res, next) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.clipping_id, c.title, c.public_id, c.created_at,
              ci.article_id, ci.created_at AS added_at,
              a.title AS article_title, a.topic, a.image, a.author, a.published_at, a.url
       FROM clippings c
       LEFT JOIN clipping_items ci ON ci.clipping_id = c.clipping_id
       LEFT JOIN articles a ON a.id = ci.article_id
       WHERE c.clipping_id = $1 AND c.user_id = $2
       ORDER BY ci.created_at DESC`,
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Clipping not found" });
    }

    const base = result.rows[0];
    const articles = result.rows
      .filter((row) => row.article_id)
      .map((row) => ({
        id: row.article_id,
        title: row.article_title,
        topic: row.topic,
        image: row.image,
        author: row.author,
        published_at: row.published_at,
        url: row.url,
        added_at: row.added_at,
      }));

    return res.json({
      clipping: {
        clipping_id: base.clipping_id,
        title: base.title,
        public_id: base.public_id,
        created_at: base.created_at,
        articles,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getClippingByPublicId(req, res, next) {
  const { publicId } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.clipping_id, c.title, c.public_id, c.created_at,
              ci.article_id, ci.created_at AS added_at,
              a.title AS article_title, a.topic, a.image, a.author, a.published_at, a.url
       FROM clippings c
       LEFT JOIN clipping_items ci ON ci.clipping_id = c.clipping_id
       LEFT JOIN articles a ON a.id = ci.article_id
       WHERE c.public_id = $1
       ORDER BY ci.created_at DESC`,
      [publicId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Clipping not found" });
    }

    const base = result.rows[0];
    const articles = result.rows
      .filter((row) => row.article_id)
      .map((row) => ({
        id: row.article_id,
        title: row.article_title,
        topic: row.topic,
        image: row.image,
        author: row.author,
        published_at: row.published_at,
        url: row.url,
        added_at: row.added_at,
      }));

    return res.json({
      clipping: {
        clipping_id: base.clipping_id,
        title: base.title,
        public_id: base.public_id,
        created_at: base.created_at,
        articles,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function addArticleToClipping(req, res, next) {
  const { id } = req.params;
  const { articleId } = req.body;

  if (!articleId) {
    return res.status(400).json({ error: "articleId is required" });
  }

  try {
    const clippingResult = await pool.query(
      "SELECT clipping_id FROM clippings WHERE clipping_id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (clippingResult.rowCount === 0) {
      return res.status(404).json({ error: "Clipping not found" });
    }

    const articleResult = await pool.query(
      "SELECT id FROM articles WHERE id = $1",
      [articleId]
    );

    if (articleResult.rowCount === 0) {
      return res.status(404).json({ error: "Article not found" });
    }

    const insertResult = await pool.query(
      `INSERT INTO clipping_items (clipping_id, article_id)
       VALUES ($1, $2)
       ON CONFLICT (clipping_id, article_id) DO NOTHING
       RETURNING id`,
      [id, articleId]
    );

    return res.status(201).json({
      added: insertResult.rowCount > 0,
    });
  } catch (error) {
    return next(error);
  }
}

async function removeArticleFromClipping(req, res, next) {
  const { id, articleId } = req.params;

  try {
    const clippingResult = await pool.query(
      "SELECT clipping_id FROM clippings WHERE clipping_id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (clippingResult.rowCount === 0) {
      return res.status(404).json({ error: "Clipping not found" });
    }

    await pool.query(
      "DELETE FROM clipping_items WHERE clipping_id = $1 AND article_id = $2",
      [id, articleId]
    );

    return res.json({ removed: true });
  } catch (error) {
    return next(error);
  }
}

async function deleteClipping(req, res, next) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM clippings WHERE clipping_id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Clipping not found" });
    }

    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
}

async function getClippingRecommendations(req, res, next) {
  const { id } = req.params;
  const limit = Number.parseInt(req.query.limit, 10) || 6;

  try {
    const clippingResult = await pool.query(
      "SELECT clipping_id FROM clippings WHERE clipping_id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (clippingResult.rowCount === 0) {
      return res.status(404).json({ error: "Clipping not found" });
    }

    const topicsResult = await pool.query(
      `SELECT DISTINCT a.topic
       FROM clipping_items ci
       JOIN articles a ON a.id = ci.article_id
       WHERE ci.clipping_id = $1 AND a.topic IS NOT NULL`,
      [id]
    );

    const topics = topicsResult.rows
      .map((row) => row.topic)
      .filter((topic) => topic && topic.trim());

    if (topics.length === 0) {
      return res.json({ articles: [] });
    }

    const recommendations = await pool.query(
      `SELECT a.id, a.title, a.topic, a.image, a.author, a.published_at, a.url
       FROM articles a
       WHERE a.topic = ANY($1)
         AND a.id NOT IN (SELECT article_id FROM clipping_items WHERE clipping_id = $2)
       ORDER BY a.published_at DESC NULLS LAST
       LIMIT $3`,
      [topics, id, limit]
    );

    return res.json({ articles: recommendations.rows });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createClipping,
  listClippings,
  getClipping,
  getClippingByPublicId,
  addArticleToClipping,
  removeArticleFromClipping,
  deleteClipping,
  getClippingRecommendations,
};
