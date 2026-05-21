const pool = require("../db");
const guardianService = require("../services/guardianService");
const aiService = require("../services/aiService");
const hfService = require("../services/hfService");

const COMPLEXITY_LABELS = ["beginner", "intermediate", "advanced"];
const complexityInFlight = new Map();

function stripHtml(html = "") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function getOrCreateTermDefinitions(article) {
    const existing = await pool.query(
        `SELECT term, definition FROM article_term_definitions
         WHERE article_id = $1
         ORDER BY id ASC`,
        [article.id]
    );

    if (existing.rows.length >= 2) {
        return existing.rows.slice(0, 5);
    }

    const textToAnalyze = `${article.title}\n${stripHtml(article.body || "")}`.substring(0, 6000);
    const generated = await aiService.generateTermDefinitions(textToAnalyze);

    if (!generated.length) {
        return existing.rows;
    }

    const saved = [];
    for (const item of generated) {
        try {
            const insert = await pool.query(
                `INSERT INTO article_term_definitions (article_id, term, definition)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (article_id, term) DO UPDATE SET definition = EXCLUDED.definition
                 RETURNING term, definition`,
                [article.id, item.term.trim(), item.definition.trim()]
            );
            if (insert.rows[0]) {
                saved.push(insert.rows[0]);
            }
        } catch (error) {
            console.warn('Failed to save term definition:', error?.message || error);
        }
    }

    return saved.length ? saved : existing.rows;
}

async function getOrCreateArticleRewrite(article, targetLevel) {
    const existing = await pool.query(
        `SELECT content FROM article_rewrites
         WHERE article_id = $1 AND target_level = $2`,
        [article.id, targetLevel]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0].content;
    }

    const textToRewrite = `${article.title}\n${stripHtml(article.body || "")}`.substring(0, 8000);
    const rewritten = await aiService.rewriteText(textToRewrite, {
        tone: 'neutral',
        complexity: 'simple',
        type: 'full'
    });

    const insert = await pool.query(
        `INSERT INTO article_rewrites (article_id, target_level, content)
         VALUES ($1, $2, $3)
         ON CONFLICT (article_id, target_level) DO UPDATE SET content = EXCLUDED.content
         RETURNING content`,
        [article.id, targetLevel, rewritten]
    );

    return insert.rows[0]?.content || rewritten;
}

async function attachComplexity(article) {
    if (!article?.id) return article;

    if (complexityInFlight.has(article.id)) {
        return complexityInFlight.get(article.id);
    }

    const pending = (async () => {
        const existing = await pool.query(
            "SELECT * FROM article_complexity WHERE article_id = $1",
            [article.id]
        );

        if (existing.rows.length > 0) {
            return {
                ...article,
                complexity_label: existing.rows[0].complexity_label,
                complexity_score: existing.rows[0].complexity_score
            };
        }

        const textToClassify = `${article.title}\n${stripHtml(article.body || "")}`
            .trim()
            .substring(0, 4000);

        try {
            const classification = await hfService.classifyComplexity(textToClassify, COMPLEXITY_LABELS);
            if (!classification) return article;

            await pool.query(
                `INSERT INTO article_complexity (article_id, complexity_label, complexity_score, model, raw_scores)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (article_id) DO NOTHING`,
                [
                    article.id,
                    classification.label,
                    classification.score,
                    classification.model,
                    classification.scores
                ]
            );

            return {
                ...article,
                complexity_label: classification.label,
                complexity_score: classification.score
            };
        } catch (err) {
            console.error("Complexity classification failed:", err);
            return article;
        } finally {
            complexityInFlight.delete(article.id);
        }
    })();

    complexityInFlight.set(article.id, pending);
    return pending;
}

