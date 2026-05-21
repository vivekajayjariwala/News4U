const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const guardianService = require("../services/guardianService");
const hfService = require("../services/hfService");
const aiService = require("../services/aiService");

const COMPLEXITY_LABELS = ["beginner", "intermediate", "advanced"];
const MAX_ITEMS = 6;
const CANDIDATE_LIMIT = MAX_ITEMS - 1;
const MAX_CLASSIFY_CALLS = MAX_ITEMS;
const MAX_CLASSIFY_CHARS = 2000;
const GUARDIAN_TIMEOUT_MS = Number.parseInt(process.env.GUARDIAN_TIMEOUT_MS || "25000", 10);
const ROADMAP_KEYWORD_LIMIT = 4;
const ROADMAP_QUERY_KEYWORD_LIMIT = 2;

const STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "but", "if", "then", "else", "when", "where", "who", "what", "why",
    "how", "to", "of", "in", "on", "for", "from", "by", "with", "about", "as", "at", "is", "are",
    "was", "were", "be", "been", "being", "this", "that", "these", "those", "it", "its", "their",
    "his", "her", "they", "them", "we", "us", "you", "your", "i", "me", "my", "our", "not",
    "best", "review", "reviews", "latest", "new", "top", "roundup", "guide"
]);

function stripHtml(html = "") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractKeywords(text, limit = ROADMAP_KEYWORD_LIMIT) {
    const words = (text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOPWORDS.has(word));

    const counts = new Map();
    words.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));

    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([word]) => word);
}

