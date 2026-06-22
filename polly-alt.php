<?php
/**
 * Plugin Name: Polly Alt
 * Description: Like a parrot on a pirate's shoulder, Polly Alt tells your blind and low-vision users exactly what's on the horizon using Gemini AI.
 * Version: 0.9.24
 * Author: Captain Accessible, SeaMonster Studios
 * Author URI: https://www.seamonsterstudios.com
 * Text Domain: polly-alt
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'POLLY_ALT_VERSION', '0.9.24' );
define( 'POLLY_ALT_PLUGIN_FILE', __FILE__ );

// =============================================================================
// 1. Settings Page & Dynamic Model Fetching
// =============================================================================

/**
 * Reach out to Google Gemini to fetch all active multimodal-capable models.
 * Results are cached for 24 hours to keep the WP admin screen fast.
 */
function polly_alt_get_available_models() {
    $api_key = get_option( 'polly_alt_api_key', '' );
    if ( empty( $api_key ) ) {
        return [];
    }

    $transient_key = 'polly_alt_models_list';
    $cached = get_transient( $transient_key );
    if ( false !== $cached ) {
        return $cached;
    }

    // Call the v1beta models endpoint to discover what endpoints are currently live
    $url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' . esc_attr( $api_key );
    $response = wp_remote_get( $url, [ 'timeout' => 15 ] );

    // Fallback if the network call fails
    if ( is_wp_error( $response ) ) {
        return [
            'gemini-1.5-flash' => 'Gemini 1.5 Flash (Fallback - API Connection Error)',
        ];
    }

    $body = wp_remote_retrieve_body( $response );
    $data = json_decode( $body, true );

    if ( empty( $data['models'] ) || ! is_array( $data['models'] ) ) {
        return [
            'gemini-1.5-flash' => 'Gemini 1.5 Flash (Fallback - Invalid API Response)',
        ];
    }

    $models = [];
    foreach ( $data['models'] as $m ) {
        if ( empty( $m['name'] ) || empty( $m['supportedGenerationMethods'] ) ) {
            continue;
        }

        // We only want models that support generating content (multimodal images)
        if ( ! in_array( 'generateContent', $m['supportedGenerationMethods'], true ) ) {
            continue;
        }

        $clean_name = str_replace( 'models/', '', $m['name'] );

        // Exclude internal tools, embedding, or text-only legacy API endpoints
        if ( 
            strpos( $clean_name, 'embedding' ) !== false || 
            strpos( $clean_name, 'text' ) !== false || 
            strpos( $clean_name, 'aqa' ) !== false ||
            strpos( $clean_name, 'tuning' ) !== false
        ) {
            continue;
        }

        $display_name = ! empty( $m['displayName'] ) ? $m['displayName'] : $clean_name;
        $models[ $clean_name ] = $display_name;
    }

    if ( empty( $models ) ) {
        $models = [
            'gemini-1.5-flash' => 'Gemini 1.5 Flash (Fallback)',
        ];
    }

    // Cache the verified endpoints for 24 hours
    set_transient( $transient_key, $models, DAY_IN_SECONDS );
    return $models;
}

// Automatically clear the model cache if the user updates their API Key
add_action( 'update_option_polly_alt_api_key', function () {
    delete_transient( 'polly_alt_models_list' );
} );

add_action( 'admin_menu', function () {
    add_options_page(
        'Polly Alt Settings',
        'Polly Alt AI',
        'manage_options',
        'polly-alt-settings',
        'polly_alt_settings_page'
    );
} );

