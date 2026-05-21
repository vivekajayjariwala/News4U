const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Generate vector embedding for text using Gemini
 * @param {string} text 
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
    if (!genAI) {
        console.warn('Google API Key missing, returning mock embedding');
        return new Array(3072).fill(0).map(() => Math.random()); // gemini-embedding-001 is 3072 dims
        // text-embedding-004 returns 768 dimensions by default.
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('Embedding generation failed:', error);
        throw error;
    }
}

/**
 * Rewrite text with specific tone/complexity using Gemini
 * @param {string} text 
 * @param {Object} options { tone, complexity, type, regenerate }
 * @returns {Promise<string>}
 */
async function rewriteText(text, { tone, complexity, type, regenerate }) {
    if (!genAI) {
        return `[MOCK REWRITE] (${tone}/${complexity}): ${text.substring(0, 100)}...${regenerate ? ' (Regenerated)' : ''}`;
    }

    const prompt = `Rewrite the following text.
Tone: ${tone || 'neutral'}
Complexity: ${complexity || 'standard'}
${type === 'highlight' ? 'Only rewrite the highlighted portion.' : 'Rewrite the entire article.'}
${regenerate ? 'Provide a clearer explanation of this term in 2 to 3 sentences using simple language. If helpful, include a brief analogy or example.' : ''}

Return only the rewritten text. Do not add a preamble, labels, or commentary.

Text:
${text}`;

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const output = response.text().trim();
            if (!type || type === 'full') {
                const lines = output.split('\n').map((line) => line.trim()).filter(Boolean);
                if (lines.length > 1 && /^here('?s| is)\b/i.test(lines[0])) {
                    return lines.slice(1).join('\n');
                }
            }
            return output;
        } catch (error) {
            if (error.status === 429 || error.message.includes('429')) {
                console.warn(`Rate limited (429). Retrying in ${Math.pow(2, retryCount + 1)}s...`);
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount + 1) * 1000));
                retryCount++;
            } else {
                console.error('Rewrite failed:', error);
                throw error;
            }
        }
    }
    throw new Error('Max retries exceeded for AI request.');
}

async function summarizeRoadmap({ name, items }) {
    if (!genAI) {
        return null;
    }

    const list = (items || [])
        .map((item, index) => `${index + 1}. ${item.title} (${item.topic || 'General'})`)
        .join('\n');

    const prompt = `Write a concise 2-3 sentence description for a learning roadmap.
Roadmap name: ${name}
Articles:
${list}

Focus on the overall learning progression and themes. Avoid mentioning specific scores.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
}

async function generateTermDefinitions(text) {
    if (!genAI) {
        return [];
    }

    const prompt = `Identify 2-5 technically complex terms from the article and define them in simple language.
Return ONLY JSON with the shape:
{ "terms": [ { "term": "...", "definition": "..." } ] }

Rules:
- Use short, plain-language definitions (1-2 sentences).
- Only include terms that appear in the article.
- Do not include markdown or extra text.

Article:
${text}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text();

    try {
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) return [];
        const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
        const terms = Array.isArray(parsed?.terms) ? parsed.terms : [];
        return terms
            .filter((item) => item?.term && item?.definition)
            .slice(0, 5);
    } catch (error) {
        console.warn('Failed to parse term definitions:', error?.message || error);
        return [];
    }
}

module.exports = {
    generateEmbedding,
    rewriteText,
    summarizeRoadmap,
    generateTermDefinitions
};
