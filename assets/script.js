/**
 * Polly Alt AI - Logic v.9.16
**/
(function () {

    const config = typeof pollyConfig !== 'undefined' ? pollyConfig : null;
    if (!config) {
        console.error('🦜 POLLY ALT: pollyConfig missing. Is the plugin configured?');
        return;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Strip WordPress thumbnail size suffixes to get the original upload URL.
     * e.g. image-300x200.jpg → image.jpg
     */
    function getHighResUrl(url) {
        if (!url) return '';
        return url.replace(/-\d+x\d+(?=\.(jpg|jpeg|png|gif|webp))/i, '');
    }

    /**
     * Detect MIME type from a URL's file extension.
     * Falls back to image/jpeg for unknown types.
     */
    function mimeTypeFromUrl(url) {
        const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
        const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
        return map[ext] || 'image/jpeg';
    }

    /**
     * Fetch an image and return its base64-encoded data (without the data: prefix).
     * Throws on network failure so the caller can handle it.
     */
    async function getBase64(url) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Could not fetch image (HTTP ${resp.status})`);
        const blob = await resp.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(blob);
        });
    }

    // -------------------------------------------------------------------------
    // Character counter & button label
    // -------------------------------------------------------------------------

    function updateCharCounter(field) {
        if (!field) return;
        let counter = document.querySelector(`.polly-char-counter[data-for="${field.id}"]`);
        if (!counter) {
            const ancestor = field.closest(
                '.polly-list-field-container, .polly-btn-wrapper, .media-sidebar, ' +
                '.attachment-details, .setting, .media-item, .media-frame-side'
            );
            counter = ancestor ? ancestor.querySelector('.polly-char-counter') : null;
        }
        if (!counter) return;
        const len = (field.value || '').length;
        counter.textContent = `${len} characters`;
        counter.classList.toggle('over-limit', len > 125);
    }

    function updateButtonLabel(field) {
        const btn = document.querySelector(`.polly-gen-btn[data-for="${field.id}"]`);
        if (btn) btn.textContent = field.value.trim() ? 'Preview and Refine' : 'Preview and Generate';
    }

    // -------------------------------------------------------------------------
    // Focus trapping
    // -------------------------------------------------------------------------

    /**
     * Trap keyboard focus inside a modal element.
     * Dispatches a 'polly-close' event on Escape so each modal's own
     * cleanup function can handle teardown and focus restore.
     */
    function trapFocus(modal) {
        const focusable = modal.querySelectorAll(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        modal.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                modal.dispatchEvent(new Event('polly-close'));
                return;
            }
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    }

    // -------------------------------------------------------------------------
    // Compliance guard — upload/media screens only
    // -------------------------------------------------------------------------

    function isUploadScreen() {
        return typeof pagenow !== 'undefined' && (pagenow === 'upload' || pagenow === 'media');
    }

    function isElementorEditor() {
        return document.body.classList.contains('elementor-editor-active');
    }

    function isEditScreen() {
        if (isElementorEditor()) return true;
        if (document.body.classList.contains('block-editor-page')) return true;
        if (typeof pagenow === 'undefined') return true;
        const nonEditScreens = ['upload', 'media', 'options-general', 'plugins', 'themes', 'users'];
        return !nonEditScreens.includes(pagenow);
    }
    // Stop uploading new files if alt text not given to previously uploaded ones, unless explicitly state they want to
    let uploadGuardSuppressed = false;
    let insertGuardSuppressed = false;
    function syncUploadGuard() {
        if (uploadGuardSuppressed) return;
        const uploadBtn = document.querySelector(
            '.plupload-upload-uic, #plupload-browse-button'
        );
        if (!uploadBtn) return;
        const missing = document.querySelectorAll('.missing-alt');
        uploadBtn.classList.toggle('polly-upload-guarded', missing.length > 0);
    }

    /**
     * Find all Polly-managed alt fields that are empty and not marked decorative.
     * Uses only specific selectors — no [name*="alt"] wildcard.
     */
    function checkCompliance() {
        if (!isUploadScreen()) return [];

        const missing = [];
        const items = document.querySelectorAll(
            '.media-item:not(:has(.media-item)), ' +
            '.polly-list-field-container:not(.media-item *):not(.attachment-details *), ' +
            '.attachment-details:not(.media-item *), ' +
            '.setting[data-setting="alt"]'
        );

        items.forEach(item => {
            const textarea = item.querySelector(
                '.polly-custom-textarea, .polly-list-alt-field, ' +
                'textarea[data-setting="alt"], #attachment-details-alt-text'
            );
            const decoCheck = item.querySelector('.polly-decorative-check');

            if (textarea && !textarea.value.trim() && (!decoCheck || !decoCheck.checked)) {
                missing.push(textarea);
                textarea.classList.add('missing-alt');
            } else if (textarea) {
                textarea.classList.remove('missing-alt');
            }
        });

        syncUploadGuard();
        return missing;
    }


    // Single custom modal on admin link clicks — no beforeunload browser dialog.
    document.addEventListener('click', (e) => {
        if (!isUploadScreen()) return;
        const link = e.target.closest('#adminmenu a, #wpadminbar a, .pagination-links a');
        if (!link) return;
        const missing = checkCompliance();
        if (missing.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            
            // Find the generate button explicitly tied to the first missing element
            const firstMissingBtn = missing[0]?.closest('.polly-list-field-container, .media-item, .setting')
                ?.querySelector('.polly-gen-btn');
                
            showEnforcementModal(link.href, missing.length, 'Leave anyway', firstMissingBtn);
        }
    }, true);

    // Intercept the plupload "Add Files" button on media-new.php.
    document.addEventListener('click', (e) => {
        if (typeof pagenow === 'undefined' || pagenow !== 'media') return;
        const uploadBtn = e.target.closest('.plupload-upload-uic, #plupload-browse-button, .moxie-shim');
        if (!uploadBtn) return;
        if (!uploadBtn.classList.contains('polly-upload-guarded')) return;
        e.preventDefault();
        e.stopPropagation();
        const missing = checkCompliance();
        if (missing.length === 0) {
            uploadBtn.classList.remove('polly-upload-guarded');
            return;
        }
        const firstBtn = missing[0]?.closest('.polly-list-field-container, .media-item')
            ?.querySelector('.polly-gen-btn');
        showEnforcementModal(null, missing.length, 'Upload anyway', firstBtn);
    }, true);

    function showEnforcementModal(targetUrl, missingCount, leaveLabel = 'Leave anyway', focusTarget = null, customMessage = null, onStay = null) {
            if (document.getElementById('polly-enforcement-overlay')) return;

        const noun = missingCount === 1 ? 'image is' : 'images are';

        const overlay = document.createElement('div');
        overlay.id = 'polly-enforcement-overlay';
        overlay.className = 'polly-alt-modal-overlay';

        const modal = document.createElement('div');
        modal.id = 'polly-enforcement-modal';
        modal.className = 'polly-modal-alert';
        modal.setAttribute('role', 'alertdialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'polly-alert-heading');
        modal.innerHTML = `
            <div class="polly-modal-header">
                <h3 id="polly-alert-heading">🦜 Just a moment, Captain!</h3>
            </div>
            <div class="polly-modal-body">
                <p style="font-size:15px; line-height:1.6;">
                    ${customMessage
                        ? customMessage
                        : `<strong>${missingCount} ${noun} missing alt text</strong> on this page.
                           Blind and low-vision visitors won't know what those images show.
                           It only takes a moment — Polly can help!`
                    }
                </p>
                <div class="polly-modal-btn-row" style="display:flex; gap:10px; margin-top:20px;">
                    <button id="polly-stay-btn" class="button button-primary" style="flex:1; height:50px; font-size:14px; font-weight:600;">
                        ✏️ Let's add some alt right now!
                    </button>
                    <button id="polly-leave-btn" class="button" style="flex:1; height:50px; font-size:14px; color:#666;">
                        ${leaveLabel}
                    </button>
                </div>
            </div>
        `;

        const trigger = document.activeElement;

        const cleanup = () => {
            overlay.remove();
            modal.remove();
            if (trigger) trigger.focus();
        };

        modal.addEventListener('polly-close', () => {
            cleanup();
            const target = focusTarget || document.querySelector('.polly-gen-btn');
            if (target) {
                target.focus();
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        document.getElementById('polly-stay-btn').onclick = () => {
            cleanup();
            if (onStay) {
                onStay();
            } else {
                const target = focusTarget || document.querySelector('.polly-gen-btn');
                if (target) {
                    target.focus();
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        };
        document.getElementById('polly-leave-btn').onclick = () => {
            if (targetUrl) {
                window.location.href = targetUrl;
            } else {
                cleanup();
                // Re-click whichever action button triggered this
                const insertBtn = document.querySelector(
                    '.media-modal .media-button-select, ' +
                    '.media-modal .media-button-insert'
                );
                if (insertBtn) {
                    insertGuardSuppressed = true;
                    cleanup();
                    insertBtn.click();
                    setTimeout(() => { insertGuardSuppressed = false; }, 1000);
                } else {
                    // Fallback: upload screen suppress
                    uploadGuardSuppressed = true;
                    document.querySelectorAll('.polly-upload-guarded, #plupload-browse-button, .plupload-upload-uic')
                        .forEach(el => el.classList.remove('polly-upload-guarded'));
                    const uploadBtn = document.querySelector('#plupload-browse-button, .plupload-upload-uic');
                    if (uploadBtn) { uploadBtn.focus(); uploadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                    setTimeout(() => { uploadGuardSuppressed = false; }, 1000);
                }
            }
        };

        modal.setAttribute('tabindex', '-1');
        modal.focus();
        document.getElementById('polly-stay-btn').focus({ focusVisible: true });
        trapFocus(modal);
    }
    // -------------------------------------------------------------------------
    // Drag and drop completion notification
    // -------------------------------------------------------------------------

    function initDropNotification() {
        if (typeof pagenow === 'undefined' || pagenow !== 'media') return;

        let knownRows = new Set();

        // Seed with any rows already on the page.
        document.querySelectorAll('.media-item').forEach(row => {
            if (row.querySelector('.edit-attachment')) knownRows.add(row);
        });

        const dropObserver = new MutationObserver(() => {
            const currentRows = new Set();
            document.querySelectorAll('.media-item').forEach(row => {
                if (row.querySelector('.edit-attachment')) currentRows.add(row);
            });

            const newRows = [...currentRows].filter(r => !knownRows.has(r));
            if (newRows.length === 0) return;

            // Update known rows.
            knownRows = currentRows;

            // Count how many existing rows are missing alt text.
            const existingMissing = checkCompliance().length;
            const newCount = newRows.length;
            const totalMissing = existingMissing;

            // Wait for injectUploaderFields to have run on the new rows.
            setTimeout(() => {
            // Ensure fields are injected for all new rows before we prompt
            injectUploaderFields();
            initPolly();

            const firstNewBtn = newRows[0]
                ?.querySelector('.polly-gen-btn');

                const message = totalMissing > newCount
                    ? `You already had ${totalMissing - newCount} image${totalMissing - newCount !== 1 ? 's' : ''} needing alt text, and you've just added ${newCount} more. Want Polly to help?`
                    : `You've just uploaded ${newCount} new image${newCount !== 1 ? 's' : ''}. Want Polly to help add alt text?`;

                showDropNotification(message, firstNewBtn);
            }, 1000);
        });

        dropObserver.observe(document.body, { childList: true, subtree: true });
    }

    function showDropNotification(message, firstBtn) {
        // Don't stack on top of another modal.
        if (document.getElementById('polly-enforcement-overlay') ||
            document.getElementById('polly-drop-notification')) return;

        const notification = document.createElement('div');
        notification.id = 'polly-drop-notification';
        notification.setAttribute('role', 'alertdialog');
        notification.setAttribute('aria-modal', 'true');
        notification.setAttribute('aria-labelledby', 'polly-drop-heading');
        notification.innerHTML = `
            <div class="polly-modal-header">
                <h3 id="polly-drop-heading">🦜 Squawk! Alt text needed!</h3>
            </div>
            <div class="polly-modal-body">
                <p style="font-size:15px; line-height:1.6;">${message}</p>
                <div class="polly-modal-btn-row" style="display:flex; gap:10px; margin-top:20px;">
                    <button id="polly-drop-yes" class="button button-primary" style="flex:1; height:50px; font-size:14px; font-weight:600;">
                        ✏️ Yes, let's do it!
                    </button>
                    <button id="polly-drop-no" class="button" style="flex:1; height:50px; font-size:14px; color:#666;">
                        Not right now
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        const cleanup = () => notification.remove();

        notification.addEventListener('polly-close', cleanup);

        document.getElementById('polly-drop-yes').onclick = () => {
            cleanup();
            const target = firstBtn || document.querySelector('.polly-gen-btn');
            if (target) {
                target.focus();
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };

        document.getElementById('polly-drop-no').onclick = cleanup;

        notification.setAttribute('tabindex', '-1');
        notification.focus();
        document.getElementById('polly-drop-yes').focus();
        trapFocus(notification);
    }

    initDropNotification();
    // -------------------------------------------------------------------------
    // AJAX save
    // -------------------------------------------------------------------------

    async function saveAltText(id, text) {
        if (!id) return;
        const formData = new FormData();
        formData.append('action', 'polly_save_alt');
        formData.append('attachment_id', id);
        formData.append('alt_text', text);
        formData.append('remove_title', config.removeTitle ? 1 : 0);
        formData.append('nonce', config.nonce);

        try {
            const resp = await fetch(config.ajaxUrl, { method: 'POST', body: formData });
            const data = await resp.json();
            if (!data.success) console.warn('🦜 POLLY ALT: Save failed.', data);
        } catch (err) {
            console.warn('🦜 POLLY ALT: Network error during save.', err);
        }

        // Keep Backbone's in-memory model in sync so Gutenberg
        // picks up the alt text when inserting.
        if (window.wp?.media?.attachment) {
            const attachment = wp.media.attachment(id);
            if (attachment.get('id')) attachment.set('alt', text);
        }
    }

    // -------------------------------------------------------------------------
    // Attachment ID resolution
    // -------------------------------------------------------------------------

    /**
     * Resolve the attachment ID from the DOM context around a field.
     * Called lazily just before the ID is needed, so Backbone/plupload
     * has had time to finish rendering.
     */
    function resolveAttachmentId(field) {
        if (field.dataset.pollyAttachmentId) return field.dataset.pollyAttachmentId;

        const context = field.closest(
            '.media-sidebar, .attachment-details, .media-frame-side, .media-modal, ' +
            '.media-item, tr, .polly-list-field-container'
        ) || field.closest('.attachment-details')?.closest('.attachment-info, .save-ready')
        || field.closest('.save-ready');

        let id = null;

        if (context) {
            // Strategy 1: edit link href contains post=NNN
            const editLink =
                context.querySelector('.edit-attachment, .view-attachment') ||
                context.closest('.media-item')?.querySelector('.edit-attachment');
            if (editLink && editLink.href) {
                const m = editLink.href.match(/post=(\d+)/);
                if (m) id = m[1];
            }

            // Strategy 2: field name contains [NNN]
            if (!id && field.name) {
                const m = field.name.match(/\[(\d+)\]/);
                if (m) id = m[1];
            }

            // Strategy 3: data-id on container or ancestor
            if (!id) {
                const withDataId = context.closest('[data-id]') || context.querySelector('[data-id]');
                if (withDataId) id = withDataId.dataset.id;
            }
        }

        if (id) field.dataset.pollyAttachmentId = id;
        return id;
    }

    // -------------------------------------------------------------------------
    // Plupload row injection (media-new.php)
    // -------------------------------------------------------------------------

    /**
     * For the legacy bulk uploader, WordPress doesn't render an alt text field
     * at all. We detect completed upload rows (they have an .edit-attachment link
     * once done) and inject our own field directly into the DOM.
     */
    function injectUploaderFields() {
        document.querySelectorAll('.media-item').forEach(row => {
            if (row.dataset.pollyInjected) return;

            // Only process rows where the upload is complete (edit link present).
            const editLink = row.querySelector('.edit-attachment');
            if (!editLink) return;

            const match = editLink.href.match(/post=(\d+)/);
            if (!match) return;
            const attachmentId = match[1];

            row.dataset.pollyInjected = 'true';

            const details = row.querySelector('.attachment-details');
            if (!details) return;

            const container = document.createElement('div');
            container.className = 'polly-list-field-container';
            container.dataset.id = attachmentId;
            container.innerHTML = `
                <div class="polly-field-header">
                    <label class="polly-custom-field-label">Alt Text</label>
                    <span class="polly-char-counter">0 characters</span>
                </div>
                <textarea
                    class="polly-list-alt-field polly-uploader-field"
                    placeholder="Please add alternative text for blind and low-vision users"
                ></textarea>
            `;
            details.appendChild(container);
            // initPolly will pick up the new textarea on the next observer tick.
        });
    }

    // -------------------------------------------------------------------------
    // Field initialisation
    // -------------------------------------------------------------------------

    const ALT_FIELD_SELECTORS = [
        '#attachment-details-alt-text',
        '.setting[data-setting="alt"] textarea',
        'textarea[data-setting="alt"]',
        '.polly-list-alt-field',
    ].join(',');

    function initPolly() {
    injectUploaderFields();

        document.querySelectorAll(ALT_FIELD_SELECTORS).forEach(field => {
            if (field.dataset.pollyReady === 'true') return;
            if (field.name && /caption|description/i.test(field.name)) return;

            field.dataset.pollyReady = 'true';

            setupFieldUI(field);
            updateCharCounter(field);
            updateButtonLabel(field);

            if (!field.value.trim() && !field.disabled) field.classList.add('missing-alt');

            field.addEventListener('input', () => {
                updateCharCounter(field);
                updateButtonLabel(field);
                field.classList.toggle('missing-alt', !field.value.trim() && !field.disabled);
            });

            // Auto-save on blur — ID resolved lazily here.
            field.addEventListener('blur', () => {
                const id = resolveAttachmentId(field);
                if (id) saveAltText(id, field.value);
            });
        });
        syncUploadGuard();
    }

    function setupFieldUI(field) {
        field.placeholder = 'Please add alternative text for blind and low-vision users';

        if (!field.id) {
            field.id = 'polly-field-' + Math.random().toString(36).slice(2, 9);
        }

        const internalId = field.id;
        const parent = field.parentNode;
        if (!parent) {
            console.warn('🦜 POLLY: field has no parentNode, skipping:', field);
            return;
        }

        // --- Header (label + character counter) ---
        const existingHeader = field.closest(
            '.polly-list-field-container, .media-item, .setting'
        )?.querySelector('.polly-field-header');

        const nativeLabel = field.closest('.setting')?.querySelector('label.name');

        if (!existingHeader && !nativeLabel) {
            const header = document.createElement('div');
            header.className = 'polly-field-header';
            header.innerHTML = `
                <label class="polly-custom-field-label" for="${internalId}">Alt Text</label>
                <span class="polly-char-counter" data-for="${internalId}">0 characters</span>
            `;
            parent.insertBefore(header, field);
        } else {
            let counter = existingHeader?.querySelector('.polly-char-counter');
            if (!counter) {
                // Native label exists but no counter yet — inject one after the label
                counter = document.createElement('span');
                counter.className = 'polly-char-counter';
                counter.dataset.for = internalId;
                counter.textContent = '0 characters';
                const labelEl = nativeLabel || existingHeader;
                labelEl.insertAdjacentElement('afterend', counter);
            } else {
                counter.dataset.for = internalId;
            }
        }

        // --- Wrapper + Generate button ---
        const wrapper = document.createElement('div');
        wrapper.className = 'polly-btn-wrapper';
        parent.insertBefore(wrapper, field);
        wrapper.appendChild(field);

        const actionRow = document.createElement('div');
        actionRow.className = 'polly-action-row';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'polly-gen-btn';
        btn.dataset.for = internalId;
        btn.textContent = 'Preview and Generate';
        btn.onclick = (e) => {
            e.preventDefault();
            const id = resolveAttachmentId(field);
            triggerGeneration(field, id);
        };

        actionRow.appendChild(btn);

        const wrapperParent = wrapper.parentNode;
        if (!wrapperParent) {
            console.warn('🦜 POLLY: wrapper was detached before actionRow could be inserted — retrying in 500ms');
            setTimeout(initPolly, 500);
            return;
        }
        wrapperParent.insertBefore(actionRow, wrapper.nextSibling);

        // --- Standards advisor ---
        const advisor = document.createElement('span');
        advisor.className = 'polly-standards-text';
        advisor.textContent =
            'Alt text should describe what sighted visitors see in the image. ' +
            'Aim for around 125 characters. Avoid starting with "image of" or "photo of".';
        actionRow.parentNode.insertBefore(advisor, actionRow.nextSibling);

        // --- Decorative toggle ---
        const decoWrap = document.createElement('div');
        decoWrap.className = 'polly-decorative-wrap';
        const decoId = 'polly-deco-' + internalId;
        decoWrap.innerHTML = `
            <label for="${decoId}">
                <input type="checkbox" id="${decoId}" class="polly-decorative-check">
                Decorative
            </label>
            <span class="decorative-notice">Blind and low-vision users don't need a description of this image.</span>
        `;
        advisor.parentNode.insertBefore(decoWrap, advisor.nextSibling);

        const decoCheck = decoWrap.querySelector('.polly-decorative-check');
        decoCheck.addEventListener('change', () => {
            if (decoCheck.checked) {
                field.value = '';
                field.disabled = true;
                field.classList.remove('missing-alt');
                field.placeholder = 'Purely decorative elements don\'t need alternative text.';
                btn.style.display = 'none';
                updateCharCounter(field);
                const id = resolveAttachmentId(field);
                if (id) saveAltText(id, '');
            } else {
                field.disabled = false;
                btn.style.display = 'flex';
                if (!field.value.trim()) field.classList.add('missing-alt');
            }
            field.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    // -------------------------------------------------------------------------
    // AI generation
    // -------------------------------------------------------------------------
    async function geminiRequest(proxyForm, retries = 3, delayMs = 5000) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const response = await fetch(config.ajaxUrl, {
                method: 'POST',
                body: proxyForm
            });

            const proxyData = await response.json();

            if (proxyData.success) return proxyData;

            const is429 = response.status === 429 ||
                (proxyData.data?.message || '').toLowerCase().includes('resource exhausted') ||
                (proxyData.data?.message || '').toLowerCase().includes('429');

            if (is429 && attempt < retries) {
                const wait = delayMs * attempt;
                console.warn(`🦜 POLLY: Rate limited (attempt ${attempt}/${retries}). Retrying in ${wait / 1000}s…`);
                await new Promise(resolve => setTimeout(resolve, wait));
                continue;
            }

            throw new Error(proxyData.data?.message || 'Proxy error.');
        }
    }
    async function triggerGeneration(field, attachmentId) {
        const btn = document.querySelector(`.polly-gen-btn[data-for="${field.id}"]`);
        const originalLabel = btn.textContent;
        btn.textContent = 'Thinking…';
        btn.disabled = true;

        // Try Backbone model first — most reliable in media modal contexts
        let apiSrc = null;
        let highResSrc = null;

        if (attachmentId && window.wp?.media?.attachment) {
            const model = wp.media.attachment(attachmentId);
            // If the model doesn't have URL data yet, fetch it first
            if (!model.get('url')) {
                try {
                    await new Promise((resolve, reject) => {
                        model.fetch({
                            success: resolve,
                            error: reject
                        });
                    });
                } catch (e) {
                    console.warn('🦜 POLLY: Could not fetch attachment model:', e);
                }
            }
            const url = model.get('url') || model.get('sizes')?.full?.url || model.get('sizes')?.large?.url;
            if (url) {
                highResSrc = url;
                // Use medium/thumbnail size for API if available to avoid size limits
                apiSrc = model.get('sizes')?.medium?.url
                    || model.get('sizes')?.thumbnail?.url
                    || url;
            }
        }

        // Fall back to DOM if Backbone didn't have it
        if (!apiSrc) {
            const row = field.closest('tr, .media-item, .media-frame, .media-modal')
                || field.closest('.attachment-details')?.parentElement;
            let imgEl = row
                ? row.querySelector('.column-thumbnail img, .pinkynail, .details-image, .thumbnail img, img')
                : null;

            if ((!imgEl || !imgEl.src) && document.querySelector('.media-modal')) {
                // Scope to the selected attachment, not just any img in the sidebar
                const selected = document.querySelector('.media-modal .attachment.selected, .media-modal [data-id].selected');
                imgEl = selected
                    ? selected.querySelector('img')
                    : document.querySelector('.media-modal .attachment-details .thumbnail img');
            }

            if (!imgEl || !imgEl.src) {
                alert("🦜 Polly can't see the image. Try opening the attachment directly.");
                return;
            }

            highResSrc = getHighResUrl(imgEl.src);
            apiSrc = imgEl.src;
        }

        const mimeType = mimeTypeFromUrl(highResSrc);

        const prompt =
            `You are an accessibility expert writing alt text for a web image. ` +
            `Generate exactly ${config.choiceCount} distinct alt text variations following these rules:\n\n` +
            `RULES:\n` +
            `- Each alt text should be as close to 125 characters as possible without going over\n` +
            `- Do NOT begin with "image of", "photo of", "picture of", or similar\n` +
            `- Write in plain language, present tense, active voice\n` +
            `- Include only what is visible — no interpretation or assumptions\n\n` +
            `VARIATIONS:\n` +
            `Each variation must foreground a DIFFERENT visible subject or element from the image as its opening focus — ` +
            `the thing named first in the alt text should differ across all variations. ` +
            `For example, if the image shows a harvester in a coffee field, one variation might open with the harvester, ` +
            `another with the rows of coffee trees, another with the wider farm scene. ` +
            `Choose the ${config.choiceCount} most distinct and interesting visual elements as your focal points.\n\n` +
            `Return ONLY a valid JSON array of objects with these exact keys:\n` +
            `- "alt": the alt text string (100-125 characters, verified)\n` +
            `- "focus": a short noun phrase naming the visual element foregrounded in this variation (e.g. "orange coffee harvester", "rows of green coffee trees", "hillside coffee farm")\n` +
            `- "explanation": one sentence explaining why a screen reader user might find this framing useful\n\n` +
            `Do not include any text outside the JSON array.`;

        try {
            let imageData;
            try {
                imageData = await getBase64(apiSrc);
            } catch (fetchErr) {
                throw new Error(`Could not load image for analysis: ${fetchErr.message}`);
            }

            const payload = JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: mimeType, data: imageData } }
                    ]
                }],
                generationConfig: { responseMimeType: 'application/json' }
            });

            const proxyForm = new FormData();
            proxyForm.append('action', 'polly_gemini_proxy');
            proxyForm.append('nonce', config.nonce);
            proxyForm.append('model', config.model);
            proxyForm.append('payload', payload);

            const proxyData = await geminiRequest(proxyForm);
            const data = proxyData.data;
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error('Unexpected response shape from Gemini API.');
            }

            const rawText = data.candidates[0].content.parts[0].text
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/```\s*$/i, '')
                .trim();
            const rawChoices = JSON.parse(rawText);
            const choices = rawChoices.map(c => ({
                alt: c.alt || c.text || '',
                explanation: config.includeExplanation
                    ? (c.focus ? `Image focus: ${c.focus}. ${c.explanation || ''}`.trim() : (c.explanation || null))
                    : null,
            }));
            
            showChoiceModal(choices, field, field.value.trim(), highResSrc, btn, (selectedText) => {
                if (attachmentId) saveAltText(attachmentId, selectedText);
                updateCharCounter(field);
                updateButtonLabel(field);

                if (config.removeTitle) {
                    const container = field.closest(
                        '.attachment-details, .media-sidebar, .media-frame-side, ' +
                        '.media-modal, .setting, .media-item, tr'
                    );
                    const titleField = container
                        ? (container.querySelector('input[data-setting="title"]') ||
                           container.querySelector('input[name*="[attachment_title]"]') ||
                           document.querySelector('#attachment-details-title'))
                        : null;
                    if (titleField) {
                        titleField.value = '';
                        titleField.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });

        } catch (err) {
            const isSize = err.message.includes('Resource exhausted') || err.message.includes('429');
            const isJson = err instanceof SyntaxError || err.message.includes('JSON');
            
            let errorMsg = '🦜 Polly Error: ' + err.message;
            
            if (isJson) {
                errorMsg = "🦜 Polly Error: Sorry, maybe the AI model is still getting its sea-legs because it sent back a scrambled message! Please try clicking the button again in a few moments.";
            } else if (isSize) {
                errorMsg += '\n\nTip: If your image is very large, try optimising it first (under 1MB works best).';
            }
            
            alert(errorMsg);
        } finally {
            btn.textContent = originalLabel;
            btn.disabled = false;
        }
    }

    // -------------------------------------------------------------------------
    // Choice modal
    // -------------------------------------------------------------------------

    function showChoiceModal(choices, field, original, imgSrc, triggerBtn, onSelect) {
        document.getElementById('polly-alt-modal-overlay')?.remove();
        document.getElementById('polly-alt-modal')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'polly-alt-modal-overlay';

        const modal = document.createElement('div');
        modal.id = 'polly-alt-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Choose Alt Text');

        modal.innerHTML = `
            <div class="polly-modal-image-container">
                <img src="${imgSrc}" alt="">
            </div>
            <div class="polly-modal-header"><h3>🦜 Choose Alt Text</h3></div>
            <div class="polly-modal-body"></div>
        `;

        const imgContainer = modal.querySelector('.polly-modal-image-container');
        const img = imgContainer.querySelector('img');
        img.onload = () => {
            imgContainer.scrollTop = (imgContainer.scrollHeight - imgContainer.clientHeight) / 2;
        };
        // If image is already cached and onload won't fire, trigger manually
        if (img.complete) {
            imgContainer.scrollTop = (imgContainer.scrollHeight - imgContainer.clientHeight) / 2;
        }

        const body = modal.querySelector('.polly-modal-body');

        const options = [];
        if (original) options.push({ alt: original, label: 'ORIGINAL', explanation: 'Your current text.' });
        choices.forEach(c => options.push({ ...c, label: 'AI OPTION' }));

        options.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'polly-choice-item';

            const tag = document.createElement('span');
            tag.className = 'polly-choice-tag';
            tag.style.color = opt.label === 'ORIGINAL' ? '#666' : '#2271b1';
            tag.textContent = opt.label;

            const content = document.createElement('div');
            content.className = 'polly-choice-content';
            content.textContent = opt.alt;

            const charCount = document.createElement('span');
            charCount.className = 'polly-choice-char-count';
            charCount.textContent = `${opt.alt.length} characters`;
            charCount.classList.toggle('over-limit', opt.alt.length > 125);

            item.appendChild(tag);
            item.appendChild(content);
            item.appendChild(charCount);

            if (opt.explanation) {
                const expl = document.createElement('div');
                expl.className = 'polly-choice-explanation';
                expl.textContent = opt.explanation;
                item.appendChild(expl);
            }

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'polly-modal-edit-btn';
            editBtn.textContent = 'Edit';
            editBtn.dataset.state = 'edit';
            item.appendChild(editBtn);

            item.onclick = (e) => {
                if (e.target === editBtn) return;
                const textarea = item.querySelector('.polly-choice-textarea');
                const finalVal = textarea ? textarea.value : content.textContent;
                field.value = finalVal;
                field.classList.remove('missing-alt');
                updateCharCounter(field);
                updateButtonLabel(field);
                field.dispatchEvent(new Event('input', { bubbles: true }));
                if (onSelect) onSelect(finalVal);
                cleanup();
            };

            editBtn.onclick = (e) => {
                e.stopPropagation();
                if (editBtn.dataset.state === 'edit') {
                    const textarea = document.createElement('textarea');
                    textarea.className = 'polly-choice-textarea';
                    textarea.value = content.textContent;
                    item.replaceChild(textarea, content);
                    editBtn.textContent = 'Apply';
                    editBtn.dataset.state = 'apply';
                    textarea.addEventListener('input', () => {
                        charCount.textContent = `${textarea.value.length} characters`;
                        charCount.classList.toggle('over-limit', textarea.value.length > 125);
                    });
                    textarea.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                    textarea.focus();
                } else {
                    item.click();
                }
            };

            body.appendChild(item);
        });

       // --- Decorative option ---
        const modalDecoWrap = document.createElement('div');
        modalDecoWrap.className = 'polly-decorative-wrap';
        const modalDecoId = 'polly-modal-deco-' + field.id;
        modalDecoWrap.innerHTML = `
            <label for="${modalDecoId}">
                <input type="checkbox" id="${modalDecoId}" class="polly-modal-decorative-check">
                This image is decorative
            </label>
            <span class="decorative-notice">Blind and low-vision users don't need a description of this image. Selecting this will clear the alt text field.</span>
        `;
        body.appendChild(modalDecoWrap);

        const modalDecoCheck = modalDecoWrap.querySelector('.polly-modal-decorative-check');
        modalDecoCheck.addEventListener('change', () => {
            if (modalDecoCheck.checked) {
                field.value = '';
                field.disabled = true;
                field.classList.remove('missing-alt');
                updateCharCounter(field);

                // Sync the decorative checkbox on the page behind the modal.
                const pageDecoCheck = document.querySelector(
                    `#polly-deco-${field.id}`
                );
                if (pageDecoCheck && !pageDecoCheck.checked) {
                    pageDecoCheck.checked = true;
                    pageDecoCheck.dispatchEvent(new Event('change', { bubbles: true }));
                }

                const id = resolveAttachmentId(field);
                if (id) saveAltText(id, '');
                cleanup();
            }
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'polly-footer-btn';
        cancelBtn.textContent = 'Keep Current & Close';
        cancelBtn.onclick = cleanup;
        body.appendChild(cancelBtn);

        const trigger = triggerBtn || document.activeElement;

        function cleanup() {
            overlay.remove();
            modal.remove();
            if (trigger) trigger.focus();
        }

        modal.addEventListener('polly-close', cleanup);
        overlay.onclick = cleanup;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        modal.setAttribute('tabindex', '-1');
        modal.focus();
        trapFocus(modal);
    }
    // -------------------------------------------------------------------------
    // Gutenberg image block helper
    // -------------------------------------------------------------------------
    function initGutenbergSidebarWatcher() {
        if (!document.body.classList.contains('block-editor-page')) return;

        let lastImageBlock = null; // { clientId, fieldValue, isDecorative }

        // Check if a block is an image block with missing alt
        function checkBlockOnLeave(clientId) {
            if (!clientId) return;
            try {
                const block = wp.data.select('core/block-editor').getBlock(clientId);
                if (!block || block.name !== 'core/image') return;
                const alt = block.attributes?.alt ?? '';
                const isDecorative = block.attributes?.className?.includes('is-decorative') || false;
                if (!alt.trim() && !isDecorative) {
                    showEnforcementModal(
                        null,
                        1,
                        'Continue anyway',
                        null,
                        'This image has no alt text. Blind and low-vision visitors won\'t know what it shows.',
                        () => {
                            // Re-select the block and open the sidebar
                            wp.data.dispatch('core/block-editor').selectBlock(clientId);
                            wp.data.dispatch('core/edit-post')
                                ?.openGeneralSidebar('edit-post/block');
                        }
                    );
                }
            } catch (e) {
                console.warn('🦜 POLLY: Error checking block on leave:', e);
            }
        }

        // Subscribe to block selection changes
        if (window.wp?.data) {
            let previousClientId = null;
            wp.data.subscribe(() => {
                try {
                    const selectedBlock = wp.data.select('core/block-editor').getSelectedBlock();
                    const currentClientId = selectedBlock?.clientId || null;

                    if (previousClientId && previousClientId !== currentClientId) {
                        checkBlockOnLeave(previousClientId);
                    }
                    previousClientId = currentClientId;
                } catch (e) {
                    // silently ignore
                }
            });
        }

        const gutenbergObserver = new MutationObserver(() => {
            const altLabel = [...document.querySelectorAll('.components-base-control__label')]
                .find(el => el.textContent.trim() === 'Alternative text');
            if (!altLabel) return;

            const field = altLabel.closest('.components-base-control')
                ?.querySelector('textarea.components-textarea-control__input');
            if (!field || field.dataset.pollyReady) return;

            field.dataset.pollyReady = 'true';

            const getBlockData = () => {
                try {
                    const block = wp.data.select('core/block-editor').getSelectedBlock();
                    return block || null;
                } catch (e) {
                    return null;
                }
            };

            const getAttachmentId = () => getBlockData()?.attributes?.id || null;

            // --- Counter ---
            const counter = document.createElement('span');
            counter.className = 'polly-char-counter';
            counter.textContent = `${field.value.length} characters`;
            counter.classList.toggle('over-limit', field.value.length > 125);
            altLabel.parentNode.insertBefore(counter, altLabel.nextSibling);

            // --- Generate button ---
            const actionRow = document.createElement('div');
            actionRow.className = 'polly-action-row';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'polly-gen-btn';
            btn.textContent = field.value.trim() ? 'Preview and Refine' : 'Preview and Generate';
            btn.onclick = (e) => {
                e.preventDefault();
                const id = getAttachmentId();
                if (!id) {
                    alert('🦜 Polly: Please click the image block first so Polly knows which image to describe.');
                    return;
                }
                if (!field.id) field.id = 'polly-gutenberg-field-' + id;
                btn.dataset.for = field.id;
                triggerGeneration(field, String(id));
            };
            actionRow.appendChild(btn);
            field.closest('.components-base-control').after(actionRow);

            // --- Decorative checkbox ---
            const decoWrap = document.createElement('div');
            decoWrap.className = 'polly-decorative-wrap';
            const decoId = 'polly-gutenberg-deco-' + (getAttachmentId() || Math.random().toString(36).slice(2));
            decoWrap.innerHTML = `
                <label for="${decoId}">
                    <input type="checkbox" id="${decoId}" class="polly-decorative-check">
                    Decorative
                </label>
                <span class="decorative-notice">Blind and low-vision users don't need a description of this image.</span>
            `;
            actionRow.after(decoWrap);

            const decoCheck = decoWrap.querySelector('.polly-decorative-check');

            // Sync initial decorative state from block attributes
            const initialBlock = getBlockData();
            if (initialBlock?.attributes?.className?.includes('is-decorative')) {
                decoCheck.checked = true;
                field.disabled = true;
            }

            decoCheck.addEventListener('change', () => {
                const block = getBlockData();
                if (!block) return;
                if (decoCheck.checked) {
                    field.value = '';
                    field.disabled = true;
                    field.classList.remove('missing-alt');
                    counter.textContent = '0 characters';
                    counter.classList.remove('over-limit');
                    // Add is-decorative class to block attributes
                    const currentClass = block.attributes?.className || '';
                    if (!currentClass.includes('is-decorative')) {
                        wp.data.dispatch('core/block-editor').updateBlockAttributes(
                            block.clientId,
                            { className: (currentClass + ' is-decorative').trim(), alt: '' }
                        );
                    }
                } else {
                    field.disabled = false;
                    // Remove is-decorative from block attributes
                    const currentClass = (block.attributes?.className || '')
                        .replace('is-decorative', '').trim();
                    wp.data.dispatch('core/block-editor').updateBlockAttributes(
                        block.clientId,
                        { className: currentClass }
                    );
                }
            });

            // --- Update counter and button label on input ---
            field.addEventListener('input', () => {
                counter.textContent = `${field.value.length} characters`;
                counter.classList.toggle('over-limit', field.value.length > 125);
                btn.textContent = field.value.trim() ? 'Preview and Refine' : 'Preview and Generate';
                // Also sync alt text back to block attributes
                const block = getBlockData();
                if (block) {
                    wp.data.dispatch('core/block-editor').updateBlockAttributes(
                        block.clientId,
                        { alt: field.value }
                    );
                }
            });
        });

        gutenbergObserver.observe(document.body, { childList: true, subtree: true });
    }

    initGutenbergSidebarWatcher();

    // -------------------------------------------------------------------------
    // Elementor media modal watcher
    // -------------------------------------------------------------------------
    

    function initElementorWatcher() {
        // Strategy 1: watch for .media-modal being added to the DOM
        const elementorObserver = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.matches?.('.media-modal') || node.querySelector?.('.media-modal')) {
                        waitForAltField();
                        return;
                    }
                }
            }
            // Strategy 2: also watch for .media-modal becoming visible
            // (Elementor may show/hide an existing node rather than add a new one)
            const existing = document.querySelector('.media-modal');
            if (existing && existing.offsetParent !== null && !existing.dataset.pollyWatching) {
                existing.dataset.pollyWatching = 'true';
                waitForAltField();
            }
        });
        elementorObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

        // Strategy 3: if the modal is already in the DOM and visible on load, catch it immediately
        const existing = document.querySelector('.media-modal');
        if (existing && existing.offsetParent !== null) {
            existing.dataset.pollyWatching = 'true';
            waitForAltField();
        }
    }

    function waitForAltField() {
        const maxWait = 30000; // bumped to 30s to match your slow Local env
        const interval = 300;
        let elapsed = 0;

        const poll = setInterval(() => {
            elapsed += interval;
            const field = document.querySelector('#attachment-details-alt-text');

            if (field && !field.dataset.pollyReady) {
                clearInterval(poll);
                initPolly();
            } else if (field && field.dataset.pollyReady) {
                clearInterval(poll);
            } else if (elapsed >= maxWait) {
                clearInterval(poll);
                console.warn('🦜 POLLY: Timed out waiting for alt field after 30s. Field never appeared.');
            }
        }, interval);
    }

    initElementorWatcher();
    // -------------------------------------------------------------------------
    // Gutenberg media inserter intercept
    // -------------------------------------------------------------------------
    /**
     * Watch for Gutenberg's media modal Insert button and intercept clicks
     * when the selected attachment has no alt text.
     */
    function initMediaInsertIntercept() {
        if (!isEditScreen()) return;

        const mediaModalObserver = new MutationObserver(() => {
            // Look for the Insert/Select button in the Gutenberg media modal.
            const insertBtn = document.querySelector(
                '.media-modal .media-button-select, ' +
                '.media-modal .media-button-insert'
            );
            if (!insertBtn || insertBtn.dataset.pollyGuarded) return;
            insertBtn.dataset.pollyGuarded = 'true';

            insertBtn.addEventListener('click', (e) => {
                if (insertGuardSuppressed) return;
                // Find the selected attachment in the media modal.
                const selected = document.querySelector(
                    '.media-modal .attachment.selected, ' +
                    '.media-modal [data-id].selected'
                );
                if (!selected) return;

                const attachmentId = selected.dataset.id;
                if (!attachmentId) return;

                // Check alt text from the input field in the modal sidebar,
                // and also from Backbone's in-memory model as a fallback.
                const altField = document.querySelector(
                    '.media-modal .attachment-details input[data-setting="alt"], ' +
                    '.media-modal .setting[data-setting="alt"] input, ' +
                    '.media-modal #attachment-details-alt-text'
                );
                const altFromField = altField ? altField.value.trim() : null;

                // Check Backbone model.
                let altFromModel = null;
                if (window.wp?.media?.attachment) {
                    const model = wp.media.attachment(attachmentId);
                    altFromModel = model.get('alt') || null;
                }

                const alt = altFromField ?? altFromModel ?? '';

                if (!alt.trim()) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Focus the alt field in the modal if we can find it.
                    const focusTarget = altField || document.querySelector(
                        '.media-modal .attachment-details [data-setting="alt"] input'
                    );

                    showEnforcementModal(
                        null,
                        1,
                        'Insert anyway',
                        focusTarget,
                        'This image has no alt text. Blind and low-vision visitors won\'t know what it shows.'
                    );
                }
            }, true);
        });

        mediaModalObserver.observe(document.body, { childList: true, subtree: true });
    }

    initMediaInsertIntercept();

    // -------------------------------------------------------------------------
    // MutationObserver
    // -------------------------------------------------------------------------

    let observerFireCount = 0;
    let debounceTimer = null;
    const observer = new MutationObserver((mutations) => {
        const relevant = mutations.some(m =>
            [...m.addedNodes].some(n => {
                if (n.nodeType !== 1) return false;
                return (
                    n.matches?.('.media-item, .polly-list-field-container, .attachment-details, .media-frame, [data-setting="alt"]') ||
                    n.querySelector?.('.media-item, .polly-list-alt-field, [data-setting="alt"], #attachment-details-alt-text')
                );
            })
        );
        if (!relevant) return;

        observerFireCount++;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            observer.disconnect();
            initPolly();
            observer.observe(document.body, { childList: true, subtree: true });
        }, 400);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    observer.disconnect();
    initPolly();
    observer.observe(document.body, { childList: true, subtree: true });

})();