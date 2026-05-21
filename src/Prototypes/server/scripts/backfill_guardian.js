const pool = require("../db");
const guardianService = require("../services/guardianService");
const aiService = require("../services/aiService");

const CATEGORIES = [
    'World',
    'Science',
    'Technology',
    'Sport',
    'Business',
    'Lifestyle',
    'Culture',
    'Environment'
];

const PAGES_PER_CATEGORY = 2; // Fetch 10 pages (~40 articles) per category
const DELAY_MS = 1000; // 1 second delay between API calls

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function saveArticle(article) {
    try {
        // 1. Check if exists
        const existing = await pool.query("SELECT id FROM articles WHERE guardian_id = $1", [article.guardian_id]);
        if (existing.rows.length > 0) {
            console.log(`Skipping existing: ${article.title.substring(0, 30)}...`);
            return;
        }

        // 2. Generate Embedding
        const textToEmbed = `${article.title}\n${article.body}`.substring(0, 8000);

        // Add retry to embedding too if needed, but aiService handles some errors.
        // We'll wrap in try-catch block here locally just in case.
        let embedding;
        try {
            embedding = await aiService.generateEmbedding(textToEmbed);
        } catch (e) {
            console.error(`Failed to embed article ${article.guardian_id}, skipping. Error: ${e.message}`);
            return;
        }

        const embeddingStr = `[${embedding.join(',')}]`;

        // 3. Insert
        await pool.query(
            `INSERT INTO articles 
             (guardian_id, title, body, author, published_at, topic, url, image, embedding)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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
        console.log(`Saved: ${article.title.substring(0, 30)}...`);

    } catch (err) {
        console.error(`Failed to save article ${article.guardian_id}:`, err.message);
    }
}

async function run() {
    console.log("Starting Guardian Backfill...");

    for (const category of CATEGORIES) {
        console.log(`\n--- Processing Category: ${category} ---`);

        for (let page = 1; page <= PAGES_PER_CATEGORY; page++) {
            try {
                console.log(`Fetching ${category} page ${page}...`);
                const articles = await guardianService.fetchArticles({ query: category, page });

                if (articles.length === 0) {
                    console.log("No more articles found.");
                    break;
                }

                // Save in serial to avoid overwhelming DB or Embedding API
                for (const article of articles) {
                    await saveArticle(article);
                }

                // Respect Rate Limits
                await sleep(DELAY_MS);

            } catch (error) {
                console.error(`Error fetching ${category} page ${page}:`, error.message);
            }
        }
    }

    console.log("\nBackfill Complete!");
    process.exit(0);
}

run();
