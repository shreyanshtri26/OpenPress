import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type EditorJS from '@editorjs/editorjs';
import type { API } from '@editorjs/editorjs';
import { EditorBlock } from '../ai/ai-types';

import EditorJSClass from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';

class StoryListTool extends (List as any) {
  static get toolbox() {
    const original = (List as any).toolbox;
    return Array.isArray(original)
      ? original.filter((item: any) => item.title !== 'Checklist' && item.data?.style !== 'checklist')
      : original;
  }

  renderSettings() {
    const settings = super.renderSettings();
    return Array.isArray(settings)
      ? settings.filter((item: any) => item.label !== 'Checklist')
      : settings;
  }
}
import Quote from '@editorjs/quote';
import ImageTool from '@editorjs/image';
import DragDrop from 'editorjs-drag-drop';
import { AITool } from '../ai/AITool';
import { AIInlineTool } from '../ai/AIInlineTool';
import Embed from '@editorjs/embed';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type StoryEditorAIConfig = {
  apiUrl?: string;
  maxTokens: number;
  temperature: number;
  topP: number;
};

interface StoryEditorCanvasProps {
  editorRef: MutableRefObject<EditorJS | null>;
  blocks: EditorBlock[];
  shouldAutofocus: boolean;
  hasEditPermission: boolean;
  aiConfig: StoryEditorAIConfig;
  uploadFile: (file: File) => Promise<string | null>;
  onContentChange: () => void;
  onNoEditAttempt: () => void;
  shouldInitialize: boolean;
  drawerOpened: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared caption CSS injected once into <head>
// All captions — YouTube, Instagram, Facebook, SoundCloud, Twitter, and the
// standalone Caption block — use .story-caption so they look identical.
// ─────────────────────────────────────────────────────────────────────────────

const CAPTION_STYLE_ID = 'story-editor-caption-style';

const injectCaptionStyles = () => {
  if (document.getElementById(CAPTION_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = CAPTION_STYLE_ID;
  style.textContent = `
    /* ── Unified caption (YouTube-like) ───────────────────────────────────── */
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
      outline: none;
      user-select: text !important;
      -webkit-user-select: text !important;
      min-height: 1em;
      border-bottom: 1px solid transparent;
      transition: border-color 0.15s ease;
    }

    .story-caption:focus {
      border-bottom-color: #d1d5db;
    }

    .story-caption:empty::before {
      content: attr(data-placeholder);
      color: #9ca3af;
      pointer-events: none;
    }

    /* ── hide native embed captions ────────────────────────────────────────── */
    .embed-tool__caption {
      display: none !important;
    }

    /* ── toolbar visibility helpers ────────────────────────────────────────── */
    .ce-toolbar__actions.hide-actions .ce-toolbar__settings-btn {
      display: none;
    }
    .ce-toolbar__plus.hide-plus-button {
      display: none;
    }

    /* ── Inline caption below embeds (YT / Insta / SoundCloud / X) ─────────── */
    .embed-inline-caption {
      display: block;
      width: 100%;
      text-align: left;
      font-style: normal !important;
      margin-top: 0.75rem;
      margin-bottom: 0.75rem;
      padding: 0;
      font-family: 'Lato', sans-serif !important;
      font-size: 16px !important;
      font-weight: 500;
      line-height: 1.375;
      color: #716d6d;
      min-height: 1em;
      outline: none;
      border-bottom: 1px solid transparent;
      transition: border-color 0.15s ease;
      user-select: text;
      -webkit-user-select: text;
    }
    .embed-inline-caption:focus {
      border-bottom-color: #d1d5db;
    }
    .embed-inline-caption:empty::before {
      content: attr(data-placeholder);
      color: #aaa;
      pointer-events: none;
    }
  `;

  document.head.appendChild(style);
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: create a shared .story-caption <div>
// Used by every embed tool and the CaptionTool block.
// ─────────────────────────────────────────────────────────────────────────────

const createCaptionElement = (
  initialText: string,
  onInput: (html: string) => void,
): HTMLDivElement => {
  const caption = document.createElement('div');
  caption.contentEditable = 'true';
  caption.className = 'story-caption';
  caption.dataset.placeholder = 'Add a caption...';
  caption.innerHTML = initialText || '';

  caption.addEventListener('input', () => {
    onInput(caption.innerHTML);
  });

  // Stop editor key-bindings from firing while typing in the caption
  caption.addEventListener('keydown', (e) => {
    e.stopPropagation();
  });

  return caption;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const StoryEditorCanvas = ({
  editorRef,
  blocks,
  shouldAutofocus,
  hasEditPermission,
  aiConfig,
  uploadFile,
  onContentChange,
  onNoEditAttempt,
  shouldInitialize,
  drawerOpened,
}: StoryEditorCanvasProps) => {

  // Stable refs so closures always see the latest callbacks
  const onContentChangeRef = useRef(onContentChange);
  const uploadFileRef      = useRef(uploadFile);
  const shouldAutofocusRef = useRef(shouldAutofocus);

  useEffect(() => { onContentChangeRef.current = onContentChange; }, [onContentChange]);
  useEffect(() => { uploadFileRef.current      = uploadFile;      }, [uploadFile]);

  // ── main editor lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (!shouldInitialize) return;

    injectCaptionStyles();

    let isMounted = true;
    let cleanupAutoScroll: (() => void) | undefined;

    // ── drag-to-scroll helper ──────────────────────────────────────────────
    const enableEditorAutoScroll = (container: HTMLElement) => {
      const MAX_SPEED   = 45;
      const SCROLL_ZONE = 120;

      const handleDragOver = (event: DragEvent) => {
        const rect       = container.getBoundingClientRect();
        const y          = event.clientY;
        const distTop    = y - rect.top;
        const distBottom = rect.bottom - y;

        if (distTop < SCROLL_ZONE) {
          container.scrollTop -= MAX_SPEED * (1 - distTop / SCROLL_ZONE);
        }
        if (distBottom < SCROLL_ZONE) {
          container.scrollTop += MAX_SPEED * (1 - distBottom / SCROLL_ZONE);
        }
      };

      document.addEventListener('dragover', handleDragOver);
      return () => document.removeEventListener('dragover', handleDragOver);
    };

    // ── strip native image captions ────────────────────────────────────────
    const removeImageCaptions = () => {
      // Retain image captions under uploaded images in editor
    };

    // ── show/hide +/settings buttons based on whether block has text ───────
    const hideToolbarActionsWhenTextExists = (api: API | EditorJS) => {
      requestAnimationFrame(() => {
        const apiBlocks = 'blocks' in api ? api.blocks : null;
        if (!apiBlocks) return;

        const block = apiBlocks.getBlockByIndex(apiBlocks.getCurrentBlockIndex());
        if (!block) return;

        const hasText = (block.holder?.innerText?.trim().length ?? 0) > 0;

        document.querySelectorAll('.ce-toolbar__actions').forEach((el) => {
          el.classList.toggle('hide-actions', hasText);
        });
        document.querySelectorAll('.ce-toolbar__plus').forEach((el) => {
          el.classList.toggle('hide-plus-button', hasText);
        });
      });
    };

    // ── CaptionTool (standalone block) ─────────────────────────────────────
    // Reuses createCaptionElement so it is visually identical to embed captions.
    /**
     * Custom Caption Tool for the toolbox
     */
    class CaptionTool {
      api: any;
      data: any;
      wrapper: HTMLElement | undefined;

      constructor({ data, api }: { data: any, api: any }) {
        this.api = api;
        this.data = data || { text: '' };
      }

      static get isReadOnlySupported() {
        return true;
      }

      static get enableLineBreaks() {
        return true;
      }

      static get toolbox() {
        return {
          title: 'Caption',
          icon: '<svg width="17" height="15" viewBox="0 0 336 276" xmlns="http://www.w3.org/2000/svg"><path d="M291 150V79c0-19-15-34-34-34H79c-19 0-34 15-34 34v150c0 19 15 34 34 34h178c19 0 34-15 34-34v-35h20v35c0 30-24 54-54 54H79c-30 0-54-24-54-54V79c0-30 24-54 54-54h178c30 0 54 24 54 54v71h-20z"/><circle cx="128" cy="129" r="14"/><path d="M183 155c-9 0-15-6-15-15s6-15 15-15 15 6 15 15-6 15-15 15zm0-20c-3 0-5 2-5 5s2 5 5 5 5-2 5-5-2-5-5-5z"/><path d="M229 273H107c-4 0-8-3-8-8s4-8 8-8h122c4 0 8 3 8 8s-4 8-8 8z"/><path d="M287 188l-50-40c-3-3-7-3-10 0l-20 20-20-20c-3-3-7-3-10 0l-40 40c-2 2-2 5 0 7 2 2 5 2 7 0l33-33 20 20c3 3 7 3 10 0l20-20 43 33c1 1 2 1 3 1 2 0 4-1 5-3 1-2 1-5-1-7z"/></svg>'
        };
      }

      render() {
        this.wrapper = document.createElement('div');
        this.wrapper.contentEditable = 'true';
        this.wrapper.classList.add('cdx-block', 'cdx-caption', 'ce-caption-block', 'mt-3', 'text-[16px]', 'leading-snug', 'font-lato', 'font-medium');
        this.wrapper.innerHTML = this.data.text || '';
        this.wrapper.dataset.placeholder = 'Write a caption...';

        // Add some basic styling
        this.wrapper.style.cssText = `
          font-style: italic;
          color: #666;
          min-height: 1em;
          user-select: text !important;
          -webkit-user-select: text !important;
        `;

        return this.wrapper;
      }

      save(blockContent: HTMLElement) {
        return {
          text: blockContent.innerHTML
        };
      }
    }

    // ── TwitterTool ─────────────────────────────────────────────────────────
    class TwitterTool {
      api:     any;
      data:    { html: string; url: string; caption: string };
      wrapper: HTMLElement | undefined;

      constructor({ data, api }: { data: any; api: any }) {
        this.api  = api;
        this.data = data || { html: '', url: '', caption: '' };
      }

      static get isReadOnlySupported() { return true; }

      static get toolbox() {
        return {
          title: 'X (Twitter)',
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                   <path d="M4 4l11.733 16h4.267l-11.733 -16z"/>
                   <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/>
                 </svg>`,
        };
      }

      static get pasteConfig() {
        return {
          patterns: {
            twitter: /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+).*$/,
          },
        };
      }

      async onPaste(event: any) {
        const url = event.detail.data;
        this.data.url = url;
        await this.fetchOEmbed(url);
      }

      render() {
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add(
          'twitter-embed-block', 'my-4', 'flex', 'flex-col', 'items-center', 'w-full',
        );

        if (this.data.html) {
          this.renderTweet();
        } else if (this.data.url) {
          // Inserted by EmbedLinkTool — url is known, fetch oEmbed automatically
          this.renderInput();
          this.fetchOEmbed(this.data.url);
        } else {
          this.renderInput();
        }

        return this.wrapper;
      }

      private renderTweet() {
        if (!this.wrapper) return;
        this.wrapper.innerHTML = '';

        const tweetContainer = document.createElement('div');
        tweetContainer.classList.add('w-full', 'flex', 'justify-center');
        tweetContainer.innerHTML = this.data.html;
        this.wrapper.appendChild(tweetContainer);

        this.loadTwitterWidgets(tweetContainer);
        this.appendCaption();
      }

      private renderInput() {
        if (!this.wrapper) return;

        const input = document.createElement('input');
        input.type        = 'text';
        input.placeholder = 'Paste X (Twitter) URL and press Enter…';
        input.classList.add('px-4', 'py-2', 'border', 'rounded', 'w-full', 'max-w-xl', 'text-sm');
        input.style.color = '#000';

        input.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter') {
            const url = input.value.trim();
            if (url) {
              this.data.url = url;
              await this.fetchOEmbed(url);
            }
          }
        });

        this.wrapper.appendChild(input);
        this.appendCaption();
      }

      private appendCaption() {
        if (!this.wrapper) return;
        
        const existing = this.wrapper.querySelector('.ce-caption-block');
        if (existing) existing.remove();

        const captionEl = document.createElement('div');
        captionEl.contentEditable = 'true';
        captionEl.classList.add('cdx-block', 'cdx-caption', 'ce-caption-block', 'mt-3', 'text-[16px]', 'leading-snug', 'font-lato', 'font-medium');
        captionEl.innerHTML = this.data.caption || '';
        captionEl.dataset.placeholder = 'Write a caption...';
        captionEl.style.cssText = `
          font-style: normal;
          color: #666;
          min-height: 1em;
          text-align: left;
          user-select: text !important;
          -webkit-user-select: text !important;
        `;
        captionEl.addEventListener('input', () => {
          this.data.caption = captionEl.innerHTML;
        });
        captionEl.addEventListener('keydown', (e) => {
          e.stopPropagation();
        });
        this.wrapper.appendChild(captionEl);
      }
      async fetchOEmbed(url: string) {
        try {
          const res  = await fetch(
            `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&theme=dark&align=center&dnt=true`,
          );
          const json = await res.json();
          if (json?.html) {
            this.data.html = json.html;
            this.renderTweet();
          }
        } catch (e) {
          console.error('Failed to fetch Twitter oEmbed:', e);
        }
      }

      loadTwitterWidgets(container: HTMLElement) {
        if (!document.getElementById('twitter-wjs')) {
          const script = document.createElement('script');
          script.id    = 'twitter-wjs';
          script.src   = 'https://platform.twitter.com/widgets.js';
          script.async = true;
          document.body.appendChild(script);
        } else if ((window as any).twttr?.widgets) {
          setTimeout(() => (window as any).twttr.widgets.load(container), 100);
        }
      }

      save() {
        return this.data;
      }
    }

    // ── YouTubeTool ─────────────────────────────────────────────────────────
    class YouTubeTool {
      api:     any;
      data:    { url: string; caption: string };
      wrapper: HTMLElement | undefined;

      constructor({ data, api }: { data: any; api: any }) {
        this.api  = api;
        this.data = data || { url: '', caption: '' };
        if (data && data.source && !this.data.url) this.data.url = data.source;
      }

      static get isReadOnlySupported() { return true; }

      static get toolbox() {
        return {
          title: 'YouTube',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.082 0 12 0 12s0 3.918.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.918 24 12 24 12s0-3.918-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
        };
      }

      static get pasteConfig() {
        return {
          patterns: {
            youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|shorts\/|live\/)?([a-zA-Z0-9_-]+)/,
          },
        };
      }

      onPaste(event: any) {
        this.data.url = event.detail.data;
        this.renderVideo();
      }

      render() {
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('youtube-embed-block', 'my-4', 'flex', 'flex-col', 'items-center', 'w-full');

        if (this.data.url) {
          this.renderVideo();
        } else {
          this.renderInput();
        }

        return this.wrapper;
      }

      private renderVideo() {
        if (!this.wrapper) return;
        this.wrapper.innerHTML = '';

        const videoContainer = document.createElement('div');
        videoContainer.classList.add('w-full', 'flex', 'justify-center');
        
        const idMatch = this.data.url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|shorts\/|live\/)?([a-zA-Z0-9_-]+)/);
        const videoId = idMatch ? idMatch[1] : '';
        
        if (!videoId) {
          this.renderInput(true);
          return;
        }

        videoContainer.innerHTML = `<iframe class="embed-tool__content" style="width:100%; aspect-ratio:16/9; max-width:800px;" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        
        this.wrapper.appendChild(videoContainer);
        this.appendCaption();
      }

      private renderInput(hasError = false) {
        if (!this.wrapper) return;
        this.wrapper.innerHTML = '';

        const input = document.createElement('input');
        input.type        = 'text';
        input.placeholder = hasError ? 'Invalid YouTube URL. Please try again...' : 'Paste YouTube URL and press Enter…';
        input.classList.add('px-4', 'py-2', 'border', 'rounded', 'w-full', 'max-w-xl', 'text-sm');
        if (hasError) {
          input.classList.add('border-red-500');
        }
        input.style.color = '#000';

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const url = input.value.trim();
            if (url) {
              this.data.url = url;
              this.renderVideo();
            }
          }
        });

        this.wrapper.appendChild(input);
        this.appendCaption();
      }

      private appendCaption() {
        if (!this.wrapper) return;
        const captionEl = document.createElement('div');
        captionEl.contentEditable = 'true';
        captionEl.classList.add('embed-inline-caption');
        captionEl.innerHTML = this.data.caption || '';
        captionEl.dataset.placeholder = 'Write a caption...';
        captionEl.addEventListener('input', () => {
          this.data.caption = captionEl.innerHTML;
        });
        captionEl.addEventListener('keydown', (e) => e.stopPropagation());
        this.wrapper.appendChild(captionEl);
      }

      save() {
        const idMatch = this.data.url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|shorts\/|live\/)?([a-zA-Z0-9_-]+)/);
        const videoId = idMatch ? idMatch[1] : '';
        if (!videoId) {
          throw new Error('Invalid YouTube URL');
        }
        return {
          service: 'youtube',
          source: this.data.url,
          embed: `https://www.youtube.com/embed/${videoId}`,
          width: 800,
          height: 400,
          caption: this.data.caption
        };
      }
    }

    // ── InstagramTool ───────────────────────────────────────────────────────
    class InstagramTool {
      api:     any;
      data:    { url: string; caption: string };
      wrapper: HTMLElement | undefined;

      constructor({ data, api }: { data: any; api: any }) {
        this.api  = api;
        this.data = data || { url: '', caption: '' };
        if (data && data.source && !this.data.url) this.data.url = data.source;
      }

      static get isReadOnlySupported() { return true; }

      static get toolbox() {
        return {
          title: 'Instagram',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`,
        };
      }

      static get pasteConfig() {
        return {
          patterns: {
            instagram: /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/,
          },
        };
      }

      onPaste(event: any) {
        this.data.url = event.detail.data;
        this.renderVideo();
      }

      render() {
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('instagram-embed-block', 'my-4', 'flex', 'flex-col', 'items-center', 'w-full');

        if (this.data.url) {
          this.renderVideo();
        } else {
          this.renderInput();
        }

        return this.wrapper;
      }

      private renderVideo() {
        if (!this.wrapper) return;
        this.wrapper.innerHTML = '';

        const videoContainer = document.createElement('div');
        videoContainer.classList.add('w-full', 'flex', 'justify-center');
        const idMatch = this.data.url.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
        const videoId = idMatch ? idMatch[1] : '';
        
        if (!videoId) {
          this.renderInput(true);
          return;
        }

        videoContainer.innerHTML = `<iframe class="embed-tool__content" style="width:100%;height:700px;max-width:550px;margin:0 auto;border:none;" src="https://www.instagram.com/p/${videoId}/embed/" frameborder="0" scrolling="no" allowtransparency="true" allow="encrypted-media"></iframe>`;
        
        this.wrapper.appendChild(videoContainer);
        this.appendCaption();
      }

      private renderInput(hasError = false) {
        if (!this.wrapper) return;
        this.wrapper.innerHTML = '';

        const input = document.createElement('input');
        input.type        = 'text';
        input.placeholder = hasError ? 'Invalid Instagram URL. Please try again...' : 'Paste Instagram URL and press Enter…';
        input.classList.add('px-4', 'py-2', 'border', 'rounded', 'w-full', 'max-w-xl', 'text-sm');
        if (hasError) {
          input.classList.add('border-red-500');
        }
        input.style.color = '#000';

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const url = input.value.trim();
            if (url) {
              this.data.url = url;
              this.renderVideo();
            }
          }
        });

        this.wrapper.appendChild(input);
        this.appendCaption();
      }

      private appendCaption() {
        if (!this.wrapper) return;
        const captionEl = document.createElement('div');
        captionEl.contentEditable = 'true';
        captionEl.classList.add('embed-inline-caption');
        captionEl.innerHTML = this.data.caption || '';
        captionEl.dataset.placeholder = 'Write a caption...';
        captionEl.addEventListener('input', () => {
          this.data.caption = captionEl.innerHTML;
        });
        captionEl.addEventListener('keydown', (e) => e.stopPropagation());
        this.wrapper.appendChild(captionEl);
      }

      save() {
        const idMatch = this.data.url.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
        const videoId = idMatch ? idMatch[1] : '';
        if (!videoId) {
          throw new Error('Invalid Instagram URL');
        }
        return {
          service: 'instagram',
          source: this.data.url,
          embed: `https://www.instagram.com/p/${videoId}/embed/`,
          width: 550,
          height: 700,
          caption: this.data.caption
        };
      }
    }

    // ── FacebookTool ────────────────────────────────────────────────────────
    class FacebookTool {
      api:     any;
      data:    { url: string; caption: string };
      wrapper: HTMLElement | undefined;

      constructor({ data, api }: { data: any; api: any }) {
        this.api  = api;
        this.data = data || { url: '', caption: '' };
        if (data && data.source && !this.data.url) this.data.url = data.source;
      }

      static get isReadOnlySupported() { return true; }

      static get toolbox() {
        return {
          title: 'Facebook',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>`,
        };
      }

      static get pasteConfig() {
        return {
          patterns: {
            facebook: /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/.+/i,
          },
        };
      }

      onPaste(event: any) {
        this.data.url = event.detail.data;
        this.renderEmbed();
      }

      render() {
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('facebook-embed-block', 'my-4', 'flex', 'flex-col', 'items-center', 'w-full');

        if (this.data.url) {
          this.renderEmbed();
        } else {
          this.renderInput();
        }

        return this.wrapper;
      }

      private renderEmbed() {
        if (!this.wrapper) return;
        this.wrapper.innerHTML = '';

        const container = document.createElement('div');
        container.classList.add('w-full', 'flex', 'justify-center');
        
        const url = this.data.url;

        // Using the user-provided iframe reference (show_text=false, compact height)
        container.innerHTML = `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=false&width=500" width="500" height="497" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
        
        this.wrapper.appendChild(container);
        this.appendCaption();
      }

      private renderInput(hasError = false) {
        if (!this.wrapper) return;
        this.wrapper.innerHTML = '';

        const input = document.createElement('input');
        input.type        = 'text';
        input.placeholder = hasError ? 'Invalid Facebook URL. Please try again...' : 'Paste Facebook URL and press Enter…';
        input.classList.add('px-4', 'py-2', 'border', 'rounded', 'w-full', 'max-w-xl', 'text-sm');
        if (hasError) {
          input.classList.add('border-red-500');
        }
        input.style.color = '#000';

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const url = input.value.trim();
            if (url) {
              this.data.url = url;
              this.renderEmbed();
            }
          }
        });

        this.wrapper.appendChild(input);
        this.appendCaption();
      }