function polly_alt_settings_page() {
    ?>
    <div class="wrap" style="max-width: 850px;">
        <h1>🦜 Polly Alt AI Settings</h1>
        
        <div class="welcome-panel" style="padding: 20px; margin-top: 20px; background: #fff; border: 1px solid #ccd0d4; border-radius: 4px;">
            <div class="welcome-panel-content">
                <h2>🏴‍☠️ The Captain's Guide to Polly Alt</h2>
                <p class="about-description" style="font-size: 14px; margin-bottom: 15px;">
                    Welcome aboard! Polly Alt helps you write great descriptive alt text while training your crew on accessibility standards. To get the absolute most out of Polly, keep these parameters in mind:
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                    <div>
                        <strong style="display:block; font-size:14px; margin-bottom:5px;">📋 Use the Media Library "List View"</strong>
                        <p style="margin:0; font-size:13px; line-height:1.5; color:#50575e;">
                            Polly anchors directly to WordPress text fields. In the main Media Library, **you must switch from Thumbnail Grid to List View** to see the custom Alt Text column and generation buttons.
                        </p>
                    </div>
                    <div>
                        <strong style="display:block; font-size:14px; margin-bottom:5px;">✍️ The 125-Character Budget</strong>
                        <p style="margin:0; font-size:13px; line-height:1.5; color:#50575e;">
                            Screen readers typically announce image descriptions in chunks. Polly optimizes suggestions to stay close to this ideal budget. Avoid starting with repetitive phrases like "image of" or "photo of."
                        </p>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                    <div>
                        <strong style="display:block; font-size:14px; margin-bottom:5px;">🪵 Core Editor Compatibility</strong>
                        <p style="margin:0; font-size:13px; line-height:1.5; color:#50575e;">
                            Polly tracks your context inside the **Gutenberg Block Editor** sidebar and **Elementor Media Panels** seamlessly. Just click an image block to trigger Polly's interface.
                        </p>
                    </div>
                    <div>
                        <strong style="display:block; font-size:14px; margin-bottom:5px;">🛡️ Intentional Friction</strong>
                        <p style="margin:0; font-size:13px; line-height:1.5; color:#50575e;">
                            The compliance guards will deliberately check your work when uploading files or exiting. It's meant to make adding alt text easier than leaving it empty!
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <form method="post" action="options.php" style="margin-top: 30px;">
            <?php
            settings_fields( 'polly_alt_group' );
            do_settings_sections( 'polly-alt-settings' );
            submit_button();
            ?>
        </form>
    </div>
    <?php
}

add_action( 'admin_init', function () {
    register_setting( 'polly_alt_group', 'polly_alt_api_key' );
    register_setting( 'polly_alt_group', 'polly_alt_model' );
    register_setting( 'polly_alt_group', 'polly_alt_choices' );
    register_setting( 'polly_alt_group', 'polly_alt_remove_title' );
    register_setting( 'polly_alt_group', 'polly_alt_include_explanation' );

    add_settings_section( 'polly_main_section', "Ship's Logs & API", null, 'polly-alt-settings' );

    add_settings_field( 'api_key', 'Gemini API Key', function () {
        $val = get_option( 'polly_alt_api_key', '' );
        ?>
        <input
            type="password"
            name="polly_alt_api_key"
            value="<?php echo esc_attr( $val ); ?>"
            class="regular-text"
            autocomplete="off"
        >
        <p class="description">
            Required to generate alt text. Get your free key at
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.
        </p>
        <?php
        
    }, 'polly-alt-settings', 'polly_main_section' );

    add_settings_field( 'model', 'AI Model', function () {
        $models = polly_alt_get_available_models();

        // Safe static fallbacks if the API call fails or key is missing
        if ( empty( $models ) ) {
            $models = [
                'gemini-3.5-flash' => 'Gemini 3.5 Flash',
                'gemini-1.5-pro'   => 'Gemini 1.5 Pro',
            ];
        }

        // --- Dynamic Default Engine ---
        // 1. Look for the absolute newest active flash model to mark as recommended
        $recommended_model = '';
        foreach ( array_keys( $models ) as $model_key ) {
            if ( strpos( $model_key, '-flash' ) !== false ) {
                // If we haven't found a flash model yet, or this one has a higher version string
                if ( empty( $recommended_model ) || version_compare( $model_key, $recommended_model, '>' ) ) {
                    $recommended_model = $model_key;
                }
            }
        }
        
        // 2. Fall back to the first available model if no explicitly named flash model exists
        if ( empty( $recommended_model ) ) {
            $model_keys = array_keys( $models );
            $recommended_model = ! empty( $model_keys ) ? $model_keys[0] : '';
        }

        // 3. Check the database, defaulting to our dynamically calculated recommendation
        $current_model = get_option( 'polly_alt_model', $recommended_model );
        ?>
        <select name="polly_alt_model" id="polly-alt-model" style="min-width: 250px;">
            <?php foreach ( $models as $value => $label ) : 
                // Dynamically append the label to the live recommended model
                $display_label = ( $recommended_model === $value ) ? $label . ' (Recommended)' : $label;
                ?>
                <option value="<?php echo esc_attr( $value ); ?>" <?php selected( $current_model, $value ); ?>>
                    <?php echo esc_html( $display_label ); ?>
                </option>
            <?php endforeach; ?>
        </select>
        <p class="description">
            Select the active Gemini model for image analysis. This list stays updated dynamically via Google's live endpoints.
        </p>
        <?php
    }, 'polly-alt-settings', 'polly_main_section' );

    add_settings_field( 'choices', 'Suggestions per Squawk', function () {
        $val = (int) get_option( 'polly_alt_choices', 3 );
        ?>
        <input
            type="number"
            name="polly_alt_choices"
            value="<?php echo esc_attr( $val ); ?>"
            min="1"
            max="5"
        >
        <p class="description">How many AI-generated alt text options to offer (1–5).</p>
        <?php
    }, 'polly-alt-settings', 'polly_main_section' );

    add_settings_field( 'include_explanation', 'AI Training', function () {
        $val = get_option( 'polly_alt_include_explanation', 1 );
        ?>
        <label>
            <input
                type="checkbox"
                name="polly_alt_include_explanation"
                value="1"
                <?php checked( 1, $val ); ?>
            >
            Include educational explanations alongside each suggestion
        </label>
        <?php
    }, 'polly-alt-settings', 'polly_main_section' );

    add_settings_field( 'remove_title', 'Clean Decks', function () {
        $val = get_option( 'polly_alt_remove_title', 0 );
        ?>
        <label>
            <input
                type="checkbox"
                name="polly_alt_remove_title"
                value="1"
                <?php checked( 1, $val ); ?>
            >
            Clear the attachment Title field when alt text is applied via the AI modal
        </label>
        <p class="description">
            This only happens when you <strong>select</strong> a suggestion from the AI modal,
            not on every auto-save, so you won't lose titles accidentally.
        </p>
        <?php
    }, 'polly-alt-settings', 'polly_main_section' );
} );

