/**
 * Lightweight HTML sanitizer for trusted-editor content.
 *
 * This is NOT a full XSS library — it's a proportional defence for
 * content authored by authenticated admins in the Puck editor.
 *
 * Strips:
 *   - <script> ... </script> blocks (including content)
 *   - <iframe>, <object>, <embed>, <form> tags entirely
 *   - on* event handler attributes (onclick, onerror, onload, etc.)
 *   - javascript: and data: URI schemes in href/src/action
 *
 * Preserves all structural/formatting HTML needed for rich policy pages.
 */
export function sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') return '';

    return html
        // Remove <script> blocks and their content
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        // Remove dangerous tags entirely (self-closing and paired)
        .replace(/<\/?(iframe|object|embed|form|base|meta|link)\b[^>]*>/gi, '')
        // Strip on* event handlers from any tag
        .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
        // Strip javascript: and data: URI schemes
        .replace(/(href|src|action)\s*=\s*["']\s*(javascript|data):[^"']*/gi, '$1="#"');
}