      private appendCaption() {
        if (!this.wrapper) return;
        const captionEl = document.createElement('div');
        captionEl.contentEditable = 'true';
        captionEl.classList.add('embed-inline-caption');
        captionEl.innerHTML = this.data.caption || '';
        captionEl.dataset.placeholder = 'Write a caption...';
        captionEl.addEventListener('input', () => {
          this.data.caption = captionEl.innerHTML;
        });
        captionEl.addEventListener('keydown', (e) => e.stopPropagation());
        this.wrapper.appendChild(captionEl);
      }

      save() {
        return {
          service: 'facebook',
          source: this.data.url,
          embed: this.data.url,
          caption: this.data.caption
        };
      }
    }

    // ── EmbedLinkTool (smart URL router) ────────────────────────────────────
    // Shows a single URL input, detects the platform, then replaces itself
    // with the correct existing tool block (YouTubeTool / InstagramTool /
    // TwitterTool / Embed-SoundCloud). No embed rendering logic lives here.
    class EmbedLinkTool {
      api:     any;
      data:    { url: string };
      wrapper: HTMLElement | undefined;

      constructor({ data, api }: { data: any; api: any }) {
        this.api  = api;
        this.data = data || { url: '' };
      }

      static get isReadOnlySupported() { return true; }

      static get toolbox() {
        return {
          title: 'Embed',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round">
                   <polyline points="16 18 22 12 16 6"/>
                   <polyline points="8 6 2 12 8 18"/>
                 </svg>`,
        };
      }

      /** Identify platform from URL string */
      private detectPlatform(url: string): 'youtube' | 'instagram' | 'twitter' | 'facebook' | 'embed' | null {
        if (/(?:youtube\.com|youtu\.be)/i.test(url))   return 'youtube';
        if (/instagram\.com\/(?:p|reel|tv)\//i.test(url)) return 'instagram';
        if (/(?:twitter|x)\.com/i.test(url))            return 'twitter';
        if (/(?:facebook\.com|fb\.watch)/i.test(url))   return 'facebook';
        if (/soundcloud\.com/i.test(url))               return 'embed';
        return null;
      }

      render() {
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('embed-link-tool', 'my-4', 'w-full');
        this.renderInput();
        return this.wrapper;
      }

      private renderInput(errorMsg = '') {
        if (!this.wrapper) return;
        this.wrapper.innerHTML = '';

        const input = document.createElement('input');
        input.type        = 'text';
        input.placeholder = 'Paste YouTube, Instagram, Facebook, X, or SoundCloud URL…';
        input.value       = this.data.url || '';
        input.classList.add('px-4', 'py-2', 'border', 'rounded', 'w-full', 'text-sm');
        input.style.color = '#000';
        if (errorMsg) input.classList.add('border-red-500');

        if (errorMsg) {
          const err = document.createElement('p');
          err.textContent = errorMsg;
          err.style.cssText = 'color:#ef4444;font-size:0.75rem;margin-top:0.25rem;';
          this.wrapper.appendChild(err);
        }

        input.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            const url = input.value.trim();
            if (!url) return;
            this.data.url = url;
            this.submit(url);
          }
        });

        this.wrapper.prepend(input);
        requestAnimationFrame(() => input.focus());
      }

      private submit(url: string) {
        const platform = this.detectPlatform(url);

        if (!platform) {
          this.renderInput('Unsupported URL — please use YouTube, Instagram, X, or SoundCloud.');
          return;
        }

        // Build data payload expected by each target tool
        let toolData: Record<string, any>;
        if (platform === 'youtube') {
          toolData = { url };
        } else if (platform === 'instagram') {
          toolData = { url };
        } else if (platform === 'twitter') {
          toolData = { url, html: '', caption: '' };
        } else if (platform === 'facebook') {
          toolData = { url };
        } else {
          // SoundCloud via Embed tool — needs `service` hint
          toolData = { service: 'soundcloud', source: url };
        }

        // Replace this block with the correct tool at the same position
        try {
          const index = this.api.blocks.getCurrentBlockIndex();
          this.api.blocks.delete(index);
          this.api.blocks.insert(platform, toolData, {}, index, true);
        } catch (err) {
          console.error('[EmbedLinkTool] block replacement failed:', err);
        }
      }

      save() {
        // Only reached if the user closes the block before submitting
        return { url: this.data.url };
      }
    }

    // ── initializeEditor ────────────────────────────────────────────────────
    const initializeEditor = async () => {
      if (!isMounted) return;

      // ── Shared width-slider control ────────────────────────────────────────
      // Used both by ImageWrapTune (standalone images) and the wrap-image-menu
      const createWidthSlider = (initialWidth: number, onChange: (width: number) => void): HTMLElement => {
        const sliderContainer = document.createElement('div');
        sliderContainer.style.cssText = 'padding:8px 14px; border-bottom:1px solid #f3f4f6; display:flex; flex-direction:column; gap:4px; font-family:sans-serif;';

        const sliderLabel = document.createElement('div');
        sliderLabel.style.cssText = 'font-weight:600; color:#4B5563; font-size:11px;';
        sliderLabel.textContent = `WIDTH: ${initialWidth}%`;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '15';
        slider.max = '100';
        slider.value = String(initialWidth);
        slider.style.cssText = 'width:100%; cursor:pointer; margin:0;';

        slider.addEventListener('input', (ev) => {
          ev.stopPropagation();
          const val = parseInt((ev.target as HTMLInputElement).value, 10);
          sliderLabel.textContent = `WIDTH: ${val}%`;
          onChange(val);
        });

        sliderContainer.appendChild(sliderLabel);
        sliderContainer.appendChild(slider);
        return sliderContainer;
      };

      class WrappedImageParagraphTool {
        static get isReadOnlySupported() { return true; }

        static get enableLineBreaks() { return true; }

        static get toolbox() { return false; }

        api: any;
        data: { text: string; imageUrl: string; wrapAlign: 'left' | 'right'; caption: string; width?: number; align: 'left' | 'center' | 'right' };
        wrapper: HTMLElement | undefined;

        constructor({ data, api }: { data: any; api: any }) {
          this.api = api;
          this.data = {
            text: data?.text || '',
            imageUrl: data?.imageUrl || '',
            wrapAlign: data?.wrapAlign || 'left',
            caption: data?.caption || '',
            width: data?.width !== undefined ? data.width : 40,
            // Not used while wrapped (float position is controlled by wrapAlign) — carried
            // through purely so the image can restore its pre-wrap alignment on unwrap.
            align: data?.align || 'center',
          };
        }

        render() {
          this.wrapper = document.createElement('div');
          this.wrapper.style.overflow = 'hidden';
          this.wrapper.classList.add('ce-paragraph', 'wrapped-image-paragraph');

          const imageWidth = this.data.width || 40;
          const floatStyle = this.data.wrapAlign === 'left'
            ? `float:left; margin: 0 1.25rem 0 0; max-width:${imageWidth}%; width:auto;`
            : `float:right; margin: 0 0 0 1.25rem; max-width:${imageWidth}%; width:auto;`;

          const imgSpan = document.createElement('span');
          imgSpan.className = 'inline-image-wrap';
          imgSpan.dataset.wrap = this.data.wrapAlign;
          imgSpan.dataset.url = this.data.imageUrl;
          imgSpan.dataset.width = String(imageWidth);
          // Carried through purely so the pre-wrap alignment can be restored on unwrap.
          imgSpan.dataset.align = this.data.align;
          imgSpan.contentEditable = 'false';
          imgSpan.style.cssText = `display:block; ${floatStyle}`;
          imgSpan.innerHTML =
            `<img src="${this.data.imageUrl}" style="max-width:100%;width:auto;height:auto;display:block;" />` +
            (this.data.caption
              ? `<span class="inline-image-caption" style="font-size:13px;color:#716d6d;display:block;margin-top:4px;line-height:1.3;">${this.data.caption}</span>`
              : '');
 
          const textNode = document.createElement('div');
          textNode.contentEditable = 'true';
          textNode.style.cssText = 'min-height:1em; outline:none;';
          textNode.innerHTML = this.data.text || '';
          textNode.addEventListener('input', () => {
            this.data.text = textNode.innerHTML;
          });
          textNode.addEventListener('keydown', (e) => e.stopPropagation());

          this.wrapper.appendChild(imgSpan);
          this.wrapper.appendChild(textNode);

          return this.wrapper;
        }

        save() {
          const textNode = this.wrapper?.querySelector('[contenteditable="true"]') as HTMLElement | null;
          const imgSpan = this.wrapper?.querySelector('.inline-image-wrap') as HTMLElement | null;
          
          const width = imgSpan?.dataset.width ? parseInt(imgSpan.dataset.width, 10) : (this.data.width || 40);
          const wrapAlign = (imgSpan?.dataset.wrap as 'left' | 'right') || this.data.wrapAlign;
          const align = (imgSpan?.dataset.align as 'left' | 'center' | 'right') || this.data.align;
          const caption = imgSpan?.querySelector('.inline-image-caption')?.innerHTML || this.data.caption;

          return {
            text: textNode?.innerHTML || this.data.text,
            imageUrl: this.data.imageUrl,
            wrapAlign: wrapAlign,
            caption: caption,
            width: width,
            align: align,
          };
        }
      }

      class ImageWrapTune {
        static get isTune() { return true; }

        api: any;
        data: { wrapAlign: 'left' | 'right' | null; width: number; align: 'left' | 'center' | 'right' };
        block: any;
        wrapperEl: HTMLElement | undefined;

        constructor({ api, data, block }: { api: any; data: any; block: any }) {
          this.api = api;
          this.data = {
            wrapAlign: data?.wrapAlign ?? null,
            width: data?.width !== undefined ? data.width : 100,
            align: data?.align || 'center',
          };
          this.block = block;
        }

        // Applies the current width/alignment to this image's own rendered content.
        wrap(blockContent: HTMLElement) {
          this.wrapperEl = document.createElement('div');
          this.wrapperEl.classList.add('image-wrap-tune');
          this.wrapperEl.style.maxWidth = `${this.data.width}%`;
          this.wrapperEl.style.marginLeft = this.data.align === 'left' ? '0' : 'auto';
          this.wrapperEl.style.marginRight = this.data.align === 'right' ? '0' : 'auto';
          this.wrapperEl.appendChild(blockContent);
          return this.wrapperEl;
        }

        render() {
          const wrapper = document.createElement('div');

          // ── Width control — always available, independent of wrap state ──────
          // slider does — no block recreation, no flicker.
          const widthSlider = createWidthSlider(this.data.width, (val) => {
            this.data.width = val;
            if (this.wrapperEl) {
              this.wrapperEl.style.maxWidth = `${val}%`;
            }
            onContentChangeRef.current?.();
          });
          wrapper.appendChild(widthSlider);

          // ── Alignment control — positions the standalone (unwrapped) image ────
          const makeAlignBtn = (label: string, direction: 'left' | 'center' | 'right', iconSvg: string) => {
            const btn = document.createElement('div');
            btn.classList.add('ce-popover-item');
            btn.innerHTML = `
              <div class="ce-popover-item__icon">${iconSvg}</div>
              <div class="ce-popover-item__title">${label}</div>`;
            btn.addEventListener('click', () => this._applyAlign(direction));
            return btn;
          };

          wrapper.appendChild(makeAlignBtn('Move to Left', 'left',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="15" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>'));
          wrapper.appendChild(makeAlignBtn('Move to Center', 'center',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="18" y2="18"/></svg>'));
          wrapper.appendChild(makeAlignBtn('Move to Right', 'right',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/></svg>'));

          const wrapLeftBtn = document.createElement('div');
          wrapLeftBtn.classList.add('ce-popover-item');
          wrapLeftBtn.innerHTML = `
            <div class="ce-popover-item__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="8" height="8"/><line x1="12" y1="4" x2="22" y2="4"/>
                <line x1="12" y1="8" x2="22" y2="8"/><line x1="2" y1="14" x2="22" y2="14"/>
                <line x1="2" y1="18" x2="22" y2="18"/>
              </svg>
            </div>
            <div class="ce-popover-item__title">Wrap Left</div>`;
          wrapLeftBtn.addEventListener('click', () => this._applyWrap('left'));

          const wrapRightBtn = document.createElement('div');
          wrapRightBtn.classList.add('ce-popover-item');
          wrapRightBtn.innerHTML = `
            <div class="ce-popover-item__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="14" y="2" width="8" height="8"/><line x1="2" y1="4" x2="12" y2="4"/>
                <line x1="2" y1="8" x2="12" y2="8"/><line x1="2" y1="14" x2="22" y2="14"/>
                <line x1="2" y1="18" x2="22" y2="18"/>
              </svg>
            </div>
            <div class="ce-popover-item__title">Wrap Right</div>`;
          wrapRightBtn.addEventListener('click', () => this._applyWrap('right'));

          wrapper.appendChild(wrapLeftBtn);
          wrapper.appendChild(wrapRightBtn);
          return wrapper;
        }

        _applyAlign(direction: 'left' | 'center' | 'right') {
          this.data.align = direction;
          if (this.wrapperEl) {
            this.wrapperEl.style.marginLeft = direction === 'left' ? '0' : 'auto';
            this.wrapperEl.style.marginRight = direction === 'right' ? '0' : 'auto';
          }
          onContentChangeRef.current?.();
        }

        _applyWrap(direction: 'left' | 'right') {
          const currentIndex = this.api.blocks.getCurrentBlockIndex();

          // Always wrap with the paragraph above — scan upward only
          let targetIndex = -1;
          for (let i = currentIndex - 1; i >= 0; i--) {
            const b = this.api.blocks.getBlockByIndex(i);
            if (b?.name === 'paragraph') { targetIndex = i; break; }
          }

          if (targetIndex === -1) {
            console.warn('[ImageWrapTune] No paragraph block found above this image. Wrap aborted.');
            return;
          }

          // ── Read image URL from DOM ──────────────────────────────────────────────
          const imageBlock = this.api.blocks.getBlockByIndex(currentIndex);
          const imageHolder = imageBlock?.holder;
          const imgEl = imageHolder?.querySelector('img') as HTMLImageElement | null;
          const imageUrl = imgEl?.src || '';

          // ── Read caption ─────────────────────────────────────────────────────────
          const captionEl = imageHolder?.querySelector(
            '.image-tool__caption [contenteditable], .story-caption'
          ) as HTMLElement | null;
          const captionText = captionEl?.innerHTML || '';

          // ── Read paragraph text BEFORE any deletion ──────────────────────────────
          // targetIndex < currentIndex always (paragraph is above image)
          // so reading it now is safe — deleting the image block below won't affect it
          const paraBlock = this.api.blocks.getBlockByIndex(targetIndex);
          const ceParaEl = paraBlock?.holder?.querySelector('.ce-paragraph') as HTMLElement | null;
          const paraText = ceParaEl?.innerHTML || '';

          // Step 1 — delete the image block
          this.api.blocks.delete(currentIndex);

          // Step 2 — insert wrappedImageParagraph block (survives save/load correctly)
          // `align` is carried over unchanged so the pre-wrap alignment can be restored on unwrap.
          this.api.blocks.insert(
            'wrappedImageParagraph',
            {
              text: paraText,
              imageUrl: imageUrl,
              wrapAlign: direction,
              caption: captionText,
              width: this.data.width,
              align: this.data.align,
            },
            {},
            targetIndex,
            true
          );

          // Step 3 — delete old paragraph
          this.api.blocks.delete(targetIndex + 1);
        }

        save() {
          return this.data;
        }
      }


      // Destroy any existing editor instance
      if (editorRef.current) {
        await editorRef.current.destroy?.();
        editorRef.current = null;
      }

      // Clear the DOM holder
      const holderElement = document.getElementById('editorjs-container');
      if (holderElement) holderElement.innerHTML = '';

      // ── EditorJS instance ──────────────────────────────────────────────────
      const editor = new EditorJSClass({
        holder:    'editorjs-container',
        autofocus: shouldAutofocusRef.current,
        readOnly:  !hasEditPermission,

        onReady: () => {
          new DragDrop(editor);
          removeImageCaptions();

          const scroller = document.querySelector('main.no-scrollbar') as HTMLElement | null;
          if (scroller) cleanupAutoScroll = enableEditorAutoScroll(scroller);

          hideToolbarActionsWhenTextExists(editor);

          // ── Inject captions below every embed block (including YT/Insta/SoundCloud)
          // MutationObserver watches for .embed-tool blocks being added/updated and
          // injects an editable caption div directly below the embed iframe.
          const editorContainer = document.getElementById('editorjs-container');

          const injectEmbedCaption = (embedBlock: Element) => {
            // Already has our caption injected
            if (embedBlock.querySelector('.embed-inline-caption')) return;

            const captionEl = document.createElement('div');
            captionEl.contentEditable = 'true';
            captionEl.className = 'embed-inline-caption';
            captionEl.dataset.placeholder = 'Write a caption...';
            captionEl.style.cssText = [
              'display:block',
              'width:100%',
              'text-align:center',
              'font-style:italic',
              'color:#666',
              'font-size:0.875rem',
              'min-height:1.2em',
              'padding:0.35rem 0 0.1rem',
              'outline:none',
              'user-select:text',
              '-webkit-user-select:text',
            ].join(';');
            captionEl.addEventListener('keydown', (e) => e.stopPropagation());

            // Persist caption back into EditorJS block data so it saves correctly
            captionEl.addEventListener('input', () => {
              const ceBlock = embedBlock.closest('.ce-block');
              if (!ceBlock) return;
              const allBlocks = editorContainer!.querySelectorAll('.ce-block');
              const idx = Array.from(allBlocks).indexOf(ceBlock);
              if (idx < 0) return;
              try {
                const block = editor.blocks.getBlockByIndex(idx);
                if (block) {
                  // Stash on the DOM element for save retrieval
                  (ceBlock as any).__embedCaption = captionEl.innerHTML;
                }
              } catch { /* ignore */ }
            });

            embedBlock.appendChild(captionEl);
          };

          // Process any embed blocks already in the DOM (loaded from saved data)
          if (editorContainer) {
            editorContainer.querySelectorAll('.embed-tool').forEach(injectEmbedCaption);

            // Watch for new embed blocks being inserted (paste-triggered renders)
            const embedObserver = new MutationObserver((mutations) => {
              mutations.forEach((mut) => {
                mut.addedNodes.forEach((node) => {
                  if (!(node instanceof HTMLElement)) return;
                  // The added node itself could be an embed-tool
                  if (node.classList.contains('embed-tool')) {
                    injectEmbedCaption(node);
                  }
                  // Or it could contain one
                  node.querySelectorAll('.embed-tool').forEach(injectEmbedCaption);
                });
              });
            });
            embedObserver.observe(editorContainer, { childList: true, subtree: true });
          }
          if (editorContainer) {
            editorContainer.addEventListener('click', (e) => {
              const target      = e.target as HTMLElement;
              const mediaToolEl = target.closest('.image-tool') || target.closest('.embed-tool') || target.closest('.twitter-embed-block');
              if (!mediaToolEl) return;

              const blockElement = mediaToolEl.closest('.ce-block');
              if (!blockElement) return;

              const allBlocks  = editorContainer.querySelectorAll('.ce-block');
              const blockIndex = Array.from(allBlocks).indexOf(blockElement);
              if (blockIndex < 0) return;

              try {
                editor.caret.setToBlock(blockIndex, 'end');
              } catch {
                editor.blocks.getBlockByIndex(blockIndex);
              }

              allBlocks.forEach((b) => b.classList.remove('ce-block--selected'));
              blockElement.classList.add('ce-block--selected');

              const toolbar = document.querySelector('.ce-toolbar') as HTMLElement | null;
              if (toolbar) {
                toolbar.classList.add('ce-toolbar--opened');
                toolbar.style.display = 'flex';

                const blockRect     = blockElement.getBoundingClientRect();
                const containerRect = editorContainer.getBoundingClientRect();
                toolbar.style.top   = `${blockRect.top - containerRect.top + editorContainer.scrollTop}px`;
              }
            });

            // Re-attach click handlers for wrapped images inside paragraphs
            const handleWrappedImageClick = (e: MouseEvent) => {
              const target = e.target as HTMLElement;
              const wrapSpan = target.closest('.inline-image-wrap') as HTMLElement | null;
              if (!wrapSpan) return;

              e.stopPropagation();

              const ceBlock = wrapSpan.closest('.ce-block') as HTMLElement | null;
              if (!ceBlock) return;

              const allBlocks = editorContainer.querySelectorAll('.ce-block');
              const blockIndex = Array.from(allBlocks).indexOf(ceBlock);
              if (blockIndex < 0) return;

              allBlocks.forEach((b) => b.classList.remove('ce-block--selected'));
              ceBlock.classList.add('ce-block--selected');

              try {
                editor.caret.setToBlock(blockIndex, 'end');
              } catch {
                // ignore
              }

              const existing = document.getElementById('wrap-image-menu');
              if (existing) existing.remove();

              const menu = document.createElement('div');
              menu.id = 'wrap-image-menu';
              menu.style.cssText = [
                'position:absolute',
                'z-index:9999',
                'background:#fff',
                'border:1px solid #e5e7eb',
                'border-radius:6px',
                'box-shadow:0 2px 8px rgba(0,0,0,0.15)',
                'display:flex',
                'flex-direction:column',
                'padding:4px 0',
                'min-width:140px',
                'font-size:13px',
                'font-family:sans-serif',
              ].join(';');

              const rect = wrapSpan.getBoundingClientRect();
              const containerRect = editorContainer.getBoundingClientRect();
              const currentWrap = wrapSpan.dataset.wrap as 'left' | 'right';

              if (currentWrap === 'right') {
                // Position at the top-right corner of the image, then shift it right by its own width
                // so it starts exactly where the image ends, plus 8px space.
                menu.style.left = `${rect.right - containerRect.left + 8}px`;
              } else {
                // Position at the top-left corner of the image, then shift it left by its own width
                // so it starts exactly where the image begins (extending to the left), minus 8px space.
                menu.style.left = `${rect.left - containerRect.left - 8}px`;
                menu.style.transform = 'translateX(-100%)'; 
              }

              menu.style.top = `${rect.top - containerRect.top + editorContainer.scrollTop}px`;

              // --- Resize Slider (shared implementation with ImageWrapTune) ---
              const currentWidth = parseInt(wrapSpan.dataset.width || '40', 10);
              const sliderContainer = createWidthSlider(currentWidth, (val) => {
                // Live update visual
                wrapSpan.style.maxWidth = `${val}%`;
                wrapSpan.dataset.width = String(val);

                // Update EditorJS data
                try {
                  const block = (editor as any).blocks.getBlockByIndex(blockIndex);
                  if (block) {
                    block.data.width = val;
                  }
                } catch (e) {}

                onContentChangeRef.current?.();
              });
              menu.appendChild(sliderContainer);

              const makeBtn = (label: string, onClick: () => void) => {
                const btn = document.createElement('div');
                btn.textContent = label;
                btn.style.cssText = 'padding:6px 14px; cursor:pointer; color:#374151;';
                btn.addEventListener('mouseenter', () => { btn.style.background = '#f3f4f6'; });
                btn.addEventListener('mouseleave', () => { btn.style.background = ''; });
                btn.addEventListener('click', (ev) => {
                  ev.stopPropagation();
                  onClick();
                  menu.remove();
                });
                return btn;
              };

              const toggleLabel = currentWrap === 'left' ? '→ Move to Right' : '← Move to Left';
              menu.appendChild(makeBtn(toggleLabel, () => {
                const newWrap = currentWrap === 'left' ? 'right' : 'left';
                const widthVal = wrapSpan.dataset.width || '40';
                const newFloat = newWrap === 'left'
                  ? `float:left; margin: 0 1.25rem 0 0; max-width:${widthVal}%; width:auto;`
                  : `float:right; margin: 0 0 0 1.25rem; max-width:${widthVal}%; width:auto;`;
                
                wrapSpan.setAttribute('data-wrap', newWrap);
                wrapSpan.dataset.wrap = newWrap;
                wrapSpan.style.cssText = `display:block; ${newFloat}`;

                // Update EditorJS data
                try {
                  const block = (editor as any).blocks.getBlockByIndex(blockIndex);
                  if (block) {
                    block.data.wrapAlign = newWrap;
                  }
                } catch(e) {}

                onContentChangeRef.current?.();
              }));

              menu.appendChild(makeBtn('↩ Unwrap Image', () => {
                const imgSrc = (wrapSpan.querySelector('img') as HTMLImageElement | null)?.src || '';
                const captionSpan = wrapSpan.querySelector('.inline-image-caption') as HTMLElement | null;
                const cap = captionSpan?.innerHTML || '';
                // Preserve the current width so unwrapping never resets the size
                const widthOnUnwrap = parseInt(wrapSpan.dataset.width || '40', 10);

                // Step 1: Get plain paragraph text from editable text node in wrapped block
                const textNode = ceBlock.querySelector('.wrapped-image-paragraph [contenteditable="true"], .wrapped-image-paragraph > div[contenteditable="true"]') as HTMLElement | null;
                const cleanParaText = textNode?.innerHTML || '';

                // Step 2: figure out current block index fresh (don't trust stale blockIndex)
                const allBlocksNow = editorContainer.querySelectorAll('.ce-block');
                const freshIndex = Array.from(allBlocksNow).indexOf(ceBlock);
                if (freshIndex < 0) return;

                // Preserve the alignment that was set before this image was wrapped, so it
                // can be restored on the standalone image below (independent of wrap state).
                // Read from the DOM dataset (same pattern as widthOnUnwrap above) — block.data
                // isn't reliably in sync with the tool's live data in this EditorJS setup.
                const alignOnUnwrap = (wrapSpan.dataset.align as 'left' | 'center' | 'right') || 'center';

                // Step 3: replace the paragraph block with the clean text (no image span)
                editor.blocks.insert('paragraph', { text: cleanParaText }, {}, freshIndex, true);
                editor.blocks.delete(freshIndex + 1);

                // Step 4: carrying its width into imageWrapTune so wrap/unwrap never changes size.
                const insertedImageBlock = editor.blocks.insert(
                  'image',
                  {
                    file: { url: imgSrc },
                    caption: cap,
                    withBorder: false,
                    withBackground: false,
                    stretched: false,
                  },
                  {},
                  freshIndex + 1,
                  false
                );
                try {
                  editor.blocks.update(insertedImageBlock.id, undefined, {
                    imageWrapTune: { wrapAlign: null, width: widthOnUnwrap, align: alignOnUnwrap },
                  } as any);
                } catch (e) {
                }
                onContentChangeRef.current?.();

                // After the unwrap inserts, refocus the new image block
                setTimeout(() => {
                  try {
                    editor.caret.setToBlock(freshIndex + 1, 'start');
                  } catch {
                    // ignore
                  }
                }, 50);
              }));

              editorContainer.style.position = 'relative';
              editorContainer.appendChild(menu);

              const closeMenu = (ev: MouseEvent) => {
                if (!menu.contains(ev.target as Node)) {
                  menu.remove();
                  document.removeEventListener('mousedown', closeMenu);
                }
              };
              setTimeout(() => document.addEventListener('mousedown', closeMenu), 0);
            };

            editorContainer.addEventListener('click', handleWrappedImageClick);
          }
        },

        onChange: async (api) => {
          hideToolbarActionsWhenTextExists(api);

          // Patch embed captions into block data before propagating save
          const editorEl = document.getElementById('editorjs-container');
          if (editorEl) {
            editorEl.querySelectorAll('.ce-block').forEach((ceBlock, idx) => {
              const captionEl = ceBlock.querySelector('.embed-inline-caption') as HTMLElement | null;
              if (!captionEl) return;
              // Stash for later retrieval during save
              (ceBlock as any).__embedCaption = captionEl.innerHTML;
            });
          }

          onContentChangeRef.current?.();
        },

        tools: {
          header: {
            class: Header as any,
            inlineToolbar: ['bold', 'italic', 'link', 'aiInline'],
          },
          // list: {
          //   class: StoryListTool as any,
          //   inlineToolbar: ['bold', 'italic', 'link', 'aiInline'],
          // },
          // quote: {
          //   class: Quote as any,
          //   inlineToolbar: ['bold', 'italic', 'link', 'aiInline'],
          // },
          image: {
            class: ImageTool as any,
            config: {
              caption: false,
              uploader: {
                async uploadByFile(file: File) {
                  const url = await uploadFileRef.current?.(file);
                  return url
                    ? { success: 1, file: { url } }
                    : { success: 0 };
                },
                async uploadByUrl(url: string) {
                  return { success: 1, file: { url } };
                },
              },
            },
            tunes: ['imageWrapTune'],
          },
          imageWrapTune: {
            class: ImageWrapTune as any,
          },
          wrappedImageParagraph: {
            class: WrappedImageParagraphTool as any,
          },
          caption: {
            class: CaptionTool as any,
            inlineToolbar: true,
          },
          aiTool: {
            class: AITool,
            config: { aiConfig },
          },
          aiInline: {
            class: AIInlineTool,
            config: { aiConfig },
          },
          embed: {
            class: Embed,
            inlineToolbar: false,
            config: {
              services: {
                youtube: {
                  regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|shorts\/)?([a-zA-Z0-9_-]+)/,
                  embedUrl: 'https://www.youtube.com/embed/<%= remote_id %>',
                  html: '<iframe class="embed-tool__content" style="width:100%; aspect-ratio:16/9; max-width:800px;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
                  id: (ids: any) => ids[0],
                },
                instagram: {
                  regex: /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)\/?/,
                  embedUrl: 'https://www.instagram.com/p/<%= remote_id %>/embed/',
                  html: '<iframe class="embed-tool__content" style="width:100%;height:700px;max-width:550px;margin:0 auto;border:none;" frameborder="0" scrolling="no" allowtransparency="true" allow="encrypted-media"></iframe>',
                  id: (ids: any) => ids[0],
                },
                soundcloud: {
                  regex: /https?:\/\/(?:www\.)?(soundcloud\.com\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*).*/,
                  embedUrl: 'https://w.soundcloud.com/player/?url=https://<%= remote_id %>&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true',
                  html: '<iframe class="embed-tool__content" height="300" scrolling="no" frameborder="no" allow="autoplay" style="width:100%;"></iframe>',
                  height: 300,
                  width: 600,
                  id: (ids: any) => ids[0],
                },
              },
            },
          },
          // ── Hidden from toolbox — used internally by EmbedLinkTool ──────────
          // toolbox: false keeps them out of the + menu but lets
          // api.blocks.insert('youtube' | 'instagram' | 'twitter') work.
          twitter: {
            class: TwitterTool as any,
            toolbox: false,
          },
          youtube: {
            class: YouTubeTool as any,
            toolbox: false,
          },
          instagram: {
            class: InstagramTool as any,
            toolbox: false,
          },
          facebook: {
            class: FacebookTool as any,
            toolbox: false,
          },
          embedLink: {
            class: EmbedLinkTool as any,
          },
        },

        data:         { blocks },
        placeholder:  'Tell your story…',
        defaultBlock: 'paragraph',
      });

      editorRef.current = editor;

      try {
        await editor.isReady;
      } catch (error) {
        console.error('EditorJS failed to initialize', error);
      }
    };

    initializeEditor();

    return () => {
      isMounted = false;
      cleanupAutoScroll?.();
      editorRef.current?.destroy?.();
      editorRef.current = null;
    };
  }, [aiConfig, blocks, editorRef, hasEditPermission, shouldInitialize]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div
      id="editorjs-container"
      className="max-w-none"
      onClick={onNoEditAttempt}
      style={{
        fontFamily:   'charis sil, serif',
        fontSize:     '1.3125rem',
        lineHeight:   '1.58',
        color:        '#374151',
        marginTop:    '0.5rem',
        paddingRight: drawerOpened ? '26px' : '20px',
      }}
    />
  );
};