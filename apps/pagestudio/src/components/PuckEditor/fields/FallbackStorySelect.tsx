// FallbackStorySelect.tsx
// A custom Puck field that shows only the latest 5 published stories,
// filtered to exclude any story already selected as a fallback by a
// sibling placement-card in the SAME grid zone.

import { useMemo } from 'react';
import { createUsePuck } from '@measured/puck';
import { ChevronDown } from 'lucide-react';
import { getLatestStoryOptions } from '../storyData';

interface FallbackStorySelectProps {
  /** The currently selected storyId for THIS card */
  value: string;
  /** Called when the user picks a different story */
  onChange: (value: string) => void;
  /** Label shown above the dropdown (Puck doesn't auto-label 'custom' fields) */
  label?: string;
}

const usePuckSelector = createUsePuck();

export function FallbackStorySelect({ value, onChange, label }: FallbackStorySelectProps) {
  let data: any = null;
  let selectedItem: any = null;
  try {
    data = usePuckSelector((s) => s.appState.data);
    selectedItem = usePuckSelector((s) => s.selectedItem);
  } catch {
    // Outside <Puck> context (e.g., during <Render>/Preview mode)
  }

  const options = useMemo(() => {
    const latest5 = getLatestStoryOptions(5);
    const usedByOthers = new Set<string>();

    // `selectedItem` from usePuck() gives us the live props of the component
    // currently open in the sidebar panel.
    const currentProps = (selectedItem as any)?.props;

    /**
     * Scan a flat array of Puck blocks.
     * For every Ad placement that is NOT the currently-selected component,
     * record its fallbackStoryId as "taken".
     */
    const scanBlocks = (blocks: any[]) => {
      if (!Array.isArray(blocks)) return;
      blocks.forEach((block: any) => {
        // Skip non-ad blocks
        if (!isAdBlock(block)) return;

        // Skip the card that is currently open in the panel
        if (isSameComponent(block.props, currentProps)) return;

        const fid = block.props?.fallbackStoryId;
        if (fid && fid !== '') {
          usedByOthers.add(fid);
        }
      });
    };

    // ─── Walk zones to find the one that contains the selected component ───
    let scannedZone = false;
    if (data?.zones && currentProps) {
      for (const zoneKey of Object.keys(data.zones)) {
        const blocks: any[] = data.zones[zoneKey];
        if (!Array.isArray(blocks)) continue;

        // Does this zone contain the currently-selected component?
        const hasCurrentCard = blocks.some(
          (b: any) => isAdBlock(b) && isSameComponent(b.props, currentProps)
        );

        if (hasCurrentCard) {
          scanBlocks(blocks);
          scannedZone = true;
          break;
        }
      }
    }

    // If not found in any zone, fall back to scanning top-level content
    if (!scannedZone && data?.content) {
      scanBlocks(data.content);
    }

    const noneOption = { label: '— None —', value: '' };
    // Always keep the currently selected value visible so the UI doesn't go blank
    const filtered = latest5.filter(
      (opt) => opt.value === value || !usedByOthers.has(opt.value)
    );

    return [noneOption, ...filtered];
  }, [data, value, selectedItem]);

  // Matches Puck's own native field styling (AutoField/_Input) exactly, via
  // its CSS custom properties, so a custom field like this one looks
  // identical to the built-in fields (e.g. "Select Spotlight Campaign")
  // right above it.
  return (
    <div className="fallback-story-select">
      {label && (
        <span className="fallback-story-select__label">
          <span className="fallback-story-select__labelIcon">
            <ChevronDown size={16} />
          </span>
          {label}
        </span>
      )}
      <select
        className="fallback-story-select__input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <style>{`
        .fallback-story-select {
          display: flex;
          flex-direction: column;
        }
        .fallback-story-select__label {
          align-items: center;
          color: var(--puck-color-grey-04);
          display: flex;
          padding-bottom: 12px;
          font-size: var(--puck-font-size-xxs);
          font-weight: 600;
        }
        .fallback-story-select__labelIcon {
          color: var(--puck-color-grey-07);
          display: flex;
          margin-inline-end: 4px;
          padding-inline-start: 4px;
        }
        .fallback-story-select__input {
          appearance: none;
          background: var(--puck-color-white) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23c3c3c3'><polygon points='0,0 100,0 50,50'/></svg>") no-repeat;
          background-size: 12px;
          background-position: calc(100% - 12px) calc(50% + 3px);
          border-width: 1px;
          border-style: solid;
          border-color: var(--puck-color-grey-09);
          border-radius: 4px;
          box-sizing: border-box;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          padding: 12px 15px;
          transition: border-color 50ms ease-in;
          width: 100%;
          max-width: 100%;
        }
        .fallback-story-select__input:hover {
          background-color: var(--puck-color-azure-12);
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%235a5a5a'><polygon points='0,0 100,0 50,50'/></svg>");
          border-color: var(--puck-color-grey-05);
        }
        .fallback-story-select__input:focus {
          border-color: var(--puck-color-grey-05);
          outline: 2px solid var(--puck-color-azure-05);
        }
      `}</style>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isAdBlock(block: any): boolean {
  if (!block?.type) return false;
  return (
    block.type === 'LeaderboardAd' ||
    block.type === 'InStoryAd' ||
    block.type === 'SidebarAd' ||
    String(block.type).startsWith('Ad_')
  );
}

/**
 * Compares two Puck props objects to determine if they represent the same
 * component instance.
 *
 * Priority:
 *  1. Reference equality (same object in memory — gold standard)
 *  2. Explicit `id` field match (user-set Section ID)
 *  3. Heuristic: adId + placementName + fallbackStoryId all match
 */
function isSameComponent(a: any, b: any): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.id && b.id && a.id === b.id) return true;
  return (
    a.adId !== undefined &&
    a.adId === b.adId &&
    a.placementName === b.placementName &&
    a.fallbackStoryId === b.fallbackStoryId
  );
}
