import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Story } from '../storyData';

export type BlogMoreStoriesCardProps = {
  id?: string;
  stories: Story[];
  insertAfterParagraph?: number;
  headingColor?: string;
  selectedTaxonomies?: Array<{ taxonomyName: string; taxonomyValue: string }>;
};

export const BlogMoreStoriesCard: React.FC<BlogMoreStoriesCardProps> = ({
  stories = [],
  insertAfterParagraph = 0,
  headingColor = '',
  selectedTaxonomies = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [isEditor, setIsEditor] = useState(false);

  useEffect(() => {
    // data-puck-component is the attribute Puck sets on component wrappers
    if (containerRef.current?.parentElement?.hasAttribute('data-puck-component')) {
      setIsEditor(true);
    }

    // If we're not injecting, just clear portal target
    if (insertAfterParagraph <= 0) {
      setPortalTarget(null);
      return;
    }

    const doc = containerRef.current?.ownerDocument || document;

    const checkTarget = () => {
      // Use querySelectorAll to find all matching injection points.
      const points = Array.from(doc.querySelectorAll(`.openPress-injection-point[data-index="${insertAfterParagraph}"]`));
      const targetElement = points.length > 0 ? points[points.length - 1] : null;

      setPortalTarget((prev) => {
        if (prev !== targetElement) return targetElement;
        return prev;
      });
    };

    checkTarget();
    const observer = new MutationObserver(() => checkTarget());
    observer.observe(doc.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [insertAfterParagraph, stories]);

  // Sync the placeholder's size and position to the portal target
  useEffect(() => {
    if (!portalTarget || !containerRef.current) return;

    const puckWrapper = containerRef.current.parentElement;
    const targetToStyle = puckWrapper || containerRef.current;

    // ONLY do this if we are inside the Puck Editor!
    if (!puckWrapper?.hasAttribute('data-puck-component')) {
      return;
    }

    const updatePosition = () => {
      if (portalTarget && portalTarget.firstElementChild) {
        const rect = portalTarget.getBoundingClientRect();

        // Find the nearest positioned ancestor (offsetParent)
        const offsetParent = targetToStyle.offsetParent as HTMLElement || portalTarget.ownerDocument.body;
        const parentRect = offsetParent.getBoundingClientRect();

        // Calculate exact coordinates relative to the offsetParent's top-left corner
        const top = rect.top - parentRect.top + offsetParent.scrollTop;
        const left = rect.left - parentRect.left + offsetParent.scrollLeft;

        targetToStyle.style.position = 'absolute';
        targetToStyle.style.top = `${top}px`;
        targetToStyle.style.left = `${left}px`;
        targetToStyle.style.width = `${rect.width}px`;
        targetToStyle.style.height = `${rect.height}px`;
        targetToStyle.style.zIndex = '50';
      }
    };

    updatePosition();
    const resizeObserver = new ResizeObserver(updatePosition);
    if (portalTarget.firstElementChild) {
      resizeObserver.observe(portalTarget.firstElementChild);
    }
    window.addEventListener('resize', updatePosition);
    portalTarget.ownerDocument.addEventListener('scroll', updatePosition, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePosition);
      portalTarget.ownerDocument.removeEventListener('scroll', updatePosition, true);

      // Cleanup styles so it returns to normal flow if portal is removed
      targetToStyle.style.position = '';
      targetToStyle.style.top = '';
      targetToStyle.style.left = '';
      targetToStyle.style.width = '';
      targetToStyle.style.height = '';
      targetToStyle.style.zIndex = '';
    };
  }, [portalTarget]);

  const widgetContent = (
    <div className="relative w-full my-8 clear-both font-sans">
      {/* Top Badge */}
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 -top-[14px] bg-white border text-black font-bold text-[12px] px-3 py-1 tracking-widest uppercase z-10"
        style={headingColor ? { borderColor: headingColor } : undefined}
      >
        More Reading
      </div>
      
      {/* Solid Border Container */}
      <div 
        className="border bg-white p-6 pt-8 flex flex-col gap-5 max-w-[800px] mx-auto"
        style={{ ...(headingColor ? { borderColor: headingColor } : {}), '--more-stories-accent': headingColor || '#9ca3af' } as React.CSSProperties}
      >
        {/* Active Taxonomies indicator in Editor mode */}
        {isEditor && selectedTaxonomies && selectedTaxonomies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center mb-2 pb-2 border-b border-gray-200">
            <span className="text-[11px] font-sans font-semibold text-gray-500 uppercase tracking-wider self-center mr-1">
              Active Filters:
            </span>
            {selectedTaxonomies.map((tax, i) => (
              <span
                key={`${tax.taxonomyName}-${tax.taxonomyValue}-${i}`}
                className="bg-green-50 text-green-700 border border-green-200 font-sans text-[11px] px-2 py-0.5 rounded-full"
              >
                {tax.taxonomyName}: {tax.taxonomyValue}
              </span>
            ))}
          </div>
        )}
        {stories.map((story, idx) => (
          <a
            key={story.id || idx}
            href={story.publishUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group block text-black hover:text-gray-600 underline decoration-gray-400 hover:decoration-[var(--more-stories-accent)] hover:decoration-2 underline-offset-4 transition-all"
          >
            <p className="text-[#222] text-[16px] md:text-[18px] leading-[1.6] inline">
              <strong className="font-bold text-black">{story.headline}</strong>
              {story.summary && (
                <span className="font-normal text-gray-800"> {story.summary}</span>
              )}
            </p>
          </a>
        ))}
        {stories.length === 0 && (
          <p className="font-sans text-gray-500 text-[14px]">
            No stories selected.
          </p>
        )}
      </div>
    </div>
  );

  // If we found a valid portal target for injection, use it. Otherwise, render inline.
  if (portalTarget) {
    const portaledContent = (
      <div
        onClick={(e) => {
          // Forward click to the hidden container so Puck selects this block in the editor
          e.stopPropagation();
          if (containerRef.current) {
            // Traverse up to find Puck's wrapper and click it, or just click the container
            containerRef.current.click();
            containerRef.current.parentElement?.click();
          }
        }}
        className="cursor-pointer transition-all hover:ring-2 hover:ring-blue-400 hover:ring-offset-2"
        title="Click to edit More Stories Widget"
      >
        {widgetContent}
      </div>
    );

    return (
      <div
        ref={containerRef}
        style={isEditor ? { width: '100%', height: '100%' } : { display: 'none' }}
        data-description={`More Stories injected after paragraph ${insertAfterParagraph}`}
      >
        {createPortal(portaledContent, portalTarget)}
      </div>
    );
  }

  // If insertAfterParagraph is 0 or target not found, show a prompt to the editor 
  // instead of rendering the widget at the bottom of the page.
  return (
    <div ref={containerRef} className="p-8 bg-blue-50/50 border-2 border-dashed border-blue-400 text-center text-blue-800 my-6 mx-auto max-w-[900px]">
      <h3 className="font-bold text-xl mb-2 font-share">More Stories Widget</h3>
      <p className="font-merriweather text-[16px]">
        Please set the <strong>Insert After Paragraph #</strong> in the right sidebar to place this widget inside the article text.
      </p>
    </div>
  );
};

export default BlogMoreStoriesCard;