function normalizeSectionSlug(value = "") {
    return value
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function buildRoadmapKeywords(baseArticle) {
    const titleKeywords = extractKeywords(baseArticle.title || "");
    const bodyKeywords = extractKeywords(stripHtml(baseArticle.body || "").slice(0, 500));
    const keywordSet = new Set([...titleKeywords, ...bodyKeywords]);
    return Array.from(keywordSet).slice(0, ROADMAP_KEYWORD_LIMIT);
}

function scoreArticleByKeywords(article, keywords = []) {
    if (!keywords.length) return 0;
    const haystack = `${article.title || ""} ${stripHtml(article.body || "")}`.toLowerCase();
    return keywords.reduce((count, keyword) => (haystack.includes(keyword) ? count + 1 : count), 0);
}

function getGuardianSectionSlug(baseArticle) {
    if (baseArticle?.guardian_id) {
        const [section] = baseArticle.guardian_id.split("/");
        if (section) return section.toLowerCase();
    }
    const topic = (baseArticle?.topic || "").trim();
    return topic ? normalizeSectionSlug(topic) : "";
}

function buildRoadmapQuery(baseArticle) {
    const topic = (baseArticle.topic || "").trim();
    const keywordList = buildRoadmapKeywords(baseArticle).slice(0, ROADMAP_QUERY_KEYWORD_LIMIT);

    if (topic && keywordList.length) {
        return `${topic} ${keywordList.join(" ")}`.trim();
    }

    if (keywordList.length) {
        return keywordList.join(" ");
    }

    return topic || baseArticle.title || "";
}

function normalizeScore(score) {
    return typeof score === "number" && !Number.isNaN(score) ? score : 1;
}

function labelRank(label) {
    const normalized = (label || "").toLowerCase();
    if (normalized === "beginner") return 1;
    if (normalized === "intermediate") return 2;
    if (normalized === "advanced") return 3;
    return 4;
}

async function getOrCreateComplexity(article, { maxChars = 4000 } = {}) {
    if (!article?.id) return null;

    const existing = await pool.query(
        "SELECT * FROM article_complexity WHERE article_id = $1",
        [article.id]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0];
    }

    const textToClassify = `${article.title}\n${stripHtml(article.body || "")}`
        .trim()
        .substring(0, maxChars);

    try {
        const classification = await hfService.classifyComplexity(textToClassify, COMPLEXITY_LABELS);
        if (!classification) return null;

        const insert = await pool.query(
            `INSERT INTO article_complexity (article_id, complexity_label, complexity_score, model, raw_scores)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                article.id,
                classification.label,
                classification.score,
                classification.model,
                classification.scores
            ]
        );

        return insert.rows[0];
    } catch (err) {
        const message = err?.message || "Unknown error";
        console.warn("Complexity classification failed:", message);
        return null;
    }
}

async function fetchGuardianArticles(query, { section, keywords = [] } = {}) {
    if (!query) return [];
    try {
        const guardianResults = await guardianService.fetchArticles({
            query,
            page: 1,
            section,
            timeoutMs: GUARDIAN_TIMEOUT_MS
        });
        if (!guardianResults.length) return [];

        const scored = guardianResults
            .map((article) => ({ article, score: scoreArticleByKeywords(article, keywords) }))
            .sort((a, b) => b.score - a.score);

        const minHits = keywords.length >= 3 ? 2 : 1;
        const filtered = scored.filter((item) => item.score >= minHits).map((item) => item.article);
        const selected = filtered.length ? filtered : scored.map((item) => item.article);

        return await saveArticlesForRoadmap(selected.slice(0, CANDIDATE_LIMIT * 2));
    } catch (error) {
        console.warn("Guardian fetch failed for roadmap:", error?.message || error);
        return [];
    }
}

async function loadCandidateArticles(baseArticle, queryTerms, keywordList = []) {
    const topic = (baseArticle.topic || "").trim();
    const sectionSlug = getGuardianSectionSlug(baseArticle);
    let fetchedArticles = [];

    if (queryTerms) {
        fetchedArticles = await fetchGuardianArticles(queryTerms, { section: sectionSlug, keywords: keywordList });
    }

    if (fetchedArticles.length < CANDIDATE_LIMIT && sectionSlug) {
        const fallbackQuery = keywordList.length ? keywordList.slice(0, ROADMAP_QUERY_KEYWORD_LIMIT).join(" ") : (topic || baseArticle.title || "");
        const extra = await fetchGuardianArticles(fallbackQuery, { section: sectionSlug, keywords: keywordList });
        const seen = new Set(fetchedArticles.map((item) => item.id));
        extra.forEach((article) => {
            if (!seen.has(article.id)) {
                fetchedArticles.push(article);
                seen.add(article.id);
            }
        });
    }

    if (fetchedArticles.length) {
        return fetchedArticles
            .filter((article) => article.id !== baseArticle.id)
            .slice(0, CANDIDATE_LIMIT);
    }

    if (keywordList.length) {
        const clauses = [];
        const values = [baseArticle.id];

        keywordList.forEach((keyword) => {
            values.push(`%${keyword}%`);
            clauses.push(`title ILIKE $${values.length} OR body ILIKE $${values.length}`);
        });

        if (topic || sectionSlug) {
            const topicValue = topic || sectionSlug;
            values.push(topicValue);
            values.push(`${topicValue}%`);
            clauses.push(`(topic ILIKE $${values.length - 1} OR topic ILIKE $${values.length})`);
        }

        const result = await pool.query(
            `SELECT * FROM articles
             WHERE id <> $1 AND (${clauses.join(" OR ")})
             ORDER BY published_at DESC
             LIMIT $${values.length + 1}`,
            [...values, CANDIDATE_LIMIT]
        );
        return result.rows;
    }

    if (topic) {
        const result = await pool.query(
            `SELECT * FROM articles
             WHERE id <> $1 AND (topic ILIKE $2 OR topic ILIKE $3)
             ORDER BY published_at DESC
             LIMIT $4`,
            [baseArticle.id, topic, `${topic}%`, CANDIDATE_LIMIT]
        );
        return result.rows;
    }

    const result = await pool.query(
        `SELECT * FROM articles
         WHERE id <> $1
         ORDER BY published_at DESC
         LIMIT $2`,
        [baseArticle.id, CANDIDATE_LIMIT]
    );
    if (result.rows.length > 0) {
        return result.rows;
    }
    return fetchedArticles.filter((article) => article.id !== baseArticle.id).slice(0, CANDIDATE_LIMIT);
}

async function saveArticlesForRoadmap(articles) {
    const saved = [];
    for (const article of articles) {
        try {
            const existing = await pool.query(
                "SELECT * FROM articles WHERE guardian_id = $1",
                [article.guardian_id]
            );
            if (existing.rows.length > 0) {
                saved.push(existing.rows[0]);
                continue;
            }

            const textToEmbed = `${article.title}\n${article.body}`.substring(0, 8000);
            let embeddingStr = null;
            try {
                const embedding = await aiService.generateEmbedding(textToEmbed);
                if (Array.isArray(embedding) && embedding.length) {
                    embeddingStr = `[${embedding.join(',')}]`;
                }
            } catch (error) {
                console.warn(`Embedding skipped for ${article.guardian_id}:`, error?.message || error);
            }

            const result = await pool.query(
                `INSERT INTO articles
                 (guardian_id, title, body, author, published_at, topic, url, image, embedding)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [
                    article.guardian_id,
                    article.title,
                    article.body,
                    article.author,
                    article.published_at,
                    article.topic,
                    article.url,
                    article.image,
                    embeddingStr
                ]
            );
            saved.push(result.rows[0]);
        } catch (err) {
            console.error(`Failed to save article ${article.guardian_id}:`, err);
        }
    }
    return saved;
}

