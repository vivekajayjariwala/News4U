const axios = require("axios");

const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODELS = process.env.HF_COMPLEXITY_MODELS
    ? process.env.HF_COMPLEXITY_MODELS.split(",").map((model) => model.trim()).filter(Boolean)
    : [
        "Qwen/Qwen2.5-7B-Instruct"
    ];
const HF_BASE_URL = process.env.HF_API_BASE_URL || "https://router.huggingface.co/hf-inference/models";
const HF_CHAT_BASE_URL = process.env.HF_CHAT_BASE_URL || "https://router.huggingface.co/v1/chat/completions";
const HF_TIMEOUT_MS = Number.parseInt(process.env.HF_TIMEOUT_MS || "15000", 10);
const HF_MAX_NEW_TOKENS = Number.parseInt(process.env.HF_MAX_NEW_TOKENS || "200", 10);
const HF_DEBUG = (process.env.HF_DEBUG || "").toLowerCase() === "true";

const DEFAULT_LABELS = ["beginner", "intermediate", "advanced"];

async function classifyComplexity(text, labels = DEFAULT_LABELS) {
    if (!text || !text.trim()) {
        return null;
    }

    if (!HF_API_KEY) {
        console.warn("HF_API_KEY missing, returning mock complexity");
        return {
            label: "intermediate",
            score: 0.5,
            scores: {
                beginner: 0.2,
                intermediate: 0.5,
                advanced: 0.3
            },
            model: "mock"
        };
    }

    const prompt = buildReadabilityPrompt(text, labels);

    const baseUrls = [HF_BASE_URL];

    let data = null;
    let lastError = null;
    let modelUsed = null;

    for (const model of HF_MODELS) {
        try {
            const response = await axios.post(HF_CHAT_BASE_URL, {
                model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: HF_MAX_NEW_TOKENS,
                temperature: 0.2
            }, {
                headers: {
                    Authorization: `Bearer ${HF_API_KEY}`
                },
                timeout: HF_TIMEOUT_MS
            });

            data = response.data;
            lastError = null;
            modelUsed = model;
            if (HF_DEBUG) {
                console.log("HF chat request succeeded", {
                    model,
                    baseUrl: HF_CHAT_BASE_URL
                });
            }
        } catch (error) {
            lastError = error;
            const status = error?.response?.status;
            if (HF_DEBUG) {
                const responseData = error?.response?.data;
                console.warn("HF chat request failed", {
                    model,
                    baseUrl: HF_CHAT_BASE_URL,
                    status,
                    code: error?.code,
                    message: error?.message,
                    response: typeof responseData === "string" ? responseData.slice(0, 500) : responseData
                });
            }
            if (status !== 404 && status !== 410) {
                break;
            }
        }

        if (data) {
            break;
        }
    }

    if (!data) {
        for (const model of HF_MODELS) {
            for (const baseUrl of baseUrls) {
                try {
                    const response = await axios.post(`${baseUrl}/${model}`, {
                        inputs: prompt,
                        parameters: {
                            max_new_tokens: HF_MAX_NEW_TOKENS,
                            temperature: 0.2,
                            return_full_text: false
                        },
                        options: {
                            wait_for_model: true
                        }
                    }, {
                        headers: {
                            Authorization: `Bearer ${HF_API_KEY}`
                        },
                        timeout: HF_TIMEOUT_MS
                    });

                    data = Array.isArray(response.data) ? response.data[0] : response.data;
                    lastError = null;
                    modelUsed = model;
                    break;
                } catch (error) {
                    lastError = error;
                    const status = error?.response?.status;
                    if (HF_DEBUG) {
                        const responseData = error?.response?.data;
                        console.warn("HF inference request failed", {
                            model,
                            baseUrl,
                            status,
                            code: error?.code,
                            message: error?.message,
                            response: typeof responseData === "string" ? responseData.slice(0, 500) : responseData
                        });
                    }
                    if (status !== 404 && status !== 410) {
                        break;
                    }
                }
            }

            if (data) {
                break;
            }
        }
    }

    if (!data) {
        if (lastError?.response?.status === 404 || lastError?.response?.status === 410) {
            return fallbackReadability(text, labels);
        }
        throw lastError || new Error("Hugging Face request failed");
    }

    const promptResult = normalizePromptResponse(data, labels);
    if (promptResult) {
        return {
            ...promptResult,
            model: modelUsed || "hf"
        };
    }

    const normalized = normalizeTextClassificationResponse(data, labels);
    if (!normalized) {
        if (HF_DEBUG) {
            console.warn("Unexpected Hugging Face response format", data);
        }
        return fallbackReadability(text, labels);
    }

    let topIndex = 0;
    normalized.scores.forEach((score, idx) => {
        if (score > normalized.scores[topIndex]) {
            topIndex = idx;
        }
    });

    const scores = {};
    normalized.labels.forEach((label, idx) => {
        scores[label] = normalized.scores[idx];
    });

    return {
        label: normalized.labels[topIndex],
        score: normalized.scores[topIndex],
        scores,
        model: modelUsed || "hf"
    };
}

