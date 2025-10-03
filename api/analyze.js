// File: api/analyze.js (Final Version for Hugging Face on Vercel)

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    try {
        const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
        if (!HUGGINGFACE_API_KEY) {
            throw new Error("Server configuration error: API key is missing.");
        }

        const { resume, jobDescription } = request.body;
        if (!resume || !jobDescription) {
            return response.status(400).json({ error: 'Resume or Job Description is missing.' });
        }

        const promptText = `You are an expert ATS Resume Optimizer... [Full prompt structure]... Here is a resume: ${resume}. And here is the job description: ${jobDescription}.`;
        
        const apiUrl = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';

        const apiResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: promptText,
                parameters: { max_new_tokens: 1500, return_full_text: false }
            }),
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('Hugging Face API Error:', errorText);
            throw new Error(`Hugging Face API failed: ${errorText}`);
        }

        const result = await apiResponse.json();
        const aiResponseText = result[0]?.generated_text;

        if (!aiResponseText) {
            throw new Error("AI response was empty or in an unexpected format.");
        }

        const parts = aiResponseText.split('---IMPROVED_RESUME---');
        const analysis = parts[0] || "Analysis could not be generated.";
        const improvedResume = parts.length > 1 ? parts[1].trim() : "Improved resume could not be generated.";

        response.status(200).json({ analysis, improvedResume });

    } catch (error) {
        console.error("Serverless function error:", error);
        response.status(500).json({ error: error.message || "An unknown server error occurred." });
    }
}
