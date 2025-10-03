// File: api/analyze.js (Final Version based on your feedback)

const DEEPSEEK_API_KEY = "sk-baf267ea3377438ab9a81a6ce2144c6e";

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Check for API key existence
        if (!DEEPSEEK_API_KEY) {
            throw new Error("Server configuration error: API key is missing.");
        }

        const { resume, jobDescription } = JSON.parse(event.body);
        if (!resume || !jobDescription) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Resume or Job Description is missing.' }) };
        }

        // The complete and structured prompt
        const promptText = `You are an expert ATS Resume Optimizer. Here is a resume: <<<RESUME_START>>>${resume}<<<RESUME_END>>>. And here is the job description: <<<JD_START>>>${jobDescription}<<<JD_END>>>. Your task is to provide two distinct outputs separated by '---IMPROVED_RESUME---'.

        Part 1 (Analysis): First, provide a detailed analysis with the following Markdown headings:
        1.  **Match Score:** A percentage score.
        2.  **Missing Keywords:** A bulleted list of crucial keywords from the job description that are missing in the resume.
        3.  **Top Suggestions:** 2-3 actionable suggestions for improvement.

        ---IMPROVED_RESUME---

        Part 2 (Improved Resume): Now, rewrite the entire original resume. Your goal is to naturally integrate the missing keywords you identified and rephrase bullet points to be more achievement-oriented and impactful. Provide only the full, rewritten resume text below this separator, with no extra explanations.`;

        const response = await fetch("https://api.deepseek.com/chat/completions", {
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

        if (!response.ok) {
            const errorData = await response.json();
            // Safer error message access
            const errorMessage = errorData.error?.message || `DeepSeek API failed with status: ${response.status}`;
            throw new Error(errorMessage);
        }

        const result = await response.json();
        // Safer response content access
        const aiResponseText = result.choices?.[0]?.message?.content;

        if (!aiResponseText) {
            throw new Error("AI response was empty or in an unexpected format.");
        }

        const parts = aiResponseText.split('---IMPROVED_RESUME---');
        const analysis = parts[0] || "Analysis could not be generated.";
        const improvedResume = parts.length > 1 ? parts[1].trim() : "Improved resume could not be generated.";

        return {
            statusCode: 200,
            body: JSON.stringify({ analysis: analysis, improvedResume: improvedResume }),
        };

    } catch (error) {
        console.error("Serverless function error:", error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message || "An unknown server error occurred." }) 
        };
    }
};
