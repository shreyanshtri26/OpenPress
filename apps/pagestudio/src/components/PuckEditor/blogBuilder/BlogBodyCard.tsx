import React, { useEffect, useState, useRef } from "react";
import { findStoryById, renderEditorJsBlocks } from "../storyData";
import { registerOverlayPortal } from "@measured/puck";

export type BlogBodyCardProps = {
  storyId?: string;
  bodyText?: string;
};

export const BlogBodyCard: React.FC<BlogBodyCardProps> = ({
  storyId,
  bodyText = `
Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat.
In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor.
Pulvinar vivamus fringilla lacus nec metus bibendum egestas.
`,
}) => {

  const bodyRef = useRef<HTMLDivElement>(null);

  const [displayText, setDisplayText] = useState(bodyText);

  useEffect(() => {
    let html = bodyText;

    if (storyId) {
      const story = findStoryById(storyId);

      // Priority: description.blocks (EditorJS) > fullDescription > bodyText
      if (story?.description?.blocks && story.description.blocks.length > 0) {
        // Use renderEditorJsBlocks to convert EditorJS blocks to HTML (including images)
        html = renderEditorJsBlocks(story.description.blocks);
      } else if (story?.fullDescription) {
        // Fallback to fullDescription
        html = story.fullDescription
          .replace(/\n{1,}/g, "<br/><br/>")
          .replace(/\n/g, "<br/>");
      }
    } else if (bodyText) {
      // Convert newlines → <br/>
      html = bodyText
        .replace(/\n{1,}/g, "<br/><br/>")
        .replace(/\n/g, "<br/>");
    }

    html = html
      .replace(/&nbsp;/g, ' ')
      .replace(/\u00A0/g, ' ');

    // Inject stable placeholder divs for widgets (like More Stories) to portal into
    let paragraphCount = 0;
    
    // Check if we have block-level HTML tags
    if (/<(p|figure|h[1-6]|div|ul|ol)\b/i.test(html)) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      Array.from(tempDiv.children).forEach((child) => {
        // Skip br tags or already injected points
        if (child.tagName.toLowerCase() === 'br' || child.classList.contains('openPress-injection-point')) return;
        
        paragraphCount++;
        const inj = document.createElement('div');
        inj.className = 'openPress-injection-point clear-both';
        inj.dataset.index = paragraphCount.toString();
        child.insertAdjacentElement('afterend', inj);
      });
      html = tempDiv.innerHTML;
    } else {
      // If no block tags, assume it's just raw text separated by double <br>s
      html = html.replace(/(<br\s*\/?>\s*<br\s*\/?>)/gi, (match) => {
        paragraphCount++;
        return `${match}<div class="openPress-injection-point clear-both" data-index="${paragraphCount}"></div>`;
      });
    }

    setDisplayText(html);
  }, [storyId, bodyText]);

  useEffect(() => {
    if (bodyRef.current) registerOverlayPortal(bodyRef.current);
  }, []);

  // 🐦 Twitter Hydration: Trigger X/Twitter widget loader when content changes
  useEffect(() => {
    const maybeLoadTwitter = () => {
      // @ts-ignore
      const twttr = window.twttr;
      if (twttr && twttr.widgets) {
        twttr.widgets.load(bodyRef.current);
      }
    };

    if (displayText.includes('twitter-') || displayText.includes('twitter.com')) {
      // Small delay to ensure DOM is updated before scanning
      const timeout = setTimeout(maybeLoadTwitter, 100);
      
      // Also try after a longer delay in case the script is still initializing
      const timeout2 = setTimeout(maybeLoadTwitter, 1000);
      
      return () => {
        clearTimeout(timeout);
        clearTimeout(timeout2);
      };
    }
  }, [displayText]);

  return (
    <div className="w-full max-w-[900px] mx-auto my-5">
      <style>{`
        .blog-body-content {
    max-width: 100%;
    overflow-wrap: break-word;
     white-space: normal;
  }

  .blog-body-content * {
    max-width: 100%;
    overflow-wrap: break-word;
   }
        .blog-body-content a {
          text-decoration: underline;
          color: inherit;
        }
        .blog-body-content a:hover {
          opacity: 0.8;
        }
        .blog-body-content a.no-underline {
          text-decoration: none;
        }
        .blog-body-content img {
          max-width: 100%;
          height: auto;
        }
        .blog-body-content p {
          /* Allow individual block margins to handle spacing */
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
          outline: none;
          user-select: text !important;
          -webkit-user-select: text !important;
          min-height: 1em;
        }
      `}</style>
      <div
        ref={bodyRef}
        contentEditable
        suppressContentEditableWarning
        className="blog-body-content text-[19px] !font-merriweather leading-[1.8rem] text-[#222] outline-none"
        dangerouslySetInnerHTML={{ __html: displayText }}
      />
    </div>
  );
};

export default BlogBodyCard;

