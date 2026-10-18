// Home's "shared chrome" — the navbar, the footer, and any leaderboard ad
// placement sitting directly above or below the navbar — is the one part of the
// Home page that every other page inherits. Extracting it, comparing it and
// copying it onto another page's data all live here.
//
// This module is deliberately free of editor, React and network imports, and
// takes the placements registry as a plain argument instead of reading the
// module-level one in campaignData. Two very different callers need the exact
// same logic:
//
//   - the editor (syncNavbarLeaderboard.ts), which resolves placements from its
//     in-memory registry, and
//   - the backend republish-all worker, which runs this code in Node out of the
//     published-page renderer bundle and loads placements from DynamoDB.
//
// Any divergence between the two would silently strip or duplicate a real
// leaderboard on every page of the site, so there is only one copy.

export const NAVBAR_TYPE = 'AtlanticNavbar';
export const FOOTER_TYPE = 'Footer';
const LEADERBOARD_TYPE = 'leaderboard';

export type ChromeBlock = { type: string; props?: any };

export type ChromePageData = {
  root?: any;
  content?: unknown;
  zones?: Record<string, unknown>;
  [key: string]: any;
};

export type ChromePlacement = { name?: string; type?: string };

export type HomeChromeLayout = {
  above: ChromeBlock | null;
  navbar: ChromeBlock | null;
  below: ChromeBlock | null;
  footer: ChromeBlock | null;
};

// Editor bookkeeping and session-derived props that must never, on their own,
// make the chrome look "changed": Puck regenerates block/array ids on every
// hydration, and `injectFallbacks` attaches `fallbackBlock` to ad blocks from
// in-session refs that a hard refresh clears.
const VOLATILE_PROP_KEYS = new Set(['id', '_arrayId', 'puckId', 'fallbackBlock']);

// Order-independent, volatile-key-free deep copy. `JSON.stringify` is sensitive
// to key insertion order, and hydration (defaultProps merges, prop spreads in
// applyHomeChromeLayout) freely reorders keys, so the raw stringify of two
// identical layouts routinely differed.
export const canonicalize = (value: any): any => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    Object.keys(value)
      .filter((key) => !VOLATILE_PROP_KEYS.has(key) && value[key] !== undefined)
      .sort()
      .forEach((key) => {
        out[key] = canonicalize(value[key]);
      });
    return out;
  }
  // The backend round-trips an empty string as `null` (e.g. DynamoDB doesn't
  // store empty-string attributes), so a prop saved as '' comes back as null
  // on the very next load with no user edit involved. Both mean "unset" for
  // every prop here, so normalize them to the same value.
  if (value === '') return null;
  return value;
};

export const stableStringify = (value: any): string => JSON.stringify(canonicalize(value));

