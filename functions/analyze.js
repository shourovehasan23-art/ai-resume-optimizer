const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";
const API_KEY = process.env.HUGGINGFACE_API_KEY;

// Helper: Format error response
function formatErrorResponse(error, status = 500) {
  return {
    statusCode: status,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      error: error.message || error.toString() || "Unknown error",
      stack: error.stack || null
    })
  };
}

async function callHuggingFaceAPI(prompt, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const response = await fetch(HUGGINGFACE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } })
    });
    if (response.ok) return await response.json();
    if (i === retries) throw new Error('Model loading timeout or API error');
    await new Promise(res => setTimeout(res, 3000)); // wait before retry
  }
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return formatErrorResponse(new Error("Method not allowed"), 405);
  }

  try {
    const { resume, jobDescription } = JSON.parse(event.body || '{}');
    if (!resume || !jobDescription) {
      return formatErrorResponse(new Error("Missing resume or job description"), 400);
    }

    const prompt = `You are an expert ATS Resume Optimizer. Here is a resume: ${resume}\nAnd here is the job description: ${jobDescription}\nYour task is to provide two distinct outputs separated by '---IMPROVED_RESUME---'.\n\n**Part 1 (Analysis):** First, provide a detailed analysis with the following Markdown headings:\n1. **Match Score:** A percentage score.\n2. **Missing Keywords:** A bulleted list of crucial keywords from the job description that are missing in the resume.\n3. **Top Suggestions:** 2-3 actionable suggestions for improvement.\n\n---IMPROVED_RESUME---\n\n**Part 2 (Improved Resume):** Now, rewrite the entire original resume. Your goal is to naturally integrate the missing keywords you identified and rephrase bullet points to be more achievement-oriented and impactful (e.g., 'Handled customer queries' becomes 'Resolved 50+ customer queries daily with a 95% satisfaction rate'). Provide only the full, rewritten resume text below this separator, with no extra explanations.`;

    let aiText = '';
    let data;
    try {
      data = await callHuggingFaceAPI(prompt);
    } catch (apiErr) {
      return formatErrorResponse(apiErr, 502);
    }
    if (Array.isArray(data) && data.length && data[0].generated_text) {
      aiText = data[0].generated_text;
    } else if (data.generated_text) {
      aiText = data.generated_text;
    } else if (typeof data === 'string') {
      aiText = data;
    } else {
      return formatErrorResponse(new Error("Unexpected API response."), 500);
    }

    const [analysis, improvedResume] = aiText.split('---IMPROVED_RESUME---');
    if (!analysis || !improvedResume) {
      return formatErrorResponse(new Error("AI response could not be parsed."), 500);
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        analysis: analysis.trim(),
        improvedResume: improvedResume.trim()
      })
    };
  } catch (err) {
    return formatErrorResponse(err, 500);
  }
};
