const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require('../config/env');

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    try {
        console.log("Testing gemini-pro...");
        const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model2.generateContent("Hello");
        console.log("gemini-pro works! Response:", result.response.text());

    } catch (error) {
        console.error("gemini-pro Error:", error.message);
    }
}

listModels();
