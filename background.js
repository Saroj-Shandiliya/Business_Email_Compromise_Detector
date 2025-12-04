// background.js

// --- Helper Functions ---

/**
 * Redacts PII (Personally Identifiable Information) from text.
 * @param {string} text - The text to redact.
 * @returns {string} - The redacted text.
 */
function redactPII(text) {
  if (!text) return "";

  // Redact Email Addresses (simple regex)
  let redacted = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

  // Redact Phone Numbers (US formats)
  redacted = redacted.replace(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[PHONE_REDACTED]');

  // Redact Credit Card Numbers (Simple 13-19 digit check)
  redacted = redacted.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[CREDIT_CARD_REDACTED]');

  return redacted;
}

/**
 * Performs local heuristic checks before AI analysis.
 * @param {string} subject 
 * @param {string} body 
 * @returns {object} - Heuristic score and reasons.
 */
function analyzeLocalHeuristics(subject, body) {
  let score = 0;
  let reasons = [];

  const urgencyKeywords = ["urgent", "immediate", "wire transfer", "bank details", "confidential", "secret"];
  const lowerBody = body ? body.toLowerCase() : "";
  const lowerSubject = subject ? subject.toLowerCase() : "";

  // Check for urgency keywords
  urgencyKeywords.forEach(keyword => {
    if (lowerBody.includes(keyword) || lowerSubject.includes(keyword)) {
      score += 1;
      if (!reasons.includes("Contains urgency keywords")) {
        reasons.push("Contains urgency keywords");
      }
    }
  });

  // Cap heuristic score contribution
  return { score: Math.min(score, 3), reasons };
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status < 500) return response;
      console.warn(`Attempt ${i + 1}: Server error ${response.status}. Retrying...`);
    } catch (error) {
      console.warn(`Attempt ${i + 1}: Network error. Retrying...`, error);
    }
    const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(`Failed to fetch after ${retries} attempts.`);
}

async function getApiKey() {
  const result = await chrome.storage.sync.get('geminiApiKey');
  if (!result.geminiApiKey) {
    throw new Error("API Key not found. Please set it via the extension Options page.");
  }
  return result.geminiApiKey;
}

async function analyzeEmailForBEC(subject, body, apiKey) {
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const systemPrompt = `You are a BEC expert. Return ONLY a raw JSON object like {"score":5, "reason":"Brief explanation."}. Score is 0 (genuine) to 10 (definite BEC).`;
  const prompt = `Subject: ${subject}\nBody: ${body.substring(0, 5000)}`;

  const fetchOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\n${prompt}`
            }
          ]
        }
      ]
    })
  };

  const response = await fetchWithRetry(API_URL, fetchOptions);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API request failed with status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!responseText) throw new Error("No valid response text from Gemini.");

  try {
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON object found in response.");

    const jsonStr = responseText.slice(jsonStart, jsonEnd);
    const parsed = JSON.parse(jsonStr);

    if (typeof parsed.score !== 'number' || typeof parsed.reason !== 'string') {
      throw new Error("Parsed JSON has an invalid format.");
    }

    return parsed;
  } catch (e) {
    console.error("BACKGROUND: Failed to parse JSON from Gemini:", responseText);
    throw new Error(`Invalid JSON from API: ${e.message}`);
  }
}


/**
 * --- NEW FUNCTION TO SHOW A HIGH-PRIORITY ALARM ---
 * Creates a prominent desktop notification for high-risk emails.
 * @param {string} subject - The subject of the email.
 * @param {{score: number, reason: string}} analysis - The analysis object.
 */
function showHighRiskNotification(subject, analysis) {
  const notificationId = `high-risk-email-${Date.now()}`;

  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/warning96.png',
    title: `⚠️ High-Risk Email Detected! (Score: ${analysis.score}/10)`,
    message: `Reason: ${analysis.reason}`,
    priority: 2
  });
}

// --- Main Event Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'NEW_EMAIL') {
    (async () => {
      try {
        const apiKey = await getApiKey();

        // 1. Local Heuristics
        const heuristics = analyzeLocalHeuristics(request.payload.subject, request.payload.body);
        console.log("BACKGROUND: Local Heuristics:", heuristics);

        // 2. PII Redaction
        const redactedBody = redactPII(request.payload.body);
        const redactedSubject = redactPII(request.payload.subject);

        // 3. AI Analysis (with redacted data)
        const analysis = await analyzeEmailForBEC(redactedSubject, redactedBody, apiKey);

        // Combine scores (AI + Heuristics) - Cap at 10
        analysis.score = Math.min(analysis.score + heuristics.score, 10);
        if (heuristics.reasons.length > 0) {
          analysis.reason = `${analysis.reason} (Local Flags: ${heuristics.reasons.join(", ")})`;
        }

        console.log("BACKGROUND: Analysis successful. Sending back:", analysis);

        // Store the last email and score for the popup
        await chrome.storage.local.set({
          lastEmail: request.payload,
          lastScore: analysis.score,
          lastReason: analysis.reason,
          lastUpdated: Date.now()
        });

        // Send explicit update notification
        chrome.runtime.sendMessage({
          type: 'EMAIL_ANALYSIS_COMPLETE',
          payload: analysis
        });

        sendResponse({ success: true, analysis: analysis });

        // Check if the score meets the threshold for notification
        if (analysis.score >= 7) {
          console.log(`BACKGROUND: High risk score (${analysis.score}). Raising alarm notification.`);
          showHighRiskNotification(request.payload.subject, analysis);
        }

      } catch (error) {
        console.error("BACKGROUND: An error occurred:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});

// --- Service Worker Lifecycle ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'keepAlive') console.log("Keep-alive ping.");
});
