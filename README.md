# 🦜 Polly Alt AI

Like a parrot on a pirate's shoulder, Polly Alt tells your blind and low-vision users exactly what's on the horizon using Gemini AI. 

Polly Alt AI is an accessibility-first WordPress plugin that analyzes media library uploads using Gemini AI models (such as `gemini-2.0-flash`) to generate concise, active-voice, descriptive alternative text (alt text) variations around 125 characters. It includes automated compliance guards to prevent publishing or leaving media screens with missing alt text, keyboard-friendly selection menus, and educational context for administrators.

---

## 🏴‍☠️ Features

* **Multi-Subject AI Variations:** Automatically queries Gemini AI to produce multiple distinct alt text angles focusing on separate visual elements for users to choose between.
* **Exit & Upload Compliance Guards:** Prevents accidental navigation away from media rows, Gutenberg image blocks, or Elementor panels if an image lacks alternative descriptions (unless explicitly bypassed).
* **Smooth Keyboard Interactivity:** Crafted with total `:focus-visible` compatibility. Modals auto-capture structural keyboard focus seamlessly for accessibility managers.
* **Educational Training Advisories:** Displays assistive structural context alongside generated suggestions to train site admins on proper description standards.
* **Clean Decks Mode:** Optionally wipes messy structural attachment Titles when an explicit AI description selection is made.

---

## 📦 How to Package (Zip) for personal use

To bundle Polly Alt AI for manual distribution or installation, compress the plugin root contents into a standard zip archive. Ensure the system folder name matches your text-domain identifiers perfectly.

### Method 1: Using Terminal/Command Line (Mac/Linux)
Navigate to the parent directory of your local repository and execute:
```bash
zip -r polly-alt.zip polly-alt/ -x "*.git*" "*node_modules*" ".DS_Store"
```

### Method 2: Manual GUI Method
Ensure your core plugin files (polly-alt.php, assets/script.js, assets/style.css) are located inside a folder named polly-alt.

Right-click the polly-alt folder.

Select Compress "polly-alt" (Mac) or Send to > Compressed (zipped) folder (Windows).

## 💾 Manual Installation Guide
Log in to your WordPress Administration Dashboard.

Navigate to Plugins > Add New Plugin in the left sidebar.

Click the Upload Plugin button located at the top of the screen.

Choose the freshly packaged polly-alt.zip file from your local machine.

Click Install Now.

Once the process completes successfully, click Activate Plugin.

## ⚙️ Configuration Setup

After activation, navigate to **Settings > Polly Alt AI** to calibrate the settings:
1. **Gemini API Key:** Paste your secure token. You can get a key via [Google AI Studio](https://aistudio.google.com/app/apikey). 
   * *Note on Cost:* Google offers a highly generous **Free Tier** that requires no card and is perfect for personal sites. If you choose to link a Google Cloud Billing account to remove rate limits and ensure maximum data privacy, you will shift to a pay-as-you-go model (though costs for lightweight text generation like alt text typically amount to pennies a month).
2. **AI Model:** Set to `gemini-2.0-flash` for rapid, optimized processing times.
3. **Suggestions per Squawk:** Define how many unique variations (1-5) are shown on generation requests.
4. **Educational Explanations:** Toggle the inclusion of screen-reader context boxes.