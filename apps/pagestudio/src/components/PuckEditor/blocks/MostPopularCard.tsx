import React, { useEffect, useRef, useState, useContext } from "react";
import type { Story } from "../storyData";
import { findStoryById } from "../storyData";
import { AutoCardAssignmentsContext } from "./AutoCardAssignmentsContext";
//import { registerOverlayPortal } from "@measured/puck";

export interface TableItemProps {
  number: number;
  text: string;
  storyId?: string;
  __automaticEmpty?: boolean;
}

interface MostPopularTableProps {
  id?: string;
  items?: TableItemProps[];
}

const TableItem: React.FC<TableItemProps> = ({ number, text, storyId, __automaticEmpty }) => {
  const [story, setStory] = useState<Story | null>(null);

  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (storyId) {
      const found = findStoryById(storyId);
      setStory(found || null);
    } else {
      setStory(null);
    }
  }, [storyId]);

  // ✅ Fix portal registration to run once
  // useEffect(() => {
  //   if (textRef.current) registerOverlayPortal(textRef.current);
  // }, []);



  const displayText = story?.headline || text;

  // Get publishUrl from story
  const publishUrl = story?.publishUrl;

  // Handle click to navigate
  const handleClick = () => {
    if (publishUrl) {
      window.open(publishUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (__automaticEmpty) return <div className="border-b border-r border-gray-300 min-h-[104px]" />;

  return (
    <div
      className={`border-b border-r border-gray-300 flex items-center gap-4 lg:gap-6 px-4 lg:px-6 py-5 min-h-[104px] lg:min-h-[120px] ${publishUrl ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
      onClick={handleClick}
      role={publishUrl ? "button" : undefined}
      tabIndex={publishUrl ? 0 : undefined}
      onKeyDown={(e) => {
        if (publishUrl && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="w-12 lg:w-16 flex-none text-center text-4xl lg:text-6xl font-bold text-black leading-none font-[Merriweather]">{number}</div>
      <p ref={textRef} className="min-w-0 flex-1 text-base lg:text-[20px] font-normal leading-snug font-lato line-clamp-3">{displayText}</p>
    </div>
  );
};


// Mobile card item component for responsive layout
const MobileTableItem: React.FC<TableItemProps> = ({ number, text, storyId, __automaticEmpty }) => {
  const [story, setStory] = useState<Story | null>(null);

  useEffect(() => {
    if (storyId) {
      const found = findStoryById(storyId);
      setStory(found || null);
    } else {
      setStory(null);
    }
  }, [storyId]);



  const displayText = story?.headline || text;
  const publishUrl = story?.publishUrl;

  const handleClick = () => {
    if (publishUrl) {
      window.open(publishUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (__automaticEmpty) return <div className="min-h-[2rem]" />;

  return (
    <div
      className={`border-b border-dotted border-gray-500 p-4 ${publishUrl ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
      onClick={handleClick}
      role={publishUrl ? "button" : undefined}
      tabIndex={publishUrl ? 0 : undefined}
      onKeyDown={(e) => {
        if (publishUrl && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 text-4xl font-bold text-black leading-none font-[Merriweather] pt-1">
          {number}
        </div>
        <div className="flex-1">
          <p className="text-[1.10rem] font-light leading-tight font-lato line-clamp-3">
            {displayText}
          </p>
        </div>
      </div>
    </div>
  );
};

const MostPopularTable: React.FC<MostPopularTableProps> = ({ id, items = [] }) => {
  const autoAssignments = useContext(AutoCardAssignmentsContext);
  const hasCardAssignment = Boolean(autoAssignments && id && Object.prototype.hasOwnProperty.call(autoAssignments.storyIdsByCardId, id));
  const assignedStoryIds = React.useMemo(
    () => hasCardAssignment && id ? autoAssignments?.storyIdsByCardId[id] ?? [] : null,
    [autoAssignments, hasCardAssignment, id]
  );

  const effectiveItems: TableItemProps[] = React.useMemo(() => {
    if (!hasCardAssignment) return items;

    if (items.length === 0) {
      return (assignedStoryIds ?? []).map((storyId, i) => ({
        number: i + 1,
        text: '',
        storyId,
        __automaticEmpty: false,
      }));
    }

    return items.map((item, i) => ({
      ...item,
      storyId: assignedStoryIds?.[i] ?? '',
      __automaticEmpty: !assignedStoryIds?.[i],
    }));
  }, [assignedStoryIds, hasCardAssignment, items]);

  const rows: TableItemProps[][] = [];
  for (let i = 0; i < effectiveItems.length; i += 2) rows.push(effectiveItems.slice(i, i + 2));

  return (
    <div className="w-full bg-white">
      {/* Desktop: two-column grid (hidden on mobile) */}
      <div className="mp-list hidden md:grid grid-cols-2 border-t border-l border-gray-300">
        {effectiveItems.map((item) => (
          <TableItem
            key={`item-${item.number}`}
            number={item.number}
            text={item.text}
            storyId={item.storyId}
            __automaticEmpty={item.__automaticEmpty}
          />
        ))}
        {effectiveItems.length % 2 === 1 && <div className="border-b border-r border-gray-300" />}
      </div>

      {/* Mobile: Stacked card layout (hidden on desktop) */}
      <div className="md:hidden border border-gray-300">
        {effectiveItems.map((item) => (
          <MobileTableItem
            key={`mobile-item-${item.number}`}
            number={item.number}
            text={item.text}
            storyId={item.storyId}
            __automaticEmpty={item.__automaticEmpty}
          />
        ))}
      </div>
    </div>
  );
};

export default MostPopularTable;
