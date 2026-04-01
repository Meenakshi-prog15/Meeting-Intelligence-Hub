import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

let genAI = null;
if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
}

// Function to extract insights from transcript
export async function extractInsights(transcriptText) {
  if (!genAI) {
      throw new Error("Google Generative AI API key is missing. Please add GOOGLE_GENERATIVE_AI_API_KEY to your environment variables.");
  }
  
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    Analyze the following meeting transcript and extract:
    1. Key Decisions made during the meeting. Keep them concise.
    2. Action Items assigned to individuals. For each, identify the Assignee, the Task description, and any Deadline mentioned.

    Format the response strictly as a JSON object with this shape:
    {
      "decisions": ["Decision 1", "Decision 2"],
      "actionItems": [
        { "assignee": "Name", "task": "Description", "deadline": "Date/Time" }
      ]
    }
    
    If an assignee or deadline is not clear, use "Unassigned" or "TBD". Do not include any other text except the JSON block.

    Transcript:
    """
    ${transcriptText}
    """
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Attempt to parse JSON cleanly, removing markdown codeblock formatting if needed
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Extraction error:", error);
    // Re-throw the real error so the API route can surface it
    throw new Error(`Extraction failed: ${error?.message || String(error)}`);
  }
}

// Function to query the transcript
export async function queryTranscript(transcriptText, userQuestion) {
  if (!genAI) {
      throw new Error("Google Generative AI API key is missing. Please add GOOGLE_GENERATIVE_AI_API_KEY to your environment variables.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    You are a helpful Meeting Assistant. You have been given the full transcript of a meeting.
    Please answer the user's question accurately based ONLY on the provided transcript.
    If the answer is not contained in the transcript, say "I cannot find the answer to that in the meeting transcript."
    Try to be concise but informative.

    Transcript:
    """
    ${transcriptText}
    """

    User Question: ${userQuestion}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Query error:", error);
    throw new Error(`Query failed: ${error?.message || String(error)}`);
  }
}
