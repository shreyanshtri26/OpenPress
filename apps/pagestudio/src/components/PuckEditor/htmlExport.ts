// Component-level CSS that needs to be included in exports

import { checkAuth } from "../../utils/auth"
import { PUBLISHED_PAGE_STYLES } from "../../generated/publishedPageStyles"

const COMPONENT_CSS = `
/* Reset and Base Styles */
* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
  font-weight: 400;
  color: #0f172a;
  background-color: #ffffff;
}

a {
  color: inherit;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Masthead navbar block */
.atlantic-navbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: #ffffff;
  color: #111111;
  transition: box-shadow 0.4s ease, transform 0.4s ease;
  --line-offset: clamp(5.75rem, 12vw, 7.25rem);
}

.atlantic-navbar--condensed {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  --line-offset: calc(100% - 0.5rem);
}

.atlantic-navbar__inner {
  position: relative;
  max-width: 1120px;
  margin: 0 auto;
  padding: clamp(1rem, 2vw, 1.5rem) clamp(1.25rem, 4vw, 2.75rem) clamp(0.75rem, 2vw, 1.5rem);
}

.atlantic-navbar__line {
  position: absolute;
  left: clamp(1.25rem, 4vw, 2.75rem);
  right: clamp(1.25rem, 4vw, 2.75rem);
  top: var(--line-offset);
  height: 1px;
  background: #111111;
  transition: top 0.5s ease, right 0.5s ease, left 0.5s ease;
}

.atlantic-navbar__line::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: min(15rem, 45%);
  height: 100%;
  background: #ffffff;
  transition: width 0.5s ease;
}

.atlantic-navbar--condensed .atlantic-navbar__line::after {
  width: 0;
}

.atlantic-navbar__masthead {
  display: flex;
  justify-content: center;
  padding-bottom: clamp(1.5rem, 3vw, 2rem);
  overflow: hidden;
  transition: padding-bottom 0.45s ease, opacity 0.45s ease;
}

.atlantic-navbar--condensed .atlantic-navbar__masthead {
  padding-bottom: 0;
  opacity: 0;
}

.atlantic-navbar__brand {
  display: inline-flex;
  align-items: flex-end;
  gap: 0.5rem;
  font-family: 'Cormorant Garamond', serif;
  color: #c6001d;
  letter-spacing: 0.02em;
}

.atlantic-navbar__brand-letter {
  font-size: clamp(4.5rem, 8vw, 5.75rem);
  line-height: 0.75;
  font-weight: 500;
}

.atlantic-navbar__brand-word {
  color: #111111;
  font-size: clamp(1.75rem, 3.5vw, 2.1rem);
  font-style: italic;
  font-weight: 500;
}

.atlantic-navbar__brand--large {
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  color: #c6001d;
  transition: transform 0.45s ease, opacity 0.45s ease;
}

.atlantic-navbar--condensed .atlantic-navbar__brand--large {
  transform: translateY(-10%);
  opacity: 0;
}

.atlantic-navbar__brand--compact {
  opacity: 0;
  pointer-events: none;
  transform: translateY(40%);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.atlantic-navbar--condensed .atlantic-navbar__brand--compact {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.atlantic-navbar__menu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(1rem, 3vw, 2.5rem);
}

.atlantic-navbar__controls {
  display: flex;
  align-items: center;
  gap: clamp(0.85rem, 2vw, 1.75rem);
}

.atlantic-navbar__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: transparent;
  color: #111111;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

.atlantic-navbar__icon-button:hover,
.atlantic-navbar__icon-button:focus-visible {
  border-color: #0f172a;
  background: rgba(15, 23, 42, 0.05);
}

.atlantic-navbar__edition {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #475569;
}

.atlantic-navbar__primary-links,
.atlantic-navbar__secondary-links {
  display: inline-flex;
  align-items: center;
  gap: clamp(0.75rem, 2vw, 1.5rem);
}

.atlantic-navbar__link {
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  color: #111111;
  transition: color 0.3s ease;
}

.atlantic-navbar__link:hover,
.atlantic-navbar__link:focus-visible {
  color: #c6001d;
}

.atlantic-navbar__actions {
  display: inline-flex;
  align-items: center;
  gap: clamp(0.75rem, 2vw, 1.5rem);
}

.atlantic-navbar__secondary-link {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #475569;
  transition: color 0.3s ease;
}

.atlantic-navbar__secondary-link:hover,
.atlantic-navbar__secondary-link:focus-visible {
  color: #111111;
}

.atlantic-navbar__sign-in {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: #111111;
  transition: color 0.3s ease;
}

.atlantic-navbar__sign-in:hover,
.atlantic-navbar__sign-in:focus-visible {
  color: #c6001d;
}

.atlantic-navbar__subscribe {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 1.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  border-radius: 999px;
  background: #c6001d;
  color: #ffffff;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: none;
  cursor: pointer;
}

.atlantic-navbar__subscribe:hover,
.atlantic-navbar__subscribe:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(198, 0, 29, 0.35);
}

@media (max-width: 960px) {
  .atlantic-navbar {
    --line-offset: clamp(5rem, 12vw, 6rem);
  }

  .atlantic-navbar__menu-row {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
  }

  .atlantic-navbar__controls {
    justify-content: space-between;
  }

  .atlantic-navbar__actions {
    justify-content: space-between;
    width: 100%;
  }

  .atlantic-navbar__secondary-links {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .atlantic-navbar__brand--compact {
    align-self: center;
  }
}

@media (max-width: 720px) {
  .atlantic-navbar__controls {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .atlantic-navbar__primary-links {
    flex-basis: 100%;
    justify-content: center;
  }

  .atlantic-navbar__actions {
    flex-wrap: wrap;
  }

  .atlantic-navbar__secondary-links {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 540px) {
  .atlantic-navbar__inner {
    padding: 1rem clamp(1rem, 6vw, 1.5rem) 0.75rem;
  }

  .atlantic-navbar__controls {
    justify-content: center;
  }

  .atlantic-navbar__edition {
    width: 100%;
    text-align: center;
  }

  .atlantic-navbar__primary-links {
    flex-direction: column;
    gap: 0.5rem;
  }

  .atlantic-navbar__actions {
    justify-content: center;
  }
}

/* Published/Exported Page Styles */
.published {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.published__content {
  flex: 1;
  width: 100%;
}

.published__return {
  border: none;
  border-radius: 999px;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  background: #0f172a;
  color: #f8fafc;
  cursor: pointer;
}

.published__return:hover,
.published__return:focus-visible {
  opacity: 0.9;
}

/* Puck and General Component Styles */
.puck-renderDropZone {
  width: 100%;
}

.puck-frame {
  width: 100%;
}

/* Common utility overrides for exported content */
section {
  width: 100%;
}

/* Embed and Caption Styles */
.embed-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.story-caption {
  display: block;
  width: 100%;
  text-align: left;
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0;
  font-family: 'Lato', sans-serif !important;
  font-size: 16px !important;
  font-weight: 500;
  font-style: normal !important;
  line-height: 1.375;
  color: #716d6d;
  min-height: 1em;
}

.twitter-embed-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
`