// Settings link on the Plugins list page.
add_filter( 'plugin_action_links_' . plugin_basename( POLLY_ALT_PLUGIN_FILE ), function ( $links ) {
    $settings_link = '<a href="' . esc_url( admin_url( 'options-general.php?page=polly-alt-settings' ) ) . '">'
        . __( 'Settings' ) . '</a>';
    array_unshift( $links, $settings_link );
    return $links;
} );

// Clear the model list cache instantly if the API key setting is updated.
add_action( 'update_option_polly_alt_api_key', function() {
    delete_transient( 'polly_alt_models_list' );
});

// =============================================================================
// 2. Media Library List View Column
// =============================================================================

add_filter( 'manage_media_columns', function ( $columns ) {
    $columns['polly_alt_col'] = 'Alt Text';
    return $columns;
} );

add_action( 'manage_media_custom_column', function ( $column_name, $attachment_id ) {
    if ( 'polly_alt_col' !== $column_name ) return;

    $alt      = get_post_meta( $attachment_id, '_wp_attachment_image_alt', true );
    $field_id = 'polly-list-alt-' . absint( $attachment_id );
    ?>
    <div class="polly-list-field-container" data-id="<?php echo absint( $attachment_id ); ?>">
        <div class="polly-field-header">
            <label class="polly-custom-field-label" for="<?php echo esc_attr( $field_id ); ?>">Alt Text</label>
            <span class="polly-char-counter">0 characters</span>
        </div>
        <textarea
            id="<?php echo esc_attr( $field_id ); ?>"
            class="polly-list-alt-field"
            placeholder="Please add alternative text for blind and low-vision users"
        ><?php echo esc_textarea( $alt ); ?></textarea>
    </div>
    <?php
}, 10, 2 );

// =============================================================================
// 3. AJAX Handler
// =============================================================================

add_action( 'wp_ajax_polly_save_alt', function () {
    if ( ! check_ajax_referer( 'polly_nonce', 'nonce', false ) ) {
        wp_send_json_error( [ 'message' => 'Security check failed. Please reload the page and try again.' ], 403 );
    }

    if ( ! current_user_can( 'upload_files' ) ) {
        wp_send_json_error( [ 'message' => 'You do not have permission to edit media.' ], 403 );
    }

    $attachment_id = absint( $_POST['attachment_id'] ?? 0 );
    if ( $attachment_id <= 0 ) {
        wp_send_json_error( [ 'message' => 'Invalid attachment ID.' ], 400 );
    }

    if ( 'attachment' !== get_post_type( $attachment_id ) ) {
        wp_send_json_error( [ 'message' => 'Post is not a media attachment.' ], 400 );
    }

    $alt_text = sanitize_text_field( wp_unslash( $_POST['alt_text'] ?? '' ) );
    update_post_meta( $attachment_id, '_wp_attachment_image_alt', $alt_text );

    /*
     * "Clean Decks" — only fires when the client sends remove_title=1,
     * which the JS only does on deliberate AI modal selections, not on
     * every blur auto-save, so titles are never silently erased.
     */
    $remove_title = ! empty( $_POST['remove_title'] ) && '1' === $_POST['remove_title'];
    if ( $remove_title ) {
        wp_update_post( [
            'ID'         => $attachment_id,
            'post_title' => '',
        ] );
    }

    wp_send_json_success( [ 'attachment_id' => $attachment_id ] );
} );

// =============================================================================
// 4. Enqueue Assets
// =============================================================================

