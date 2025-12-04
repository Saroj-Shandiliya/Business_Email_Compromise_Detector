# Gmail BEC Detector 🛡️

**Protect your business from Business Email Compromise (BEC) attacks with AI-powered detection.**

![Version](https://img.shields.io/badge/version-1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📖 Overview

The **Gmail BEC Detector** is a Chrome Extension designed to analyze incoming emails in Gmail for signs of Business Email Compromise. It combines **Local Heuristics** (keyword analysis, urgency detection) with the power of **Google Gemini AI** to provide a real-time risk assessment of your emails.

## ✨ Features

*   **Real-Time Analysis**: Automatically scans emails as you open them in Gmail.
*   **AI-Powered**: Uses Google's **Gemini 1.5 Flash** model to understand context and intent.
*   **Privacy-First**: Automatically **redacts PII** (emails, phone numbers, credit cards) *before* sending data to the AI.
*   **In-Context Alerts**: Displays a **Warning Banner** directly inside the email for high-risk threats.
*   **Risk Scoring**: Provides a clear 0-10 risk score with a detailed explanation.
*   **Local Heuristics**: Detects urgency keywords (e.g., "Wire Transfer", "Immediate") locally for faster detection.

## 🚀 Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/saroj-shandiliya/gmail-bec-detector.git
    ```
2.  **Load into Chrome**:
    *   Open Chrome and navigate to `chrome://extensions`.
    *   Enable **Developer Mode** (top right toggle).
    *   Click **Load unpacked**.
    *   Select the directory where you cloned this repository.

## ⚙️ Configuration

1.  **Get a Gemini API Key**:
    *   Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to generate a free API key.
2.  **Set the Key**:
    *   Right-click the extension icon in your browser toolbar.
    *   Select **Options**.
    *   Paste your API Key and click **Save**.

## 🛠️ Tech Stack

*   **Manifest V3**: Modern Chrome Extension architecture.
*   **JavaScript (ES6+)**: Core logic.
*   **Google Gemini API**: LLM for semantic analysis.
*   **Chrome Storage & Notifications**: State management and alerts.

## 🔒 Privacy & Security

*   **No Data Retention**: Emails are analyzed in real-time and not stored permanently.
*   **PII Redaction**: Sensitive information is scrubbed locally.
*   **Secure Storage**: API keys are stored in `chrome.storage.sync`.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
