// Saves options to chrome.storage
const saveOptions = () => {
  const apiKey = document.getElementById('apiKey').value;
  const status = document.getElementById('status');

  if (!apiKey) {
    status.textContent = 'Please enter a valid API key.';
    status.className = 'error';
    return;
  }

  chrome.storage.sync.set(
    { geminiApiKey: apiKey },
    () => {
      status.textContent = 'Settings saved successfully!';
      status.className = 'success';
      setTimeout(() => {
        status.textContent = '';
        status.className = '';
      }, 2000);
    }
  );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(
    { geminiApiKey: '' }, // Default value
    (items) => {
      document.getElementById('apiKey').value = items.geminiApiKey;
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
