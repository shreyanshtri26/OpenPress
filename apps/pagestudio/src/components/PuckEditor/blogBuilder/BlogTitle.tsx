import React, { useRef, useEffect, useState } from "react";
import { registerOverlayPortal } from "@measured/puck";
import { findStoryById } from "../storyData"; // ✅ Add import
import { getAuthors, type Author } from "../authorData";

export type BlogTitleProps = {
  text?: string;
  author?: string;
  storyId?: string; // ✅ Add storyId
  authors?: Author[];
};

export const BlogTitle: React.FC<BlogTitleProps> = ({
  text = "Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat.",
  author = "AUTHOR NAME",
  storyId,
  authors: initialAuthors,
}) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const authorRef = useRef<HTMLSpanElement>(null);

  const [displayText, setDisplayText] = useState(text);
  const [displayAuthor, setDisplayAuthor] = useState(author);
  const [formattedDate, setFormattedDate] = useState('');
  const [authors, setAuthors] = useState<Author[]>(initialAuthors || []);

  useEffect(() => {
    if (!initialAuthors || initialAuthors.length === 0) {
      setAuthors(getAuthors());
    } else {
      setAuthors(initialAuthors);
    }
  }, [initialAuthors]);

  useEffect(() => {
    if (storyId) {
      const story = findStoryById(storyId);
      if (story) {

        const byLine = story?.byLine;
        const displayAuthor = (Array.isArray(byLine) && byLine.length > 0)
          ? byLine.join(", ")
          : (story?.author || "AUTHOR NAME");

        const displaySummary = story?.storySummary || "";
        const normalizedSummary = displaySummary
          .replace(/&nbsp;/g, ' ')
          .replace(/\u00A0/g, ' ');

        const publishDate = story?.publishDate || null;
        let formattedDate = "";
        if (publishDate) {
          try {
            const dateObj = new Date(publishDate);
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            }
          } catch (e) {
            // Ignore date parsing errors
          }
        }


        setDisplayText(normalizedSummary);
        setDisplayAuthor(displayAuthor);
        setFormattedDate(formattedDate);
      }
    } else {
      setDisplayText(text);
      setDisplayAuthor(author);
    }
  }, [storyId, text, author]); // ✅ Update when story changes

  useEffect(() => {
    if (textRef.current) registerOverlayPortal(textRef.current);
    if (authorRef.current) registerOverlayPortal(authorRef.current);
  }, []);

  const slugify = (value: string) => {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    if (storyId) {
      const story = findStoryById(storyId);
      if (story && (story.authorName || story.author)) {
        e.preventDefault();
        const name = story.authorName || story.author;
        const authorSlug = slugify(name);
        window.location.hash = `/authors/${authorSlug}`;
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <p
        ref={textRef}
        contentEditable
        suppressContentEditableWarning
        className="font-lato text-[24px] font-bold italic leading-snug text-black outline-none"
      >
        {displayText}
      </p>

      <div className="flex flex-col gap-1">
        <div className="w-28 border-t-[0.5px] border-black"></div>

        <span
          ref={authorRef}
          contentEditable
          suppressContentEditableWarning
          className="text-[12px] uppercase tracking-wide font-share text-black outline-none"
        >
          {(() => {
            if (storyId) {
              const story = findStoryById(storyId);
              const byLine = story?.byLine;
              if (Array.isArray(byLine) && byLine.length > 0) {
                return (
                  <span className="flex flex-wrap gap-x-1 underline">
                    {byLine.map((name, index) => {
                      const authorMatch = authors.find(a => a.name === name);
                      if (authorMatch) {
                        const authorSlug = slugify(name);
                        return (
                          <React.Fragment key={index}>
                            <a
                              href={`#/authors/${authorSlug}`}
                              className="underline cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                window.location.hash = `/authors/${authorSlug}`;
                              }}
                            >
                              {name}
                            </a>
                            {index < byLine.length - 1 ? ", " : ""}
                          </React.Fragment>
                        );
                      }
                      return <span key={index}>{name}{index < byLine.length - 1 ? ", " : ""}</span>;
                    })}
                  </span>
                );
              }
            }
            return (
              <span className="underline cursor-pointer" onClick={handleAuthorClick}>
                {displayAuthor}
              </span>
            );
          })()}
        </span>

        {formattedDate ? <span className="text-[11px] font-share text-black">{formattedDate}</span> : ""}
      </div>
    </div>
  );
}

export default BlogTitle;