async function loadExistingComplexities(articleIds = []) {
    if (!articleIds.length) return new Map();
    const result = await pool.query(
        "SELECT * FROM article_complexity WHERE article_id = ANY($1)",
        [articleIds]
    );
    const map = new Map();
    result.rows.forEach((row) => {
        map.set(row.article_id, row);
    });
    return map;
}

async function buildRoadmapArticles(baseArticle, candidates = [], onProgress) {
    const allArticles = [baseArticle, ...candidates];
    const seen = new Set();
    const enriched = [];
    const existingMap = await loadExistingComplexities(allArticles.map((article) => article.id));
    let remainingClassify = MAX_CLASSIFY_CALLS;

    for (const article of allArticles) {
        if (!article?.id || seen.has(article.id)) continue;
        seen.add(article.id);

        let complexity = existingMap.get(article.id) || null;
        if (!complexity && remainingClassify > 0) {
            complexity = await getOrCreateComplexity(article, { maxChars: MAX_CLASSIFY_CHARS });
            remainingClassify -= 1;
        }

        if (onProgress) {
            await onProgress();
        }

        enriched.push({
            article,
            complexity_label: complexity?.complexity_label || "unknown",
            complexity_score: normalizeScore(complexity?.complexity_score)
        });
    }

    const baseEntry = enriched.find((entry) => entry.article.id === baseArticle.id);
    const others = enriched.filter((entry) => entry.article.id !== baseArticle.id);

    const sortedOthers = others.sort((a, b) => {
        const rankDiff = labelRank(a.complexity_label) - labelRank(b.complexity_label);
        if (rankDiff !== 0) return rankDiff;
        return normalizeScore(a.complexity_score) - normalizeScore(b.complexity_score);
    });

    let selected = sortedOthers.slice(0, Math.max(0, MAX_ITEMS - 1));
    if (baseEntry) {
        selected = [...selected, baseEntry];
    }

    const sortedSelected = selected.sort((a, b) => {
        const rankDiff = labelRank(a.complexity_label) - labelRank(b.complexity_label);
        if (rankDiff !== 0) return rankDiff;
        return normalizeScore(a.complexity_score) - normalizeScore(b.complexity_score);
    });

    return sortedSelected.slice(0, MAX_ITEMS);
}

