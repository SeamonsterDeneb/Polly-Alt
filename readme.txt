=== Polly Alt ===
Contributors: seamonsterdeneb
Tags: accessibility, alt text, gemini ai, image descriptions, a11y
Requires at least: 6.0
Tested up to: 6.9
Stable tag: 1.0.0
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

= 1.0.0 =
* Launching Polly Alt v1.0.0 — Complete integration with Gutenberg and Elementor modalities.

== Screenshots ==

1. The multi-subject AI suggestion suite, providing clean layout options and educational compliance tools right inside your media browser window.
2. The custom modal enforcement guard actively intercepting media insertions to prevent missing alt descriptions.