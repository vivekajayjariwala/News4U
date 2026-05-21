const axios = require('axios');

const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;
const GUARDIAN_BASE_URL = 'https://content.guardianapis.com';

/**
 * Fetch latest articles from Guardian API
 * @param {Object} options
 * @param {string} [options.query] - Optional search query (supports OR strings)
 * @param {number} [options.page] - Page number
 * @param {string} [options.section] - Optional Guardian section slug (e.g., "technology")
 * @returns {Promise<Array>} Normalized articles
 */
async function fetchArticles({ query = '', page = 1, section, timeoutMs } = {}) {
    try {
        const params = {
            'api-key': GUARDIAN_API_KEY,
            page,
            'show-fields': 'body,headline,thumbnail,byline,publication', // Request specific fields
            'page-size': 20
        };

        if (query) {
            params.q = query;
        }

        // Guardian supports filtering by a single section slug via `section`
        if (section) {
            params.section = section;
        }

        const response = await axios.get(`${GUARDIAN_BASE_URL}/search`, {
            params,
            timeout: timeoutMs
        });
        const results = response.data.response.results;

        return results.map(normalizeArticle);
    } catch (error) {
        console.error('Error fetching from Guardian:', error.message);
        throw error;
    }
}

/**
 * Normalize Guardian article data to our schema
 */
function normalizeArticle(item) {
    return {
        guardian_id: item.id,
        title: item.fields?.headline || item.webTitle,
        body: item.fields?.body || '', // HTML body
        author: item.fields?.byline || 'Unknown',
        published_at: item.webPublicationDate,
        topic: item.sectionName,
        url: item.webUrl,
        image: item.fields?.thumbnail
    };
}

module.exports = {
    fetchArticles
};
