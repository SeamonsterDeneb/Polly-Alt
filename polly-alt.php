<?php
/**
 * Plugin Name: Polly Alt
 * Description: Like a parrot on a pirate's shoulder, Polly Alt tells your blind and low-vision users exactly what's on the horizon using Gemini AI.
 * Version: .9.10
 * Author: Captain Accessible, SeaMonster Studios
 * Author URI: https://www.seamonsterstudios.com
 * Text Domain: polly-alt
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'POLLY_ALT_VERSION', '.9.10' );
define( 'POLLY_ALT_PLUGIN_FILE', __FILE__ );

// =============================================================================
// 1. Settings Page
// =============================================================================

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
    <div class="wrap">
        <h1>🦜 Polly Alt AI Settings</h1>
        <form method="post" action="options.php">
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
        $val = get_option( 'polly_alt_model', 'gemini-2.0-flash' );
        ?>
        <input
            type="text"
            name="polly_alt_model"
            value="<?php echo esc_attr( $val ); ?>"
            placeholder="gemini-2.0-flash"
            class="regular-text"
        >
        <p class="description">
            The Gemini model to use. <code>gemini-2.0-flash</code> is recommended for speed and cost.
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
        $base_url . 'assets/style.css',
        [],
        POLLY_ALT_VERSION
    );

    wp_enqueue_script(
        'polly-alt-script',
        $base_url . 'assets/script.js',
        [],
        POLLY_ALT_VERSION,
        true
    );

    wp_localize_script( 'polly-alt-script', 'pollyConfig', [
        'model'              => get_option( 'polly_alt_model', 'gemini-2.0-flash' ),
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