// Global index.css styles
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700;800&display=swap');

:root {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
  font-weight: 400;
  color: #0f172a;
  background-color: var(--op-bg, #ffffff);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

a {
  color: inherit;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

body {
  margin: 0;
  min-height: 100vh;
  background-color: var(--op-bg, #ffffff);
  color: inherit;
}

#root {
  min-height: 100vh;
}
`

export interface ExportOptions {
  title?: string
  filename?: string
}

// ✅ FIXED: API Configuration with fallback to hardcoded URL
const API_BASE = import.meta.env.VITE_BACKEND_API

export const DEFAULT_GET_URL = `${API_BASE}/pagestudio/page`;
export const DEFAULT_POST_URL = `${API_BASE}/pagestudio/saveHtml`;

// Log the configured URLs for debugging
console.log('🔧 API Configuration:', {
  API_BASE,
  DEFAULT_GET_URL,
  DEFAULT_POST_URL
});

interface SaveHtmlResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface PageDataResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Generates complete HTML with embedded CSS from rendered Puck content
 */
export function generateExportHTML(
  renderedHTML: string,
  options: ExportOptions = {}
): string {
  const { title = 'Exported Page' } = options

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <title>${title}</title>

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&family=Merriweather:wght@400;700&family=Share+Tech+Mono&family=Lato:wght@400;700&display=swap" rel="stylesheet">

  <!-- Tailwind (compiled, inlined to avoid FOUC) -->
  <style>${PUBLISHED_PAGE_STYLES}</style>
  <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

  <!-- Global and Component Styles -->
  <style>
    ${GLOBAL_CSS}

    ${COMPONENT_CSS}
  </style>
</head>
<body style="margin: 0; padding: 0;">
  <div id="root">
    ${renderedHTML}
  </div>
</body>
</html>`

  return html
}

/**
 * Fetches page data from the backend API
 * @param pageType The type of page to fetch (e.g., 'Blog')
 * @returns Promise with the page data or null if there was an error
 */
export async function fetchPageData(pageType: string = 'Blog'): Promise<any | null> {

  const token = checkAuth();
  if (!token) return null;
  try {
    const url = `${DEFAULT_GET_URL}?pageType=${encodeURIComponent(pageType)}`;

    console.log('📥 Fetching page data:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch page data:', response.status, errorText);
      return null;
    }

    const result: PageDataResponse = await response.json();

    // Handle error in response
    if (result.error) {
      console.error('❌ Backend error:', result.error);
      return null;
    }

    console.log('✅ Page data fetched successfully');
    return result.data || result;

  } catch (error) {
    console.error('❌ Error fetching page data:', error);
    return null;
  }
}

/**
 * Saves HTML content to the backend
 * @param htmlContent The HTML content to save
 * @param metadata Object containing slug and category
 * @returns Promise with the save result
 */
export async function saveHtmlToBackend(
  htmlContent: string,
  metadata: { slug: string; category: string }
): Promise<SaveHtmlResponse> {

  const token = checkAuth();
  if (!token) {
    return {
      success: false,
      message: 'Authentication failed',
      error: 'No token found'
    };
  }
  try {
    const payload = {
      htmlContent,
      slug: metadata.slug,
      category: metadata.category,
    };

    console.log('📤 Saving HTML to backend:', {
      url: DEFAULT_POST_URL,
      slug: metadata.slug,
      category: metadata.category,
      htmlLength: htmlContent.length
    });

    const response = await fetch(DEFAULT_POST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('❌ Failed to save HTML:', response.status, errText);
      return {
        success: false,
        message: 'Failed to save HTML',
        error: errText || `HTTP ${response.status}`,
      };
    }

    const json = await response.json();

    // Backend may return success: false even with 200 status
    if (json.success === false) {
      console.error('❌ Backend rejected save:', json);
      return {
        success: false,
        message: json.message || 'Failed to save HTML',
        error: json.error,
      };
    }

    console.log('✅ HTML saved successfully:', json);
    return {
      success: true,
      message: json.message || 'HTML saved successfully',
      data: json.data || json,
    };

  } catch (error) {
    console.error('❌ Error saving HTML:', error);
    return {
      success: false,
      message: 'Failed to save HTML',
      error: String(error),
    };
  }
}

/**
 * Download exported HTML as a file
 */
export function downloadExportHTML(
  htmlContent: string,
  filename: string = 'exported-page'
): void {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.html`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the URL object
  URL.revokeObjectURL(url)
}

/**
 * Captures the rendered HTML from the DOM
 * This captures the current rendered state of the Puck editor and converts images to data URLs
 */
export async function captureRenderedHTML(): Promise<string | null> {
  // Find the published content container
  const container = document.querySelector('.published__content')
  if (!container) {
    console.warn('⚠️ Could not find .published__content container')
    return null
  }

  console.log('📸 Capturing rendered HTML from DOM...');

  // Clone the content to avoid modifying the DOM
  const clone = container.cloneNode(true) as HTMLElement

  // Convert all images to data URLs so they'll be embedded in the exported HTML
  const images = clone.querySelectorAll('img')
  const imagePromises: Promise<void>[] = []

  images.forEach((img) => {
    const src = img.getAttribute('src')
    if (src && !src.startsWith('data:')) {
      const promise = imageToDataURL(src).then((dataUrl) => {
        if (dataUrl) {
          img.setAttribute('src', dataUrl)
        }
      })
      imagePromises.push(promise)
    }
  })

  // Wait for all images to be converted
  if (imagePromises.length > 0) {
    console.log(`🖼️ Converting ${imagePromises.length} images to data URLs...`);
    await Promise.all(imagePromises)
  }

  console.log('✅ HTML captured successfully');
  return clone.innerHTML
}

/**
 * Convert an image URL to a data URL
 */
function imageToDataURL(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const xhr = new XMLHttpRequest()
      xhr.onload = () => {
        try {
          const reader = new FileReader()
          reader.onloadend = () => {
            resolve(reader.result as string)
          }
          reader.readAsDataURL(xhr.response)
        } catch (error) {
          console.warn(`⚠️ Failed to convert image to data URL: ${url}`, error)
          resolve(null)
        }
      }
      xhr.onerror = () => {
        console.warn(`⚠️ Failed to load image: ${url}`)
        resolve(null)
      }
      xhr.open('GET', url)
      xhr.responseType = 'blob'
      xhr.send()
    } catch (error) {
      console.warn(`⚠️ Error converting image: ${url}`, error)
      resolve(null)
    }
  })
}