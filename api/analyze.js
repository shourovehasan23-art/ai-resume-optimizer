// File: api/analyze.js (Final Victorious Version using your HF Space)

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    try {
        const { resume, jobDescription } = request.body;
        if (!resume || !jobDescription) {
            return response.status(400).json({ error: 'Resume or Job Description is missing.' });
        }
        
        // *** YOUR PERSONAL HUGGING FACE SPACE API URL ***
        const spaceApiUrl = 'https://shourove-ai-resume-optimizer.hf.space/run/predict';

        const apiResponse = await fetch(spaceApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data: [resume, jobDescription] // Gradio expects data in this format
            }),
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('Hugging Face Space API Error:', errorText);
            throw new Error(`Your personal AI API failed: ${errorText}`);
        }

        const result = await apiResponse.json();
        const aiResponseText = result.data?.[0];

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