async function runRoadmapBuild(roadmapId, baseArticle) {
    try {
        const roadmapInfo = await pool.query(
            `SELECT name FROM roadmaps WHERE roadmap_id = $1`,
            [roadmapId]
        );
        const roadmapName = roadmapInfo.rows[0]?.name || `Roadmap: ${baseArticle.title}`;

        const keywordList = buildRoadmapKeywords(baseArticle);
        const queryTerms = buildRoadmapQuery(baseArticle);
        await pool.query(
            `UPDATE roadmaps SET query_terms = $1, fetch_status = 'fetching' WHERE roadmap_id = $2`,
            [queryTerms, roadmapId]
        );

        const candidates = await loadCandidateArticles(baseArticle, queryTerms, keywordList);
        const totalItems = Math.min(MAX_ITEMS, 1 + candidates.length);

        await pool.query(
            `UPDATE roadmaps SET fetch_status = $1 WHERE roadmap_id = $2`,
            [candidates.length ? 'fetched' : 'fallback', roadmapId]
        );

        await pool.query(
            `UPDATE roadmaps SET total_items = $1 WHERE roadmap_id = $2`,
            [totalItems, roadmapId]
        );

        let completed = 0;
        const roadmapItems = await buildRoadmapArticles(baseArticle, candidates, async () => {
            completed += 1;
            await pool.query(
                `UPDATE roadmaps SET completed_items = $1 WHERE roadmap_id = $2`,
                [Math.min(completed, totalItems), roadmapId]
            );
        });

        let step = 1;
        for (const item of roadmapItems) {
            await pool.query(
                `INSERT INTO roadmap_items
                 (roadmap_id, article_id, step_order, complexity_label, complexity_score)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    roadmapId,
                    item.article.id,
                    step,
                    item.complexity_label,
                    item.complexity_score
                ]
            );
            step += 1;
        }

        await pool.query(
            `UPDATE roadmaps SET status = 'ready' WHERE roadmap_id = $1`,
            [roadmapId]
        );

        try {
            const description = await aiService.summarizeRoadmap({
                name: roadmapName,
                items: roadmapItems.map((item) => item.article)
            });

            if (description) {
                await pool.query(
                    `UPDATE roadmaps SET description = $1 WHERE roadmap_id = $2`,
                    [description, roadmapId]
                );
            }
        } catch (err) {
            console.warn("Roadmap summary failed:", err?.message || err);
        }
    } catch (error) {
        console.error("Roadmap build failed:", error?.message || error);
        await pool.query(
            `UPDATE roadmaps SET status = 'error' WHERE roadmap_id = $1`,
            [roadmapId]
        );
    }
}

async function createRoadmap(req, res, next) {
    const { articleId, name } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
    }

    if (!articleId) {
        return res.status(400).json({ error: "articleId is required" });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM articles WHERE id::text = $1 OR guardian_id = $1`,
            [articleId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Article not found" });
        }

        const baseArticle = result.rows[0];
        const existingRoadmap = await pool.query(
            `SELECT roadmap_id, status FROM roadmaps WHERE user_id = $1 AND source_article_id = $2`,
            [userId, baseArticle.id]
        );

        if (existingRoadmap.rows.length > 0) {
            return res.json({
                roadmapId: existingRoadmap.rows[0].roadmap_id,
                status: existingRoadmap.rows[0].status,
                existing: true
            });
        }

        const roadmapName = (name || `Roadmap: ${baseArticle.title}`).trim().slice(0, 120);

        const roadmapId = uuidv4();
        const publicId = uuidv4();

        await pool.query(
            `INSERT INTO roadmaps (roadmap_id, user_id, name, public_id, source_article_id, total_items, completed_items, status, fetch_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [roadmapId, userId, roadmapName, publicId, baseArticle.id, 0, 0, 'pending', 'pending']
        );

        setImmediate(() => {
            runRoadmapBuild(roadmapId, baseArticle);
        });

        res.status(202).json({
            roadmapId,
            status: 'pending'
        });
    } catch (error) {
        next(error);
    }
}

async function loadRoadmapById(roadmapId, userId) {
    const roadmapResult = await pool.query(
        `SELECT roadmap_id, name, public_id, total_items, completed_items, status, description, source_article_id, query_terms, fetch_status, created_at
         FROM roadmaps
         WHERE roadmap_id = $1 AND user_id = $2`,
        [roadmapId, userId]
    );

    if (roadmapResult.rows.length === 0) {
        return null;
    }

    const itemsResult = await pool.query(
        `SELECT ri.step_order, ri.complexity_label, ri.complexity_score,
                a.*
         FROM roadmap_items ri
         JOIN articles a ON a.id = ri.article_id
         WHERE ri.roadmap_id = $1
         ORDER BY ri.step_order ASC`,
        [roadmapId]
    );

    return {
        roadmap: roadmapResult.rows[0],
        items: itemsResult.rows
    };
}

async function listRoadmaps(req, res, next) {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const result = await pool.query(
        `SELECT r.roadmap_id, r.name, r.public_id, r.total_items, r.completed_items, r.status, r.description, r.query_terms, r.fetch_status, r.created_at,
                    r.source_article_id, a.image AS source_image,
                    COUNT(ri.id) AS item_count
             FROM roadmaps r
             LEFT JOIN roadmap_items ri ON ri.roadmap_id = r.roadmap_id
             LEFT JOIN articles a ON a.id = r.source_article_id
             WHERE r.user_id = $1
             GROUP BY r.roadmap_id, a.image
             ORDER BY r.created_at DESC`,
            [userId]
        );

        res.json({ roadmaps: result.rows });
    } catch (error) {
        next(error);
    }
}

async function getRoadmap(req, res, next) {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const detail = await loadRoadmapById(id, userId);
        if (!detail) {
            return res.status(404).json({ error: "Roadmap not found" });
        }
        res.json(detail);
    } catch (error) {
        next(error);
    }
}

async function getRoadmapByPublicId(req, res, next) {
    const { publicId } = req.params;
    try {
        const roadmapResult = await pool.query(
            `SELECT roadmap_id, name, public_id, total_items, completed_items, status, description, source_article_id, query_terms, fetch_status, created_at
             FROM roadmaps
             WHERE public_id = $1`,
            [publicId]
        );

        if (roadmapResult.rows.length === 0) {
            return res.status(404).json({ error: "Roadmap not found" });
        }

        const roadmap = roadmapResult.rows[0];
        const itemsResult = await pool.query(
            `SELECT ri.step_order, ri.complexity_label, ri.complexity_score,
                    a.*
             FROM roadmap_items ri
             JOIN articles a ON a.id = ri.article_id
             WHERE ri.roadmap_id = $1
             ORDER BY ri.step_order ASC`,
            [roadmap.roadmap_id]
        );

        res.json({ roadmap, items: itemsResult.rows });
    } catch (error) {
        next(error);
    }
}

async function getRoadmapProgress(req, res, next) {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const result = await pool.query(
            `SELECT roadmap_id, total_items, completed_items, status, query_terms, fetch_status
             FROM roadmaps
             WHERE roadmap_id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Roadmap not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
}

async function getRoadmapForArticle(req, res, next) {
    const userId = req.user?.id;
    const { articleId } = req.params;

    if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const articleResult = await pool.query(
            `SELECT id FROM articles WHERE id::text = $1 OR guardian_id = $1`,
            [articleId]
        );

        if (articleResult.rows.length === 0) {
            return res.status(404).json({ error: "Article not found" });
        }

        const result = await pool.query(
            `SELECT roadmap_id, status
             FROM roadmaps
             WHERE user_id = $1 AND source_article_id = $2`,
            [userId, articleResult.rows[0].id]
        );

        if (result.rows.length === 0) {
            return res.json({ roadmapId: null });
        }

        res.json({ roadmapId: result.rows[0].roadmap_id, status: result.rows[0].status });
    } catch (error) {
        next(error);
    }
}

async function deleteRoadmap(req, res, next) {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const result = await pool.query(
            `DELETE FROM roadmaps WHERE roadmap_id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Roadmap not found" });
        }

        res.json({ status: "deleted" });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createRoadmap,
    listRoadmaps,
    getRoadmap,
    getRoadmapByPublicId,
    getRoadmapProgress,
    getRoadmapForArticle,
    deleteRoadmap
};