add_action( 'admin_enqueue_scripts', function ( $hook ) {
    $screen = get_current_screen();
    if ( ! $screen ) return;

    $allowed_bases = [ 'upload', 'media', 'post', 'page', 'elementor' ];
    if ( ! in_array( $screen->base, $allowed_bases, true ) ) return;

    polly_alt_enqueue_assets();
} );

add_action( 'elementor/editor/before_enqueue_scripts', function () {
    polly_alt_enqueue_assets();
} );

function polly_alt_enqueue_assets() {
    $api_key  = get_option( 'polly_alt_api_key', '' );
    $base_url = plugin_dir_url( POLLY_ALT_PLUGIN_FILE );

    wp_enqueue_style(
        'polly-alt-style',
        $base_url . 'assets/polly-alt.css',
        [],
        POLLY_ALT_VERSION
    );

    wp_enqueue_script(
        'polly-alt-script',
        $base_url . 'assets/polly-alt.js',
        [],
        POLLY_ALT_VERSION,
        true
    );

    wp_localize_script( 'polly-alt-script', 'pollyConfig', [
        // Dynamically grab the exact model from the option database, defaulting to a live stable model
        'model'              => get_option( 'polly_alt_model', 'gemini-3.5-flash' ),
        'choiceCount'        => (int) get_option( 'polly_alt_choices', 3 ),
        'removeTitle'        => (bool) get_option( 'polly_alt_remove_title', 0 ),
        'includeExplanation' => (bool) get_option( 'polly_alt_include_explanation', 1 ),
        'ajaxUrl'            => admin_url( 'admin-ajax.php' ),
        'nonce'              => wp_create_nonce( 'polly_nonce' ),
    ] );
}

// =============================================================================
// 5. Handle API Key Securely
// =============================================================================

add_action('wp_ajax_polly_gemini_proxy', function() {
    if (!check_ajax_referer('polly_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => 'Security check failed.'], 403);
    }
    if (!current_user_can('upload_files')) {
        wp_send_json_error(['message' => 'Permission denied.'], 403);
    }

    $api_key = get_option('polly_alt_api_key', '');
    if (!$api_key) {
        wp_send_json_error(['message' => 'No API key configured.'], 400);
    }

    $model = sanitize_text_field(wp_unslash($_POST['model'] ?? 'gemini-2.0-flash'));
    $body  = wp_unslash($_POST['payload'] ?? '');

    $response = wp_remote_post(
        "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$api_key}",
        [
            'headers' => ['Content-Type' => 'application/json'],
            'body'    => $body,
            'timeout' => 30,
        ]
    );

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => $response->get_error_message()], 500);
    }

    $code = wp_remote_retrieve_response_code($response);
    $data = json_decode(wp_remote_retrieve_body($response), true);

    if ($code !== 200) {
        wp_send_json_error(['message' => $data['error']['message'] ?? 'Gemini error.'], $code);
    }

    wp_send_json_success($data);
});

// Display a helpful hint on the Media Library screen if users are on the grid view
add_action( 'admin_notices', function () {
    $screen = get_current_screen();
    if ( ! $screen || 'upload' !== $screen->base ) {
        return;
    }

    // Check if user is on the thumbnail/grid view (WordPress default layout)
    if ( isset( $_GET['mode'] ) && 'list' === $_GET['mode'] ) {
        return;
    }

    // Don't show if they've already dismissed it
    $user_id = get_current_user_id();
    if ( get_user_meta( $user_id, 'dismissed_polly_view_notice', true ) ) {
        return;
    }
    ?>
    <div class="notice notice-info is-dismissible polly-view-hint-notice">
        <p>
            🦜 <strong>Polly Alt Tip:</strong> To generate and tweak your alt text values right inside the Media Library dashboard, switch over to the 
            <a href="<?php echo esc_url( admin_url( 'upload.php?mode=list' ) ); ?>"><strong>List View layout</strong></a>! 
            Polly also works automatically when you click images inside the Gutenberg and Elementor post editors.
        </p>
    </div>
    <script>
        jQuery(document).on('click', '.polly-view-hint-notice .notice-dismiss', function() {
            wp.ajax.post('polly_dismiss_view_notice', {
                nonce: '<?php echo wp_create_nonce("polly_view_nonce"); ?>'
            });
        });
    </script>
    <?php
} );

// AJAX endpoint to save the user's dismissal choice
add_action( 'wp_ajax_polly_dismiss_view_notice', function () {
    check_ajax_referer( 'polly_view_nonce', 'nonce' );
    update_user_meta( get_current_user_id(), 'dismissed_polly_view_notice', true );
    wp_send_json_success();
} );