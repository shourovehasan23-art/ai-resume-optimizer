// File: api/analyze.js (Final Vercel Compatible Version)

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    try {
        const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
        if (!DEEPSEEK_API_KEY) {
            throw new Error("Server configuration error: API key is missing.");
        }

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

        const apiResponse = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { "role": "system", "content": "You are a helpful resume analysis assistant." },
                    { "role": "user", "content": promptText }
                ],
                stream: false
            }),
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            const errorMessage = errorData.error?.message || `DeepSeek API failed with status: ${apiResponse.status}`;
            throw new Error(errorMessage);
        }

        const result = await apiResponse.json();
        const aiResponseText = result.choices?.[0]?.message?.content;

        if (!aiResponseText) {
            throw new Error("AI response was empty or in an unexpected format.");
        }

        const parts = aiResponseText.split('---IMPROVED_RESUME---');
        const analysis = parts[0] || "Analysis could not be generated.";
        const improvedResume = parts.length > 1 ? parts[1].trim() : "Improved resume could not be generated.";

        // Send successful response
        response.status(200).json({ analysis, improvedResume });

    } catch (error) {
        console.error("Serverless function error:", error);
        response.status(500).json({ error: error.message || "An unknown server error occurred." });
    }
}
