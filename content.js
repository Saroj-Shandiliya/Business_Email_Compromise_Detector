// content.js

// Improved email scraping function
function scrapeEmailUsingKeywords() {
  // Get all visible text
  const allText = document.body.innerText;

  // Common greeting keywords
  const keywords = [
    "Dear ",
    "Hello ",
    "Hi ",
    "Greetings",
    "Good morning",
    "Good afternoon",
    "Good evening",
    "To Whom It May Concern"
  ];

  // Find the earliest occurrence of any keyword
  let startIndex = -1;
  for (const keyword of keywords) {
    const idx = allText.indexOf(keyword);
    if (idx !== -1 && (startIndex === -1 || idx < startIndex)) {
      startIndex = idx;
    }
  }

  let bodyText = "";
  if (startIndex !== -1) {
    bodyText = allText.substring(startIndex).trim();
  } else {
    // Fallback: just take last part of text if no keyword found
    bodyText = allText.slice(-2000).trim();
  }

  // Extract subject from Gmail's known subject selector if possible
  const subjectEl = document.querySelector('h2.hP');
  const subject = subjectEl ? subjectEl.innerText.trim() : "(No Subject)";

  return { subject, body: bodyText };
}

/**
 * Injects a warning banner into the email view.
 * @param {number} score 
 * @param {string} reason 
 */
function injectWarningBanner(score, reason) {
  // Remove existing banners
  const existingBanner = document.getElementById('bec-warning-banner');
  if (existingBanner) existingBanner.remove();

  const banner = document.createElement('div');
  banner.id = 'bec-warning-banner';

  const isHighRisk = score >= 7;
  const color = isHighRisk ? '#d32f2f' : '#f57c00'; // Red or Orange
  const bgColor = isHighRisk ? '#ffebee' : '#fff3e0';
  const icon = isHighRisk ? '⚠️' : '⚠️';
  const title = isHighRisk ? 'HIGH RISK DETECTED' : 'POTENTIAL RISK DETECTED';

  banner.style.cssText = `
    background-color: ${bgColor};
    border: 1px solid ${color};
    border-left: 5px solid ${color};
    color: #333;
    padding: 15px;
    margin: 10px 0;
    border-radius: 4px;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
    display: flex;
    align-items: flex-start;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    z-index: 9999;
    position: relative;
  `;

  banner.innerHTML = `
    <div style="font-size: 24px; margin-right: 15px;">${icon}</div>
    <div>
      <h3 style="margin: 0 0 5px 0; color: ${color}; font-size: 16px; font-weight: bold;">${title} (Score: ${score}/10)</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.4;">${reason}</p>
    </div>
  `;

  // Try to find the best place to insert
  const subjectElement = document.querySelector('h2.hP');
  if (subjectElement && subjectElement.parentElement) {
    subjectElement.parentElement.insertBefore(banner, subjectElement.nextSibling);
  } else {
    // Fallback: prepend to body
    const emailBody = document.querySelector('.a3s.aiL');
    if (emailBody) {
      emailBody.insertBefore(banner, emailBody.firstChild);
    } else {
      // Last resort
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }
}

// Track the last processed email
let lastMessageId = null;
let isProcessing = false;

// Debounce function to prevent rapid firing
function debounce(func, delay) {
  let timeoutId;
  return function () {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, arguments), delay);
  };
}

// Handle new email detection
async function handleNewEmail() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const mail = scrapeEmailUsingKeywords();
    if (!mail.body) return;

    const signature = mail.subject + '||' + mail.body.slice(0, 100);
    if (signature === lastMessageId) return;

    lastMessageId = signature;
    console.log('CONTENT: Detected new email, sending to background:', mail.subject);

    // Send to background AND popup simultaneously
    chrome.runtime.sendMessage({
      type: 'NEW_EMAIL_DETECTED',  // New message type
      payload: {
        subject: mail.subject,
        preview: mail.body.slice(0, 200) + (mail.body.length > 200 ? "..." : "")
      }
    });

    // Send to background script and wait for response
    const response = await chrome.runtime.sendMessage({
      type: 'NEW_EMAIL',
      payload: mail
    });

    if (response?.success) {
      console.log('CONTENT: Received analysis from background:', response.analysis);

      // Inject Warning Banner if score is high
      if (response.analysis.score >= 4) {
        injectWarningBanner(response.analysis.score, response.analysis.reason);
      }
    } else if (response?.error) {
      console.error('CONTENT: Background processing error:', response.error);
    }

  } catch (error) {
    console.error('CONTENT: Error processing email:', error);
  } finally {
    isProcessing = false;
  }
}

// Debounced version of the handler
const debouncedEmailHandler = debounce(handleNewEmail, 1000);

// MutationObserver setup
const observer = new MutationObserver((mutations) => {
  // Only trigger if we see relevant changes
  const emailContainer = document.querySelector('[role="tabpanel"]') || document.body;
  for (const mutation of mutations) {
    if (emailContainer.contains(mutation.target)) {
      debouncedEmailHandler();
      break;
    }
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: true
});

// Initial check
setTimeout(handleNewEmail, 2000);

// Listen for updates from background (optional)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_SCORE') {
    console.log('CONTENT: Received score update from background');
  }
});