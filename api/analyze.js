// File: api/analyze.js (Final Debugging Version - Complete Code)

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    try {
        // --- START: DEBUGGING BLOCK ---
        const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
        if (!HUGGINGFACE_API_KEY) {
            return response.status(500).json({ error: "CRITICAL ERROR: API Key not found on the server. Please check Vercel environment variables." });
        }
        // --- END: DEBUGGING BLOCK ---

        const { resume, jobDescription } = request.body;
        if (!resume || !jobDescription) {
            return response.status(400).json({ error: 'Resume or Job Description is missing.' });
        }

        const promptText = `You are an expert ATS Resume Optimizer. Here is a resume: <<<RESUME_START>>>${resume}<<<RESUME_END>>>. And here is a job description: <<<JD_START>>>${jobDescription}<<<JD_END>>>. Your task is to provide two distinct outputs separated by '---IMPROVED_RESUME---'.

        Part 1 (Analysis): First, provide a detailed analysis with the following Markdown headings:
        1.  **Match Score:** A percentage score.
        2.  **Missing Keywords:** A bulleted list of crucial keywords from the job description that are missing in the resume.
        3.  **Top Suggestions:** 2-3 actionable suggestions for improvement.

        ---IMPROVED_RESUME---

        Part 2 (Improved Resume): Now, rewrite the entire original resume. Your goal is to naturally integrate the missing keywords you identified and rephrase bullet points to be more achievement-oriented and impactful. Provide only the full, rewritten resume text below this separator, with no extra explanations.`;
        
        const apiUrl = 'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta';

        const apiResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: promptText,
                parameters: { max_new_tokens: 1500 }
            }),
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('Hugging Face API Error:', errorText);
            throw new Error(`Hugging Face API failed: ${errorText}`);
        }

        const result = await apiResponse.json();
        
        let aiResponseText = result[0]?.generated_text;
        if (aiResponseText && aiResponseText.startsWith(promptText)) {
            aiResponseText = aiResponseText.substring(promptText.length).trim();
        }

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