// Map stored preference slugs (from registration) to Guardian section slugs and topic aliases
const PREFERENCE_TOPIC_MAP = {
    tech: { sections: ["technology"], topics: ["technology", "tech"] },
    science: { sections: ["science"], topics: ["science"] },
    politics: { sections: ["politics"], topics: ["politics"] },
    business: { sections: ["business"], topics: ["business"] },
    sports: { sections: ["sport"], topics: ["sport", "sports"] },
    entertainment: { sections: ["culture"], topics: ["culture", "entertainment"] },
    health: { sections: ["health"], topics: ["health"] },
    environment: { sections: ["environment"], topics: ["environment", "climate"] },
    design: { sections: ["artanddesign"], topics: ["design", "art & design", "artanddesign"] },
    travel: { sections: ["travel"], topics: ["travel"] },
    fashion: { sections: ["fashion"], topics: ["fashion"] },
    art: { sections: ["artanddesign"], topics: ["art", "art & design", "artanddesign"] },
    music: { sections: ["music"], topics: ["music"] },
    gaming: { sections: ["games"], topics: ["gaming", "games"] },
    food: { sections: ["food"], topics: ["food"] },
    history: { sections: ["world"], topics: ["history", "world"] },
    literature: { sections: ["books"], topics: ["literature", "books"] },
    psychology: { sections: ["society"], topics: ["psychology", "society"] }
};

function buildPreferenceTargets(preferredTopicsRaw = []) {
    const sectionSet = new Set();
    const topicSet = new Set();

    preferredTopicsRaw
        .map((t) => (t || "").toString().toLowerCase())
        .forEach((slug) => {
            const mapping = PREFERENCE_TOPIC_MAP[slug];
            if (mapping) {
                mapping.sections.forEach((s) => sectionSet.add(s));
                mapping.topics.forEach((t) => topicSet.add(t));
            } else if (slug) {
                // Fallback: use the raw slug for both lists
                sectionSet.add(slug);
                topicSet.add(slug);
            }
        });

    return {
        sections: Array.from(sectionSet),
        topics: Array.from(topicSet)
    };
}

async function loadUserPreferences(userId) {
    if (!userId) return { sections: [], topics: [] };

    const { rows } = await pool.query(
        "SELECT preferred_topics FROM user_profiles WHERE user_id = $1",
        [userId]
    );

    const preferredTopicsRaw = rows[0]?.preferred_topics || [];
    return buildPreferenceTargets(preferredTopicsRaw);
}

/**
 * Fetch headlines, store them (with embeddings), and return them.
 */