function buildReadabilityPrompt(text, labels = DEFAULT_LABELS) {
    const tiers = labels.length ? labels : DEFAULT_LABELS;
    return `You are a readability assessor. Return ONLY a JSON object with keys: grade_level (number), complexity_score (1-10), label (${tiers.join(", ")}), reasoning (short).

Rules:
- complexity_score must be an integer from 1 to 10.
- label must be one of: ${tiers.join(", ")}.
- Do not include markdown or extra text.

Text:\n${text}`;
}

function normalizePromptResponse(payload, labels = DEFAULT_LABELS) {
    if (!payload) return null;
    const text = extractGeneratedText(payload);
    if (!text && HF_DEBUG) {
        console.warn("HF prompt response missing generated text", payload);
    }
    if (!text) return null;

    const json = extractJsonFromText(text);
    if (!json && HF_DEBUG) {
        console.warn("HF prompt response missing JSON", { text: text.slice(0, 500) });
    }
    if (!json) return null;

    const gradeRaw = json.grade_level ?? json.grade ?? json.readability_grade;
    const scoreRaw = json.complexity_score ?? json.complexity ?? json.score;
    const labelRaw = json.label ?? json.level ?? null;

    const grade = typeof gradeRaw === "string" ? Number.parseFloat(gradeRaw) : gradeRaw;
    let score = typeof scoreRaw === "string" ? Number.parseFloat(scoreRaw) : scoreRaw;

    if (Number.isNaN(score) || score === null || score === undefined) return null;
    score = Math.max(1, Math.min(10, score));

    let label = labelRaw ? mapReadabilityLabel(labelRaw, labels) : null;
    if (!label) {
        if (typeof grade === "number" && !Number.isNaN(grade)) {
            label = grade <= 6
                ? (labels[0] || "beginner")
                : grade <= 10
                    ? (labels[1] || "intermediate")
                    : (labels[2] || "advanced");
        } else {
            label = score <= 4
                ? (labels[0] || "beginner")
                : score <= 7
                    ? (labels[1] || "intermediate")
                    : (labels[2] || "advanced");
        }
    }

    const normalizedScore = score / 10;
    const scores = {};
    labels.forEach((tier) => {
        scores[tier] = tier === label ? normalizedScore : 0;
    });

    scores.grade_level = typeof grade === "number" && !Number.isNaN(grade) ? grade : null;
    scores.complexity_score = score;
    if (json.reasoning) {
        scores.reasoning = json.reasoning;
    }

    return {
        label,
        score: normalizedScore,
        scores
    };
}

function extractGeneratedText(payload) {
    const root = Array.isArray(payload) ? payload[0] : payload;
    if (!root) return null;
    if (typeof root === "string") return root;
    if (root.generated_text) return root.generated_text;
    if (root.text) return root.text;
    if (root.output_text) return root.output_text;
    if (Array.isArray(root.outputs) && root.outputs[0]?.text) return root.outputs[0].text;
    if (root.choices?.[0]?.message?.content) return root.choices[0].message.content;
    if (root.choices?.[0]?.text) return root.choices[0].text;
    return null;
}

