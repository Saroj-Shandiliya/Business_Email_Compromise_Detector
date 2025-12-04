// chrome.storage.local.get(["lastEmail", "lastScore"], (data) => {
//   if (data.lastEmail) {
//     document.querySelector(".subject").innerText = data.lastEmail.subject || "(No Subject)";
//     document.querySelector(".body").innerText = data.lastEmail.body || "(No Body)";
//   }
//   if (data.lastScore !== undefined) {
//     document.querySelector(".score").innerText = "Score: " + Math.round(data.lastScore * 100) + "%";
//   }
// });
// -------------------------------------top original---------------------------

// Updated popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'NEW_EMAIL_DETECTED') {
    document.querySelector('.subject').textContent = request.payload.subject;
    document.querySelector('.body').textContent = request.payload.preview;
    document.querySelector('.score').textContent = "Analyzing...";
    console.log('Popup received real-time update');
  }
  return true;
});
document.addEventListener('DOMContentLoaded', async () => {
  // DOM elements
  const elements = {
    subject: document.querySelector('.subject'),
    body: document.querySelector('.body'),
    score: document.querySelector('.score'),
    timestamp: document.getElementById('timestamp'),
    refreshBtn: document.getElementById('refreshBtn')
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return timestamp ? new Date(timestamp).toLocaleString() : 'Never updated';
  };

  // Force-update the popup UI
  const updatePopupUI = (data) => {
    console.log('Updating UI with:', data);
    
    // Update subject
    elements.subject.textContent = data.lastEmail?.subject || '(No subject)';
    
    // Update body (first 500 chars)
    const bodyText = data.lastEmail?.body 
      ? data.lastEmail.body.length > 500 
        ? `${data.lastEmail.body.substring(0, 500)}...` 
        : data.lastEmail.body
      : '(No content)';
    elements.body.textContent = bodyText;
    
    // Update score
    if (data.lastScore !== undefined) {
      elements.score.textContent = `Score: ${data.lastScore}/10 - ${data.lastReason || ''}`;
      elements.score.className = 'score ' + (
        data.lastScore >= 7 ? 'high' :
        data.lastScore >= 4 ? 'medium' : 'low'
      );
    } else {
      elements.score.textContent = 'No score available';
      elements.score.className = 'score';
    }
    
    // Update timestamp
    elements.timestamp.textContent = `Last updated: ${formatTime(data.lastUpdated)}`;
  };

  // Load data from storage
  const loadData = async () => {
    try {
      const data = await chrome.storage.local.get([
        'lastEmail', 
        'lastScore', 
        'lastReason',
        'lastUpdated'
      ]);
      updatePopupUI(data);
    } catch (error) {
      console.error('Failed to load data:', error);
      elements.score.textContent = 'Error loading data';
    }
  };

  // Setup storage listener
  const setupStorageListener = () => {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') return;
      
      console.log('Storage changed:', changes);
      loadData(); // Refresh when storage changes
    });
  };

  // Manual refresh
  elements.refreshBtn.addEventListener('click', async () => {
    elements.refreshBtn.disabled = true;
    elements.refreshBtn.textContent = 'Refreshing...';
    await loadData();
    elements.refreshBtn.textContent = '✓ Refreshed';
    setTimeout(() => {
      elements.refreshBtn.textContent = 'Refresh Data';
      elements.refreshBtn.disabled = false;
    }, 1000);
  });

  // Initial load
  await loadData();
  setupStorageListener();
  
  // DEBUG: Log storage contents
  chrome.storage.local.get(null, (data) => {
    console.log('Current storage:', data);
  });
});