async function getHeadlines(req, res, next) {
    try {
        const noPrefs = req.query.noPrefs === 'true';
        const { category, q, startDate, endDate, page = 1 } = req.query;
        const limit = 20;
        const offset = (page - 1) * limit;

        const requestParts = [];
        if (q) requestParts.push(`q=${q}`);
        if (category) requestParts.push(`category=${category}`);
        if (startDate) requestParts.push(`startDate=${startDate}`);
        if (endDate) requestParts.push(`endDate=${endDate}`);
        if (page) requestParts.push(`page=${page}`);
        const requestSuffix = requestParts.length ? `: ${requestParts.join(", ")}` : "";
        console.log(`GetHeadlines request${requestSuffix}`);

        let dbArticles = [];

        // Toggle for preference-first behavior; set to false to bypass preferences globally
        const applyPreferences = !noPrefs && !q && (!category || category === "All");
        let prefTopics = [];
        let prefSections = [];
        if (applyPreferences && req.user?.id) {
            const prefs = await loadUserPreferences(req.user.id);
            prefTopics = prefs.topics;
            prefSections = prefs.sections;
            console.log(`Preferences loaded for user ${req.user.id}: topics=${JSON.stringify(prefTopics)}, sections=${JSON.stringify(prefSections)}`);
        } else {
            if (!applyPreferences) {
                console.log("Preferences not applied (explicit q/category provided).");
            } else {
                console.log("No authenticated user; preferences not applied.");
            }
        }

        // Base date condition
        const dateParams = [];
        if (startDate) dateParams.push(startDate);
        if (endDate) dateParams.push(endDate);

        function getDateCondition(startIndex) {
            let cond = '';
            let idx = startIndex;
            if (startDate) {
                cond += ` AND published_at >= $${idx}`;
                idx++;
            }
            if (endDate) {
                cond += ` AND published_at <= $${idx}`;
            }
            return cond;
        }

        // 1. Try DB First
        if (q) {
            const textQuery = `SELECT * FROM articles WHERE (title ILIKE $1 OR body ILIKE $1 OR author ILIKE $1) ${getDateCondition(4)} ORDER BY published_at DESC LIMIT $2 OFFSET $3`;
            const params = [`%${q}%`, limit, offset, ...dateParams];
            const result = await pool.query(textQuery, params);
            dbArticles = result.rows;
        } else if (category && category !== 'All') {
            const result = await pool.query(
                `SELECT * FROM articles WHERE (topic ILIKE $1 OR topic ILIKE $2) ${getDateCondition(5)} ORDER BY published_at DESC LIMIT $3 OFFSET $4`,
                [category, `${category}%`, limit, offset, ...dateParams]
            );
            dbArticles = result.rows;
        } else if (applyPreferences && prefTopics.length) {
            // Preference-first ordering: preferred topics first, then recency
            const result = await pool.query(
                `SELECT *, (LOWER(topic) = ANY($1)) AS is_pref
                 FROM articles
                 WHERE 1=1 ${getDateCondition(4)}
                 ORDER BY (LOWER(topic) = ANY($1)) DESC, published_at DESC
                 LIMIT $2 OFFSET $3`,
                [prefTopics, limit, offset, ...dateParams]
            );
            dbArticles = result.rows;
        } else {
            // All headlines
            const result = await pool.query(`SELECT * FROM articles WHERE 1=1 ${getDateCondition(3)} ORDER BY published_at DESC LIMIT $1 OFFSET $2`, [limit, offset, ...dateParams]);
            dbArticles = result.rows;
        }

        if (dbArticles.length > 0) {
            console.log(`Found ${dbArticles.length} articles in DB (page ${page}).`);

            // If applying preferences and preferred count is too low, try to backfill then re-run the preferred query
            if (applyPreferences && prefTopics.length) {
                const prefCount = dbArticles.filter((a) => prefTopics.includes((a.topic || '').toLowerCase())).length;
                if (prefCount < 5) {
                    console.log(`Only ${prefCount} preferred-topic articles on page ${page}; backfilling from Guardian...`);

                    await backfillFromGuardian({
                        prefTopics,
                        prefSections,
                        q,
                        category,
                        page,
                        limit,
                        offset
                    });

                    // Re-run the preference-first query after backfill
                    const refreshed = await pool.query(
                        `SELECT *, (LOWER(topic) = ANY($1)) AS is_pref
                         FROM articles
                         WHERE 1=1 ${getDateCondition(4)}
                         ORDER BY (LOWER(topic) = ANY($1)) DESC, published_at DESC
                         LIMIT $2 OFFSET $3`,
                        [prefTopics, limit, offset, ...dateParams]
                    );
                    dbArticles = refreshed.rows;
                }
            }

            res.json({
                status: "ok",
                articles: dbArticles
            });
            return;
        }

        // If page > 1 and DB is empty, it might just mean we ran out of DB content.
        // We generally don't want to fallback to API for page > 1 unless we are sure.
        // But for now, let's keep the fallback ONLY for page 1 or if we want to fill gaps.
        // Actually, if we backfilled, we should have data.
        // If the user requests page 10 and we don't have it, maybe we shouldn't fetch 200 articles from Guardian API suddenly.

        // If not applying preferences and this is a deep page, you may choose to bail out instead of backfilling.
        // Toggle this condition if you want to disable backfill for deep pages in the future.
        if (!applyPreferences && page > 1) {
            console.log("DB empty for this page. Returning empty list.");
            res.json({ status: "ok", articles: [] });
            return;
        }

        console.log("DB empty/miss for this page. Fallback to Guardian API...");

        // 2. Fetch from Guardian (Fallback - Only valid for first fetch usually)
        // Note: We don't strictly support the date filter in the initial Guardian backfill since we mostly rely on our own DB.
        const articles = await guardianService.fetchArticles({
            query: buildGuardianQuery(prefTopics, q || category),
            section: prefSections.length === 1 ? prefSections[0] : undefined,
            page
        });
        console.log(`Guardian returned ${articles.length} articles.`);

        // 3. Save to DB
        const savedArticles = await saveArticles(articles);
        console.log(`Saved ${savedArticles.length} articles to DB.`);

        // If a date was provided, doing an in-memory filter post-fetch since we didn't pass it to Guardian directly
        let finalArticles = savedArticles;
        if (startDate || endDate) {
            finalArticles = finalArticles.filter(a => {
                const pubMs = new Date(a.published_at).getTime();
                let valid = true;
                if (startDate) valid = valid && pubMs >= new Date(startDate).getTime();
                if (endDate) valid = valid && pubMs <= new Date(endDate).getTime();
                return valid;
            });
        }

        res.json({
            status: "ok",
            articles: finalArticles
        });
    } catch (error) {
        console.error("Error in getHeadlines:", error);
        next(error);
    }
}

