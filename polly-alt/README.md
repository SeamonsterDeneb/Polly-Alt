# 🦜 Polly Alt

> Like a parrot on a pirate's shoulder, Polly Alt tells your blind and low-vision users exactly what's on the horizon using Gemini AI.

Polly Alt is an open-source, accessibility-first WordPress plugin that connects to Google's Gemini API to generate descriptive, active-voice alternative text (alt text) for images. Designed with "benevolent friction," Polly integrates directly into standard WordPress workflows—including Gutenberg, Elementor, and Classic editors—to guide site administrators toward strict WCAG compliance.

---

## ✨ Key Features

### 🧠 Context-Aware AI Generation
Polly doesn't analyze images in a vacuum. It scans the surrounding post context (headings and preceding/following paragraphs) in Gutenberg, Elementor, and TinyMCE to steer Gemini's vision models toward foregrounding visual details most relevant to the surrounding narrative.

### 🎯 Functional Image Identification
When an image is wrapped in a link (`<a>`) or acts as a button (`<button>`), Polly automatically detects its functional role. Instead of describing the visual aesthetics of the graphic, the prompt redirects Gemini to generate concise destination- or action-oriented alt text (e.g., *"2026 Annual Report PDF"* rather than *"A blue folder icon"*) without redundant phrases like "link to" or "click here".

### 📌 Per-Instance Alt Editing
Images used across multiple posts or pages often require different context. Polly scans Gutenberg blocks (`core/image`), Classic Editor content, and Elementor widgets (`image`, `e-image`, `theme-site-logo`) to map every occurrence of an attachment across your database. You can tailor and save unique alt text for specific post instances without overwriting the global attachment default.

### 🛡️ Benevolent Compliance Guards
To prevent missing alt text from slipping into production, Polly intercepts publish and navigation events across Gutenberg, Elementor, and the Media Library. If un-described images are detected, a modal offers step-by-step walkthroughs to resolve them before saving.

### ✂️ "Make it Fit" Character Compression
Screen readers announce image descriptions in chunks, making ~125 characters the ideal character budget. If a generated or manually typed description exceeds this limit, Polly provides a single-click inline compression tool powered by Gemini to trim length while preserving core visual meaning.

### 🔄 Side-by-Side Revision Assistant
Whenever an alt text draft is compressed or modified inline, Polly renders a side-by-side diff card. This allows administrators to inspect previous drafts, copy dropped visual details, or revert changes instantly.

### ⚙️ Dynamic Engine & Clean Decks
* **Dynamic API Fetching:** Automatically queries Google AI Studio endpoints (`/v1beta/models`) to keep available Gemini vision models up to date, caching valid options for 24 hours.
* **Clean Decks Mode:** Optionally wipes camera-generated attachment titles (e.g., `IMG_4829.jpg`) upon selecting an AI alt description to keep database records clean.

---

## 🛠️ Tech Stack & Architecture

* **Backend:** PHP 7.4+, WordPress REST API & Custom AJAX Endpoints.
* **Frontend:** Vanilla JavaScript (ES6+), jQuery (for WordPress admin hook integration).
* **Styling:** CSS3 with full `:focus-visible` keyboard focus trapping for accessibility.
* **External APIs:** Google Gemini API (`generateContent` endpoint) via server-side PHP proxy to protect API keys.
* **Integrations:** Gutenberg (`wp.data`), Elementor Editor API (`$e`), TinyMCE, WordPress Media Backbone views.

---

## 📁 Repository Structure

```text
polly-alt/
├── assets/
│   ├── polly-alt.css    # Admin UI, modal overlays, focus rings, revision cards
│   └── polly-alt.js     # Core logic, DOM observers, context scrapers, Gemini API handling
├── polly-alt.php        # Core plugin entry point, settings, AJAX handlers, usage scanner
├── readme.txt           # Official WordPress.org directory readme file
└── README.md            # GitHub documentation for contributors