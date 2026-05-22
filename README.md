# 🦜 Polly Alt AI

Like a parrot on a pirate's shoulder, Polly Alt tells your blind and low-vision users exactly what's on the horizon using Gemini AI. 

Polly Alt AI is an accessibility-first WordPress plugin that analyzes media library uploads using Gemini AI models (such as `gemini-2.0-flash`) to generate concise, active-voice, descriptive alternative text (alt text) variations under 125 characters. It includes automated compliance guards to prevent publishing or leaving media screens with missing alt text, keyboard-friendly selection menus, and educational context for administrators.

---

## 🏴‍☠️ Features

* **Multi-Subject AI Variations:** Automatically queries Gemini AI to produce multiple distinct alt text angles focusing on separate visual elements.
* **Exit & Upload Compliance Guards:** Prevents accidental navigation away from media rows, Gutenberg image blocks, or Elementor panels if an image lacks alternative descriptions (unless explicitly bypassed).
* **Smooth Keyboard Interactivity:** Crafted with total `:focus-visible` compatibility. Modals auto-capture structural keyboard focus seamlessly for accessibility managers.
* **Educational Training Advisories:** Displays assistive structural context alongside generated suggestions to train site admins on proper description standards.
* **Clean Decks Mode:** Optionally wipes messy structural attachment Titles when an explicit AI description selection is made.

---

## 📦 How to Package (Zip) for Release

To bundle Polly Alt AI for manual distribution or installation, compress the plugin root contents into a standard zip archive. Ensure the system folder name matches your text-domain identifiers perfectly.

### Method 1: Using Terminal/Command Line (Mac/Linux)
Navigate to the parent directory of your local repository and execute:
```bash
zip -r polly-alt.zip polly-alt/ -x "*.git*" "*node_modules*" ".DS_Store"