/**
 * Helper to save articles and generate embeddings
 */
async function saveArticles(articles) {
    const saved = [];
    for (const article of articles) {
        try {
            // 1. Check if exists
            const existing = await pool.query("SELECT * FROM articles WHERE guardian_id = $1", [article.guardian_id]);
            if (existing.rows.length > 0) {
                saved.push(existing.rows[0]);
                continue;
            }

            // 2. Generate Embedding
            // Combine title and body for embedding context
            const textToEmbed = `${article.title}\n${article.body}`.substring(0, 8000); // Truncate for API limits
            const embedding = await aiService.generateEmbedding(textToEmbed);
            // Format vector for pgvector: '[1,2,3...]'
            const embeddingStr = `[${embedding.join(',')}]`;

            // 3. Insert
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
            // Continue processing others
        }
    }
    return saved;
}

function buildGuardianQuery(prefTopics = [], fallback) {
    if (prefTopics.length) {
        return prefTopics.join(' OR ');
    }
    return fallback || '';
}

async function backfillFromGuardian({ prefTopics, prefSections, q, category, page, limit, offset }) {
    // Build a Guardian request using preferences if available; otherwise fallback to q/category
    const guardianQuery = buildGuardianQuery(prefTopics, q || category);
    const section = prefSections.length === 1 ? prefSections[0] : undefined;

    const articles = await guardianService.fetchArticles({
        query: guardianQuery,
        section,
        page
    });
    console.log(`Guardian returned ${articles.length} articles for backfill.`);

    const savedArticles = await saveArticles(articles);
    console.log(`Saved ${savedArticles.length} backfilled articles.`);
    return savedArticles;
}

/**
 * Search local DB with vector similarity
 */
