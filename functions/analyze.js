// File: functions/analyze.js (Version 2 with Retry Logic)

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { resume, jobDescription } = JSON.parse(event.body);
    const apiToken = process.env.HUGGINGFACE_API_KEY;

    if (!resume || !jobDescription || !apiToken) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required data.' }) };
    }

    const promptText = `You are an expert ATS Resume Optimizer... [The full detailed prompt structure]... Here is a resume: <<<RESUME_START>>>${resume}<<<RESUME_END>>>. And here is a job description: <<<JD_START>>>${jobDescription}<<<JD_END>>>.`;

    const apiUrl = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';
    
    const callHuggingFace = async () => {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                inputs: promptText,
                parameters: { max_new_tokens: 1500 }
            })
        });

        if (!response.ok) {
            // If the model is loading, the status might be 503
            if (response.status === 503) {
                const errorBody = await response.json();
                // Throw a specific error to trigger a retry
                throw new Error(`Model is loading: ${errorBody.error}`);
            }
            console.error('API Error:', await response.text());
            throw new Error(`Hugging Face API failed with status: ${response.status}`);
        }
        return response.json();
    };

    try {
        let result;
        const maxRetries = 3; // Try a total of 3 times
        let attempt = 0;
        
        while (attempt < maxRetries) {
            try {
                result = await callHuggingFace();
                // If successful, break the loop
                break;
            } catch (error) {
                attempt++;
                if (error.message.includes("Model is loading") && attempt < maxRetries) {
                    console.log(`Attempt ${attempt}: Model is loading, retrying in 10 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 10 seconds
                } else {
                    // If it's another error or max retries reached, throw it
                    throw error;
                }
            }
        }

        if (!result) {
            throw new Error("Failed to get a response from the AI model after several attempts.");
        }

        const aiResponseText = result[0].generated_text.replace(promptText, '').trim();
        
        const parts = aiResponseText.split('---IMPROVED_RESUME---');
        const analysis = parts[0] || "Analysis could not be generated.";
        const improvedResume = parts.length > 1 ? parts[1].trim() : "Improved resume could not be generated.";

        return {
            statusCode: 200,
            body: JSON.stringify({ analysis: analysis, improvedResume: improvedResume })
        };

    } catch (error) {
        console.error('Serverless function final error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message, stack: error.stack })
        };
    }
};

// Helper: Format error response
function formatErrorResponse(res, error, status = 500) {
  res.status(status).json({
    error: error.message || error.toString() || "Unknown error",
    stack: error.stack || null
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return formatErrorResponse(res, new Error("Method not allowed"), 405);
  }

  try {
    const { resume, jobDescription } = req.body;
    if (!resume || !jobDescription) {
      return formatErrorResponse(res, new Error("Missing resume or job description"), 400);
    }

    // ...existing Hugging Face API logic or other API logic...
    // Example:
    // const result = await callHuggingFaceAPI(...);
    // return res.status(200).json(result);

  } catch (err) {
    formatErrorResponse(res, err, 500);
  }
}
