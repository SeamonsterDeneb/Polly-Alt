=== Polly Alt ===
Contributors: seamonsterdeneb
Tags: accessibility, alt text, gemini ai, image descriptions, a11y
Requires at least: 6.0
Tested up to: 7.1
Stable tag: 1.4.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Like a parrot on a pirate's shoulder, Polly Alt prompts you with smart, accessible alternative text suggestions using Gemini AI.

== Description ==

Polly Alt is an accessibility-first WordPress plugin that analyzes media library uploads using live Gemini AI models to generate concise, active-voice, descriptive alternative text (alt text) variations around 125 characters. It introduces purposeful "benevolent friction" via automated compliance guards to prevent publishing or leaving media screens with missing alt text, combined with keyboard-friendly selection menus and educational context for administrators.

= Core Features =

* **Multi-Subject AI Variations:** Automatically queries Gemini AI to produce multiple distinct alt text angles focusing on separate visual elements for users to choose between, rather than assuming a single "correct" answer.
* **Exit & Upload Compliance Guards:** Warns you if you are navigating away from media rows, Gutenberg image blocks, or Elementor panels while an image lacks alternative descriptions.
* **Smooth Keyboard Interactivity:** Crafted with total `:focus-visible` compatibility. Modals capture, trap, and restore structural keyboard focus seamlessly for screen reader and keyboard-only users.
* **Educational Training Advisories:** Displays assistive structural context alongside generated suggestions to train site admins on proper visual description standards.
* **Clean Decks Mode:** Optionally wipes messy camera-generated attachment Titles (like `IMG_4829.jpg`) when an explicit AI description selection is made.

== Installation ==

= Getting Started =

1. Upload the `polly-alt` folder to the `/wp-content/plugins/` directory, or install directly via the WordPress admin area.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Navigate to **Settings > Polly Alt** in your WordPress sidebar.
4. Click the link to secure a free Gemini API key via Google AI Studio (up to 15 requests per minute completely free, no credit card or billing configuration required).
5. Paste your API key into the input field, select your preferred live model variant from the dropdown, and click **Save Changes**.

== Frequently Asked Questions ==

= Do I need a paid Google Cloud account to use this? =
No. Google AI Studio offers a generous free tier that is perfect for standard content management workflows without needing a credit card or subscription plan.

= Does this plugin automatically modify images without my consent? =
Never. Polly Alt operates on a strict human-in-the-loop review architecture. The AI makes suggestions, but an administrator must explicitly review, polish, and approve a choice before the database fields are updated.

== Changelog ==

= 1.4.0 =
* **Context Awareness:** Automatically reads surrounding headings and paragraphs in Gutenberg, Elementor, and Classic editors to steer AI descriptions toward page context.
* **Per-Instance Alt Text:** Scans and applies unique alternative descriptions to specific image occurrences across posts without overwriting global attachment defaults.
* **Functional Image Accommodation:** Detects linked images and buttons, directing Gemini to write destination- and action-oriented alt text.
* **"Make it Fit" Character Compression:** One-click AI budget compression to keep descriptions under the ideal 125-character budget.
* **Side-by-Side Revision Assistant:** Added a diff assistant card to inspect, copy from, or revert inline alt text edits.
* **Publish & Save Compliance Wizard:** Page-wide interceptor in Gutenberg and Elementor that steps you through missing alt text before publishing.
* **Dynamic Model Fetching:** Automatically fetches live Gemini vision models directly from Google AI Studio API with transient caching.
* **Drag-and-Drop Batch Upload Alerts:** Instant prompts when newly uploaded batch media items require alt text.
* **Media Library List View Column:** Added custom column for inline editing and AI generation directly in the WordPress Media Library list layout.

= 1.0.0 =
* **Launching Polly Alt v1.0.0** — Complete integration with Gutenberg and Elementor modalities.

== External services ==

This plugin connects to external APIs to analyze image media and generate descriptions:

* Google Gemini API: Sends image data and surrounding post text to Google's Gemini models when generating alt text suggestions.
* Terms of Service: https://policies.google.com/terms
* Privacy Policy: https://policies.google.com/privacy

== Screenshots ==

1. The multi-subject AI suggestion suite, providing clean layout options and educational compliance tools right inside your media browser window.
2. The custom modal enforcement guard actively intercepting media insertions to prevent missing alt descriptions.