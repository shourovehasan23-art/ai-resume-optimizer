// File: functions/analyze.js

exports.handler = async function(event, context) {
    // 1. Get data from frontend request
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { resume, jobDescription } = JSON.parse(event.body);
    const apiToken = process.env.HUGGINGFACE_API_KEY;

    if (!resume || !jobDescription || !apiToken) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required data.' }) };
    }

    // 2. Construct the detailed AI prompt
    const promptText = `You are an expert ATS Resume Optimizer. Here is a resume: <<<RESUME_START>>>${resume}<<<RESUME_END>>>. And here is the job description: <<<JD_START>>>${jobDescription}<<<JD_END>>>. Your task is to provide two distinct outputs separated by '---IMPROVED_RESUME---'.

    Part 1 (Analysis): First, provide a detailed analysis with the following Markdown headings:
    1.  **Match Score:** A percentage score.
    2.  **Missing Keywords:** A bulleted list of crucial keywords from the job description that are missing in the resume.
    3.  **Top Suggestions:** 2-3 actionable suggestions for improvement.

    ---IMPROVED_RESUME---

    Part 2 (Improved Resume): Now, rewrite the entire original resume. Your goal is to naturally integrate the missing keywords you identified and rephrase bullet points to be more achievement-oriented and impactful. Provide only the full, rewritten resume text below this separator, with no extra explanations.`;

    // 3. Call the Hugging Face API
    try {
        const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                inputs: promptText,
                parameters: { max_new_tokens: 1500 } // To ensure the response is not cut off
            })
        });

        if (!response.ok) {
            console.error('API Error:', await response.text());
            throw new Error(`Hugging Face API failed with status: ${response.status}`);
        }

        const result = await response.json();
        const aiResponseText = result[0].generated_text.replace(promptText, '').trim(); // Clean the response

        // 4. Parse the response and send it back to the frontend
        const parts = aiResponseText.split('---IMPROVED_RESUME---');
        const analysis = parts[0] || "Analysis could not be generated.";
        const improvedResume = parts.length > 1 ? parts[1].trim() : "Improved resume could not be generated.";

        return {
            statusCode: 200,
            body: JSON.stringify({ analysis: analysis, improvedResume: improvedResume })
        };

    } catch (error) {
        console.error('Serverless function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};