// Compact, storage-friendly digest of the signature (FNV-1a). The full
// signature JSON is far too long for a backend `title` field to be relied on.
export const hashSignature = (signature: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < signature.length; i += 1) {
    hash ^= signature.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a-${hash.toString(16)}-${signature.length}`;
};

const getContent = (data: ChromePageData | null | undefined): ChromeBlock[] | null => {
  const content = (data?.content as unknown) as ChromeBlock[] | undefined;
  return Array.isArray(content) ? content : null;
};

export const isLeaderboardAdBlock = (
  block: ChromeBlock | undefined | null,
  placements: ChromePlacement[]
): boolean => {
  if (!block || typeof block.type !== 'string') return false;
  // Static LeaderboardAd block (from CommonBlocksConfig)
  if (block.type === 'LeaderboardAd') return true;
  // Dynamic Ad_* blocks: check the placement type via the placements registry
  if (!block.type.startsWith('Ad_')) return false;
  const placementName = block.props?.placementName;
  if (!placementName) return false;
  const placement = placements.find((p) => p.name === placementName);
  return !!placement && (placement.type || '').toLowerCase() === LEADERBOARD_TYPE;
};

// True when the layout of `data` cannot be resolved without a placements
// registry: a dynamic `Ad_*` block sits next to the navbar, so whether it is a
// leaderboard (and therefore part of the shared chrome) is unknowable while the
// registry is empty. Callers must not compare or propagate such a layout — it
// would read as "no leaderboard next to the navbar" and strip a real one from
// every other page.
export const needsPlacementsRegistry = (data: ChromePageData | null | undefined): boolean => {
  const content = getContent(data);
  if (!content) return false;

  const navIdx = content.findIndex((b) => b?.type === NAVBAR_TYPE);
  if (navIdx === -1) return false;

  return [content[navIdx - 1], content[navIdx + 1]].some(
    (b) => typeof b?.type === 'string' && b.type.startsWith('Ad_')
  );
};

export const extractHomeChromeLayout = (
  data: ChromePageData | null | undefined,
  placements: ChromePlacement[]
): HomeChromeLayout | null => {
  const content = getContent(data);
  if (!content) return null;

  const navIdx = content.findIndex((b) => b?.type === NAVBAR_TYPE);
  const footerIdx = content.findIndex((b) => b?.type === FOOTER_TYPE);

  if (navIdx === -1) {
    return {
      above: null,
      navbar: null,
      below: null,
      footer: footerIdx === -1 ? null : content[footerIdx] || null,
    };
  }

  const navbar = content[navIdx] || null;
  const footer = footerIdx === -1 ? null : content[footerIdx] || null;
  const above =
    navIdx > 0 && isLeaderboardAdBlock(content[navIdx - 1], placements)
      ? content[navIdx - 1]
      : null;
  const below =
    navIdx < content.length - 1 && isLeaderboardAdBlock(content[navIdx + 1], placements)
      ? content[navIdx + 1]
      : null;
  return { above, navbar, below, footer };
};

export const getHomeChromeSignature = (
  homeData: ChromePageData | null | undefined,
  placements: ChromePlacement[]
): string | null => {
  const layout = extractHomeChromeLayout(homeData, placements);
  if (!layout) return null;

  const serializeBlock = (block: ChromeBlock | null) => {
    if (!block) return null;
    return {
      type: block.type,
      props: canonicalize(block.props ?? {}),
    };
  };

  // Include above/below leaderboard blocks in the signature so that adding,
  // removing, or changing an adjacent leaderboard ad also triggers bulk
  // republish of Section, Author, and Blog pages.
  const signaturePayload = {
    above: serializeBlock(layout.above),
    navbar: serializeBlock(layout.navbar),
    below: serializeBlock(layout.below),
    footer: serializeBlock(layout.footer),
  };

  return stableStringify(signaturePayload);
};

const mergePropsPreserveId = (target?: any, source?: any) => {
  const next = { ...(source || {}) };
  if (target?.id) {
    next.id = target.id;
  }
  return next;
};

export const applyHomeChromeLayout = <T extends ChromePageData>(
  data: T,
  layout: HomeChromeLayout,
  placements: ChromePlacement[]
): T => {
  const clone: T = JSON.parse(JSON.stringify(data));
  const content = (clone.content as unknown) as ChromeBlock[];
  if (!Array.isArray(content)) return clone;

  let navIdx = content.findIndex((b) => b?.type === NAVBAR_TYPE);

  if (layout.navbar) {
    if (navIdx === -1) {
      content.unshift(JSON.parse(JSON.stringify(layout.navbar)));
      navIdx = 0;
    } else {
      const existingNav = content[navIdx];
      content[navIdx] = {
        ...layout.navbar,
        props: mergePropsPreserveId(existingNav?.props, layout.navbar.props),
      };
    }
  } else if (navIdx !== -1) {
    if (navIdx > 0 && isLeaderboardAdBlock(content[navIdx - 1], placements)) {
      content.splice(navIdx - 1, 1);
      navIdx -= 1;
    }
    if (navIdx < content.length - 1 && isLeaderboardAdBlock(content[navIdx + 1], placements)) {
      content.splice(navIdx + 1, 1);
    }
    content.splice(navIdx, 1);
    navIdx = -1;
  }

  if (navIdx !== -1) {
    // Remove any existing leaderboard ads directly adjacent to the navbar so
    // the home page state becomes the source of truth.
    if (navIdx > 0 && isLeaderboardAdBlock(content[navIdx - 1], placements)) {
      content.splice(navIdx - 1, 1);
      navIdx -= 1;
    }
    if (navIdx < content.length - 1 && isLeaderboardAdBlock(content[navIdx + 1], placements)) {
      content.splice(navIdx + 1, 1);
    }

    if (layout.below) {
      content.splice(navIdx + 1, 0, JSON.parse(JSON.stringify(layout.below)));
    }
    if (layout.above) {
      content.splice(navIdx, 0, JSON.parse(JSON.stringify(layout.above)));
    }
  }

  if (layout.footer) {
    const footerIdx = content.findIndex((b) => b?.type === FOOTER_TYPE);
    if (footerIdx !== -1) {
      const existingFooter = content[footerIdx];
      content[footerIdx] = {
        ...layout.footer,
        props: mergePropsPreserveId(existingFooter?.props, layout.footer.props),
      };
    } else {
      content.push(JSON.parse(JSON.stringify(layout.footer)));
    }
  } else {
    const footerIdx = content.findIndex((b) => b?.type === FOOTER_TYPE);
    if (footerIdx !== -1) {
      content.splice(footerIdx, 1);
    }
  }

  return clone;
};

export const layoutsEqual = (
  current: HomeChromeLayout,
  target: HomeChromeLayout
): boolean => {
  const same = (a: ChromeBlock | null, b: ChromeBlock | null) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.type === b.type && a.props?.placementName === b.props?.placementName;
  };

  const navbarSame =
    (!current.navbar && !target.navbar) ||
    (!!current.navbar &&
      !!target.navbar &&
      current.navbar.type === target.navbar.type &&
      stableStringify(current.navbar.props ?? {}) ===
        stableStringify(target.navbar.props ?? {}));

  const footerSame =
    (!current.footer && !target.footer) ||
    (!!current.footer &&
      !!target.footer &&
      current.footer.type === target.footer.type &&
      stableStringify(current.footer.props ?? {}) ===
        stableStringify(target.footer.props ?? {}));

  return (
    same(current.above, target.above) &&
    same(current.below, target.below) &&
    navbarSame &&
    footerSame
  );
};

// A layout is only safe to act on when every slot holds either nothing or a
// real block, AND at least one slot holds a block. Used by the backend worker,
// which receives a layout over the wire: an all-empty one would read as "Home
// has no navbar and no footer" and strip both from every page on the site.
export const isUsableChromeLayout = (layout: unknown): layout is HomeChromeLayout => {
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return false;
  const candidate = layout as Record<string, unknown>;
  const slots = ['above', 'navbar', 'below', 'footer'];

  const shapeOk = slots.every((key) => {
    const value = candidate[key];
    if (value === null || value === undefined) return true;
    return typeof value === 'object' && typeof (value as any).type === 'string';
  });

  return shapeOk && slots.some((key) => !!candidate[key]);
};
