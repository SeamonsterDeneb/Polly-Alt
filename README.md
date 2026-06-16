# 🦜 Polly Alt

Like a parrot on a pirate's shoulder, Polly Alt tells your blind and low-vision users exactly what's on the horizon using Gemini AI. 

Polly Alt is an accessibility-first WordPress plugin that analyzes media library uploads using live Gemini AI models to generate concise, active-voice, descriptive alternative text (alt text) variations around 125 characters. It includes automated compliance guards to prevent publishing or leaving media screens with missing alt text, keyboard-friendly selection menus, and educational context for administrators.

---

## 🏴‍☠️ Alpha Tester Quick-Start Guide (Easiest Method)

Thank you for helping test Polly Alt! You do not need to build or compile anything to try this plugin on your site.

### 1. Download the Pre-Built Plugin
1. Look at the folders at the top of this GitHub repository page and click into the **`dist`** folder.
2. Click on the **`polly-alt.zip`** file.
3. Look toward the right side of the screen and click the **Download Raw** button (it looks like a small downward arrow, or a button labeled "Download"). This will save the clean installer zip to your computer.

### 2. Install on WordPress
1. Log in to your WordPress dashboard and go to **Plugins > Add New Plugin**.
2. Click the **Upload Plugin** button at the top of the page.
3. Choose the `polly-alt.zip` file you just downloaded and click **Install Now**.
4. Once installed, click **Activate Plugin**.

### 3. Get Your Free Gemini API Key (No Credit Card Required!)
1. Go to **Settings > Polly Alt** in your WordPress sidebar.
2. Click the link to get a free key via [Google AI Studio](https://aistudio.google.com/app/apikey).
3. **Note:** Google AI Studio offers a completely free tier (up to 15 requests per minute). **You do not need a Google Cloud Billing account or a credit card** to get a key and use this plugin for testing!
4. Paste your key into the settings page, choose your preferred model from the live dropdown menu, and hit **Save Changes**.

---

## 💬 How to Give Feedback & Report Bugs

As an alpha tester, your thoughts are gold! Whether you run into a layout glitch or have a brilliant feature idea, please let us know:
* **Option A:** Post your thoughts directly in our thread inside the **WordPress Accessibility Facebook Group**.
* **Option B:** Open a formal issue right here on GitHub by clicking the **Issues** tab at the top of this page and hitting **New Issue**.

---

## 🏴‍☠️ Core Features

* **Multi-Subject AI Variations:** Automatically queries Gemini AI to produce multiple distinct alt text angles focusing on separate visual elements for users to choose between, rather than assuming a single "correct" answer.
* **Exit & Upload Compliance Guards:** Introduces purposeful "benevolent friction" by warning you if you are navigating away from media rows, Gutenberg image blocks, or Elementor panels while an image lacks alternative descriptions.
* **Smooth Keyboard Interactivity:** Crafted with total `:focus-visible` compatibility. Modals capture, trap, and restore structural keyboard focus seamlessly for screen reader and keyboard-only users.
* **Educational Training Advisories:** Displays assistive structural context alongside generated suggestions to train site admins on proper visual description standards.
* **Clean Decks Mode:** Optionally wipes messy camera-generated attachment Titles (like `IMG_4829.jpg`) when an explicit AI description selection is made.