async function searchArticles(req, res, next) {
    const { q } = req.query;
    try {
        // 1. Generate embedding for query
        const queryEmbedding = await aiService.generateEmbedding(q);
        const embeddingStr = `[${queryEmbedding.join(',')}]`;

        // 2. Search using cosine similarity (<=> is L2 distance, <=> is cosine distance operator in pgvector? 
        // pgvector: <-> is L2 distance, <=> is cosine distance, <#> is inner product.
        // We want cosine similarity, so order by cosine distance <=> ASC.
        const result = await pool.query(
            `SELECT *, 1 - (embedding <=> $1) as similarity
       FROM articles
       ORDER BY embedding <=> $1
       LIMIT 20`,
            [embeddingStr]
        );

        res.json({
            status: "ok",
            results: result.rows
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Rewrite article (AI feature)
 */
async function rewriteArticle(req, res, next) {
    const { text, tone, complexity, type, regenerate } = req.body;
    try {
        const rewritten = await aiService.rewriteText(text, { tone, complexity, type, regenerate });
        res.json({ original: text, rewritten });
    } catch (error) {
        next(error);
    }
}

// ... existing code ...

/**
 * Record user interaction and potentially update knowledge level
 */
async function recordInteraction(req, res, next) {
    const { articleId, action, metadata } = req.body;
    // TODO: Get real user ID from auth middleware
    const userId = req.user?.id || 1;

    try {
        await pool.query(
            `INSERT INTO user_interactions (user_id, article_id, action, metadata)
       VALUES ($1, $2, $3, $4)`,
            [userId, articleId, action, metadata]
        );

        // Simple learning logic:
        // If user requests "rewrite" with "beginner" complexity, maybe downgrade level?
        // If user reads "advanced" topic, upgrade?
        // For now, we just record it.

        res.json({ status: "recorded" });
    } catch (err) {
        next(err);
    }
}

// ... existing code ...

/**
 * Get single article by ID
 */
async function getArticleById(req, res, next) {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM articles WHERE id::text = $1 OR guardian_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Article not found" });
        }
        const withComplexity = await attachComplexity(result.rows[0]);
        res.json(withComplexity);
    } catch (error) {
        next(error);
    }
}

async function getArticleTerms(req, res, next) {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM articles WHERE id::text = $1 OR guardian_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Article not found" });
        }

        const terms = await getOrCreateTermDefinitions(result.rows[0]);
        res.json({ terms });
    } catch (error) {
        next(error);
    }
}

async function getArticleRewrite(req, res, next) {
    const { id } = req.params;
    const target = (req.query.target || 'beginner').toString().toLowerCase();
    try {
        const result = await pool.query(
            `SELECT * FROM articles WHERE id::text = $1 OR guardian_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Article not found" });
        }

        const content = await getOrCreateArticleRewrite(result.rows[0], target);
        res.json({ content, target });
    } catch (error) {
        next(error);
    }
}

/**
 * Get top 5 most read topics based on global user history
 */
async function getTopTopics(req, res, next) {
    try {
        const result = await pool.query(
            `SELECT a.topic, COUNT(ui.id) as read_count
             FROM user_interactions ui
             JOIN articles a ON ui.article_id = a.id
             WHERE ui.action = 'read' AND a.topic IS NOT NULL AND a.topic != '' AND a.published_at >= NOW() - INTERVAL '1 year'
             GROUP BY a.topic
             ORDER BY read_count DESC
             LIMIT 15`
        );

        let topTopics = result.rows.map(r => r.topic);
        const validCategories = ['World', 'Science', 'Technology', 'Sport', 'Business', 'Lifestyle', 'Culture', 'Environment'];

        let validTopics = topTopics.map(t => {
            const temp = t.toLowerCase();
            const matched = validCategories.find(c => c.toLowerCase() === temp);
            return matched || null;
        }).filter(Boolean);

        // Remove duplicates
        validTopics = [...new Set(validTopics)];

        // Fallback to top categories by article count if interactions are sparse
        if (validTopics.length < 5) {
            const fallbackResult = await pool.query(
                `SELECT topic, COUNT(id) as article_count
                 FROM articles 
                 WHERE topic IS NOT NULL AND topic != '' AND published_at >= NOW() - INTERVAL '1 year'
                 GROUP BY topic
                 ORDER BY article_count DESC
                 LIMIT 15`
            );

            const fallbackTopics = fallbackResult.rows.map(r => r.topic).map(t => {
                const temp = t.toLowerCase();
                const matched = validCategories.find(c => c.toLowerCase() === temp);
                return matched || null;
            }).filter(Boolean);

            validTopics = [...new Set([...validTopics, ...fallbackTopics])];
        }

        // Final fallback if DB is totally empty
        if (validTopics.length < 5) {
            const missing = validCategories.filter(c => !validTopics.includes(c));
            validTopics = [...new Set([...validTopics, ...missing])];
        }

        res.json({
            status: "ok",
            topics: validTopics.slice(0, 5)
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getHeadlines,
    searchArticles,
    rewriteArticle,
    recordInteraction,
    getArticleById,
    getTopTopics,
    getArticleTerms,
    getArticleRewrite
};