function extractJsonFromText(text) {
    if (!text) return null;
    const trimmed = text.trim();
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
    const jsonText = candidate.slice(firstBrace, lastBrace + 1);
    try {
        return JSON.parse(jsonText);
    } catch (error) {
        return null;
    }
}

function normalizeTextClassificationResponse(payload, labels = DEFAULT_LABELS) {
    if (!payload) return null;

    if (payload.error) {
        console.warn("Hugging Face error:", payload.error);
        return null;
    }

    const root = Array.isArray(payload) ? payload[0] : payload;
    if (Array.isArray(root) && root.length && root[0]?.label) {
        const sorted = [...root].sort((a, b) => b.score - a.score);
        const best = sorted[0];
        const mappedLabels = mapReadabilityLabel(best.label, labels);
        const normalizedLabels = labels.length ? labels : [best.label];
        const normalizedScores = normalizedLabels.map((label) =>
            label === mappedLabels ? best.score : 0
        );
        return {
            labels: normalizedLabels,
            scores: normalizedScores
        };
    }

    if (root?.label && typeof root?.score === "number") {
        const mappedLabel = mapReadabilityLabel(root.label, labels);
        const normalizedLabels = labels.length ? labels : [root.label];
        const normalizedScores = normalizedLabels.map((label) =>
            label === mappedLabel ? root.score : 0
        );
        return {
            labels: normalizedLabels,
            scores: normalizedScores
        };
    }

    if (root?.labels && root?.scores) return root;
    if (root?.output?.labels && root?.output?.scores) return root.output;
    if (root?.outputs?.labels && root?.outputs?.scores) return root.outputs;
    if (Array.isArray(root?.outputs) && root.outputs[0]?.labels && root.outputs[0]?.scores) {
        return root.outputs[0];
    }
    if (Array.isArray(root?.results) && root.results[0]?.labels && root.results[0]?.scores) {
        return root.results[0];
    }
    if (root?.result?.labels && root?.result?.scores) return root.result;

    return null;
}

function mapReadabilityLabel(rawLabel, labels = DEFAULT_LABELS) {
    const label = (rawLabel || "").toString().toLowerCase();
    if (label.includes("easy") || label.includes("beginner") || label.includes("simple") || label.includes("low")) {
        return labels[0] || "beginner";
    }
    if (label.includes("medium") || label.includes("intermediate")) {
        return labels[1] || "intermediate";
    }
    if (label.includes("hard") || label.includes("advanced") || label.includes("high")) {
        return labels[2] || "advanced";
    }

    const numeric = Number.parseInt(label.replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(numeric)) {
        const tiers = labels.length ? labels : DEFAULT_LABELS;
        if (numeric <= 4) return tiers[0] || "beginner";
        if (numeric <= 7) return tiers[1] || "intermediate";
        return tiers[2] || "advanced";
    }

    return labels[1] || "intermediate";
}

function fallbackReadability(text, labels = DEFAULT_LABELS) {
    console.warn("HF readability unavailable; falling back to Flesch–Kincaid scoring.");
    const grade = fleschKincaidGrade(text);
    if (grade === null) return null;

    const normalizedScore = Math.max(0, Math.min(1, grade / 16));
    const label = grade <= 6
        ? (labels[0] || "beginner")
        : grade <= 10
            ? (labels[1] || "intermediate")
            : (labels[2] || "advanced");

    const scores = {
        grade,
        normalized: normalizedScore
    };

    return {
        label,
        score: normalizedScore,
        scores,
        model: "flesch-kincaid"
    };
}

function fleschKincaidGrade(text) {
    const clean = (text || "").replace(/\s+/g, " ").trim();
    if (!clean) return null;

    const sentences = Math.max(1, clean.split(/[.!?]+/).filter(Boolean).length);
    const words = clean.split(/\s+/).filter(Boolean);
    const wordCount = Math.max(1, words.length);
    const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

    return 0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;
}

function countSyllables(word) {
    const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!cleaned) return 0;

    const vowelGroups = cleaned.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 0;

    if (cleaned.endsWith("e")) {
        count -= 1;
    }

    return Math.max(1, count);
}

module.exports = {
    classifyComplexity
};
