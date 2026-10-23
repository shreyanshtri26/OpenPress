import { renderCampaignAd } from "./renderAds";
import { renderSpotlightAd } from "./renderSpotlightAd";

const ComponentRegistry = {

  /* ------------------------------------------------
   * 1️⃣  NAVIGATION / HEADER
   * ------------------------------------------------*/
  AtlanticNavbar: (props) =>
    renderAtlanticNavbar(props),

  /* ------------------------------------------------
   * 2️⃣  GRID WRAPPER WITH ZONES
   * ------------------------------------------------*/
  BlogGrid: (props, zones, storiesById, ctx) =>
    renderBlogGrid(props, zones, storiesById, ctx),

  /* ------------------------------------------------
   * 3️⃣  STORY CARDS
   * ------------------------------------------------*/
  BlogPostCard: (props, zones, storiesById, ctx) => {
    // Load the REAL story from ctx (set by PublishDrawer/republishAll) or localStorage fallback
    let overrideStory = (ctx && ctx.currentStory && Object.keys(ctx.currentStory).length > 0)
      ? ctx.currentStory : null;
    if (!overrideStory) {
      try {
        if (typeof localStorage !== 'undefined') {
          const item = localStorage.getItem('currentStory');
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) overrideStory = parsed;
          }
        }
      } catch (e) { }
    }

    if (overrideStory) {
      // Use the story's OWN id as the map key so the lookup inside renderBlogPostCard always hits
      const storyId = overrideStory.id || overrideStory.storyId || props.storyId || 'current-story';
      const customStoriesMap = { [storyId]: overrideStory };
      return renderBlogPostCard({ ...props, storyId }, zones, customStoriesMap, ctx);
    }

    // No override — fall through to whatever storiesById the template had
    return renderBlogPostCard(props, zones, storiesById || {}, ctx);
  },

  BlogRecomCard: (props, zones, storiesById) =>
    renderBlogRecomCard(props, storiesById),

  BlogPostCardPreview: (props, zones, storiesById, ctx) =>
    renderBlogPostCard(props, zones, storiesById, ctx), // optional alias

  /* ------------------------------------------------
   * 4️⃣  HEADINGS
   * ------------------------------------------------*/
  BlogHeading: (props) =>
    renderBlogHeading(props),

  HeadingBlock: (props) =>
    renderBlogHeading(props), // alias if needed

  /* ------------------------------------------------
   * 5️⃣  POPULAR LISTS
   * ------------------------------------------------*/
  PopularBlogCard: (props, zones, storiesById) =>
    renderPopularBlogCard(props, storiesById),

  /* ------------------------------------------------
     * 6️⃣  SHOWCASE / FEATURED
     * ------------------------------------------------*/
  BlogShowcaseCard: (props, zones, storiesById) =>
    renderBlogShowcaseCard(props, storiesById),

  /* ------------------------------------------------
   * 7️⃣  SECTION COMPONENTS
   * ------------------------------------------------*/
  SectionGrid: (props, zones, storiesById, ctx) =>
    renderSectionGrid(props, zones, storiesById, ctx),

  SectionBottomCard: (props, zones, storiesById, ctx) =>
    renderSectionBottomGrid(props, zones, storiesById, ctx),

  Footer: (props) =>
    renderFooter(props),

  Border: (props) =>
    renderBorder({
      id: props.id,
      height: props.height,
      color: props.color,
    }),

  LeaderboardAd: (props, zones, storiesById, ctx) =>
    renderCampaignAd({ ...props, placementName: 'leaderboard', desktopDimensions: props.desktopDimensions || '728*90', mobileDimensions: props.mobileDimensions || '320*50' }, ctx),

  InStoryAd: (props, zones, storiesById, ctx) =>
    renderCampaignAd({ ...props, placementName: 'in_story', desktopDimensions: '300*250', mobileDimensions: '300*250' }, ctx),

  SidebarAd: (props, zones, storiesById, ctx) =>
    renderCampaignAd({ ...props, placementName: 'sidebar', desktopDimensions: '350*200', mobileDimensions: '350*200' }, ctx),

  SpotlightAd: (props, zones, storiesById, ctx) =>
    renderSpotlightAd(props, ctx),
};

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/**
 * Safely extracts plain text from a storySummary that may be
 * raw EditorJS JSON (e.g. `[{"type":"paragraph","data":{"text":"..."}}]`).
 */
function cleanTextSummary(input) {
  if (!input) return '';
  let str = typeof input === 'string' ? input.trim() : '';

  if (!str && typeof input === 'object') {
    const blocks = Array.isArray(input) ? input : input.blocks;
    if (Array.isArray(blocks)) {
      const p = blocks.find((b) => b?.type === 'paragraph' && (b?.data?.text || b?.text));
      if (p) str = p.data?.text || p.text || '';
    } else if (input.text) {
      str = input.text;
    }
  }

  if (str && (str.startsWith('[') || str.startsWith('{'))) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        const p = parsed.find((b) => b?.type === 'paragraph' && (b?.data?.text || b?.text));
        if (p) str = p.data?.text || p.text || '';
        else if (parsed[0]?.data?.text) str = parsed[0].data.text;
        else if (parsed[0]?.text) str = parsed[0].text;
        else str = ''; // was JSON but nothing extractable — don't show raw JSON
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.blocks)) {
          const p = parsed.blocks.find((b) => b?.type === 'paragraph' && (b?.data?.text || b?.text));
          if (p) str = p.data?.text || p.text || '';
        } else if (parsed.text) {
          str = parsed.text;
        }
      }
    } catch (e) {
      // Handle malformed/truncated JSON gracefully using regex fallback
      str = str
        .replace(/\\[?\\{"type":"[^"]+","data":\\{"text":"/g, '') // remove opening sequence
        .replace(/"\\}\\},?/g, ' ') // remove closing sequence
        .replace(/\\]$/, '') // remove trailing bracket
        .replace(/\\"/g, '"'); // unescape quotes
    }
  }

  return typeof str === 'string' ? str
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim() : '';
}

function extractSearchDescription(story) {
  return cleanTextSummary(
    story?.storySummary || story?.summary || story?.description?.blocks || story?.description || story?.fullDescription
  );
}

function extractFullSearchText(story) {
  let description = story?.description;
  if (typeof description === 'string') {
    try {
      const parsed = JSON.parse(description.trim());
      if (parsed && typeof parsed === 'object') description = parsed;
    } catch (e) { }
  }

  const blocks = Array.isArray(description) ? description : description?.blocks;
  if (Array.isArray(blocks)) {
    const blockText = blocks.map((block) => {
      if (!block || typeof block !== 'object') return '';
      const data = block.data || {};
      if (typeof data.text === 'string') return data.text;
      if (typeof data.caption === 'string') return data.caption;
      if (typeof data.content === 'string') return data.content;
      return typeof block.text === 'string' ? block.text : '';
    }).map((text) => text.trim()).filter(Boolean).join(' ');
    if (blockText) return blockText;
  }

  return firstString(typeof description === 'string' ? description : '', story?.fullDescription, story?.content);
}

function normalizeSearchStory(story) {
  const title = firstString(story?.title, story?.headline);
  const publishUrl = firstString(
    story?.publishUrl,
    story?.publishedUrl,
    story?.published_url,
    story?.redirectUrl,
    story?.['Published URL'],
    story?.['Published Url'],
    story?.slug ? (String(story.slug).startsWith('/') ? story.slug : `/${story.slug}`) : ''
  );

  if (!title || !publishUrl) return null;

  const description = extractSearchDescription(story);
  const fullText = extractFullSearchText(story);
  const apiReadTime = firstString(story?.readTime, story?.read_time, story?.READ_TIME);
  const words = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
  const minRead = apiReadTime || `${Math.max(1, Math.ceil(words / 220))} min read`;
  const dateValue = firstString(story?.date, story?.publishedAt, story?.createdAt);
  let dateStr = '';

  if (dateValue) {
    const date = new Date(dateValue);
    if (!Number.isNaN(date.getTime())) {
      dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  return {
    title,
    section: firstString(story?.section, story?.Section, story?.primarySection, story?.category, story?.Category),
    image: firstString(story?.featuredImage, story?.featureImg, story?.image, story?.thumbnail, story?.imageUrl, story?.socialImage),
    publishUrl,
    description,
    author: firstString(story?.authorName, story?.author_name, story?.byline, story?.Reporter, story?.author?.name, story?.author),
    dateStr,
    minRead,
  };
}

function serializeForInlineScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function renderAtlanticNavbar({
  id,
  sections = [],
  activeSection = 'HOME',
  logoUrl = '/openpress-logo-full-nobg-trim.png',
  showBanner = false,
  showSignIn = true,
  showSupportUs = false,
  showBecomeMember = true,
  showFacebookIcon = true,
  showLinkedInIcon = true,
  storiesById = {},
  bannerText = 'Our journalism is free. It needs your support. Consider becoming a member?',
  bannerBgColor = '#F1EDFF',
  bannerTextColor = '',
  supportUsText = 'SUPPORT US',
  supportUsBgColor = '',
  supportUsTextColor = '',
  signInText = 'SIGN IN',
  signInBgColor = '',
  signInTextColor = '',
  becomeMemberText = 'BECOME A MEMBER',
  becomeMemberBgColor = '',
  becomeMemberTextColor = '',
  themeColor = '#0057FF'
}) {
  const getContrastColor = (hexColor) => {
    if (!hexColor) return '#FFFFFF';
    const hex = hexColor.trim();
    if (!hex.startsWith('#')) return '#FFFFFF';
    let cleanHex = hex.slice(1);
    if (cleanHex.length === 3) cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
    if (cleanHex.length !== 6) return '#FFFFFF';
    const r = parseInt(cleanHex.slice(0, 2), 16), g = parseInt(cleanHex.slice(2, 4), 16), b = parseInt(cleanHex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#000000' : '#FFFFFF';
  };

  const resolvedTheme = themeColor || '#0057FF';
  const resolvedBannerBg = bannerBgColor || '#F1EDFF';
  const resolvedBannerText = bannerTextColor || getContrastColor(resolvedBannerBg);
  const resolvedSupportUsBg = supportUsBgColor || resolvedTheme;
  const resolvedSupportUsText = supportUsTextColor || getContrastColor(resolvedSupportUsBg);
  const resolvedSignInBg = signInBgColor || '#FFFFFF';
  const resolvedSignInText = signInTextColor || resolvedTheme;
  const resolvedBecomeMemberBg = becomeMemberBgColor || resolvedTheme;
  const resolvedBecomeMemberText = becomeMemberTextColor || getContrastColor(resolvedBecomeMemberBg);

  const backendApi = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_API) || '';

  const normalizedActiveSection = String(activeSection || 'HOME').trim().toUpperCase();
  const normalizedSections = sections.map((s) => s.trim().toUpperCase());

  // Pre-map storiesById into the lightweight shape the search overlay needs.
  const preloadedStories = Object.values(storiesById || {})
    .map(normalizeSearchStory)
    .filter(Boolean);
  const preloadedStoriesJson = serializeForInlineScript(preloadedStories);
  const mobileDrawerLoginHtml = serializeForInlineScript(
    `<button id="mobile-drawer-login-btn" onclick="closeMobileMenu(); openEpaperAuthModal();" type="button" class="font-share text-[10px] tracking-wider px-2.5 py-1 transition-colors uppercase font-bold rounded cursor-pointer" style="background-color: ${resolvedSignInBg}; color: ${resolvedSignInText};">${signInText}</button>`
  );

  // Get first 3 sections for top nav; remaining sections go into the hamburger
  const topSections = normalizedSections.slice(0, 3);
  const overflowSections = normalizedSections.slice(3);
  const showHamburger = normalizedSections.length > 3;

  const renderNavButton = (label) => {
    const isActive = normalizedActiveSection === label;
    const slug = label === 'HOME' ? '' : label.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    return `
      <button
        onclick="handleNavClick('${label}', '${slug}')"
        class="nav-btn relative flex items-center justify-center px-1 lg:px-2 h-[64px] sm:h-[96px] lg:h-[130px] transition-all duration-300 whitespace-nowrap ${isActive ? 'text-black' : 'hover:text-black'}"
        data-section="${label}"
      >
        <span class="nav-box absolute capitalize top-[-10px] h-[60px] lg:h-[80px] inset-x-0 border-2 border-t-0 border-black bg-white transition-all duration-300" style="z-index: 0; display: ${isActive ? 'block' : 'none'};"></span>
        <span class="relative z-10">${label.toUpperCase()}</span>
      </button>
    `;
  };

  const renderMobileMenuItem = (label) => {
    const isActive = normalizedActiveSection === label;
    const slug = label === 'HOME' ? '' : label.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `
      <button
        onclick="closeMobileMenu(); handleNavClick('${label}', '${slug}')"
        data-section="${label}"
        class="text-left py-3 px-4 font-share uppercase transition-colors shrink-0 ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}"
      >
        ${label}
      </button>
    `;
  };

  const renderDesktopMenuItem = (label) => {
    const isActive = normalizedActiveSection === label;
    const slug = label.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `
      <button
        onclick="closeDesktopMenu(); handleNavClick('${label}', '${slug}')"
        data-section="${label}"
        class="p-3 text-[0.9rem] font-share uppercase text-black transition-colors ${isActive ? 'font-bold bg-gray-100' : 'hover:bg-gray-50'}"
      >
        ${label}
      </button>
    `;
  };

  return `
  <!-- Top Banner -->
  ${showBanner ? `
  <div
    id="navbar-top-banner"
      class="relative z-[49] w-full flex items-center justify-between px-4 sm:px-6 lg:px-[8%] transition-all duration-300"
    style="background-color: ${resolvedBannerBg}; color: ${resolvedBannerText}; margin-top: 10px; height: auto; min-height: 48px; opacity: 1; padding-top: 12px; padding-bottom: 12px; pointer-events: auto;"
  >
    <div class="mx-auto w-full flex flex-wrap sm:flex-nowrap items-center justify-between font-share text-xs tracking-wider uppercase gap-y-2 sm:gap-y-0">
      <!-- Center: Banner Text -->
      <div class="hidden sm:block sm:w-auto sm:flex-initial sm:pl-4 text-left italic font-merriweather font-semibold text-[16px] sm:text-sm normal-case px-2 order-1 sm:order-2">
        ${bannerText}
      </div>

      <!-- Left: SUPPORT US -->
      <div class="w-1/2 sm:w-auto sm:flex-initial flex justify-start order-2 sm:order-1">
        ${showSupportUs ? '<a href="/support-us" class="font-share text-[13px] sm:text-sm lg:text-base px-4 py-1.5 sm:py-2 font-bold transition-all duration-200 whitespace-nowrap inline-flex items-center justify-center text-center leading-none" style="background-color: ' + resolvedSupportUsBg + '; color: ' + resolvedSupportUsText + ';">' + supportUsText + '</a>' : ''}
      </div>

      <!-- Right: SIGN IN -->
      <div class="w-1/2 sm:w-auto sm:flex-initial sm:ml-auto flex justify-end order-4 sm:order-3">
        ${showSignIn ? '<button id="banner-login-btn" onclick="openEpaperAuthModal()" type="button" class="font-share text-[13px] sm:text-sm lg:text-base px-4 py-1.5 sm:py-2 font-bold transition-all duration-200 whitespace-nowrap inline-flex items-center justify-center text-center leading-none rounded-full cursor-pointer shadow-sm hover:opacity-90" style="display: none; background-color: ' + resolvedSignInBg + '; color: ' + resolvedSignInText + ';">' + signInText + '</button>' : ''}
      </div>
    </div>
  </div>
  ` : ''}

<header id="${id ?? ''}" class="top-0 z-50 w-full bg-white relative lg:sticky transition-all duration-300">

  <!-- Store flags for JS -->
  <script>window.currentActiveSection = '${normalizedActiveSection}'; window.showSignIn = ${showSignIn}; window.showSupportUs = ${showSupportUs}; window.showFacebookIcon = ${showFacebookIcon}; window.showLinkedInIcon = ${showLinkedInIcon}; window.__openPress_API__ = '${backendApi}';</script>

  <!-- Decorative lines -->
  <div class="absolute top-[50px] sm:top-[65px] lg:top-[100px] left-0 w-[40%] sm:w-[47%] lg:w-[42%] h-[2px] bg-black transition-opacity duration-300 navbar-dec-line"></div>
  <div class="absolute top-[50px] sm:top-[65px] lg:top-[100px] right-0 w-[40%] sm:w-[38%] lg:w-[42%] h-[2px] bg-black transition-opacity duration-300 navbar-dec-line"></div>

  <!-- Top row -->
  <div id="navbar-top-row" class="mx-auto lg:mx-28 flex items-center w-full px-4 sm:px-6 lg:w-[84%] lg:px-0 pt-2 pb-4 transition-all duration-300 relative">

    <!-- Mobile menu + social icons for mobile -->
    <div class="absolute left-4 top-[29px] -translate-y-1/2 sm:relative sm:left-auto sm:top-auto sm:translate-y-0 sm:mt-0 flex sm:hidden justify-start items-center gap-2 z-10">
      <button onclick="toggleMobileMenu()" class="p-1 text-black" aria-label="Toggle menu">
        <svg
          class="w-10 h-10"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="14" y1="20" x2="50" y2="20" stroke="black" stroke-width="3.5" stroke-linecap="round" />
          <line x1="14" y1="32" x2="50" y2="32" stroke="black" stroke-width="3.5" stroke-linecap="round" />
          <line x1="14" y1="44" x2="50" y2="44" stroke="black" stroke-width="3.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- Desktop nav -->
    <div class="hidden sm:flex flex-1 justify-start items-center gap-4">
      <nav class="flex flex-1 items-center gap-1 text-sm lg:text-[1rem] font-share uppercase text-black">
        ${renderNavButton('HOME')}
        ${topSections.map(renderNavButton).join('')}

  <!-- Desktop hamburger icon - only show if more than 3 sections -->
        ${showHamburger ? `
        <button
          onclick="toggleDesktopMenu()"
          id="desktop-hamburger-btn"
          class="relative flex flex-col items-center justify-center h-[64px] sm:h-[96px] lg:h-[130px] gap-1.5 transition-all duration-300 hover:opacity-70 translate-x-4"
          aria-label="Toggle menu"
        >
          <span id="hamburger-line-1" class="w-6 h-0.5 bg-black transition-all duration-200"></span>
          <span id="hamburger-line-2" class="w-6 h-0.5 bg-black transition-all duration-200"></span>
          <span id="hamburger-line-3" class="w-6 h-0.5 bg-black transition-all duration-200"></span>
        </button>
        ` : ''}
        <!-- Search icon – desktop left side -->
        <button
          onclick="toggleSearch()"
          id="navbar-search-btn"
          aria-label="Search"
          class="relative flex items-center justify-center h-[64px] sm:h-[96px] lg:h-[130px] px-1 lg:px-2 text-black hover:opacity-70 transition-opacity ${showHamburger ? 'translate-x-8' : 'translate-x-4'}"
        >
          <svg class="w-[18px] h-[18px] lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </button>
      </nav>
    </div>

    <!-- Logo -->
    <div class="flex justify-center flex-1 items-center overflow-visible">
      <div id="navbar-logo-container" onclick="handleNavClick('HOME', '')" class="cursor-pointer flex items-center justify-center relative w-[150px] sm:w-[180px] lg:w-[200px] h-[64px] sm:h-[96px] lg:h-[130px] transition-all duration-300 ease-in-out">
        <!-- Single logo: mark + wordmark are clipped copies of the logo that re-arrange on scroll -->
        <img
          id="navbar-logo-mark"
          src="${logoUrl}"
          onerror="this.onerror=null; (function(img){ const h = window.location.hostname; let o = window.location.origin; img.src = o + '/openpress-logo-full-nobg-trim.png'; })(this);"
          alt="OpenPress Logo"
          class="h-[60px] sm:h-[80px] lg:h-[100px] w-auto object-contain scale-125 translate-y-[-10px] sm:translate-y-[0px] lg:translate-y-[15px] absolute"
          style="transform-origin: center; clip-path: inset(0 0 26.9% 0);"
        />
        <img
          id="navbar-logo-word"
          src="${logoUrl}"
          onerror="this.onerror=null; (function(img){ const h = window.location.hostname; let o = window.location.origin; img.src = o + '/openpress-logo-full-nobg-trim.png'; })(this);"
          alt=""
          aria-hidden="true"
          class="h-[60px] sm:h-[80px] lg:h-[100px] w-auto object-contain scale-125 translate-y-[-10px] sm:translate-y-[0px] lg:translate-y-[15px] absolute"
          style="transform-origin: center; clip-path: inset(73.1% 0 0 0);"
        />
      </div>
    </div>

    <!-- Right side: Social icons + Sign In / My Account + Support Us -->
    <div class="absolute right-4 top-[25px] -translate-y-1/2 sm:relative sm:right-auto sm:top-auto sm:translate-y-0 sm:mt-0 flex sm:flex-1 items-center justify-end gap-1.5 sm:gap-3 text-sm lg:text-[1rem] text-slate-900">


      <!-- Social Icons (desktop) -->
      ${showFacebookIcon || showLinkedInIcon ? `
      <div id="navbar-social-icons" class="hidden sm:flex items-center gap-2">
        ${showFacebookIcon ? `
        <a
          href="https://www.facebook.com/shreyanshtri26"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          class="flex items-center justify-center w-6 h-6 text-black hover:opacity-70 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9c1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12c0-5.5-4.5-10-10-10z"/></svg>
        </a>
        ` : ''}
        ${showLinkedInIcon ? `
        <a
          href="https://www.linkedin.com/in/shreyanshtri26"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          class="flex items-center justify-center w-6 h-6 text-black hover:opacity-70 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6" fill="currentColor" aria-hidden="true"><path d="M19.7,3H4.3C3.582,3,3,3.582,3,4.3v15.4C3,20.418,3.582,21,4.3,21h15.4c0.718,0,1.3-0.582,1.3-1.3V4.3C21,3.582,20.418,3,19.7,3z M8.339,18.338H5.667v-8.59h2.672V18.338z M7.004,8.574c-0.857,0-1.549-0.694-1.549-1.548c0-0.855,0.691-1.548,1.549-1.548c0.854,0,1.547,0.694,1.547,1.548C8.551,7.881,7.858,8.574,7.004,8.574z M18.339,18.338h-2.669v-4.177c0-0.996-0.017-2.278-1.387-2.278c-1.389,0-1.601,1.086-1.601,2.206v4.249h-2.667v-8.59h2.559v1.174h0.037c0.356-0.675,1.227-1.387,2.526-1.387c2.703,0,3.203,1.779,3.203,4.092V18.338z"/></svg>
        </a>
        ` : ''}
      </div>
      ` : ''}

      <!-- Sign In / My Account (hidden by default; shown by JS if showSignIn + correct domain) -->
      <div id="auth-container" class="relative z-10 flex items-center gap-2" style="display: none;">
        <button
          id="login-btn"
          onclick="openEpaperAuthModal()"
          type="button"
          class="font-share text-[13px] sm:text-sm lg:text-base px-4 py-1.5 sm:py-2 font-bold transition-colors whitespace-nowrap inline-flex items-center justify-center text-center leading-none rounded-full cursor-pointer shadow-sm hover:opacity-90"
          style="display: none; background-color: ${resolvedSignInBg}; color: ${resolvedSignInText};"
        >
          ${signInText}
        </button>
        <div id="account-dropdown-container" class="relative" style="display: none;">
          <button
            onclick="toggleAccountDropdown(event)"
            id="account-dropdown-btn"
            class="flex items-center gap-2 px-3 py-2 font-share text-black text-xs sm:text-sm lg:text-[1rem] hover:opacity-70 transition-opacity whitespace-nowrap cursor-pointer"
          >
            <img id="user-picture" src="" alt="" class="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border border-black hidden" />
            <div id="user-initial" class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">?</div>
            <svg
              id="account-chevron"
              class="w-4 h-4 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div id="account-dropdown-menu" class="hidden absolute right-0 mt-1 w-56 bg-white border border-neutral-300 shadow-xl rounded-xl overflow-hidden z-[60]">
            <div class="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <div id="user-display-name" class="font-bold text-xs uppercase tracking-wider text-neutral-900 font-share truncate">ePaper Reader</div>
              <div id="user-display-email" class="text-[11px] text-neutral-500 truncate mt-0.5">reader@openpress.com</div>
              <div class="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                ePaper Subscriber
              </div>
            </div>
            <div class="py-1">
              <button
                onclick="handleLogout()"
                class="flex items-center w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 font-share font-semibold uppercase text-left transition-colors cursor-pointer"
              >
                <svg class="w-4 h-4 mr-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      ${showBecomeMember ? `
      <a
        id="navbar-support-btn"
        href="/support-us"
        class="font-share text-[13px] sm:text-sm lg:text-base px-4 py-1.5 sm:py-2 font-bold transition-colors whitespace-nowrap hidden sm:inline-flex items-center justify-center text-center leading-none"
        style="background-color: ${resolvedBecomeMemberBg}; color: ${resolvedBecomeMemberText};"
      >
        ${becomeMemberText}
      </a>
      ` : ''}
    </div>

  </div>

  <!-- Mobile menu drawer -->
  <div id="mobile-menu-overlay" class="sm:hidden fixed inset-0 z-50 flex justify-end transition-opacity duration-300 opacity-0 pointer-events-none">
    <div class="absolute inset-0 bg-black/50" onclick="closeMobileMenu()"></div>
    <div id="mobile-menu-drawer" class="relative w-[75%] max-w-sm bg-white h-full shadow-xl flex flex-col transition-transform duration-300 translate-x-full">
      <!-- Header section (Black background) -->
      <div class="bg-black text-white px-4 pt-4 pb-3 flex flex-col gap-3 shrink-0">
        <!-- Top row -->
        <div class="flex items-center justify-between h-[40px]">
          <!-- Close Button on Left -->
          <button onclick="closeMobileMenu()" class="p-1 -ml-1 text-white hover:bg-neutral-800 rounded-full transition-colors animate-none" aria-label="Close menu">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Brand logo in Center -->
          <img
            src="/openpress-logo-full-nobg-trim.png"
            alt="OpenPress"
            class="h-12 w-auto max-w-[150px] object-contain select-none brightness-0 invert"
          />

          <!-- Right: SIGN IN button -->
          <div id="drawer-avatar-container" class="flex items-center justify-end">
            ${showSignIn ? `
            <button
              id="mobile-drawer-login-btn"
              onclick="closeMobileMenu(); openEpaperAuthModal();"
              type="button"
              class="font-share text-[10px] tracking-wider px-2.5 py-1 transition-colors uppercase font-bold rounded cursor-pointer"
              style="display: none; background-color: ${resolvedSignInBg}; color: ${resolvedSignInText};"
            >
              ${signInText}
            </button>
            ` : ''}
          </div>
        </div>

        <!-- Search Input Box -->
        <div id="drawer-search-container" class="relative flex items-center bg-neutral-800 text-neutral-450 rounded-none px-4 py-2 text-sm transition-all duration-200 border border-transparent">
          <svg id="drawer-search-icon" class="w-4 h-4 mr-2.5 text-neutral-450 flex-shrink-0 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="drawer-search-input"
            type="text"
            oninput="handleDrawerSearch(this.value)"
            placeholder="Search stories..."
            class="w-full bg-transparent outline-none text-white text-sm placeholder-neutral-400 transition-colors duration-200"
          />
          <button
            id="drawer-search-clear-btn"
            onclick="clearDrawerSearch()"
            style="display: none;"
            class="text-neutral-450 hover:text-white transition-colors duration-200"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div id="drawer-nav-container" class="flex-1 flex flex-col min-h-0">
        <nav id="drawer-nav-links" class="flex flex-col p-4 gap-2 overflow-y-auto flex-1 h-full">
          <!-- Reader Profile Card in Mobile Drawer -->
          <div id="drawer-reader-card" class="hidden p-3.5 mb-2 bg-neutral-50 rounded-xl border border-neutral-200 shrink-0">
            <div class="flex items-center gap-3">
              <div id="drawer-reader-initial" class="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm shrink-0">?</div>
              <img id="drawer-reader-picture" class="w-10 h-10 rounded-full object-cover hidden shrink-0 border border-neutral-300" src="" alt="" />
              <div class="flex-1 min-w-0">
                <div id="drawer-reader-name" class="font-bold text-sm text-neutral-900 truncate">ePaper Reader</div>
                <div id="drawer-reader-email" class="text-xs text-neutral-500 truncate"></div>
                <span class="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">Subscriber</span>
              </div>
            </div>
            <button onclick="closeMobileMenu(); handleLogout();" type="button" class="mt-3 w-full py-2 px-3 text-xs font-semibold text-red-600 bg-white border border-neutral-300 rounded-lg hover:bg-red-50 text-center transition cursor-pointer">
              Sign Out
            </button>
          </div>

          ${renderMobileMenuItem('HOME')}
          ${normalizedSections.map(renderMobileMenuItem).join('')}
          ${showBecomeMember ? `
          <a
            href="/support-us"
            class="mt-4 text-center font-share text-sm px-4 py-3 transition-colors whitespace-nowrap block"
            style="background-color: ${resolvedBecomeMemberBg}; color: ${resolvedBecomeMemberText};"
          >
            ${becomeMemberText}
          </a>
          ` : ''}
        </nav>
        <div id="drawer-search-results" class="hidden flex flex-col p-4 gap-2 overflow-y-auto flex-1 h-full"></div>
      </div>
      <!-- Social icons in mobile menu footer -->
      ${showFacebookIcon || showLinkedInIcon ? `
      <div class="flex items-center gap-3 px-4 py-4 border-t border-gray-100">
        ${showFacebookIcon ? `
        <a
          href="https://www.facebook.com/shreyanshtri26"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          class="flex items-center justify-center w-6 h-6 text-black hover:opacity-70 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9c1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12c0-5.5-4.5-10-10-10z"/></svg>
        </a>
        ` : ''}
        ${showLinkedInIcon ? `
        <a
          href="https://www.linkedin.com/in/shreyanshtri26"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          class="flex items-center justify-center w-6 h-6 text-black hover:opacity-70 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6" fill="currentColor" aria-hidden="true"><path d="M19.7,3H4.3C3.582,3,3,3.582,3,4.3v15.4C3,20.418,3.582,21,4.3,21h15.4c0.718,0,1.3-0.582,1.3-1.3V4.3C21,3.582,20.418,3,19.7,3z M8.339,18.338H5.667v-8.59h2.672V18.338z M7.004,8.574c-0.857,0-1.549-0.694-1.549-1.548c0-0.855,0.691-1.548,1.549-1.548c0.854,0,1.547,0.694,1.547,1.548C8.551,7.881,7.858,8.574,7.004,8.574z M18.339,18.338h-2.669v-4.177c0-0.996-0.017-2.278-1.387-2.278c-1.389,0-1.601,1.086-1.601,2.206v4.249h-2.667v-8.59h2.559v1.174h0.037c0.356-0.675,1.227-1.387,2.526-1.387c2.703,0,3.203,1.779,3.203,4.092V18.338z"/></svg>
        </a>
        ` : ''}
      </div>
      ` : ''}
    </div>
  </div>

  <!-- Desktop Hamburger Menu dropdown -->
  ${showHamburger ? `
  <div id="desktop-hamburger-menu" class="hidden absolute top-full left-0 w-full bg-white z-50 shadow-lg border-t">
    <div class="mx-auto w-[84%] py-6">
      <div class="grid grid-cols-5 gap-4">
        ${overflowSections.map(renderDesktopMenuItem).join('')}
      </div>
    </div>
  </div>
  ` : ''}
</header>

  <!-- Search overlay (outside <header> to avoid stacking context conflicts) -->
  <div id="search-overlay" class="hidden fixed inset-0 z-[200] flex flex-col bg-white" style="height:100dvh">
    <!-- Top bar with input - Black & White theme -->
    <div class="border-b border-neutral-800 bg-black shadow-sm flex-shrink-0 py-3 sm:py-4">
      <div class="mx-auto w-full max-w-5xl px-4 sm:px-6 flex items-center gap-3">
        <svg class="w-5 h-5 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          id="search-input"
          type="text"
          inputmode="search"
          enterkeyhint="search"
          placeholder="Search stories…"
          oninput="handleSearchInput(this.value)"
          autocomplete="off"
          style="font-size:16px"
          class="flex-1 outline-none text-base sm:text-xl font-merriweather text-white bg-transparent placeholder-neutral-500"
        />
        <button
          id="search-clear-btn"
          onclick="clearSearchInput()"
          aria-label="Clear search"
          style="display: none;"
          class="flex-shrink-0 flex items-center justify-center w-8 h-8 text-white hover:text-neutral-300 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <button
          onclick="closeSearch()"
          aria-label="Close search"
          class="flex-shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] text-xs font-merriweather uppercase text-white hover:text-neutral-300 transition-colors"
        >
          CLOSE
        </button>
      </div>
    </div>
    <!-- Results area -->
    <div class="flex-1 overflow-y-auto overscroll-contain" style="-webkit-overflow-scrolling:touch">
      <div class="mx-auto w-full max-w-5xl px-4 sm:px-6 py-5">
        <div id="search-results">
          <!-- Pulse skeleton cards while background fetch resolves to avoid layout flash / false "no results" state -->
          <div class="flex flex-col animate-pulse divide-y divide-gray-200">
            ${Array(6).fill(
    `<div class="flex flex-col md:flex-row gap-4 sm:gap-6 py-6">
                <div class="w-full md:w-1/3 aspect-[16/10] bg-neutral-200 rounded-sm flex-shrink-0"></div>
                <div class="flex-1 flex flex-col justify-start py-1">
                  <div class="h-6 bg-neutral-200 rounded w-3/4 mb-3"></div>
                  <div class="h-6 bg-neutral-200 rounded w-1/2 mb-6"></div>
                  <div class="h-4 bg-neutral-200 rounded w-full mb-2"></div>
                  <div class="h-4 bg-neutral-200 rounded w-5/6 mb-4"></div>
                  <div class="h-4 bg-neutral-200 rounded w-1/4 mt-auto"></div>
                </div>
              </div>`
  ).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>

<style>
  /* Disable Tailwind transition-all via stylesheet — JS also sets inline
     transition:none!important on each element at init for guaranteed override */
  #navbar-logo-mark, #navbar-logo-word, #navbar-logo-container,
  #navbar-social-icons, #auth-container, #navbar-support-btn,
  .navbar-dec-line, .nav-btn, .nav-box,
  #navbar-top-row, #desktop-hamburger-btn, #navbar-search-btn { transition: none !important; }

  #navbar-logo-mark, #navbar-logo-word { will-change: transform; }

  /* Header resizes with scroll; anchoring would feed that back into scrollY and jitter */
  @media (min-width: 1024px) { html { overflow-anchor: none; } }
</style>

<!-- Direct redirect to /login on Sign In; no modal popup needed -->

<script>
  (function() {
    let isMobileMenuOpen = false;
    let isDesktopMenuOpen = false;
    let isAccountDropdownOpen = false;
    let isSearchOpen = false;
    let isDrawerSearchActive = false;
    let activeSection = (window.currentActiveSection || 'HOME').trim().toUpperCase();
    let _navRawT       = 0;
    let _navAnimRAF    = null;
    let _navStopTimer  = null;
    let _navLastTarget = 0; /* tracks last committed state for hysteresis */
    let visibleCount = 10;
    let lastSearchQuery = '';
    let drawerVisibleCount = 10;
    let lastDrawerQuery = '';
    let hasLoadedSearchStories = false;
    const mobileDrawerLoginHtml = ${mobileDrawerLoginHtml};
    let _searchStories = (function() {
      /* Pre-populated at render time from storiesById — no API call needed. */
      var pre = ${preloadedStoriesJson};
      if (pre && pre.length > 0) hasLoadedSearchStories = true;
      return pre.length > 0 ? pre : null; /* null triggers the API fallback */
    })();

    // ── IMMEDIATE (parse-time, before DOMContentLoaded): Kill all CSS
    // transitions and set the correct visual state right away.  This prevents
    // a flash of the expanded navbar when the browser restores scroll position
    // (e.g. back-navigation) before DOMContentLoaded fires.
    _initNavTransitions();
    if (window.innerWidth >= 1024 && (window.scrollY || 0) > 0) {
      _navRawT = Math.min(1, Math.max(0, ((window.scrollY || 0) - 20) / 160));
      _setNavVisual(_easeInOut(_navRawT));
    }

    // ── SEARCH ──────────────────────────────────────────────────────────────
    window.toggleSearch = function() {
      if (isSearchOpen) { window.closeSearch(); } else { window.openSearch(); }
    };

    window.openSearch = function() {
      isSearchOpen = true;
      var overlay = document.getElementById('search-overlay');
      if (overlay) {
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        window.handleSearchInput('');
        // Delay focus slightly so iOS has time to render the overlay first
        setTimeout(function() {
          var input = document.getElementById('search-input');
          if (input) { input.value = ''; input.focus(); }
        }, 50);
      }
    };

    window.closeSearch = function() {
      isSearchOpen = false;
      var overlay = document.getElementById('search-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
        if (!isMobileMenuOpen) document.body.style.overflow = '';
      }
    };

    window.clearSearchInput = function() {
      var input = document.getElementById('search-input');
      if (input) {
        input.value = '';
        input.focus();
      }
      window.handleSearchInput('');
    };

    window.handleDrawerSearch = function(query) {
      var linksEl = document.getElementById('drawer-nav-links');
      var resultsEl = document.getElementById('drawer-search-results');
      if (!linksEl || !resultsEl) return;

      var q = (query || '').toLowerCase().trim();
      var active = !!isDrawerSearchActive;

      var clearBtn = document.getElementById('drawer-search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = (q || active) ? 'block' : 'none';
      }

      if (!q && !active) {
        resultsEl.classList.add('hidden');
        linksEl.classList.remove('hidden');
        return;
      }

      resultsEl.classList.remove('hidden');
      linksEl.classList.add('hidden');

      if (q !== lastDrawerQuery) {
        drawerVisibleCount = 10;
        lastDrawerQuery = q;
      }

      var stories = _searchStories || [];
      var filtered = q ? stories.filter(function(s) {
        return (s.title && s.title.toLowerCase().indexOf(q) !== -1) ||
               (s.section && s.section.toLowerCase().indexOf(q) !== -1);
      }) : stories;

      var headerText = q ? (filtered.length + ' result' + (filtered.length !== 1 ? 's' : '')) : 'LATEST STORIES';

      if (filtered.length === 0) {
        resultsEl.innerHTML = '<div class="p-4 text-center text-gray-500 font-merriweather text-sm">No stories found.</div>';
        return;
      }

      var displayed = filtered.slice(0, drawerVisibleCount);
      var listHtml = '<div class="flex flex-col gap-3">' +
        '<p class="text-xs font-merriweather text-gray-400 uppercase tracking-widest px-2">' + headerText + '</p>' +
        '<div class="flex flex-col gap-2">' +
        displayed.map(function(s) {
          var imgHtml = s.image ? '<img src="' + s.image + '" alt="" class="w-full h-full object-cover" loading="lazy" />' : '';
          var sectionBadge = s.section ? '<span class="inline-block text-[8px] font-share text-white bg-black uppercase tracking-widest px-1 py-0.5 mb-0.5">' + s.section + '</span>' : '';
          return '<a href="' + (s.publishUrl || '#') + '" onclick="closeMobileMenu()" class="flex items-start gap-3 p-2 hover:bg-gray-50 active:bg-gray-100 rounded-sm group transition-colors border-b border-gray-100 last:border-0">' +
            '<div class="w-16 h-12 flex-shrink-0 overflow-hidden rounded-sm bg-gray-100">' + imgHtml + '</div>' +
            '<div class="flex-1 min-w-0">' + sectionBadge + '<p class="font-merriweather text-black text-xs leading-snug group-hover:underline line-clamp-2">' + s.title + '</p></div>' +
            '</a>';
        }).join('') +
        '</div></div>';

      if (filtered.length > drawerVisibleCount) {
        listHtml += '<div class="flex justify-center pt-4 pb-2">' +
          '<button onmousedown="event.preventDefault()" onclick="loadMoreDrawerStories()" class="bg-black font-merriweather text-white text-[10px] px-4 py-1.5 hover:bg-neutral-850 transition-colors uppercase tracking-wider border border-black hover:border-neutral-850 rounded-sm">Load More</button>' +
          '</div>';
      }

      resultsEl.innerHTML = listHtml;
    };

    window.loadMoreDrawerStories = function() {
      drawerVisibleCount += 10;
      var input = document.getElementById('drawer-search-input');
      window.handleDrawerSearch(input ? input.value : '');
    };

    window.clearDrawerSearch = function() {
      var input = document.getElementById('drawer-search-input');
      if (input) {
        input.value = '';
        isDrawerSearchActive = false;
        input.blur();
        window.handleDrawerSearch('');
      }
    };

    window.loadMoreStories = function() {
      visibleCount += 10;
      window.handleSearchInput(lastSearchQuery);
    };

    window.handleSearchInput = function(query) {
      var resultsEl = document.getElementById('search-results');
      if (!resultsEl) return;
      var q = (query || '').toLowerCase().trim();

      // Show/Hide custom clear button
      var clearBtn = document.getElementById('search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = q ? 'block' : 'none';
      }

      // If background fetch hasn't completed, keep showing pulsed skeletons
      var stories = _searchStories;
      if (stories === null && !hasLoadedSearchStories) {
        return;
      }

      var filtered = (stories || []).filter(function(s) {
        if (!q) return true;
        return (s.title && s.title.toLowerCase().indexOf(q) !== -1) ||
               (s.section && s.section.toLowerCase().indexOf(q) !== -1);
      });

      // Reset visibleCount if query changes
      if (q !== lastSearchQuery) {
        visibleCount = 10;
        lastSearchQuery = q;
      }

      if (filtered.length === 0) {
        resultsEl.innerHTML = '<div class="flex flex-col items-center justify-center py-12 sm:py-20 gap-2 text-gray-500">' +
          '<p class="font-merriweather text-base">' + (q === '' ? 'No stories found.' : 'No stories found for') + '</p>' +
          (q !== '' ? '<p class="font-merriweather text-lg font-bold text-black">\\u201c' + query + '\\u201d</p>' : '') +
          '</div>';
        return;
      }

      var displayed = filtered.slice(0, visibleCount);

      var countHeader = '';
      if (q !== '') {
        countHeader = '<p class="text-xs font-merriweather text-gray-400 uppercase tracking-widest mb-4">' + filtered.length + ' result' + (filtered.length !== 1 ? 's' : '') + '</p>';
      }

      var listHtml = countHeader +
        '<div class="flex flex-col divide-y divide-gray-200">' +
        displayed.map(function(s) {
          var imgHtml = s.image
            ? '<img src="' + s.image + '" alt="" class="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90" loading="lazy" />'
            : '';
          var descHtml = s.description
            ? '<p class="font-merriweather text-gray-700 text-xs sm:text-sm mb-4 line-clamp-3">' + s.description.replace(/<[^>]+>/g, '') + '</p>'
            : '';

          var metaItems = [];
          if (s.dateStr) metaItems.push('<span>' + s.dateStr + '</span>');
          if (s.author) metaItems.push('<span>By ' + s.author + '</span>');
          if (s.minRead) metaItems.push('<span>' + s.minRead + '</span>');
          var metaHtml = '<div class="mt-auto font-share text-xs sm:text-sm text-gray-600 uppercase tracking-wide flex items-center flex-wrap gap-1">' +
            metaItems.join('<span class="mx-1">|</span>') +
            '</div>';

          return '<a href="' + (s.publishUrl || '#') + '" onclick="closeSearch()" class="flex flex-col md:flex-row gap-4 sm:gap-6 py-6 group cursor-pointer hover:no-underline decoration-transparent">' +
            '<div class="flex-shrink-0 w-full lg:w-[250px] h-auto aspect-video lg:h-[170px] overflow-hidden bg-gray-100">' + imgHtml + '</div>' +
            '<div class="flex-1 flex flex-col justify-start py-1">' +
              '<h3 class="font-libre text-[1.1rem] sm:text-[1.25rem] font-bold text-black mb-2 leading-snug hover:no-underline group-hover:no-underline">' + s.title + '</h3>' +
              descHtml +
              metaHtml +
            '</div>' +
            '</a>';
        }).join('') +
        '</div>';

      if (filtered.length > visibleCount) {
        listHtml += '<div class="flex justify-center pt-6 pb-4">' +
          '<button onclick="loadMoreStories()" class="bg-black font-merriweather text-white text-xs px-6 py-2.5 hover:bg-neutral-800 transition-colors uppercase tracking-wider border border-black hover:border-neutral-800">Load More</button>' +
          '</div>';
      }

      resultsEl.innerHTML = listHtml;
    };
    // ─────────────────────────────────────────────────────────────────────────


    function _easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

    /* Disable all CSS transitions via inline !important — beats Tailwind transition-all */
    function _initNavTransitions() {
      var ids = ['navbar-logo-mark','navbar-logo-word','navbar-logo-container',
                 'navbar-social-icons','auth-container','navbar-support-btn','navbar-top-row',
                 'navbar-search-btn'];
      ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.setProperty('transition', 'none', 'important');
      });
      document.querySelectorAll('.navbar-dec-line,.nav-btn,.nav-box,#desktop-hamburger-btn').forEach(function(el) {
        el.style.setProperty('transition', 'none', 'important');
      });
      /* Kill transition on the <header> element itself so the box-shadow and
         border-bottom don't animate when the initial scroll state is applied. */
      var headerEl = document.querySelector('header');
      if (headerEl) headerEl.style.setProperty('transition', 'none', 'important');
    }

    /* Pure opacity + transform + heights and padding to match preview */
    function _setNavVisual(t) {
      var logoMark    = document.getElementById('navbar-logo-mark');
      var logoWord    = document.getElementById('navbar-logo-word');
      var decLines    = document.querySelectorAll('.navbar-dec-line');
      var socialIcons = document.getElementById('navbar-social-icons');
      var authArea    = document.getElementById('auth-container');
      var supportBtn  = document.getElementById('navbar-support-btn');
      var header      = document.querySelector('header');

      /* One logo: mark slides left, then the wordmark tucks in beside it, both shrinking together */
      var logoBase = 'translateY(' + (18.75 * (1 - t)).toFixed(2) + 'px) scale(' + (1.25 - 0.65*t).toFixed(4) + ') ';
      var logoFx   = _easeInOut(Math.min(1, t / 0.6));
      var logoFy   = _easeInOut(Math.max(0, (t - 0.4) / 0.6));
      if (logoMark) logoMark.style.transform = logoBase + 'translate(' + (-23.26*logoFx).toFixed(2) + 'px,' + (2.32*logoFy).toFixed(2) + 'px)';
      if (logoWord) logoWord.style.transform = logoBase + 'translate(' + (21.21*logoFx).toFixed(2) + 'px,' + (-13.37*logoFy).toFixed(2) + 'px)';
      decLines.forEach(function(l) {
        var lineOpacity = Math.max(0, 1 - 7 * t);
        l.style.opacity = lineOpacity.toFixed(4);
        l.style.pointerEvents = lineOpacity <= 0 ? 'none' : '';
      });

      var isLarge = window.innerWidth >= 1024;
      var btnHeight = isLarge ? (110 - 60 * t).toFixed(1) + 'px' : '';
      var boxHeight = isLarge ? (80 - 30 * t).toFixed(1) + 'px' : '';
      var rowPaddingTop = isLarge ? (8 - 4 * t).toFixed(1) + 'px' : '';
      var rowPaddingBottom = isLarge ? (16 - 12 * t).toFixed(1) + 'px' : '';

      var logoContainer = document.getElementById('navbar-logo-container');
      if (logoContainer) {
        if (isLarge) logoContainer.style.height = btnHeight;
        else logoContainer.style.height = '';
      }

      var topRow = document.getElementById('navbar-top-row');
      if (topRow) {
        if (isLarge) {
          topRow.style.paddingTop = rowPaddingTop;
          topRow.style.paddingBottom = rowPaddingBottom;
        } else {
          topRow.style.paddingTop = '';
          topRow.style.paddingBottom = '';
        }
      }

      var hamburgerBtn = document.getElementById('desktop-hamburger-btn');
      if (hamburgerBtn) {
        if (isLarge) hamburgerBtn.style.height = btnHeight;
        else hamburgerBtn.style.height = '';
      }

      var searchBtn = document.getElementById('navbar-search-btn');
      if (searchBtn) {
        if (isLarge) searchBtn.style.height = btnHeight;
        else searchBtn.style.height = '';
      }

      document.querySelectorAll('.nav-btn').forEach(function(btn) {
        if (isLarge) btn.style.height = btnHeight;
        else btn.style.height = '';
      });

      document.querySelectorAll('.nav-box').forEach(function(box) {
        if (isLarge) box.style.height = boxHeight;
        else box.style.height = '';
      });

      if (header) {
        header.style.boxShadow = t > 0.02
          ? '0 1px ' + (t*5).toFixed(2) + 'px rgba(0,0,0,' + (t*0.09).toFixed(3) + ')'
          : '';
        if (isLarge) {
          header.style.borderBottom = t > 0.5 ? '1px solid #262626' : 'none';
        } else {
          header.style.borderBottom = '';
        }
      }

      var loginBtn = document.getElementById('login-btn');
      if (loginBtn) {
        var token = localStorage.getItem('website_token') || localStorage.getItem('token') || getCookie('website_token');
        if (window.showSignIn && !token) {
          loginBtn.style.display = (isLarge && t > 0.05) ? 'flex' : 'none';
        } else {
          loginBtn.style.display = 'none';
        }
      }

      // Switch navbar button: "BECOME A MEMBER" → "SUPPORT US" when scrolled (desktop only)
      if (supportBtn && supportBtn.style.display !== 'none') {
        if (isLarge && t > 0.5) {
          supportBtn.textContent = '${supportUsText}';
          supportBtn.style.backgroundColor = '${resolvedSupportUsBg}';
          supportBtn.style.color = '${resolvedSupportUsText}';
        } else {
          supportBtn.textContent = '${becomeMemberText}';
          supportBtn.style.backgroundColor = '${resolvedBecomeMemberBg}';
          supportBtn.style.color = '${resolvedBecomeMemberText}';
        }
      }
    }

    /* Snap duration scales with remaining distance */
    function _snapNavTo(targetT) {
      if (_navAnimRAF) cancelAnimationFrame(_navAnimRAF);
      var startT    = _easeInOut(_navRawT); /* start from what is on screen */
      var distance  = Math.abs(targetT - startT);
      var duration  = Math.round(distance * 420 + 60);
      var startTime = null;

      function step(ts) {
        if (startTime === null) startTime = ts;
        var progress = Math.min(1, (ts - startTime) / duration);
        _navRawT = startT + (targetT - startT) * _easeInOut(progress);
        _setNavVisual(_navRawT);
        if (progress < 1) {
          _navAnimRAF = requestAnimationFrame(step);
        } else {
          _navRawT = targetT;
          _setNavVisual(targetT);
          _navLastTarget = targetT; /* record committed state */
          _navAnimRAF = null;
        }
      }
      _navAnimRAF = requestAnimationFrame(step);
    }

    /* Called when scroll AND all inertia have truly stopped.
     * Hysteresis: 30% dead zone around midpoint so back-and-forth
     * scrolling near the transition zone doesn't oscillate states.
     *   From expanded → only condense if t > 0.65
     *   From condensed → only expand  if t < 0.35
     *   Between 0.35–0.65 → stay in last committed state            */
    function _onNavScrollEnd() {
      if (window.innerWidth < 1024) return;
      var targetT;
      if (_navLastTarget === 0) {
        targetT = _navRawT > 0.65 ? 1 : 0;
      } else {
        targetT = _navRawT < 0.35 ? 0 : 1;
      }
      _snapNavTo(targetT);
    }

    window.updateScrollState = function() {
      var y = window.scrollY;
      if (window.innerWidth < 1024) {
        if (_navAnimRAF)   { cancelAnimationFrame(_navAnimRAF); _navAnimRAF = null; }
        if (_navStopTimer) { clearTimeout(_navStopTimer);       _navStopTimer = null; }
        _navRawT = 0;

        // Reset logo and navbar inline styles so they fall back to standard responsive classes
        var logoMark = document.getElementById('navbar-logo-mark');
        var logoWord = document.getElementById('navbar-logo-word');
        var decLines = document.querySelectorAll('.navbar-dec-line');
        var logoContainer = document.getElementById('navbar-logo-container');
        var topRow = document.getElementById('navbar-top-row');
        var header = document.querySelector('header');

        if (logoMark) logoMark.style.transform = '';
        if (logoWord) logoWord.style.transform = '';
        decLines.forEach(function(l) {
          l.style.opacity = '';
          l.style.pointerEvents = '';
        });
        if (logoContainer) logoContainer.style.height = '';
        if (topRow) {
          topRow.style.paddingTop = '';
          topRow.style.paddingBottom = '';
        }
        if (header) {
          header.style.boxShadow = '';
          header.style.borderBottom = '';
        }
        /* Clear heights set by _setNavVisual on desktop so Tailwind classes
           take over when the viewport is resized to mobile. */
        document.querySelectorAll('.nav-btn').forEach(function(btn) { btn.style.height = ''; });
        document.querySelectorAll('.nav-box').forEach(function(box) { box.style.height = ''; });
        var hamburgerBtnM = document.getElementById('desktop-hamburger-btn');
        if (hamburgerBtnM) hamburgerBtnM.style.height = '';
        var searchBtnM = document.getElementById('navbar-search-btn');
        if (searchBtnM) searchBtnM.style.height = '';
        return;
      }
      if (_navAnimRAF) { cancelAnimationFrame(_navAnimRAF); _navAnimRAF = null; }

      /* Zone 20-180px. Scroll speed = transition speed. */
      _navRawT = Math.min(1, Math.max(0, (y - 20) / 160));
      _setNavVisual(_easeInOut(_navRawT));

      /* Fallback for browsers without scrollend */
      if (!('onscrollend' in window)) {
        if (_navStopTimer) clearTimeout(_navStopTimer);
        _navStopTimer = setTimeout(_onNavScrollEnd, 400);
      }
    };

    window.updateActiveNavDisplay = function() {
      const navButtons = document.querySelectorAll('[data-section]');
      navButtons.forEach(btn => {
        const section = btn.getAttribute('data-section');
        const isActive = section === activeSection;

        if (isActive) {
          btn.classList.add('text-black');
          btn.classList.remove('hover:text-black');
          if (btn.classList.contains('bg-black')) { /* mobile active */ }
          else { btn.classList.add('font-bold'); }
        } else {
          btn.classList.remove('text-black', 'font-bold');
          btn.classList.add('hover:text-black');
        }

        const square = btn.querySelector('.nav-box');
        if (square) {
          square.style.display = isActive ? 'block' : 'none';
        }
      });
    };

    window.toggleMobileMenu = function() {
      isMobileMenuOpen = !isMobileMenuOpen;
      const overlay = document.getElementById('mobile-menu-overlay');
      const drawer = document.getElementById('mobile-menu-drawer');
      if (isMobileMenuOpen) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
        drawer.classList.remove('translate-x-full');
        drawer.classList.add('translate-x-0');
        document.body.style.overflow = 'hidden';
      } else {
        window.closeMobileMenu();
      }
    };

    window.closeMobileMenu = function() {
      isMobileMenuOpen = false;
      const overlay = document.getElementById('mobile-menu-overlay');
      const drawer = document.getElementById('mobile-menu-drawer');
      if (overlay && drawer) {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        overlay.classList.remove('opacity-100', 'pointer-events-auto');
        drawer.classList.add('translate-x-full');
        drawer.classList.remove('translate-x-0');
        document.body.style.overflow = '';
      }
    };

    window.toggleDesktopMenu = function() {
      isDesktopMenuOpen = !isDesktopMenuOpen;
      const menu = document.getElementById('desktop-hamburger-menu');
      const line1 = document.getElementById('hamburger-line-1');
      const line2 = document.getElementById('hamburger-line-2');
      const line3 = document.getElementById('hamburger-line-3');
      if (menu) {
        if (isDesktopMenuOpen) {
          menu.classList.remove('hidden');
          if (line1) line1.style.transform = 'rotate(45deg) translate(5px, 5px)';
          if (line2) line2.style.opacity = '0';
          if (line3) line3.style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
          window.closeDesktopMenu();
        }
      }
    };

    window.closeDesktopMenu = function() {
      isDesktopMenuOpen = false;
      const menu = document.getElementById('desktop-hamburger-menu');
      const line1 = document.getElementById('hamburger-line-1');
      const line2 = document.getElementById('hamburger-line-2');
      const line3 = document.getElementById('hamburger-line-3');
      if (menu) {
        menu.classList.add('hidden');
        if (line1) line1.style.transform = 'none';
        if (line2) line2.style.opacity = '1';
        if (line3) line3.style.transform = 'none';
      }
    };

    window.handleNavClick = function(section, slug) {
      activeSection = section;
      window.updateActiveNavDisplay();
      window.closeMobileMenu();
      window.closeDesktopMenu();
      if (section === 'HOME') {
        window.location.href = '/';
      } else {
        window.location.href = '/' + slug;
      }
    };

    function getCookie(name) {
      const value = "; " + document.cookie;
      const parts = value.split("; " + name + "=");
      if (parts.length === 2) return parts.pop().split(";").shift();
      return null;
    }

    window.updateAuthUI = function() {
      try {
        const authContainer = document.getElementById('auth-container');
        const drawerAvatarContainer = document.getElementById('drawer-avatar-container');
        if (!window.showSignIn) {
          if (authContainer) authContainer.style.display = 'none';
          if (drawerAvatarContainer) drawerAvatarContainer.innerHTML = '';
          return;
        }
        if (authContainer) authContainer.style.display = 'flex';

        const token = localStorage.getItem('website_token') || localStorage.getItem('token') || getCookie('website_token');
        const userRaw = localStorage.getItem('auth_user') || localStorage.getItem('website_user');
        let user = null;
        if (userRaw) {
          try {
            user = JSON.parse(userRaw);
          } catch (e) {}
        }
        if (!user && token) {
          const name = localStorage.getItem('name');
          const email = localStorage.getItem('email');
          if (name || email) {
            user = { name, displayName: name, email };
          }
        }

        const loginBtn = document.getElementById('login-btn');
        const bannerLoginBtn = document.getElementById('banner-login-btn');
        const accountContainer = document.getElementById('account-dropdown-container');

        if (token) {
          if (loginBtn) loginBtn.style.display = 'none';
          if (bannerLoginBtn) bannerLoginBtn.style.display = 'none';
          if (accountContainer) {
            accountContainer.style.display = 'block';
            const nameEl = document.getElementById('user-display-name') || document.getElementById('user-name');
            const emailEl = document.getElementById('user-display-email');
            const initialEl = document.getElementById('user-initial');
            const pictureEl = document.getElementById('user-picture');

            const displayName = user ? (user.displayName || user.name || user.fullName || user.email || 'Reader') : 'Reader';
            const email = user ? (user.email || '') : '';
            const initial = displayName.charAt(0).toUpperCase();
            const picture = user ? (user.avatarUrl || user.picture || user.photoURL || user.image) : null;

            if (nameEl) nameEl.textContent = displayName;
            if (emailEl) emailEl.textContent = email;
            if (initialEl) initialEl.textContent = initial;

            if (picture && pictureEl) {
              pictureEl.src = picture;
              pictureEl.classList.remove('hidden');
              if (initialEl) initialEl.classList.add('hidden');
            } else {
              if (pictureEl) pictureEl.classList.add('hidden');
              if (initialEl) initialEl.classList.remove('hidden');
            }
            if (drawerAvatarContainer) {
              if (picture) {
                drawerAvatarContainer.innerHTML = '<button onclick="closeMobileMenu(); window.toggleAccountDropdown();" class="w-8 h-8 rounded-full overflow-hidden border border-neutral-700 bg-neutral-900 flex items-center justify-center animate-none cursor-pointer"><img src="' + picture + '" class="w-full h-full object-cover" /></button>';
              } else {
                drawerAvatarContainer.innerHTML = '<button onclick="closeMobileMenu(); window.toggleAccountDropdown();" class="w-8 h-8 rounded-full bg-white text-black font-merriweather font-black flex items-center justify-center text-sm select-none animate-none cursor-pointer">' + initial + '</button>';
              }
            }

            const drawerCard = document.getElementById('drawer-reader-card');
            if (drawerCard) {
              drawerCard.classList.remove('hidden');
              const dName = document.getElementById('drawer-reader-name');
              const dEmail = document.getElementById('drawer-reader-email');
              const dInit = document.getElementById('drawer-reader-initial');
              const dPic = document.getElementById('drawer-reader-picture');
              if (dName) dName.textContent = displayName;
              if (dEmail) dEmail.textContent = email;
              if (dInit) dInit.textContent = initial;
              if (picture && dPic) {
                dPic.src = picture;
                dPic.classList.remove('hidden');
                if (dInit) dInit.classList.add('hidden');
              } else {
                if (dPic) dPic.classList.add('hidden');
                if (dInit) dInit.classList.remove('hidden');
              }
            }
          }
        } else {
          if (loginBtn) {
            const isLarge = window.innerWidth >= 1024;
            const hasScrolled = isLarge && (_navRawT > 0.05);
            loginBtn.style.display = (window.showSignIn && hasScrolled) ? 'flex' : 'none';
          }
          if (bannerLoginBtn) bannerLoginBtn.style.display = 'inline-flex';
          if (accountContainer) accountContainer.style.display = 'none';
          if (drawerAvatarContainer) {
            drawerAvatarContainer.innerHTML = mobileDrawerLoginHtml;
          }
          const drawerCard = document.getElementById('drawer-reader-card');
          if (drawerCard) drawerCard.classList.add('hidden');
        }
      } catch (e) {
        console.error('Auth UI update failed:', e);
      }
    };

    window.openEpaperAuthModal = function() {
      const currentPath = window.location.pathname + window.location.search;
      const returnParam = (currentPath && currentPath !== '/' && !currentPath.includes('/login')) ? '?returnUrl=' + encodeURIComponent(currentPath) : '';
      window.location.href = '/login' + returnParam;
    };

    window.closeEpaperAuthModal = function() {};

    window.toggleAccountDropdown = function(event) {
      if (event) event.stopPropagation();
      isAccountDropdownOpen = !isAccountDropdownOpen;
      const menu = document.getElementById('account-dropdown-menu');
      const chevron = document.getElementById('account-chevron');
      if (menu) {
        if (isAccountDropdownOpen) {
          menu.classList.remove('hidden');
          if (chevron) chevron.classList.add('rotate-180');
        } else {
          window.closeAccountDropdown();
        }
      }
    };

    window.closeAccountDropdown = function() {
      isAccountDropdownOpen = false;
      const menu = document.getElementById('account-dropdown-menu');
      const chevron = document.getElementById('account-chevron');
      if (menu) {
        menu.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
      }
    };

    window.handleLogout = async function() {
      try {
        const apiBase = window.__openPress_API__ || (window.location.origin.includes(':8080') ? 'http://localhost:3001' : window.location.origin);
        await fetch(apiBase + '/epaper/auth/logout', { method: 'POST' }).catch(function() {});
      } catch (e) {}
      localStorage.removeItem('website_token');
      localStorage.removeItem('website_user');
      localStorage.removeItem('auth_user');
      document.cookie = "website_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.updateAuthUI();
      window.closeAccountDropdown();
    };

    function initAuth() {
      window.updateActiveNavDisplay();
      window.updateAuthUI();

      // Check donor status and hide top banner, Support Us / Become a Member
      // buttons, and all campaign ad blocks (leaderboard/sidebar/in-story/popup/spotlight)
      // if the signed-in user is a donor. Non-donors and logged-out visitors are unaffected.
      (function() {
        try {
          function hideForDonor(el) {
            if (!el) return;
            el.style.setProperty('display', 'none', 'important');
          }
          function hideDonorButtons() {
            var topBannerEl = document.getElementById('navbar-top-banner');
            var navbarBtn = document.getElementById('navbar-support-btn');
            var drawerSupport = document.querySelector('[data-drawer-support-btn]');
            var drawerMember = document.querySelector('[data-drawer-become-member-btn]');
            if (topBannerEl) { hideForDonor(topBannerEl); topBannerEl.style.height = '0'; topBannerEl.style.overflow = 'hidden'; }
            hideForDonor(navbarBtn);
            hideForDonor(drawerSupport);
            hideForDonor(drawerMember);
            // Covers campaign ads (leaderboard/sidebar/in-story), popup ad, and spotlight ad —
            // all of these are rendered with a data-ad-block attribute.
            document.querySelectorAll('.instory-ad, .ad-block-container, [data-ad-block], .ad-container, [data-ad-type], #instory-ad, #leaderboard-ad, #sidebar-ad, .popup-ad-overlay').forEach(hideForDonor);
          }
          function isDonorUserObj(parsed) {
            if (!parsed || typeof parsed !== 'object') return false;
            return Boolean(
              parsed.isDonor === true ||
              parsed.adFree === true ||
              parsed.suppressCampaigns === true ||
              Number(parsed.donationTotalAmount || 0) > 0 ||
              Number(parsed.donationCount || 0) > 0 ||
              Number(parsed.lastDonationAmount || 0) > 0
            );
          }
          // Fast path: check website_user / auth_user / user for donation status
          var storedKeys = ['website_user', 'auth_user', 'user'];
          var isDonorFast = false;
          for (var ki = 0; ki < storedKeys.length; ki++) {
            try {
              var parsed = JSON.parse(localStorage.getItem(storedKeys[ki]) || '{}');
              if (isDonorUserObj(parsed)) { isDonorFast = true; break; }
            } catch(e) {}
          }
          if (isDonorFast) {
            hideDonorButtons();
            window.__isDonorUser = true;
            return;
          }
          window.__isDonorUser = false;
          // Slow path: API call
          var token = localStorage.getItem('website_token') || localStorage.getItem('token') || getCookie('website_token');
          var email = null;
          try {
            var authUser = JSON.parse(localStorage.getItem('website_user') || localStorage.getItem('auth_user') || '{}');
            email = (authUser && authUser.email) ? authUser.email : null;
          } catch(e) {}
          if (!email && token) {
            try { email = JSON.parse(atob(token.split('.')[1])).email || null; } catch(e) {}
          }
          var base = window.__openPress_API__ || '';
          if (token && email && base) {
            fetch(base + '/api/audience/users?donation=donor', {
              headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(data) {
              if (data && data.users && Array.isArray(data.users)) {
                var isDonorApi = data.users.some(function(u) { return u.email && u.email.toLowerCase() === email.toLowerCase(); });
                if (isDonorApi) {
                  hideDonorButtons();
                  window.__isDonorUser = true;
                }
              }
            }).catch(function(e) { console.error('Error checking donor status:', e); });
          }
        } catch (e) { console.error('Failed donor check:', e); }
      })();

      if (_searchStories === null) {
        _searchStories = [];
        (function() {
          try {
            var token = localStorage.getItem('website_token') || localStorage.getItem('token') || getCookie('website_token') || '';
            var base = window.__openPress_API__ || '';
            if (!base) return;
            fetch(base + '/story/fetchReadyToPublish', {
              headers: { 'Authorization': token ? ('Bearer ' + token) : '' }
            }).then(function(r) { return r.ok ? r.json() : null; })
              .then(function(data) {
                if (!data) return;
                var rawStories = Array.isArray(data) ? data : (data.data || []);
                _searchStories = rawStories.map(function(s) {
                  var title = s.title || s.headline || '';
                  var publishUrl = s.publishUrl || s.publishedUrl || s.published_url || s.redirectUrl || s['Published URL'] || s['Published Url'] || (s.slug ? (String(s.slug).charAt(0) === '/' ? s.slug : '/' + s.slug) : '') || '';
                  var extractedText = '';
                  if (s.storySummary) {
                    // storySummary may be raw EditorJS JSON — extract text from first paragraph
                    var rawSum = typeof s.storySummary === 'string' ? s.storySummary.trim() : '';
                    if (rawSum && (rawSum.startsWith('[') || rawSum.startsWith('{'))) {
                      try {
                        var parsedSum = JSON.parse(rawSum);
                        var sumBlocks = Array.isArray(parsedSum) ? parsedSum : (parsedSum.blocks || []);
                        var sumP = sumBlocks.find(function(b) { return b && b.type === 'paragraph' && b.data && b.data.text; });
                        extractedText = sumP ? sumP.data.text.replace(/<[^>]+>/g, '') : (sumBlocks[0] && sumBlocks[0].data && sumBlocks[0].data.text ? sumBlocks[0].data.text.replace(/<[^>]+>/g, '') : '');
                      } catch(e) { extractedText = rawSum.replace(/<[^>]+>/g, ''); }
                    } else {
                      extractedText = rawSum.replace(/<[^>]+>/g, '');
                    }
                  } else if (s.summary && typeof s.summary === 'string') {
                    extractedText = s.summary;
                  } else if (s.description && s.description.blocks && Array.isArray(s.description.blocks)) {
                    extractedText = s.description.blocks
                      .filter(function(b) { return b && b.data && b.data.text; })
                      .map(function(b) { return b.data.text; })
                      .join(' ')
                      .replace(/<[^>]+>/g, '');
                  } else if (typeof s.description === 'string') {
                    extractedText = s.description;
                  } else if (typeof s.fullDescription === 'string') {
                    extractedText = s.fullDescription;
                  } else if (typeof s.excerpt === 'string') {
                    extractedText = s.excerpt;
                  } else if (typeof s.content === 'string') {
                    extractedText = s.content;
                  }

                  var descriptionForReadTime = s.description;
                  if (typeof descriptionForReadTime === 'string') {
                    try {
                      var parsedDescription = JSON.parse(descriptionForReadTime.trim());
                      if (parsedDescription && typeof parsedDescription === 'object') {
                        descriptionForReadTime = parsedDescription;
                      }
                    } catch (e) { }
                  }

                  var descriptionBlocks = Array.isArray(descriptionForReadTime)
                    ? descriptionForReadTime
                    : (descriptionForReadTime && descriptionForReadTime.blocks);
                  var fullText = '';
                  if (Array.isArray(descriptionBlocks)) {
                    fullText = descriptionBlocks.map(function(block) {
                      if (!block || typeof block !== 'object') return '';
                      var blockData = block.data || {};
                      if (typeof blockData.text === 'string') return blockData.text;
                      if (typeof blockData.caption === 'string') return blockData.caption;
                      if (typeof blockData.content === 'string') return blockData.content;
                      return typeof block.text === 'string' ? block.text : '';
                    }).map(function(text) { return text.trim(); }).filter(Boolean).join(' ');
                  } else if (typeof descriptionForReadTime === 'string') {
                    fullText = descriptionForReadTime;
                  }
                  if (!fullText && typeof s.fullDescription === 'string') fullText = s.fullDescription;
                  if (!fullText && typeof s.content === 'string') fullText = s.content;

                  var apiReadTime = [s.readTime, s.read_time, s.READ_TIME].find(function(value) {
                    return typeof value === 'string' && value.trim();
                  });
                  var words = fullText.trim() ? fullText.trim().split(/\\s+/).length : 0;
                  var minRead = apiReadTime
                    ? apiReadTime.trim()
                    : Math.max(1, Math.ceil(words / 220)) + ' min read';

                  var dateStr = '';
                  if (s.date || s.publishedAt || s.createdAt) {
                    var d = new Date(s.date || s.publishedAt || s.createdAt);
                    if (!isNaN(d.getTime())) {
                      dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    }
                  }

                  return {
                    title: title,
                    section: s.section || s.Section || s.primarySection || s.category || s.Category || '',
                    image: s.featuredImage || s.featureImg || s.image || s.thumbnail || s.imageUrl || s.socialImage || '',
                    publishUrl: publishUrl,
                    description: extractedText,
                    author: s.authorName || s.author_name || s.byline || s.Reporter || (s.author && s.author.name) || (typeof s.author === 'string' ? s.author : '') || '',
                    dateStr: dateStr,
                    minRead: minRead
                  };
                }).filter(function(s) { return s.title && s.publishUrl; });
                hasLoadedSearchStories = true;
                if (isSearchOpen) {
                  var input = document.getElementById('search-input');
                  window.handleSearchInput(input ? input.value : '');
                }
              }).catch(function() {});
          } catch(e) {}
        })();
      }

      _initNavTransitions();
      let scrollRAF = null;
      window.addEventListener('scroll', function() {
        if (scrollRAF) cancelAnimationFrame(scrollRAF);
        scrollRAF = requestAnimationFrame(window.updateScrollState);
      }, { passive: true });

      if ('onscrollend' in window) {
        window.addEventListener('scrollend', _onNavScrollEnd, { passive: true });
      }

      window.updateScrollState();

      const loginButtons = ['login-btn'];
      loginButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.addEventListener('click', function(e) {
            localStorage.setItem('sso_return_to', window.location.href);
          });
        }
      });

      setInterval(window.updateAuthUI, 1000);
      window.addEventListener('storage', (e) => {
        if (e.key === 'website_token' || e.key === 'auth_user') {
          window.updateAuthUI();
        }
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          if (isSearchOpen) { window.closeSearch(); }
          else if (isMobileMenuOpen) { window.closeMobileMenu(); }
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAuth);
    } else {
      initAuth();
    }

    document.addEventListener('click', function(event) {
      const desktopMenu = document.getElementById('desktop-hamburger-menu');
      const hamburgerBtn = document.getElementById('desktop-hamburger-btn');
      if (desktopMenu && hamburgerBtn && isDesktopMenuOpen) {
        if (!desktopMenu.contains(event.target) && !hamburgerBtn.contains(event.target)) {
          window.closeDesktopMenu();
        }
      }

      const accountMenu = document.getElementById('account-dropdown-menu');
      const accountBtn = document.getElementById('account-dropdown-btn');
      if (accountMenu && accountBtn && isAccountDropdownOpen) {
        if (!accountMenu.contains(event.target) && !accountBtn.contains(event.target)) {
          window.closeAccountDropdown();
        }
      }

      const searchOverlay = document.getElementById('search-overlay');
      if (searchOverlay && isSearchOpen && event.target === searchOverlay) {
        window.closeSearch();
      }
    });
  })();
</script>
`;
}

// BLOG Grid HTML
/***************************************************
 * Render ANY component using ComponentRegistry
 ***************************************************/
function renderComponent(block, zones, storiesById, ctx = {}) {
  if (!block || typeof block !== "object") return "";

  const { type, props = {} } = block;

  let renderer = ComponentRegistry[type];

  // Fallback for dynamically generated Ad components from Page Studio
  if (!renderer && type.startsWith('Ad_')) {
    if (type.toLowerCase().includes('spotlight')) {
      // Spotlight Ad blocks → scroll-experience renderer
      renderer = (p, z, s, c) => renderSpotlightAd({
        id: p.id,
        adId: p.adId,
        linkUrl: p.linkUrl,
        altText: p.altText,
        fallbackStoryId: p.fallbackStoryId,
        fallbackAllowed: p.fallbackAllowed,
        _autoFallbackStoryId: p._autoFallbackStoryId,
        _autoFallbackTitle: p._autoFallbackTitle,
        _autoFallbackLabel: p._autoFallbackLabel,
        _autoFallbackImageUrl: p._autoFallbackImageUrl,
        _autoFallbackPublishUrl: p._autoFallbackPublishUrl,
      }, c);
    } else {
      const placementName = type.replace('Ad_', '').replace(/_/g, '-');
      renderer = (p, z, s, c) => renderCampaignAd({
        ...p,
        placementName: placementName,
      }, c);
    }
  }

  if (!renderer) {
    console.warn("⚠️ Unknown component type:", type);
    return `<!-- Unknown component: ${type} -->`;
  }

  try {
    return renderer(props, zones, storiesById, ctx);
  } catch (err) {
    console.error(`Error rendering component ${type}:`, err);
    return `<!-- Error rendering ${type} -->`;
  }
}



export function renderBlogGrid(props, zones, storiesById, ctx = {}) {
  const id = props.id;




  // Helper to get components inside a zone
  function renderZone(zoneName) {
    const zoneKey = `${id}:${zoneName}`;
    const zoneItems = zones[zoneKey] || [];

    if (!zoneItems.length) return "";

    return zoneItems
      .map((item) => renderComponent(item, zones, storiesById, ctx))
      .join("");
  }

  // ─── Spotlight Ad — desktop sidebar card (matches PopularBlogCard) ────────
  // On a single-story Blog page, if there's an active Spotlight campaign, render
  // its desktop fallback as a card in the "blog-grid-right-5" zone — the same
  // slot/column where PopularBlogCard is displayed — instead of as a separate
  // rail beside the article body. Mobile is unaffected (cover-stack slider is
  // injected inline into the article body by renderBlogBodyCard).
  // `ctx.claimSpotlightSidebarAd()` guards against the ad appearing more than
  // once on the same page: multiple grid components (e.g. BlogGrid AND one or
  // more SectionGrid instances) can each independently resolve the same active
  // campaign since they all share `ctx.currentStory`, so only the first one to
  // render is allowed to actually claim/show the card.
  const { job: spotlightSidebarJob, campaign: spotlightSidebarCampaign } = (ctx?.currentStory && ctx?.claimSpotlightSidebarAd?.() !== false)
    ? resolveActiveSpotlightCampaign(ctx.campaigns || [])
    : { job: null, campaign: null };
  const spotlightSidebarAdHtml = spotlightSidebarJob
    ? buildSpotlightDesktopFallbackHtml(spotlightSidebarJob, spotlightSidebarCampaign)
    : '';

  return `
    <section
      id="${id}"
      class="w-full bg-white pt-4 px-4 pb-6 lg:pt-8 lg:px-16 lg:pb-12 ${props.className || ""}"
    >
      <div class="mx-auto w-full max-w-7xl px-2 sm:px-6 lg:px-8">
        <div class="flex flex-col lg:flex-row gap-[2%]">

          <!-- LEFT COLUMN -->
          <div class="flex-1 flex flex-col gap-1 lg:gap-2">

            <div class="h-auto w-full min-h-0 lg:min-h-[2.2rem]">
              ${renderZone("blog-grid-left-top-1")}
            </div>
          </div>

           <!-- RIGHT COLUMN -->
         <div class="w-full lg:w-[30%] flex flex-col gap-5 blog-grid-right-col">
            <!-- Spotlight Ad — sits at the top of the column, scrolls normally
                 (not sticky) at a lower z-index than the sticky section below,
                 so once the sticky cards (right-1..right-5) catch up while
                 scrolling, they slide over/cover it. -->
            ${spotlightSidebarAdHtml ? `<div class="relative lg:sticky lg:top-[96px] lg:self-start z-0 w-full lg:max-w-md hidden lg:block" data-ad-block="Spotlight-Sidebar">${spotlightSidebarAdHtml}</div>` : ''}

            <!-- Scrolling sections -->
            <div class="relative z-10 bg-white flex flex-col gap-5">
              <div class="h-auto min-h-0 lg:min-h-[12rem] pt-4">
                ${renderZone("blog-grid-right-1")}
              </div>
              <div class="h-auto min-h-0 lg:min-h-[3rem]">
                ${renderZone("blog-grid-right-2")}
              </div>
              <div class="h-auto min-h-0 lg:min-h-[7rem]">
                ${renderZone("blog-grid-right-3")}
              </div>
              <div class="h-auto min-h-0 -mt-3 bg-white [&_article]:!border-b-0">
                ${renderZone("blog-grid-right-4")}
              </div>
            </div>
            <div class="border-t border-dotted border-gray-700 mb-3"></div>

            <!-- STICKY SECTION - Works on both mobile and desktop -->
            <div class="lg:sticky lg:top-[96px] lg:self-start pb-8 bg-white z-10">
              <div class="h-auto min-h-0">
                ${renderZone("blog-grid-right-5")}
              </div>
            </div>
          </div>
        </div>
      </div>
      ${ctx?.pageType === 'Home' || (ctx?.activeSection === 'HOME' && !ctx?.currentStory && !ctx?.authorId)
      ? `
      <style>
        @media (max-width: 1023px) {
          #${id} .blog-grid-right-col section[id*="heading"],
          #${id} .blog-grid-right-col section[id*="Heading"] {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          #${id} .blog-grid-right-col section[id*="heading"] > div,
          #${id} .blog-grid-right-col section[id*="Heading"] > div {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
      </style>
      `
      : ''
    }
    </section>
  `;
}




//BLOG HEADING
export function renderBlogHeading(props) {
  const {
    id = "",
    text = "Heading",
    align = "left",
    level = "2",
    size = "m"
  } = props;

  // map Tailwind size classes
  const sizeClasses = {
    xxxl: "text-6xl font-extrabold",
    xxl: "text-5xl font-bold",
    xl: "text-4xl font-bold",
    l: "text-2xl font-semibold",
    m: "text-2xl font-semibold",
    s: "text-xl font-medium",
    xs: "text-lg font-medium",
  };

  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";


  const tag = `h${level}`;

  return `
    <section id="${id}" class="bg-white w-full">
      <div class=" w-full ">
        <${tag} class="${alignClass} font-libre italic font-semibold" style="font-size: 19px; line-height: 2rem;">
          ${text}
        </${tag}>
      </div>
    </section>
  `;
}



//  POPULAR BLOG CARD
//  RENDER A SINGLE ITEM (SingleColumnItem)
function renderPopularBlogItem(item, storyData) {
  const displayText = storyData?.title || item.text;
  const convertedText = displayText;
  const publishUrl = storyData?.publishUrl || '';

  return `
    <div class="border border-dotted border-gray-700">
      <div
        class="border-b last:border-b-0 border-gray-700 flex gap-4 items-start min-h-[80px] p-2 lg:p-3 pt-2 ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity"
        ${publishUrl ? `onclick="window.location.href='${publishUrl}'"` : ''}
      >
        <div class="text-[42px] lg:text-[56px] font-extrabold leading-none tracking-[-0.015em] font-[Merriweather] text-black tabular-nums flex-shrink-0">
          ${item.number}
        </div>
        <div class="flex-1">
          <p class="text-[19px] lg:text-[18px] font-normal font-libre text-gray-700 leading-[1.40] lg:leading-[1.25] pt-1">
            ${convertedText}
          </p>
        </div>
      </div>
    </div>

  `;
}

// RENDER THE PopulaBlogCard WRAPPER
export function renderPopularBlogCard(props, storiesById) {
  const { id, items = [] } = props;

  // Just like React version → first 4
  const firstFourItems = items.slice(0, 4);

  return `
    <div id="${id || ""}" class="w-full lg:max-w-md pb-4 pt-4">
      <div>
        ${firstFourItems
      .map((item, index) => {
        const storyData = item.storyId
          ? storiesById[item.storyId]
          : null;

        return `
              <div>
                ${renderPopularBlogItem(item, storyData)}
                ${index === firstFourItems.length - 1 ? "<div></div>" : ""}
              </div>
            `;
      })
      .join("")}
      </div>
    </div>
  `;
}



// Blog showcase card
function renderShowcaseCardItem(item, storyData, noBorder) {
  const displayTitle = storyData?.title || item.title || "Untitled";
  const rawCategory = storyData?.Category || storyData?.category || item.category;
  const displayCategory = Array.isArray(rawCategory)
    ? rawCategory[0]
    : rawCategory || "Category";
  const publishUrl = storyData?.publishUrl || '';

  return `
    <div
      class="${!noBorder ? "border-b border-dotted border-black last:border-b-0 lg:last:border-b" : ""} p-4 pl-2 pt-0 last:mb-0 ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity"
      ${publishUrl ? `onclick="window.location.href='${publishUrl}'"` : ''}
    >

      <p class="text-[12px] lg:text-[10px] font-share text-black uppercase">
        ${displayCategory}
      </p>

      <h2 class="text-[20px] lg:text-[18px] font-libre text-gray-600 leading-[1.40rem] lg:leading-[1.25rem] pt-1">
        ${displayTitle}
      </h2>

    </div>
  `;
}


function renderShowcaseCardLayout(items, storiesById, noBorder) {
  if (!items || !items.length) {
    return `
      <div class="p-4 text-gray-500 italic">
        No featured cards added. Please add some cards in the editor.
      </div>
    `;
  }

  return `
    <div class="w-full lg:max-w-md lg:mx-auto">
      ${items
      .map((item) => {
        const storyData = item.storyId ? storiesById[item.storyId] : null;
        return renderShowcaseCardItem(item, storyData, noBorder);
      })
      .join("")}
    </div>
  `;
}


export function renderBlogShowcaseCard(props, storiesById) {
  const { id, items = [], className = "" } = props;

  return `
    <div id="${id || ""}" class="${className}">
      ${renderShowcaseCardLayout(items, storiesById, true)}
    </div>
  `;
}



// Recommended Card
function renderRecommendCard(props, storyData) {
  const {
    storyId,
    title: fallbackTitle = "Recommended Story",
    description: fallbackDesc = "Category",
    imageUrl: fallbackImage = "https://via.placeholder.com/400x250",
    imageAlt: fallbackAlt = "Recommended article",
    className = ""
  } = props;

  const imageUrl = storyData?.image || storyData?.imageUrl || fallbackImage;
  const description = storyData?.Category || storyData?.category || fallbackDesc;
  const title = storyData?.title || storyData?.headline || fallbackTitle;
  const imageAlt = storyData?.imageAlt || fallbackAlt;
  const publishUrl = storyData?.publishUrl || '';

  return `
   <article
      class="relative flex flex-col overflow-hidden border-b border-dotted border-gray-700 pb-3 mb-3 ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity ${className}"
      ${publishUrl ? `onclick="window.location.href='${publishUrl}'"` : ''}
    >
      <!-- Image -->
      <div class="aspect-[4/3] w-full overflow-hidden">
        <img
          src="${imageUrl}"
          alt="${imageAlt}"
          class="h-full w-full object-cover transition-opacity duration-300"
          loading="lazy"
        />
      </div>

      <!-- Content -->
      <div class="flex flex-1 flex-col p-1 lg:p-2">
        <p class="font-share text-[9px] sm:text-[10px] text-black line-clamp-2 uppercase pt-2 sm:pt-3 pb-0.5">
          ${description}
        </p>

        <p class="font-libre text-[1rem] sm:text-lg lg:text-[20px] font-extrabold text-black mb-1 sm:mb-2 leading-[1.2] lg:leading-[1.40rem]">
          ${title}
        </p>
      </div>

    </article>
  `;
}

export function findStory(storyId, storiesById) {
  if (!storiesById || typeof storiesById !== 'object') return null;
  if (storyId && storiesById[storyId]) return storiesById[storyId];
  const entries = Object.values(storiesById).filter(Boolean);
  if (storyId) {
    const found = entries.find(s =>
      s.id === storyId || s.storyId === storyId || s.slug === storyId ||
      String(s.id || '') === String(storyId) || String(s.storyId || '') === String(storyId)
    );
    if (found) return found;
  }
  if (entries.length === 1) return entries[0];
  return null;
}

//  BlogRecomCard WRAPPER
export function renderBlogRecomCard(props, storiesById) {
  const { id, storyId, className = "" } = props;

  const storyData = findStory(storyId, storiesById);

  return `
    <div id="${id || ""}" class="${className}">
      ${renderRecommendCard({ storyId, className }, storyData)}
    </div>
  `;
}






// BlogPostCard
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}


//  RENDER: BlogMainTitle
export function renderBlogMainTitle({ id, storyId, fallbackTitle }, storiesById) {
  const story = findStory(storyId, storiesById);
  const displayTitle = story?.headline || fallbackTitle || "Story Title";

  return `
    <div id="${escapeHtml(id || "")}" class="w-full">
      <h1 class="block text-inherit
           text-3xl lg:text-[2.6rem] leading-tight lg:leading-[1.05]
           font-black font-libre
           ">
        ${escapeHtml(displayTitle)}
      </h1>
    </div>
  `;
}

//  RENDER: BlogSubHeading (category + time + share button)
export function renderBlogSubHeading({ id, time = "18 minutes ago", category = "CATEGORY" }, containerId) {
  const safeTime = escapeHtml(time);
  const safeCategory = escapeHtml(category);
  const subId = `${containerId}-subheading`;

  return `
    <div id="${subId}" class="flex items-center justify-between w-full max-w-full lg:max-w-[808px] py-2 lg:py-1 font-share">
      <div class="flex items-center gap-2">
        ${safeCategory ? `<span
          class="text-black font-share border-black border-[0.5px] text-[11px] uppercase cursor-pointer tracking-wide px-1 py-1 w-fit"
          onclick="handleNavClick('${category}', '${category.toLowerCase().split(' ').join('-')}')"
        >${safeCategory}</span>` : ""}
        ${safeTime ? `<span class="text-black text-[11px] font-share">${safeTime}</span>` : ""}
      </div>
      <div class="flex-1"></div>
      <div class="flex-shrink-0 font-share relative">
        <button
          data-puck-share
          style="
            display: flex;
            align-items: stretch;
            border: 0.25px solid rgb(62, 62, 62);
            background: #FFFFFF;
            padding: 0;
            cursor: pointer;
            user-select: none;
            height: 24px;
            "
            aria-label="Share"
            title="Share"
        >
          <span style="
            font-size:9px;
            letter-spacing:0.03em;
            color:rgb(59, 59, 59);
            padding:2px 2px;
            display:flex;
            align-items:center;
            justify-content:center;
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
            padding-left: 0.25rem;
            padding-right: 0.25rem;
          ">
            SHARE
          </span>

          <div style="
            width:0.25px;
            background:rgb(62,62,62);
          "></div>
          <div style="padding:2px 6px; display:flex; align-items:center;">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              width="16"
              height="16"
              fill="black"
              style="display:block;"
            >
              <path
                d="M12 6V2l7 7l-7 7v-4c-5 0-8.5 1.5-11 5l.8-3l.2-.4A12 12 0 0 1 12 6"
              ></path>
            </svg>
          </div>
        </button>

        <!-- Share Dropdown Menu -->
        <div
          data-puck-share-menu
          style="
            display: none;
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border: 1px solid rgb(62, 62, 62);
            border-radius: 0px;
            margin-top: 4px;
            z-index: 1000;
            min-width: 180px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          "
        >
<button
            data-share-facebook
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              border-bottom: 1px solid black;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
          >
            <svg fill="#000000" height="25px" width="25px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier"> <g> <path d="M113,145c-141.4,0-256,114.6-256,256s114.6,256,256,256s256-114.6,256-256S254.4,145,113,145z M272.8,560.7 c-20.8,20.8-44.9,37.1-71.8,48.4c-27.8,11.8-57.4,17.7-88,17.7c-30.5,0-60.1-6-88-17.7c-26.9-11.4-51.1-27.7-71.8-48.4 c-20.8-20.8-37.1-44.9-48.4-71.8C-107,461.1-113,431.5-113,401s6-60.1,17.7-88c11.4-26.9,27.7-51.1,48.4-71.8 c20.9-20.8,45-37.1,71.9-48.5C52.9,181,82.5,175,113,175s60.1,6,88,17.7c26.9,11.4,51.1,27.7,71.8,48.4 c20.8,20.8,37.1,44.9,48.4,71.8c11.8,27.8,17.7,57.4,17.7,88c0,30.5-6,60.1-17.7,88C309.8,515.8,293.5,540,272.8,560.7z"/> <path d="M146.8,313.7c10.3,0,21.3,3.2,21.3,3.2l6.6-39.2c0,0-14-4.8-47.4-4.8c-20.5,0-32.4,7.8-41.1,19.3 c-8.2,10.9-8.5,28.4-8.5,39.7v25.7H51.2v38.3h26.5v133h49.6v-133h39.3l2.9-38.3h-42.2v-29.9C127.3,317.4,136.5,313.7,146.8,313.7z"/> </g> </g>
            </svg>
            <h2 class="font-libre italic pl-2 font-semibold">FACEBOOK</h2>
          </button>
          <button
            data-share-twitter
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              transition: background-color 0.2s;
              border-bottom: 1px solid black;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
          >
          <svg fill="#000000" height="25px" width="25px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier"> <g> <path d="M113,145c-141.4,0-256,114.6-256,256s114.6,256,256,256s256-114.6,256-256S254.4,145,113,145z M272.8,560.7 c-20.8,20.8-44.9,37.1-71.8,48.4c-27.8,11.8-57.4,17.7-88,17.7c-30.5,0-60.1-6-88-17.7c-26.9-11.4-51.1-27.7-71.8-48.4 c-20.8-20.8-37.1-44.9-48.4-71.8C-107,461.1-113,431.5-113,401s6-60.1,17.7-88c11.4-26.9,27.7-51.1,48.4-71.8 c20.9-20.8,45-37.1,71.9-48.5C52.9,181,82.5,175,113,175s60.1,6,88,17.7c26.9,11.4,51.1,27.7,71.8,48.4 c20.8,20.8,37.1,44.9,48.4,71.8c11.8,27.8,17.7,57.4,17.7,88c0,30.5-6,60.1-17.7,88C309.8,515.8,293.5,540,272.8,560.7z"/> <path d="M234.3,313.1c-10.2,6-21.4,10.4-33.4,12.8c-9.6-10.2-23.3-16.6-38.4-16.6c-29,0-52.6,23.6-52.6,52.6c0,4.1,0.4,8.1,1.4,12 c-43.7-2.2-82.5-23.1-108.4-55c-4.5,7.8-7.1,16.8-7.1,26.5c0,18.2,9.3,34.3,23.4,43.8c-8.6-0.3-16.7-2.7-23.8-6.6v0.6 c0,25.5,18.1,46.8,42.2,51.6c-4.4,1.2-9.1,1.9-13.9,1.9c-3.4,0-6.7-0.3-9.9-0.9c6.7,20.9,26.1,36.1,49.1,36.5 c-18,14.1-40.7,22.5-65.3,22.5c-4.2,0-8.4-0.2-12.6-0.7c23.3,14.9,50.9,23.6,80.6,23.6c96.8,0,149.7-80.2,149.7-149.7 c0-2.3,0-4.6-0.1-6.8c10.3-7.5,19.2-16.7,26.2-27.3c-9.4,4.2-19.6,7-30.2,8.3C222.1,335.7,230.4,325.4,234.3,313.1z"/> </g> </g>
          </svg>
            <h1 class="font-libre italic pl-2 font-semibold">TWITTER</h1>
          </button>
          <button
            data-share-linkedin
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              border-bottom: 1px solid black;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
          >
            <svg fill="#000000" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve" width="25px" height="25px">
              <g id="SVGRepo_bgCarrier" stroke-width="0"/>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
              <g id="SVGRepo_iconCarrier"> <g> <path d="M329,145h-432c-22.1,0-40,17.9-40,40v432c0,22.1,17.9,40,40,40h432c22.1,0,40-17.9,40-40V185C369,162.9,351.1,145,329,145z M339,617c0,5.5-4.5,10-10,10h-432c-5.5,0-10-4.5-10-10V185c0-5.5,4.5-10,10-10h432c5.5,0,10,4.5,10,10V617z"/> <rect x="-8.5" y="348.4" width="49.9" height="159.7"/> <path d="M177.7,346.9c-28.6,0-46.5,15.6-49.8,26.6v-25.1H71.8c0.7,13.3,0,159.7,0,159.7h56.1v-86.3c0-4.9-0.2-9.7,1.2-13.1 c3.8-9.6,12.1-19.6,27-19.6c19.5,0,28.3,14.8,28.3,36.4v82.6H241v-88.8C241,369.9,213.2,346.9,177.7,346.9z"/> <path d="M15.4,273c-18.4,0-30.5,11.9-30.5,27.7c0,15.5,11.7,27.7,29.8,27.7h0.4c18.8,0,30.5-12.3,30.4-27.7 C45.1,284.9,33.8,273,15.4,273z"/> </g> </g>
            </svg>
            <h2 class="font-libre italic pl-2 font-semibold">LINKEDIN</h2>
          </button>
          <button
            data-share-whatsapp
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              transition: background-color 0.2s;
              border-bottom: 1px solid black;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
          >
          <svg fill="#000000" width="25px" height="25px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier">
            <path d="M11.42 9.49c-.19-.09-1.1-.54-1.27-.61s-.29-.09-.42.1-.48.6-.59.73-.21.14-.4 0a5.13 5.13 0 0 1-1.49-.92 5.25 5.25 0 0 1-1-1.29c-.11-.18 0-.28.08-.38s.18-.21.28-.32a1.39 1.39 0 0 0 .18-.31.38.38 0 0 0 0-.33c0-.09-.42-1-.58-1.37s-.3-.32-.41-.32h-.4a.72.72 0 0 0-.5.23 2.1 2.1 0 0 0-.65 1.55A3.59 3.59 0 0 0 5 8.2 8.32 8.32 0 0 0 8.19 11c.44.19.78.3 1.05.39a2.53 2.53 0 0 0 1.17.07 1.93 1.93 0 0 0 1.26-.88 1.67 1.67 0 0 0 .11-.88c-.05-.07-.17-.12-.36-.21z"/>
            <path d="M13.29 2.68A7.36 7.36 0 0 0 8 .5a7.44 7.44 0 0 0-6.41 11.15l-1 3.85 3.94-1a7.4 7.4 0 0 0 3.55.9H8a7.44 7.44 0 0 0 5.29-12.72zM8 14.12a6.12 6.12 0 0 1-3.15-.87l-.22-.13-2.34.61.62-2.28-.14-.23a6.18 6.18 0 0 1 9.6-7.65 6.12 6.12 0 0 1 1.81 4.37A6.19 6.19 0 0 1 8 14.12z"/>
            </g>
          </svg>
            <h1 class="font-libre italic pl-2 font-semibold">WHATSAPP</h1>
          </button>
          <button
            data-share-share
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.querySelectorAll('path').forEach(p => p.setAttribute('fill', 'white')));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.querySelectorAll('path').forEach(p => p.setAttribute('fill', '#1C274C')));"
          >
          <svg width="25px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" stroke-width="0"/>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
              <g id="SVGRepo_iconCarrier"> <path d="M15.7285 3.88396C17.1629 2.44407 19.2609 2.41383 20.4224 3.57981C21.586 4.74798 21.5547 6.85922 20.1194 8.30009L17.6956 10.7333C17.4033 11.0268 17.4042 11.5017 17.6976 11.794C17.9911 12.0863 18.466 12.0854 18.7583 11.7919L21.1821 9.35869C23.0934 7.43998 23.3334 4.37665 21.4851 2.5212C19.6346 0.663551 16.5781 0.905664 14.6658 2.82536L9.81817 7.69182C7.90688 9.61053 7.66692 12.6739 9.51519 14.5293C9.80751 14.8228 10.2824 14.8237 10.5758 14.5314C10.8693 14.2391 10.8702 13.7642 10.5779 13.4707C9.41425 12.3026 9.44559 10.1913 10.8809 8.75042L15.7285 3.88396Z" fill="#1C274C"/> <path d="M14.4851 9.47074C14.1928 9.17728 13.7179 9.17636 13.4244 9.46868C13.131 9.76101 13.1301 10.2359 13.4224 10.5293C14.586 11.6975 14.5547 13.8087 13.1194 15.2496L8.27178 20.1161C6.83745 21.556 4.73937 21.5863 3.57791 20.4203C2.41424 19.2521 2.44559 17.1408 3.88089 15.6999L6.30473 13.2667C6.59706 12.9732 6.59614 12.4984 6.30268 12.206C6.00922 11.9137 5.53434 11.9146 5.24202 12.2081L2.81818 14.6413C0.906876 16.5601 0.666916 19.6234 2.51519 21.4789C4.36567 23.3365 7.42221 23.0944 9.33449 21.1747L14.1821 16.3082C16.0934 14.3895 16.3334 11.3262 14.4851 9.47074Z" fill="#1C274C"/> </g>
            </svg>
            <h1 class="font-libre italic pl-2 font-semibold">COPY</h1>
          </button>
        </div>
      </div>
    </div>
  `;
}

//  RENDER: BlogImageCard
export function renderBlogImageCard({ storyId, imageUrl: fallbackImage = "/story-images/default.png", title: fallbackTitle = "" }, storiesById) {
  const story = findStory(storyId, storiesById);
  const displayImage = story?.imageUrl || story?.image || fallbackImage || "https://via.placeholder.com/900x600";
  const displayTitle = story?.caption || story?.mediaCaption || story?.imageDescription || fallbackTitle || "";
  const displayAltText = story?.altText || fallbackTitle || "";

  // Get focal point from story data, default to center if not set
  const focalPoint = story?.imageFocalPoint || { x: 50, y: 50 };
  const objectPosition = `${focalPoint.x}% ${focalPoint.y}%`;

  return `
    <div class="w-full mb-3">
      <div class="w-full aspect-video bg-gray-200 overflow-hidden mb-3">
        <img
          src="${escapeHtml(displayImage)}"
          alt="${escapeHtml(displayAltText)}"
          class="w-full h-full object-cover transition-opacity duration-500 opacity-100"
          style="object-position: ${escapeHtml(objectPosition)};"
          loading="lazy"
        />
      </div>

      <h2
        class="mt-3 text-[16px] leading-snug font-lato font-medium outline-none"
        style="color:#716d6d;"
      >
        ${displayTitle}
      </h2>

    </div>
  `;
}

function slugify(value) {
  if (!value) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeAuthorName(value) {
  if (!value) return "";
  const str = typeof value === "string"
    ? value
    : (value.name || value.authorName || value.fullName || "");

  return str
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveAuthorMatch(name, allAuthors = []) {
  const normalizedCandidate = normalizeAuthorName(name);
  if (!normalizedCandidate) return undefined;

  const exactMatches = [];
  const prefixMatches = [];

  allAuthors.forEach((author) => {
    const canonicalName = author?.name || author?.authorName || author?.fullName || "";
    const normalizedCanonical = normalizeAuthorName(canonicalName);

    if (!normalizedCanonical) {
      return;
    }

    // Strong exact match.
    if (normalizedCanonical === normalizedCandidate) {
      exactMatches.push(author);
      return;
    }

    // Controlled partial match for abbreviated bylines (e.g. "Ravi" vs "Ravi Bajpai").
    const canonicalTokens = normalizedCanonical.split(" ").filter(Boolean);
    const candidateTokens = normalizedCandidate.split(" ").filter(Boolean);
    if (!canonicalTokens.length || !candidateTokens.length) {
      return;
    }

    const candidateIsPrefix =
      candidateTokens.length < canonicalTokens.length &&
      candidateTokens.every((token, index) => canonicalTokens[index] === token);

    if (candidateIsPrefix) {
      prefixMatches.push(author);
    }
  });

  // Exact matches take priority — even if there are duplicates (same name, same slug).
  if (exactMatches.length > 0) {
    return exactMatches[0];
  }

  // Prefix match only when unambiguous (exactly 1 match).
  return prefixMatches.length === 1 ? prefixMatches[0] : undefined;
}

function renderAuthorAnchor(displayName, authorMatch) {
  const rawName = typeof displayName === "string"
    ? displayName
    : (displayName.name || displayName.authorName || displayName.fullName || "AUTHOR NAME");

  if (!authorMatch) {
    return escapeHtml(rawName);
  }

  const canonicalAuthorName = authorMatch.name || authorMatch.authorName || authorMatch.fullName || rawName;
  const authorPath = `/authors/${slugify(canonicalAuthorName)}`;
  return `<a href="${authorPath}" class="underline">${escapeHtml(rawName)}</a>`;
}


//  RENDER: BlogTitle (title + author)
export function renderBlogTitle(
  { text, author, storyId },
  storiesById,
  allAuthors = []
) {


  const story = findStory(storyId, storiesById);

  // Check byLine array first, then fall back to authorName
  const byLine = story?.byLine;


  let displayAuthorHTML = "";

  if (Array.isArray(byLine) && byLine.length > 0) {
    displayAuthorHTML = byLine
      .map((name) => renderAuthorAnchor(name, resolveAuthorMatch(name, allAuthors)))
      .join(", ");
  } else {
    const finalAuthorName = story?.authorName || author || "AUTHOR NAME";
    displayAuthorHTML = renderAuthorAnchor(finalAuthorName, resolveAuthorMatch(finalAuthorName, allAuthors));
  }

  const normalizedSummary = cleanTextSummary(story?.storySummary || story?.summary || story?.description?.blocks || text || '');

  // Format publish date if available
  const publishDate = story?.publishDate || story?.proposedFilingDate || null;
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

  return `
    <div class="w-full flex mt-4 flex-col gap-3 lg:gap-4">
      <p class="font-libre text-xl lg:text-[24px] font-semibold italic leading-snug text-black">
        ${normalizedSummary}
      </p>

      <div class="flex flex-col gap-1">
        <div class="w-28 border-t-[0.5px] border-black"></div>

        <span class="text-[12px] uppercase tracking-wide font-share text-black pt-2">
          ${displayAuthorHTML}
        </span>
       ${formattedDate ? `<span class="text-[11px] font-share text-black">${escapeHtml(formattedDate)}</span>` : ""}
      </div>
    </div>
  `;
}

//  RENDER: BlogBodyCard — injects in-story ad after every N paragraphs

// ─── Shared Spotlight campaign resolution ────────────────────────────────
// Used both by renderBlogBodyCard (mobile in-body cover-stack slider) and by
// renderBlogGrid's "blog-grid-right-5" sidebar zone (desktop fallback card,
// rendered alongside/like PopularBlogCard instead of as a rail beside the
// article body).
function resolveActiveSpotlightCampaign(campaigns = []) {
  const now = new Date();
  let spotlightJob = null;
  let spotlightCampaign = null;
  for (const camp of campaigns) {
    if (!camp.jobs) continue;
    for (const job of camp.jobs) {
      const fmt = (job.adFormat || job.ad_format || '').toLowerCase().replace(/[\s_-]+/g, '');
      if (fmt !== 'spotlight') continue;
      const imgs = job.spotlightMobileImages || job.spotlight_mobile_images
        || job.creatives?.spotlightMobileImages || job.creatives?.spotlight_mobile_images;
      if (!Array.isArray(imgs) || imgs.filter(Boolean).length < 1) continue;
      const start = job.startTime ? new Date(job.startTime) : null;
      const end = job.endTime ? new Date(job.endTime) : null;
      const campStatus = (camp.status || '').toLowerCase().trim().replace(/[\s_-]+/g, '_');
      const isActive =
        (['start_now', 'active', 'running', 'started'].includes(campStatus) || campStatus.includes('start')) &&
        (!start || start <= now) &&
        (!end || end >= now);
      if (isActive) {
        spotlightJob = job;
        spotlightCampaign = camp;
        break;
      }
    }
    if (spotlightJob) break;
  }
  return { job: spotlightJob, campaign: spotlightCampaign };
}

// Builds the desktop-only Spotlight fallback ad card (image + link), styled
// as a bordered/shadowed card so it can drop into the blog-grid-right-5
// sidebar zone and match PopularBlogCard's placement/width/spacing.
function buildSpotlightDesktopFallbackHtml(job, campaign) {
  if (!job) return '';
  const imgs = (job.spotlightMobileImages || job.spotlight_mobile_images
    || job.creatives?.spotlightMobileImages || job.creatives?.spotlight_mobile_images || [])
    .filter(Boolean);
  if (imgs.length === 0) return '';
  const rawIdx = job.spotlightFallbackIndex ?? job.spotlight_fallback_index;
  const idx = Number.isInteger(Number(rawIdx)) && imgs[Number(rawIdx)] ? Number(rawIdx) : 0;
  const fallbackUrl = imgs[idx] || imgs[0];
  const linkUrl = job.landingPageURL || job.landing_page_url || campaign?.landingPageURL || campaign?.url || '#';
  const altText = campaign?.campaignName || campaign?.name || 'Advertisement';
  const campaignId = campaign?.campaignId || campaign?.id || '';
  const jobId = job.jobId || job.id || '';
  return `
<div id="instory-spotlight-desktop-fallback" data-ad-block="Spotlight-Desktop-Fallback" style="width:100%;box-sizing:border-box;">
  <span style="display:block;font-size:10px;text-transform:uppercase;font-weight:700;color:#9ca3af;letter-spacing:0.1em;margin-bottom:8px;">Advertisement</span>
  <a href="${fallbackUrl ? linkUrl : '#'}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;" onclick="
    if(typeof cwr === 'function') { cwr('recordEvent', { type: 'ad_click', data: { campaignId: '${campaignId}' } }); }
    var api = window.__openPress_API__ || '';
    if(api) {
      fetch(api + '/campaigns/trackEvent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: '${campaignId}', jobId: '${jobId}', eventType: 'click', placement: 'spotlight', pageUrl: window.location.href, referrer: document.referrer })
      }).catch(function(e) { console.warn('Failed to track ad click', e); });
    }
  ">
    <img src="${fallbackUrl}" alt="${altText}" loading="lazy" style="width:100%;height:auto;display:block;" />
  </a>
</div>`;
}

// ─── Popup Ad — full-page overlay/modal ad ─────────────────────────────────
// Unlike Spotlight/Leaderboard/Sidebar/InStory (which live inside a specific
// Puck zone), a Popup Ad floats above the entire page, so it is NOT rendered
// as a Puck-placeable block. Instead it's injected once per page, directly by
// the top-level page renderers (renderHomePageFromPuckJSON, lib/renderBlogPage.js's
// renderPageFromPuckJSON), right before the closing </body>. Because it's
// injected exactly once per page-render call (not once per grid/zone
// component), it is inherently immune to the "renders twice" class of bug we
// hit with the Spotlight sidebar card.
export function resolveActivePopupCampaign(campaigns = []) {
  const now = new Date();
  const INACTIVE = new Set(['paused', 'pause', 'draft', 'stopped', 'ended', 'cancelled', 'canceled']);
  let popupJob = null;
  let popupCampaign = null;

  for (const camp of campaigns) {
    const st = (camp.status || '').toLowerCase().replace(/[\s_-]+/g, '_');
    if (INACTIVE.has(st)) continue;
    if (!camp.jobs) continue;

    for (const job of camp.jobs) {
      const fmt = (job.adFormat || job.ad_format || '').toLowerCase().replace(/[\s_-]+/g, '');
      if (fmt !== 'popup') continue;

      const desktopImg = job.popupDesktopImage || job.popup_desktop_image;
      const mobileImg = job.popupMobileImage || job.popup_mobile_image;
      if (!desktopImg && !mobileImg) continue;

      const start = job.startTime ? new Date(job.startTime) : null;
      const end = job.endTime ? new Date(job.endTime) : null;
      if (start && start > now) continue;
      if (end && end < now) continue;

      popupJob = job;
      popupCampaign = camp;
      break;
    }
    if (popupJob) break;
  }

  return { job: popupJob, campaign: popupCampaign };
}

export function buildPopupAdHtml(job, campaign) {
  if (!job) return '';

  const desktopImg = job.popupDesktopImage || job.popup_desktop_image || '';
  const mobileImg = job.popupMobileImage || job.popup_mobile_image || desktopImg;
  if (!desktopImg && !mobileImg) return '';

  const jobId = job.jobId || job.job_id || `popup-${Math.random().toString(36).slice(2)}`;
  const linkUrl = job.landingPageURL || job.landing_page_url || campaign?.landingPageURL || campaign?.url || '#';
  const altText = (campaign?.campaignName || campaign?.name || 'Advertisement').replace(/"/g, '&quot;');
  const ctaText = job.popupCtaText || job.popup_cta_text || '';

  // Trigger config — "immediate" and "delay" both resolve to a plain timer;
  // "immediate" is simply delay=0.
  const trigger = (job.popupTrigger || 'immediate').toLowerCase();
  const triggerVal = Number(job.popupTriggerVal) || 0;
  const capDays = job.popupCapDays !== undefined ? Number(job.popupCapDays) : 7;
  const hideOnConvert = job.popupHideOnConvert !== false;

  const id = `popup-ad-${jobId}`;
  const capKey = `popup_ad_seen_${jobId}`;

  return `
<div id="${id}" class="popup-ad-overlay" data-ad-block="Popup-Ad" style="display:none;position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.6);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
  <div class="popup-ad-card" style="position:relative;max-width:520px;width:100%;">
    <button type="button" class="popup-ad-close" aria-label="Close advertisement" style="position:absolute;top:-14px;right:-14px;width:32px;height:32px;border-radius:50%;background:#fff;border:1px solid #e5e7eb;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#111;z-index:1;">&times;</button>
    <span style="display:block;font-size:10px;text-transform:uppercase;font-weight:700;color:#e5e7eb;letter-spacing:0.1em;margin-bottom:6px;">Advertisement</span>
    <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="popup-ad-link" style="display:block;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.3);background:#fff;">
      <img class="popup-ad-img-desktop" src="${desktopImg || mobileImg}" alt="${altText}" style="width:100%;height:auto;display:block;" />
      <img class="popup-ad-img-mobile" src="${mobileImg || desktopImg}" alt="${altText}" style="width:100%;height:auto;display:none;" />
      ${ctaText ? `<span class="popup-ad-cta" style="display:block;text-align:center;padding:10px 16px;font-weight:600;font-size:14px;background:#111;color:#fff;">${ctaText}</span>` : ''}
    </a>
  </div>
</div>
<style>
@media(max-width:768px){
  #${id} .popup-ad-img-desktop{ display:none !important; }
  #${id} .popup-ad-img-mobile{ display:block !important; }
}
</style>
<script>
(function(){
  var overlay = document.getElementById('${id}');
  if(!overlay) return;

  // Donors never see the popup ad — bail out before arming any trigger.
  function isDonorUser(){
    try {
      var keys = ['website_user', 'auth_user', 'user'];
      for (var i = 0; i < keys.length; i++) {
        var u = JSON.parse(localStorage.getItem(keys[i]) || '{}');
        if (u && (
          u.isDonor === true ||
          u.adFree === true ||
          u.suppressCampaigns === true ||
          Number(u.donationTotalAmount || 0) > 0 ||
          Number(u.donationCount || 0) > 0 ||
          Number(u.lastDonationAmount || 0) > 0
        )) return true;
      }
    } catch(e) {}
    return false;
  }
  if (isDonorUser()) {
    overlay.style.setProperty('display', 'none', 'important');
    return;
  }

  var capKey = ${JSON.stringify(capKey)};
  var capDays = ${capDays};
  var hideOnConvert = ${hideOnConvert ? 'true' : 'false'};
  var trigger = ${JSON.stringify(trigger)};
  var triggerVal = ${triggerVal};
  var shown = false;

  var stored = null;
  try { stored = JSON.parse(localStorage.getItem(capKey) || 'null'); } catch(e) {}
  if (stored && stored.converted) return;
  if (stored && stored.lastShown && (Date.now() - stored.lastShown) < capDays * 86400000) return;

  function showPopup(){
    if (shown) return;
    shown = true;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try { localStorage.setItem(capKey, JSON.stringify({ lastShown: Date.now() })); } catch(e) {}
    try {
      var api = window.__openPress_API__ || '';
      if (api) {
        fetch(api + '/campaigns/trackEvent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: '${campaign?.campaignId || campaign?.id || ''}',
            jobId: '${job.jobId || job.job_id || job.id || ''}',
            eventType: 'impression',
            placement: 'popup',
            pageUrl: window.location.href,
            referrer: document.referrer
          })
        }).catch(function(e) { console.warn('Failed to track ad impression', e); });
      }
    } catch(err) {}
  }

  function closePopup(){
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  overlay.querySelector('.popup-ad-close').addEventListener('click', function(e){
    e.preventDefault();
    closePopup();
  });
  overlay.addEventListener('click', function(e){
    if (e.target === overlay) closePopup();
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && overlay.style.display !== 'none') closePopup();
  });
  var link = overlay.querySelector('.popup-ad-link');
  if (link) {
    link.addEventListener('click', function(){
      if (hideOnConvert) {
        try { localStorage.setItem(capKey, JSON.stringify({ converted: true })); } catch(e) {}
      }
      try {
        var api = window.__openPress_API__ || '';
        if (api) {
          fetch(api + '/campaigns/trackEvent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaignId: '${campaign?.campaignId || campaign?.id || ''}',
              jobId: '${job.jobId || job.job_id || job.id || ''}',
              eventType: 'click',
              placement: 'popup',
              pageUrl: window.location.href,
              referrer: document.referrer
            })
          }).catch(function(e) { console.warn('Failed to track ad click', e); });
        }
      } catch(err) {}
    });
  }

  function armDelay(){
    setTimeout(showPopup, Math.max(0, triggerVal) * 1000);
  }

  function armScroll(){
    var ticking = false;
    function check(){
      ticking = false;
      var docEl = document.documentElement;
      var scrollable = docEl.scrollHeight - window.innerHeight;
      var pct = scrollable > 0 ? ((window.scrollY / scrollable) * 100) : 100;
      if (pct >= triggerVal) {
        showPopup();
        window.removeEventListener('scroll', onScroll);
      }
    }
    function onScroll(){
      if (!ticking) { ticking = true; requestAnimationFrame(check); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    if (document.documentElement.scrollHeight <= window.innerHeight) check();
  }

  function armExitIntent(){
    if (window.innerWidth <= 768) return;
    var armedAt = Date.now();
    function onMouseOut(e){
      if (Date.now() - armedAt < 3000) return;
      if (e.clientY <= 0 && !e.relatedTarget) {
        showPopup();
        document.removeEventListener('mouseout', onMouseOut);
      }
    }
    document.addEventListener('mouseout', onMouseOut);
  }

  switch (trigger) {
    case 'scroll':
      armScroll();
      break;
    case 'exit_intent':
      armExitIntent();
      break;
    case 'delay':
    case 'immediate':
    default:
      armDelay();
      break;
  }
})();
</script>`;
}

// publishedStoriesById: every published story; storiesById may hold only the story being rendered.
export function renderBlogBodyCard({ storyId, bodyText }, storiesById, campaigns = [], moreStoriesInjections = [], publishedStoriesById = null) {
  const story = findStory(storyId, storiesById);

  // ─── Resolve active In-story campaign ────────────────────────────────────
  const now = new Date();
  let inStoryJob = null;
  let inStoryCampaign = null;
  for (const camp of campaigns) {
    if (!camp.jobs) continue;
    for (const job of camp.jobs) {
      const placement = (job.placement || '').toLowerCase().trim().replace(/[\s_-]+/g, '-');
      const campaignType = (camp.type || '').toLowerCase().trim().replace(/[\s_-]+/g, '-');
      const placementMatch = placement === 'instory' || placement === 'in-story' || placement === 'instory-ad' || placement === 'in-story-ad';
      const typeMatch = campaignType === 'instory' || campaignType === 'in-story' || campaignType === 'instory-ad' || campaignType === 'in-story-ad';
      if (!placementMatch && !typeMatch) continue;
      const start = job.startTime ? new Date(job.startTime) : null;
      const end = job.endTime ? new Date(job.endTime) : null;
      const campStatus = (camp.status || '').toLowerCase().trim().replace(/[\s_-]+/g, '_');
      const isActive =
        (['start_now', 'active', 'running', 'started'].includes(campStatus) || campStatus.includes('start')) &&
        (!start || start <= now) &&
        (!end || end >= now);
      if (isActive) {
        inStoryJob = job;
        inStoryCampaign = camp;
        break;
      }
    }
    if (inStoryJob) break;
  }

  // afterParagraph: every N paragraphs (default 3)
  const rawAfterParagraph = inStoryJob?.afterParagraph ?? inStoryJob?.after_paragraph;
  const afterEvery = (inStoryJob && Number(rawAfterParagraph) > 0)
    ? Number(rawAfterParagraph)
    : null;

  // ─── Resolve active Spotlight campaign ───────────────────────────────────
  // Spotlight Ads reuse the same "position after paragraph N" placement mechanic
  // as In-Story Ads, independent of which placement slot the job is attached to.
  // Unlike In-Story, Spotlight always shows once (never repeats).
  const { job: spotlightJob, campaign: spotlightCampaign } = resolveActiveSpotlightCampaign(campaigns);

  // Spotlight afterParagraph: single fixed position (default 3), never repeats.
  const rawSpotlightAfterParagraph = spotlightJob?.afterParagraph ?? spotlightJob?.after_paragraph;
  const spotlightAfterParagraph = spotlightJob
    ? (Number(rawSpotlightAfterParagraph) > 0 ? Number(rawSpotlightAfterParagraph) : 3)
    : null;

  // ─── Build Spotlight ad HTML snippet ─────────────────────────────────────
  // Desktop fallback is NOT built here — it's rendered by renderBlogGrid in the
  // "blog-grid-right-5" sidebar zone (same placement/width/spacing as
  // PopularBlogCard), not inline inside the article body.
  function buildSpotlightAdHtml(campaign) {
    if (!campaign) return '';
    // Reuse the shared Spotlight renderer (cover-stack mobile interscroller) so the
    // format stays identical to the homepage/Puck-zone Spotlight block — only the
    // in-story position (afterParagraph) is story-specific.
    return renderSpotlightAd(
      { id: 'instory-spotlight-ad', adId: 'auto' },
      { zones: {}, storiesById: {}, campaigns: [campaign] }
    );
  }

  // ─── Build in-story ad HTML snippet ──────────────────────────────────────
  function buildInStoryAdHtml(job, campaign) {
    if (!job) return '';
    const placementVal = job?.placement || 'in-story';
    const normalizedP = placementVal.toLowerCase().replace(/[\s_-]+/g, '-');
    const rawPlacement = job?.placement || 'instory';

    const campaignCreatives = campaign?.creatives || {};
    const creativeFromCamp =
      campaignCreatives[normalizedP] ||
      campaignCreatives[rawPlacement] ||
      campaignCreatives[placementVal] ||
      Object.values(campaignCreatives)[0] ||
      {};

    const desktopUrl =
      (Array.isArray(job.creatives?.desktop)
        ? (job.creatives.desktop[0]?.fileUrl || job.creatives.desktop[0]?.preview || '')
        : (typeof job.creatives?.desktop === 'string' ? job.creatives.desktop : '')) ||
      job.desktop ||
      (typeof creativeFromCamp === 'string' ? creativeFromCamp : (creativeFromCamp && typeof creativeFromCamp === 'object' ? (creativeFromCamp.desktop || '') : '')) ||
      '';
    const mobileUrl =
      (Array.isArray(job.creatives?.mobile)
        ? (job.creatives.mobile[0]?.fileUrl || job.creatives.mobile[0]?.preview || '')
        : (typeof job.creatives?.mobile === 'string' ? job.creatives.mobile : '')) ||
      job.mobile ||
      (typeof creativeFromCamp === 'string' ? creativeFromCamp : (creativeFromCamp && typeof creativeFromCamp === 'object' ? (creativeFromCamp.mobile || '') : '')) ||
      desktopUrl;
    const linkUrl =
      job.landingPageURL ||
      job.landingPageUrl ||
      job.url ||
      campaign?.landingPageURL ||
      campaign?.landingPageUrl ||
      campaign?.url ||
      campaign?.landing_page_url ||
      '#';
    const altText = 'Advertisement';
    const cleanTag = (tag) => {
      if (!tag) return '';
      return tag
        .replace(/\u00A0/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/{{LANDING_PAGE_URL}}/gi, linkUrl);
    };
    const tagDesktop = cleanTag(
      job.thirdPartyTagDesktop ||
      job.third_party_tag_desktop ||
      job.tagDesktop ||
      job.desktop_tag ||
      campaign?.thirdPartyTag ||
      campaign?.third_party_tag ||
      campaign?.thirdPartyTagDesktop ||
      campaign?.third_party_tag_desktop ||
      ''
    );
    const tagMobile = cleanTag(
      job.thirdPartyTagMobile ||
      job.third_party_tag_mobile ||
      job.third_party_tag_mobile_tag ||
      job.tagMobile ||
      job.mobile_tag ||
      campaign?.thirdPartyTagMobile ||
      campaign?.third_party_tag_mobile ||
      campaign?.third_party_tag_mobile_tag ||
      tagDesktop
    );

    if (!desktopUrl && !tagDesktop) return '';

    const trackCampaignId = campaign?.campaignId || campaign?.id || '';
    const trackJobId = job?.jobId || job?.id || '';
    // The ad can repeat down the story, so the impression is sent once per page view.
    const impressionScript = trackCampaignId ? `
        <script>
          (function() {
            var api = window.__openPress_API__ || '';
            var seen = window.__instoryImpressions = window.__instoryImpressions || {};
            var key = '${trackCampaignId}|${trackJobId}';
            if (!api || seen[key]) return;
            seen[key] = true;
            fetch(api + '/campaigns/trackEvent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ campaignId: '${trackCampaignId}', jobId: '${trackJobId}', eventType: 'impression', placement: 'in-story', pageUrl: window.location.href, referrer: document.referrer })
            }).catch(function(e) { console.warn('Failed to track ad impression', e); });
          })();
        </script>` : '';

    if (tagDesktop) {
      // Third-party tag mode
      return `
        <div class="instory-ad w-full my-6 flex justify-center" style="max-width:100%;">
          <div class="w-full flex flex-col items-center">
            <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #6b7280; letter-spacing: 0.1em; margin-bottom: 8px;">
                Advertisement
            </span>
            <div class="w-full flex justify-center overflow-hidden">
                <div class="instory-ad-desktop hidden md:block" style="width: 728px; height: 90px;">
                    <iframe
                        srcdoc="<style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}</style>${tagDesktop.replace(/"/g, '&quot;')}"
                        style="width: 100%; height: 100%; border: none; overflow: hidden;"
                        scrolling="no"
                        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                    ></iframe>
                </div>
                <div class="instory-ad-mobile block md:hidden" style="width: 320px; height: 50px;">
                    <iframe
                        srcdoc="<style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}</style>${tagMobile.replace(/"/g, '&quot;')}"
                        style="width: 100%; height: 100%; border: none; overflow: hidden;"
                        scrolling="no"
                        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                    ></iframe>
                </div>
            </div>
          </div>
        </div>${impressionScript}`;
    }

    return `
      <div class="instory-ad w-full my-6 flex justify-center" style="max-width:100%;">
        <div class="w-full flex flex-col items-center">
            <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #6b7280; letter-spacing: 0.1em; margin-bottom: 8px;">
                Advertisement
            </span>
            <a href="${linkUrl || '#'}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; max-width: 728px; border: 1px solid #f3f4f6; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); overflow: hidden;" onclick="if(typeof cwr === 'function') { cwr('recordEvent', { type: 'ad_click', data: { campaignId: '${campaign?.campaignId || campaign?.id || ''}' } }); } var api = window.__openPress_API__ || ''; if(api) { fetch(api + '/campaigns/trackEvent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: '${trackCampaignId}', jobId: '${trackJobId}', eventType: 'click', placement: 'in-story', pageUrl: window.location.href, referrer: document.referrer }) }).catch(function(e) { console.warn('Failed to track ad click', e); }); }">
                <picture>
                  <source media="(max-width:768px)" srcset="${mobileUrl}">
                  <img src="${desktopUrl}" alt="${altText}" class="w-full h-auto object-contain" loading="lazy" />
                </picture>
            </a>
        </div>
      </div>${impressionScript}`;
  }

  function buildMoreStoriesHtml(savedStories, headingColor) {
    // The list is saved with the template; drop stories deactivated since (storiesById holds published ones only).
    const publishedIds = new Set(Object.values(publishedStoriesById || {}).map((s) => s?.id || s?.storyId).filter(Boolean));
    const stories = publishedIds.size > 0
      ? (savedStories || []).filter((story) => !story?.id || publishedIds.has(story.id))
      : savedStories;
    if (!stories || stories.length === 0) return '';

    const borderStyle = headingColor ? `border-color:${escapeHtml(headingColor)};` : '';
    const accent = escapeHtml(headingColor || '#9ca3af');
    const storyItems = stories;
    const storyLinks = storyItems.map((story, idx) => {
      const href = escapeHtml(story.publishUrl || story.redirectUrl || '#');
      const headline = escapeHtml(story.headline || story.title || 'Untitled Story');
      const summaryText = story.summary || story.storySummary || "";
      const summarySpan = summaryText ? `<span class="font-normal text-gray-800"> ${escapeHtml(summaryText)}</span>` : "";
      
      return `<a key="${idx}" href="${href}" target="_blank" rel="noopener noreferrer" class="group block text-black hover:text-gray-600 underline decoration-gray-400 hover:decoration-[var(--more-stories-accent)] hover:decoration-2 underline-offset-4 transition-all">
          <p class="text-[#222] text-[16px] md:text-[18px] leading-[1.6] inline">
            <strong class="font-bold text-black">${headline}</strong>${summarySpan}
          </p>
        </a>`;
    }).join('');

    return `
      <div class="relative w-full my-8 clear-both font-sans">
        <div class="absolute left-1/2 transform -translate-x-1/2 -top-[14px] bg-white border text-black font-bold text-[12px] px-3 py-1 tracking-widest uppercase z-10" style="${borderStyle}">
          More Reading
        </div>
        <div class="border bg-white p-6 pt-8 flex flex-col gap-5 max-w-[800px] mx-auto" style="${borderStyle} --more-stories-accent:${accent};">
          ${storyLinks}
        </div>
      </div>`;
  }

  // ─── Build body HTML, injecting ad after every N paragraphs ──────────────
  let bodyHtml = '';

  const blocks = story?.description?.blocks;
  if (Array.isArray(blocks) && blocks.length > 0 && (afterEvery !== null || spotlightAfterParagraph !== null || moreStoriesInjections.length > 0)) {
    // Use EditorJS blocks directly so we can count paragraphs precisely
    const adSnippet = buildInStoryAdHtml(inStoryJob, inStoryCampaign);
    const shouldRepeat = inStoryJob?.repeatAd !== false && inStoryJob?.repeat_ad !== false;
    const spotlightSnippet = buildSpotlightAdHtml(spotlightCampaign);
    let spotlightInjected = false;
    let paragraphCount = 0;

    for (const block of blocks) {
      if (block.type === 'paragraph') {
        bodyHtml += `<p>${block.data?.text || ''}</p>`;
        paragraphCount++;
        if (adSnippet && afterEvery !== null) {
          if (shouldRepeat) {
            if (paragraphCount % afterEvery === 0) {
              bodyHtml += adSnippet;
            }
          } else {
            if (paragraphCount === afterEvery) {
              bodyHtml += adSnippet;
            }
          }
        }
        // Spotlight always shows once, at its configured paragraph position — never repeats.
        if (spotlightSnippet && !spotlightInjected && spotlightAfterParagraph !== null && paragraphCount === spotlightAfterParagraph) {
          bodyHtml += spotlightSnippet;
          spotlightInjected = true;
        }
        // Inject More Stories cards at their configured paragraph positions
        for (const injection of moreStoriesInjections) {
          if (injection.insertAfterParagraph === paragraphCount) {
            bodyHtml += buildMoreStoriesHtml(injection.stories, injection.headingColor);
          }
        }
      } else if (block.type === 'image') {
        const url = block.data?.file?.url || block.data?.url || '';
        const rawCaption = block.data?.caption || block.data?.file?.caption || '';
        const caption = (rawCaption && !rawCaption.startsWith('Image contains:')) ? rawCaption : '';
        // Tune data is saved by EditorJS as a sibling of `data` (block.tunes), not nested
        // inside `data`. Fall back to the old (incorrect) `data.tunes` path defensively.
        const imageTune = block.tunes?.imageWrapTune || block.data?.tunes?.imageWrapTune || {};
        const wrapAlign = imageTune.wrapAlign || null;
        const captionHtml = caption
          ? `<figcaption class="openPress-story-caption font-lato text-[16px] leading-snug font-medium text-left m-0 mt-2 mb-4" style="color:#716d6d; font-family:'Lato',sans-serif;">${caption}</figcaption>`
          : '';

        if (wrapAlign) {
          const floatStyle = wrapAlign === 'left'
            ? 'float:left; margin: 0 1.5rem 1rem 0; max-width: 45%;'
            : 'float:right; margin: 0 0 1rem 1.5rem; max-width: 45%;';
          bodyHtml += `<figure class="story-image-wrap-figure article-inline-figure" style="${floatStyle}; margin: 0;"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="width:100%;display:block;" loading="lazy"/>${captionHtml}</figure>`;
        } else {
          const align = imageTune.align || 'center';
          const width = imageTune.width || 100;
          const marginLeft = align === 'left' ? '0' : 'auto';
          const marginRight = align === 'right' ? '0' : 'auto';
          bodyHtml += `<figure class="mb-2 story-image-figure article-inline-figure" style="margin-bottom: 1rem; max-width:${width}%; margin-left:${marginLeft}; margin-right:${marginRight};"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="display:block; width:100%; height:auto; object-fit:contain;" loading="lazy"/>${captionHtml}</figure>`;
        }
      } else if (block.type === 'wrappedImageParagraph') {
        const url = block.data?.imageUrl || '';
        const wrapAlign = block.data?.wrapAlign || 'left';
        const caption = block.data?.caption || '';
        const text = block.data?.text || '';
        const width = block.data?.width || 40;
        const floatStyle = wrapAlign === 'left'
          ? `float:left; margin: 0 1.5rem 1rem 0; max-width:${width}%; width:auto;`
          : `float:right; margin: 0 0 1rem 1.5rem; max-width:${width}%; width:auto;`;
        bodyHtml += `<div style="overflow:hidden;" class="story-wrapped-paragraph"><div class="story-image-wrap-figure article-inline-figure" style="${floatStyle}"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="max-width:100%;width:auto;height:auto;display:block;" loading="lazy"/>${caption ? `<p style="font-size:13px;color:#716d6d;margin-top:4px;">${caption}</p>` : ''}</div><p>${text}</p></div>`;
      } else if (block.type === 'caption') {
        const data = block.data || {};
        bodyHtml += `<p class="openPress-story-caption font-lato text-[16px] leading-snug font-medium text-left m-0 mb-4" style="color:#716d6d; font-family:'Lato',sans-serif;">${data.text || ''}</p>`;
      } else if (block.type === 'header') {
        const data = block.data || {};
        const level = data.level || 2;
        bodyHtml += `<h${level}>${data.text || ""}</h${level}>`;
      } else if (block.type === 'list') {
        const data = block.data || {};
        const isOrdered = data.style === "ordered";
        const tag = isOrdered ? "ol" : "ul";
        const listStyleType = isOrdered ? "decimal" : "disc";
        const items = Array.isArray(data.items)
          ? data.items.map((item) => `<li style="margin-bottom: 0.25rem;">${typeof item === 'string' ? item : item.content || ""}</li>`).join("")
          : "";
        bodyHtml += `<${tag} style="list-style-type: ${listStyleType}; padding-left: 1.5rem; margin-bottom: 1rem;">${items}</${tag}>`;
      } else if (block.type === 'quote') {
        const data = block.data || {};
        const text = data.text || "";
        const alignment = data.alignment || "left";
        const quoteCaption = data.caption ? `<cite>${data.caption}</cite>` : "";
        bodyHtml += `<blockquote style="text-align: ${alignment};">${text}${quoteCaption}</blockquote>`;
      } else if (block.type === 'embed' || block.type === 'youtube' || block.type === 'instagram' || block.type === 'soundcloud') {
        const data = block.data || {};
        const embedUrl = data.embed || data.source;
        if (embedUrl) {
          let captionMaxWidth = '800px';
          if (data.service === 'instagram' || block.type === 'instagram') {
            captionMaxWidth = '550px';
          }
          const trimmedCaption = (data.caption || "").trim();
          const embedCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: ${captionMaxWidth}; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
          let style = 'width: 100%; border: none; margin: 0 auto; display: block;';
          let height = data.height || 400;
          let width = data.width || '100%';

          if (data.service === 'instagram') {
            style += ' max-width: 550px; height: 700px;';
          } else if (data.service === 'soundcloud') {
            style += ' height: 300px;';
          } else if (data.service === 'youtube') {
            style += ' aspect-ratio: 16/9; max-width: 800px;';
          }

          bodyHtml += `<div class="embed-wrapper mb-2" style="width: 100%; display: flex; flex-direction: column; align-items: center;"><iframe class="embed-tool__content" src="${embedUrl}" style="${style}" height="${height}" width="${width}" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media"></iframe>${embedCaption}</div>`;
        }
      } else if (block.type === 'facebook') {
        const data = block.data || {};
        const embedUrl = data.url || data.embed || data.source;
        if (embedUrl) {
          const trimmedCaption = (data.caption || "").trim();
          const embedCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: 800px; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
          const encodedUrl = encodeURIComponent(embedUrl);
          const fbSrc = `https://www.facebook.com/plugins/post.php?href=${encodedUrl}&show_text=false&width=500`;
          bodyHtml += `<div class="embed-wrapper mb-2" style="width: 100%; display: flex; flex-direction: column; align-items: center;"><iframe class="embed-tool__content" src="${fbSrc}" style="width: 100%; border: none; margin: 0 auto; display: block;" height="497" width="100%" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media"></iframe>${embedCaption}</div>`;
        }
      } else if (block.type === 'twitter') {
        const data = block.data || {};
        const tweetHtml = (data.html || '').replace(/\n/g, '');
        const trimmedCaption = (data.caption || "").trim();
        const tweetCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: 550px; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
        bodyHtml += `<div class="twitter-embed-wrapper mb-2 w-full flex flex-col items-center">${tweetHtml}${tweetCaption}</div>`;
      }
    }
  } else {
    // Fallback: plain text (fullDescription / summary / bodyText)
    const displayText = bodyText || story?.fullDescription || story?.summary || '';
    const html = displayText
      .split(/(<[^>]+>)/g)
      .map(part =>
        part.startsWith('<')
          ? part
          : part.replace(/\n{2,}/g, '<br/><br/>').replace(/\n/g, '<br/>')
      )
      .join('');
    bodyHtml = html;

    // Previously this branch only handled moreStoriesInjections — in-story/spotlight ads
    // were silently never injected for plain-text bodies (fullDescription/summary), which
    // is the most common story format. Also fixed here: the old code matched paragraph
    // boundaries on `</p>` tags, but this branch's HTML uses `<br/><br/>` (no <p> tags at
    // all), so that regex could never match — moreStoriesInjections were silently broken
    // too. Both now split on the actual `<br/><br/>` boundary the HTML really uses.
    const adSnippet = buildInStoryAdHtml(inStoryJob, inStoryCampaign);
    const shouldRepeat = inStoryJob?.repeatAd !== false && inStoryJob?.repeat_ad !== false;
    const spotlightSnippet = buildSpotlightAdHtml(spotlightCampaign);

    if (moreStoriesInjections.length > 0 || afterEvery !== null || spotlightAfterParagraph !== null) {
      const segments = bodyHtml.split(/(<br\s*\/?>[\s]*<br\s*\/?>)/gi);
      let paragraphCount = 0;
      let spotlightInjected = false;
      let result = '';
      for (const segment of segments) {
        result += segment;
        if (/^<br\s*\/?>[\s]*<br\s*\/?>/i.test(segment)) {
          paragraphCount++;
          if (adSnippet && afterEvery !== null) {
            if (shouldRepeat) {
              if (paragraphCount % afterEvery === 0) {
                result += adSnippet;
              }
            } else if (paragraphCount === afterEvery) {
              result += adSnippet;
            }
          }
          // Spotlight always shows once, at its configured paragraph position — never repeats.
          if (spotlightSnippet && !spotlightInjected && spotlightAfterParagraph !== null && paragraphCount === spotlightAfterParagraph) {
            result += spotlightSnippet;
            spotlightInjected = true;
          }
          for (const injection of moreStoriesInjections) {
            if (injection.insertAfterParagraph === paragraphCount) {
              result += buildMoreStoriesHtml(injection.stories, injection.headingColor);
            }
          }
        }
      }
      // If the story is shorter than the configured spotlight position, show it at the end
      // instead of never showing it at all.
      if (spotlightSnippet && !spotlightInjected) {
        result += spotlightSnippet;
      }
      bodyHtml = result;
    }
  }


  return `
    <div class="w-full max-w-[900px] mx-auto my-5">
      <style>
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
        .blog-body-content p {
          margin: 0 0 0.8rem 0;
        }
        /* Clearfix: keeps any floated content (e.g. inline image captions) contained
           within this box's height instead of bleeding into whatever follows next. */
        .blog-body-content::after {
          content: "";
          display: table;
          clear: both;
        }
      </style>
      <div class="blog-body-content text-[19px] font-merriweather leading-[1.8rem] text-[#222] outline-none" style="font-family: 'Merriweather', serif;">
        ${bodyHtml}
      </div>
      <script>
        (function () {
          document.querySelectorAll('.blog-body-content a').forEach(function (link) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
          });

          try {
            var isDonor = false;
            ['website_user', 'auth_user', 'user'].forEach(function(key) {
              var u = JSON.parse(localStorage.getItem(key) || '{}');
              if (u && (
                u.isDonor === true ||
                u.adFree === true ||
                u.suppressCampaigns === true ||
                Number(u.donationTotalAmount || 0) > 0 ||
                Number(u.donationCount || 0) > 0 ||
                Number(u.lastDonationAmount || 0) > 0
              )) isDonor = true;
            });
            if (isDonor) {
              document.querySelectorAll('.instory-ad, .ad-block-container, [data-ad-block], .popup-ad-overlay').forEach(function(el) {
                el.style.setProperty('display', 'none', 'important');
              });
            }
          } catch(e) {}
        })();
      </script>
    </div>
  `;
}

//  RENDER: ShareCard (copy + share). Each BlogPostCard instance wires its own buttons.
export function renderShareCard({ title, url = "" }, containerId) {
  // create buttons with data attributes; wiring script will be inserted by parent
  const safeTitle = escapeHtml(title || "");
  const safeUrl = escapeHtml(url || "");

  return `
    <div class="flex flex-col items-start space-y-4 pb-2 pt-[1.40rem]">
      <div style="position: relative;">
        <button
          data-puck-share-card-button
          style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 25px;
            height: 23px;
            background: white;
            border: .25px solid black;
            color: #000;
            cursor: pointer;
            padding: 0;
          "
          title="Share"
          aria-label="Share"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            width="24"
            height="26"
            fill="black"
          >
            <path d="M12 6V2l7 7l-7 7v-4c-5 0-8.5 1.5-11 5l.8-3l.2-.4A12 12 0 0 1 12 6"></path>
          </svg>
        </button>

        <!-- Share Dropdown Menu -->
        <div
          data-puck-share-card-menu
          style="
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid rgb(62, 62, 62);
            border-radius: 0px;
            margin-top: 4px;
            z-index: 1000;
            min-width: 180px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          "
        >
        <button
          data-share-card-facebook
          style="
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 13px;
            color: #333;
            font-family: libre;
            border-bottom: 1px solid black;
            transition: background-color 0.2s;
          "
          onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
          onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
        >
          <svg fill="#000000" height="25px" width="25px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve">
          <g id="SVGRepo_bgCarrier" stroke-width="0"/>
          <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
          <g id="SVGRepo_iconCarrier"> <g> <path d="M113,145c-141.4,0-256,114.6-256,256s114.6,256,256,256s256-114.6,256-256S254.4,145,113,145z M272.8,560.7 c-20.8,20.8-44.9,37.1-71.8,48.4c-27.8,11.8-57.4,17.7-88,17.7c-30.5,0-60.1-6-88-17.7c-26.9-11.4-51.1-27.7-71.8-48.4 c-20.8-20.8-37.1-44.9-48.4-71.8C-107,461.1-113,431.5-113,401s6-60.1,17.7-88c11.4-26.9,27.7-51.1,48.4-71.8 c20.9-20.8,45-37.1,71.9-48.5C52.9,181,82.5,175,113,175s60.1,6,88,17.7c26.9,11.4,51.1,27.7,71.8,48.4 c20.8,20.8,37.1,44.9,48.4,71.8c11.8,27.8,17.7,57.4,17.7,88c0,30.5-6,60.1-17.7,88C309.8,515.8,293.5,540,272.8,560.7z"/> <path d="M146.8,313.7c10.3,0,21.3,3.2,21.3,3.2l6.6-39.2c0,0-14-4.8-47.4-4.8c-20.5,0-32.4,7.8-41.1,19.3 c-8.2,10.9-8.5,28.4-8.5,39.7v25.7H51.2v38.3h26.5v133h49.6v-133h39.3l2.9-38.3h-42.2v-29.9C127.3,317.4,136.5,313.7,146.8,313.7z"/> </g> </g>
          </svg>
          <h2 class="font-libre italic pl-2 font-semibold">FACEBOOK</h2>
        </button>
        <button
          data-share-card-twitter
          style="
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 13px;
            color: #333;
            font-family: libre;
            transition: background-color 0.2s;
            border-bottom: 1px solid black;
          "
          onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
          onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
        >
          <svg fill="#000000" height="25px" width="25px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier"> <g> <path d="M113,145c-141.4,0-256,114.6-256,256s114.6,256,256,256s256-114.6,256-256S254.4,145,113,145z M272.8,560.7 c-20.8,20.8-44.9,37.1-71.8,48.4c-27.8,11.8-57.4,17.7-88,17.7c-30.5,0-60.1-6-88-17.7c-26.9-11.4-51.1-27.7-71.8-48.4 c-20.8-20.8-37.1-44.9-48.4-71.8C-107,461.1-113,431.5-113,401s6-60.1,17.7-88c11.4-26.9,27.7-51.1,48.4-71.8 c20.9-20.8,45-37.1,71.9-48.5C52.9,181,82.5,175,113,175s60.1,6,88,17.7c26.9,11.4,51.1,27.7,71.8,48.4 c20.8,20.8,37.1,44.9,48.4,71.8c11.8,27.8,17.7,57.4,17.7,88c0,30.5-6,60.1-17.7,88C309.8,515.8,293.5,540,272.8,560.7z"/> <path d="M234.3,313.1c-10.2,6-21.4,10.4-33.4,12.8c-9.6-10.2-23.3-16.6-38.4-16.6c-29,0-52.6,23.6-52.6,52.6c0,4.1,0.4,8.1,1.4,12 c-43.7-2.2-82.5-23.1-108.4-55c-4.5,7.8-7.1,16.8-7.1,26.5c0,18.2,9.3,34.3,23.4,43.8c-8.6-0.3-16.7-2.7-23.8-6.6v0.6 c0,25.5,18.1,46.8,42.2,51.6c-4.4,1.2-9.1,1.9-13.9,1.9c-3.4,0-6.7-0.3-9.9-0.9c6.7,20.9,26.1,36.1,49.1,36.5 c-18,14.1-40.7,22.5-65.3,22.5c-4.2,0-8.4-0.2-12.6-0.7c23.3,14.9,50.9,23.6,80.6,23.6c96.8,0,149.7-80.2,149.7-149.7 c0-2.3,0-4.6-0.1-6.8c10.3-7.5,19.2-16.7,26.2-27.3c-9.4,4.2-19.6,7-30.2,8.3C222.1,335.7,230.4,325.4,234.3,313.1z"/> </g> </g>
          </svg>
          <h1 class="font-libre italic pl-2 font-semibold">TWITTER</h1>
        </button>
        <button
          data-share-card-linkedin
          style="
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 13px;
            color: #333;
            font-family: libre;
            border-bottom: 1px solid black;
            transition: background-color 0.2s;
          "
          onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
          onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
        >
          <svg fill="#000000" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve" width="25px" height="25px">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier"> <g> <path d="M329,145h-432c-22.1,0-40,17.9-40,40v432c0,22.1,17.9,40,40,40h432c22.1,0,40-17.9,40-40V185C369,162.9,351.1,145,329,145z M339,617c0,5.5-4.5,10-10,10h-432c-5.5,0-10-4.5-10-10V185c0-5.5,4.5-10,10-10h432c5.5,0,10,4.5,10,10V617z"/> <rect x="-8.5" y="348.4" width="49.9" height="159.7"/> <path d="M177.7,346.9c-28.6,0-46.5,15.6-49.8,26.6v-25.1H71.8c0.7,13.3,0,159.7,0,159.7h56.1v-86.3c0-4.9-0.2-9.7,1.2-13.1 c3.8-9.6,12.1-19.6,27-19.6c19.5,0,28.3,14.8,28.3,36.4v82.6H241v-88.8C241,369.9,213.2,346.9,177.7,346.9z"/> <path d="M15.4,273c-18.4,0-30.5,11.9-30.5,27.7c0,15.5,11.7,27.7,29.8,27.7h0.4c18.8,0,30.5-12.3,30.4-27.7 C45.1,284.9,33.8,273,15.4,273z"/> </g> </g>
          </svg>
          <h2 class="font-libre italic pl-2 font-semibold">LINKEDIN</h2>
        </button>
        <button
          data-share-card-whatsapp
          style="
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 13px;
            color: #333;
            font-family: libre;
            transition: background-color 0.2s;
            border-bottom: 1px solid black;
          "
          onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.querySelectorAll('path').forEach(p => p.setAttribute('fill', 'white')));"
          onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.querySelectorAll('path').forEach(p => p.setAttribute('fill', '#000000')));"
        >
          <svg fill="#000000" width="25px" height="25px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier">
            <path d="M11.42 9.49c-.19-.09-1.1-.54-1.27-.61s-.29-.09-.42.1-.48.6-.59.73-.21.14-.4 0a5.13 5.13 0 0 1-1.49-.92 5.25 5.25 0 0 1-1-1.29c-.11-.18 0-.28.08-.38s.18-.21.28-.32a1.39 1.39 0 0 0 .18-.31.38.38 0 0 0 0-.33c0-.09-.42-1-.58-1.37s-.3-.32-.41-.32h-.4a.72.72 0 0 0-.5.23 2.1 2.1 0 0 0-.65 1.55A3.59 3.59 0 0 0 5 8.2 8.32 8.32 0 0 0 8.19 11c.44.19.78.3 1.05.39a2.53 2.53 0 0 0 1.17.07 1.93 1.93 0 0 0 1.26-.88 1.67 1.67 0 0 0 .11-.88c-.05-.07-.17-.12-.36-.21z"/>
            <path d="M13.29 2.68A7.36 7.36 0 0 0 8 .5a7.44 7.44 0 0 0-6.41 11.15l-1 3.85 3.94-1a7.4 7.4 0 0 0 3.55.9H8a7.44 7.44 0 0 0 5.29-12.72zM8 14.12a6.12 6.12 0 0 1-3.15-.87l-.22-.13-2.34.61.62-2.28-.14-.23a6.18 6.18 0 0 1 9.6-7.65 6.12 6.12 0 0 1 1.81 4.37A6.19 6.19 0 0 1 8 14.12z"/>
            </g>
          </svg>
          <h1 class="font-libre italic pl-2 font-semibold">WHATSAPP</h1>
        </button>
      </div>

      <div style="position: relative; display: inline-block;">
        <button
          data-puck-copy-button
          style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background: none;
            border: none;
            color: #4b5563;
            cursor: pointer;
            padding-top: 2rem;
          "
          title="Copy link"
          aria-label="Copy link"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="26"
            fill="black"
          >
            <path
              d="M15 20H5V7c0-.55-.45-1-1-1s-1 .45-1 1v13c0 1.1.9 2 2 2h10c.55 0 1-.45 1-1s-.45-1-1-1m5-4V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2m-2 0H9V4h9z"
            ></path>
          </svg>
        </button>

        <span data-puck-copied-msg style="display:none; position: absolute; top: calc(100% + 20px); left: 50%; transform: translateX(-50%); white-space: nowrap;" class="text-sm text-green-600">Copied!</span>
      </div>

      <script>
        (function() {
          var container = document.getElementById("${escapeHtml(containerId)}");
          if (!container) return;

          // Get dropdown menu and buttons
          var shareBtn = container.querySelector('[data-puck-share-card-button]');
          var shareMenu = container.querySelector('[data-puck-share-card-menu]');
          var copyBtns = container.querySelectorAll('[data-puck-copy-button]');
          var msg = container.querySelector('[data-puck-copied-msg]');

          var pageUrl = typeof window !== 'undefined' ? window.location.href : '';
          var pageTitle = "${safeTitle}" || document.title || 'Check this out';

          // Mobile detection utility
          function isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          }

          function isIOS() {
            return /iPhone|iPad|iPod/i.test(navigator.userAgent);
          }

          function isAndroid() {
            return /Android/i.test(navigator.userAgent);
          }

          function isSafari() {
            return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          }

          // Open URL in new tab (Safari-compatible)
          function openInNewTab(url) {
            // Safari handles window.open without specs better - opens as new tab
            // Other browsers work fine with popup specs
            if (isSafari()) {
              window.open(url, '_blank');
            } else {
              window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer');
            }
          }

          // Smart share handler - tries native app first, falls back to web
          function smartShare(appUrl, webUrl, fallbackFn) {
            if (!isMobile()) {
              // Desktop - use web popup
              if (fallbackFn) {
                fallbackFn();
              } else {
                openInNewTab(webUrl);
              }
              return;
            }

            // Mobile - try native app URL scheme
            var startTime = Date.now();
            var timeout = null;
            var hasNavigated = false;

            function handleVisibilityChange() {
              if (document.hidden || document.webkitHidden) {
                hasNavigated = true;
                cleanup();
              }
            }

            function cleanup() {
              if (timeout) clearTimeout(timeout);
              document.removeEventListener('visibilitychange', handleVisibilityChange);
              document.removeEventListener('webkitvisibilitychange', handleVisibilityChange);
              window.removeEventListener('pagehide', handleVisibilityChange);
              window.removeEventListener('blur', handleVisibilityChange);
            }

            document.addEventListener('visibilitychange', handleVisibilityChange);
            document.addEventListener('webkitvisibilitychange', handleVisibilityChange);
            window.addEventListener('pagehide', handleVisibilityChange);
            window.addEventListener('blur', handleVisibilityChange);

            // Try to open native app
            window.location.href = appUrl;

            // Fallback to web if app doesn't open within timeout
            timeout = setTimeout(function() {
              var elapsed = Date.now() - startTime;
              if (!hasNavigated && elapsed < 2500) {
                cleanup();
                window.location.href = webUrl;
              }
            }, 1500);
          }

          // Build WhatsApp message
          function buildWhatsAppMessage(title, url) {
            return url;
          }

          // Toggle dropdown menu on Share button click
          if (shareBtn && shareMenu) {
            shareBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              var isVisible = shareMenu.style.display === 'block';
              shareMenu.style.display = isVisible ? 'none' : 'block';
            });

            // Close menu when clicking outside
            document.addEventListener('click', function(e) {
              if (!shareBtn.contains(e.target) && !shareMenu.contains(e.target)) {
                shareMenu.style.display = 'none';
              }
            });

            // Facebook Share - uses intent URL for Android, direct URL for iOS
            var facebookBtn = container.querySelector('[data-share-card-facebook]');
            if (facebookBtn) {
              facebookBtn.addEventListener('click', function() {
                shareMenu.style.display = 'none';
                var encodedUrl = encodeURIComponent(pageUrl);

                if (isMobile()) {
                  if (isAndroid()) {
                    // Android: Use intent URL which triggers app chooser with FB app
                    var intentUrl = 'intent://www.facebook.com/sharer/sharer.php?u=' + encodedUrl +
                      '#Intent;scheme=https;package=com.facebook.katana;end';
                    window.location.href = intentUrl;
                  } else {
                    // iOS: Use Facebook's share dialog URL - FB app registers as handler
                    var fbUrl = 'https://www.facebook.com/dialog/share?app_id=966242223397117&display=touch&href=' + encodedUrl + '&redirect_uri=' + encodedUrl;
                    window.location.href = fbUrl;
                  }
                } else {
                  var webUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl;
                  openInNewTab(webUrl);
                }
              });
            }

            // Twitter/X Share - uses twitter:// scheme on mobile
            var twitterBtn = container.querySelector('[data-share-card-twitter]');
            if (twitterBtn) {
              twitterBtn.addEventListener('click', function() {
                shareMenu.style.display = 'none';
                var text = encodeURIComponent(pageTitle);
                var url = encodeURIComponent(pageUrl);
                var webUrl = 'https://twitter.com/intent/tweet?url=' + url + '&text=' + text;

                if (isMobile()) {
                  var twitterAppUrl = 'twitter://post?message=' + text + '%20' + url;
                  smartShare(twitterAppUrl, webUrl);
                } else {
                  openInNewTab(webUrl);
                }
              });
            }

            // LinkedIn Share - uses linkedin:// scheme on mobile
            var linkedinBtn = container.querySelector('[data-share-card-linkedin]');
            if (linkedinBtn) {
              linkedinBtn.addEventListener('click', function() {
                shareMenu.style.display = 'none';
                var webUrl = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(pageUrl);

                if (isMobile()) {
                  var linkedinAppUrl = 'linkedin://shareArticle?mini=true&url=' + encodeURIComponent(pageUrl);
                  smartShare(linkedinAppUrl, webUrl);
                } else {
                  openInNewTab(webUrl);
                }
              });
            }

            // WhatsApp Share - uses whatsapp:// scheme on mobile
            var whatsappBtn = container.querySelector('[data-share-card-whatsapp]');
            if (whatsappBtn) {
              whatsappBtn.addEventListener('click', function() {
                shareMenu.style.display = 'none';
                var message = buildWhatsAppMessage(pageTitle, pageUrl);
                var encodedMsg = encodeURIComponent(message);

                if (isMobile()) {
                  // whatsapp:// works on both iOS and Android
                  var whatsappAppUrl = 'whatsapp://send?text=' + encodedMsg;
                  var webUrl = 'https://wa.me/?text=' + encodedMsg;
                  smartShare(whatsappAppUrl, webUrl);
                } else {
                  // Desktop - open WhatsApp Web
                  openInNewTab('https://web.whatsapp.com/send?text=' + encodedMsg);
                }
              });
            }

            // Copy Link from dropdown
            var copyFromDropdown = container.querySelector('[data-share-card-copy]');
            if (copyFromDropdown) {
              copyFromDropdown.addEventListener('click', function(e) {
                e.preventDefault();
                doCopy(pageUrl);
              });
            }
          }

          // Copy button below
          copyBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
              e.preventDefault();
              var toCopy = typeof window !== 'undefined' ? window.location.href : pageUrl;
              if (!toCopy) {
                console.error('No URL available to copy');
                return;
              }
              doCopy(toCopy);
            });
          });

          function doCopy(urlToCopy) {
            // Try modern Clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(urlToCopy).then(function() {
                showCopyNotification();
              }).catch(function(err) {
                console.error('Clipboard copy failed:', err);
                fallbackCopy();
              });
            } else {
              fallbackCopy();
            }

            function fallbackCopy() {
              var textArea = document.createElement('textarea');
              textArea.value = urlToCopy;
              textArea.style.position = 'fixed';
              textArea.style.left = '-999999px';
              textArea.style.top = '-999999px';
              document.body.appendChild(textArea);
              textArea.select();
              try {
                document.execCommand('copy');
                showCopyNotification();
              } catch (err) {
                console.error('Fallback copy failed:', err);
              }
              document.body.removeChild(textArea);
            }

            function showCopyNotification() {
              if (msg) {
                msg.style.display = 'inline';
                setTimeout(function() {
                  msg.style.display = 'none';
                }, 2000);
              }
            }
          }
        })();
      </script>
    </div>
    </div>
  `;
}

//  MAIN RENDERER: BlogPostCard
export function renderBlogPostCard(props, zones, storiesById, ctx = {}) {
  const allAuthors = ctx.allAuthors || [];
  const {
    id,
    storyId,
    title = "Default Blog Title",
    author = "Author Name",
    time = "Just now",
    category = "CATEGORY",
    section,
    imageUrl,
    bodyText,
    className = "",
  } = props || {};


  function renderEditorJsBlocks(blocks) {
    if (!Array.isArray(blocks)) return "";

    return blocks
      .map((block) => {
        if (block.type === "paragraph") {
          return `<p>${block.data?.text || ""}</p>`;
        }
        if (block.type === "image") {
          const url = block.data?.file?.url || block.data?.url;
          const rawCaption = block.data?.caption || block.data?.file?.caption || "";
          const caption = (rawCaption && !rawCaption.startsWith("Image contains:")) ? rawCaption : "";
          // Tune data is saved by EditorJS as a sibling of `data` (block.tunes), not nested
          // inside `data`. Fall back to the old (incorrect) `data.tunes` path defensively.
          const imageTune = block.tunes?.imageWrapTune || block.data?.tunes?.imageWrapTune || {};
          const wrapAlign = imageTune.wrapAlign || null;
          const captionHtml = caption
            ? `<figcaption class="openPress-story-caption font-lato text-[16px] leading-snug font-medium text-left m-0 mt-2 mb-4" style="color:#716d6d; font-family:'Lato',sans-serif;">${caption}</figcaption>`
            : '';

          if (wrapAlign) {
            const floatStyle = wrapAlign === 'left'
              ? 'float:left; margin: 0 1.5rem 1rem 0; max-width: 45%;'
              : 'float:right; margin: 0 0 1rem 1.5rem; max-width: 45%;';
            return `<figure class="story-image-wrap-figure article-inline-figure" style="${floatStyle}; margin: 0;"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="width:100%;display:block;" loading="lazy"/>${captionHtml}</figure>`;
          }

          const align = imageTune.align || 'center';
          const width = imageTune.width || 100;
          const marginLeft = align === 'left' ? '0' : 'auto';
          const marginRight = align === 'right' ? '0' : 'auto';
          return `<figure class="mb-4 story-image-figure article-inline-figure" style="margin-bottom: 1rem; max-width:${width}%; margin-left:${marginLeft}; margin-right:${marginRight};"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="display:block; width:100%; height:auto; object-fit:contain;" loading="lazy"/>${captionHtml}</figure>`;
        }
        if (block.type === 'wrappedImageParagraph') {
          const url = block.data?.imageUrl || '';
          const wrapAlign = block.data?.wrapAlign || 'left';
          const caption = block.data?.caption || '';
          const text = block.data?.text || '';
          const width = block.data?.width || 40;
          const floatStyle = wrapAlign === 'left'
            ? `float:left; margin: 0 1.5rem 1rem 0; max-width:${width}%; width:auto;`
            : `float:right; margin: 0 0 1rem 1.5rem; max-width:${width}%; width:auto;`;
          return `<div style="overflow:hidden;"><div style="${floatStyle}"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="max-width:100%;width:auto;height:auto;display:block;" loading="lazy"/>${caption ? `<p style="font-size:13px;color:#716d6d;margin-top:4px;">${caption}</p>` : ''}</div><p>${text}</p></div>`;
        }
        if (block.type === "caption") {
          return `<p class="text-[16px] leading-snug font-lato font-medium text-left m-0 mb-4" style="color: #716d6d;">${block.data?.text || ""}</p>`;
        }
        // Add more block types here later (header, list, quote, etc.)
        return "";
      })
      .join("");
  }



  // Robust story lookup:
  const story = findStory(storyId, storiesById);

  // NOTE: these fields are guaranteed to exist because PublishDrawer overrides them
  const displayTitle =
    story?.headline ||
    story?.title ||
    title;


  if (typeof window !== "undefined") {
    window.__PUCK_FINAL_TITLE__ = displayTitle;
  }


  const displayAuthor =
    story?.author ||
    story?.authorName ||
    author;

  const displayCategory =
    story?.category ||
    category;

  const displaySection =
    story?.section ||
    section;

  const displayTime =
    story?.readTime ||
    time;


  const displayImage =
    story?.imageUrl ||
    story?.image ||
    imageUrl;

  const shareImage =
    story?.socialImage ||
    displayImage;

  if (typeof window !== "undefined") {
    window.__PUCK_FINAL_IMAGE__ = shareImage;
  }

  // editorJS > fullDescription > summary
  let displayBody = "";

  if (story?.description?.blocks) {
    displayBody = renderEditorJsBlocks(story.description.blocks);
  } else if (story?.fullDescription) {
    displayBody = story.fullDescription;
  } else if (story?.summary) {
    displayBody = story.summary;
  } else {
    displayBody = bodyText || "";
  }


  // container id (use provided id or a generated one)
  const containerId = id || `blogpost-${Math.random().toString(36).slice(2, 9)}`;


  // build subparts
  const mainTitleHTML = renderBlogMainTitle({ id: containerId + "-main-title", storyId, fallbackTitle: displayTitle }, storiesById);
  const subHeadingHTML = renderBlogSubHeading({ id: containerId + "-sub", time: displayTime, category: displaySection }, containerId);
  const imageCardHTML = renderBlogImageCard({ storyId, imageUrl: displayImage, title: "" }, storiesById);
  const titleHTML = renderBlogTitle({ text: displayTitle, author: displayAuthor, storyId }, storiesById, allAuthors);
  const bodyHTML = renderBlogBodyCard({ storyId, bodyText: displayBody }, storiesById, ctx.campaigns || [], ctx.moreStoriesInjections || [], ctx.storiesById);

  // Share card: pass title and url; url resolved at runtime if possible
  const pageUrl = (typeof window !== 'undefined' && window.location) ? window.location.href : "";
  const shareCardHTML = renderShareCard({ title: displayTitle, url: pageUrl }, containerId);

  // Prepare meta tag values
  const ogTitle = escapeHtml(displayTitle);
  const ogDescription = escapeHtml(story?.summary || displayBody?.substring(0, 160).replace(/<[^>]*>/g, '') || displayTitle);
  const ogImage = escapeHtml(shareImage || "");
  const ogType = "article";

  // INJECT META TAGS INTO HEAD AT RENDER TIME (not runtime)
  // This ensures Facebook crawler reads them before page load
  if (typeof window !== 'undefined' && document && document.head) {
    // Helper function to set meta tag
    const setMetaTag = (property, content) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const setNameTag = (name, content) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Set Open Graph tags
    setMetaTag('og:title', ogTitle);
    setMetaTag('og:description', ogDescription);
    setMetaTag('og:image', ogImage);
    setMetaTag('og:type', 'article');

    // Twitter Card tags
    setNameTag('twitter:card', 'summary_large_image');
    setNameTag('twitter:title', ogTitle);
    setNameTag('twitter:description', ogDescription);
    setNameTag('twitter:image', ogImage);

    // General meta tags
    setNameTag('description', ogDescription);
  }

  return `
    <article id="${escapeHtml(containerId)}" class="${escapeHtml(className)}">
      <div class="flex flex-col">
        <div class="mb-4 lg:mb-6 max-w-full lg:max-w-[808px]">
          ${mainTitleHTML}
        </div>

        <div class="w-full mr-0 lg:mr-[120px]">
          ${subHeadingHTML}
        </div>

        <div class="mt-2 mb-0 w-full overflow-hidden" id="${containerId}-image-section">
          <div class="aspect-video mr-0 lg:mr-[120px]">
             ${imageCardHTML}
          </div>
        </div>

        <!-- Content Area with Sticky Share Side -->
        <div class="flex flex-row items-start relative mt-6">

            <!-- Share Buttons - Hidden on mobile, sticky on desktop -->
            <div class="hidden lg:block w-[40px] shrink-0 sticky top-[7rem] z-10 self-start">
               ${shareCardHTML}
            </div>

            <!-- Title and Body Content - Takes remaining space -->
            <div class="w-full lg:w-[768px] mr-0 lg:mr-[120px] border-b border-dotted border-black lg:border-none">
              ${titleHTML}
              ${bodyHTML}
            </div>

        </div>

      </div>

      <script>
        (function() {


          // Initialize share menu - define function inline to avoid reference errors
          (function(containerId) {
            const shareBtn = document.querySelector("#" + containerId + " [data-puck-share]");
            const shareMenu = document.querySelector("#" + containerId + " [data-puck-share-menu]");
            const facebookBtn = document.querySelector("#" + containerId + " [data-share-facebook]");
            const whatsappBtn = document.querySelector("#" + containerId + " [data-share-whatsapp]");
            const linkedinBtn = document.querySelector("#" + containerId + " [data-share-linkedin]");
            const twitterBtn = document.querySelector("#" + containerId + " [data-share-twitter]");

            if (!shareBtn || !shareMenu) return;

            const pageUrl = window.location.href;
            const pageTitle = "${ogTitle}" || document.title || 'Check this out';

            // Mobile detection utilities
            function isMobile() {
              return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            }

            function isAndroid() {
              return /Android/i.test(navigator.userAgent);
            }

            function isSafari() {
              return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            }

            // Open URL in new tab (Safari-compatible)
            function openInNewTab(url) {
              if (isSafari()) {
                window.open(url, '_blank');
              } else {
                window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer');
              }
            }

            // Smart share - tries native app first on mobile, falls back to web
            function smartShare(appUrl, webUrl, desktopFn) {
              if (!isMobile()) {
                if (desktopFn) {
                  desktopFn();
                } else {
                  openInNewTab(webUrl);
                }
                return;
              }

              let hasNavigated = false;
              const startTime = Date.now();
              let timeout = null;

              function handleVisibilityChange() {
                if (document.hidden || document.webkitHidden) {
                  hasNavigated = true;
                  cleanup();
                }
              }

              function cleanup() {
                if (timeout) clearTimeout(timeout);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                document.removeEventListener('webkitvisibilitychange', handleVisibilityChange);
                window.removeEventListener('pagehide', handleVisibilityChange);
                window.removeEventListener('blur', handleVisibilityChange);
              }

              document.addEventListener('visibilitychange', handleVisibilityChange);
              document.addEventListener('webkitvisibilitychange', handleVisibilityChange);
              window.addEventListener('pagehide', handleVisibilityChange);
              window.addEventListener('blur', handleVisibilityChange);

              window.location.href = appUrl;

              timeout = setTimeout(function() {
                const elapsed = Date.now() - startTime;
                if (!hasNavigated && elapsed < 2500) {
                  cleanup();
                  window.location.href = webUrl;
                }
              }, 1500);
            }

            function buildWhatsAppMessage(title, url) {
              return url;
            }

            // Toggle menu on button click
            shareBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const isVisible = shareMenu.style.display === 'block';
              shareMenu.style.display = isVisible ? 'none' : 'block';
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
              if (!shareBtn.contains(e.target) && !shareMenu.contains(e.target)) {
                shareMenu.style.display = 'none';
              }
            });

            // Facebook Share - uses intent URL for Android, dialog URL for iOS
            if (facebookBtn) {
              facebookBtn.addEventListener('click', () => {
                shareMenu.style.display = 'none';
                const encodedUrl = encodeURIComponent(pageUrl);

                if (isMobile()) {
                  if (isAndroid()) {
                    // Android: Use intent URL which triggers app chooser with FB app
                    const intentUrl = 'intent://www.facebook.com/sharer/sharer.php?u=' + encodedUrl +
                      '#Intent;scheme=https;package=com.facebook.katana;end';
                    window.location.href = intentUrl;
                  } else {
                    // iOS: Use Facebook's share dialog URL
                    const fbUrl = 'https://www.facebook.com/dialog/share?app_id=966242223397117&display=touch&href=' + encodedUrl + '&redirect_uri=' + encodedUrl;
                    window.location.href = fbUrl;
                  }
                } else {
                  const webUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl;
                  openInNewTab(webUrl);
                }
              });
            }

            // WhatsApp Share - uses whatsapp:// scheme on mobile
            if (whatsappBtn) {
              whatsappBtn.addEventListener('click', () => {
                shareMenu.style.display = 'none';
                const message = buildWhatsAppMessage(pageTitle, pageUrl);
                const encodedMsg = encodeURIComponent(message);

                if (isMobile()) {
                  const whatsappAppUrl = 'whatsapp://send?text=' + encodedMsg;
                  const webUrl = 'https://wa.me/?text=' + encodedMsg;
                  smartShare(whatsappAppUrl, webUrl);
                } else {
                  openInNewTab('https://web.whatsapp.com/send?text=' + encodedMsg);
                }
              });
            }

            // LinkedIn Share - uses linkedin:// scheme on mobile
            if (linkedinBtn) {
              linkedinBtn.addEventListener('click', () => {
                shareMenu.style.display = 'none';
                const webUrl = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(pageUrl);

                if (isMobile()) {
                  const linkedinAppUrl = 'linkedin://shareArticle?mini=true&url=' + encodeURIComponent(pageUrl);
                  smartShare(linkedinAppUrl, webUrl);
                } else {
                  openInNewTab(webUrl);
                }
              });
            }

            // Twitter/X Share - uses twitter:// scheme on mobile
            if (twitterBtn) {
              twitterBtn.addEventListener('click', () => {
                shareMenu.style.display = 'none';
                const text = encodeURIComponent(pageTitle);
                const url = encodeURIComponent(pageUrl);
                const webUrl = 'https://twitter.com/intent/tweet?url=' + url + '&text=' + text;

                if (isMobile()) {
                  const twitterAppUrl = 'twitter://post?message=' + text + '%20' + url;
                  smartShare(twitterAppUrl, webUrl);
                } else {
                  openInNewTab(webUrl);
                }
              });
            }

            // Copy Link
            const copyBtn = document.querySelector("#" + containerId + " [data-share-share]");
            if (copyBtn) {
              copyBtn.addEventListener('click', (e) => {
                e.preventDefault();

                // Use the current page URL
                const urlToCopy = pageUrl;

                if (!urlToCopy) {
                  console.error('No URL available to copy');
                  return;
                }

                // Try modern Clipboard API first
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(urlToCopy)
                    .then(() => {
                      showCopyNotification();
                      shareMenu.style.display = 'none';
                    })
                    .catch((err) => {
                      console.error('Clipboard copy failed:', err);
                      fallbackCopy();
                    });
                } else {
                  fallbackCopy();
                }

                // Fallback for older browsers
                function fallbackCopy() {
                  const textArea = document.createElement('textarea');
                  textArea.value = urlToCopy;
                  textArea.style.position = 'fixed';
                  textArea.style.left = '-999999px';
                  textArea.style.top = '-999999px';
                  document.body.appendChild(textArea);
                  textArea.select();
                  try {
                    document.execCommand('copy');
                    showCopyNotification();
                  } catch (err) {
                    console.error('Fallback copy failed:', err);
                  }
                  document.body.removeChild(textArea);
                  shareMenu.style.display = 'none';
                }

                // Show notification
                function showCopyNotification() {
                  // Create notification if it doesn't exist
                  let notification = document.querySelector("#" + containerId + " [data-copy-notification]");
                  if (!notification) {
                    notification = document.createElement('div');
                    notification.setAttribute('data-copy-notification', '');
                    notification.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: #10b981; color: white; padding: 12px 20px; border-radius: 6px; font-size: 14px; z-index: 10000; animation: slideIn 0.3s ease-out;';
                    notification.textContent = '✓ Link copied to clipboard!';
                    document.body.appendChild(notification);
                  }

                  notification.style.display = 'block';
                  notification.style.animation = 'slideIn 0.3s ease-out';

                  setTimeout(() => {
                    notification.style.animation = 'slideOut 0.3s ease-out';
                    setTimeout(() => {
                      notification.style.display = 'none';
                    }, 300);
                  }, 2000);
                }
              });
            }
          })("${containerId}");

          // Add CSS animations if not already present
          if (!document.querySelector('style[data-copy-animations]')) {
            const style = document.createElement('style');
            style.setAttribute('data-copy-animations', '');
            style.textContent = \`
              @keyframes slideIn {
                from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
              }
              @keyframes slideOut {
                from { opacity: 1; transform: translateX(-50%) translateY(0); }
                to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
              }
            \`;
            document.head.appendChild(style);
          }
        })();
      </script>
    </article>
  `;
}


/* ------------------------------------------------
 * SECTION COMPONENTS
 * ------------------------------------------------ */

export function renderSectionGrid(props, zones, storiesById, ctx = {}) {
  const id = props.id || `section-grid-${Math.random().toString(36).substr(2, 9)}`;

  function renderZone(zoneName) {
    const zoneKey = `${id}:${zoneName}`;
    const zoneItems = zones[zoneKey] || [];
    if (!zoneItems.length) return "";
    return zoneItems
      .map((item) => renderComponent(item, zones, storiesById, ctx))
      .join("");
  }

  const leftTop1 = renderZone("section-grid-left-top-1");
  const right1 = renderZone("section-grid-right-1");
  const right2 = renderZone("section-grid-right-2");
  const right3 = renderZone("section-grid-right-3");
  const right4 = renderZone("section-grid-right-4");
  const right5 = renderZone("section-grid-right-5");

  // ─── Spotlight Ad — desktop sidebar card (matches PopularBlogCard) ────────
  // The "Blog" page's single-article template actually renders through
  // SectionGrid (not BlogGrid), so this is where the desktop Spotlight
  // fallback card must live. Only shown when viewing a single story
  // (ctx.currentStory truthy) — never on Section/Home listing pages that
  // also use SectionGrid. Mobile is unaffected (cover-stack slider is
  // injected inline into the article body by renderBlogBodyCard).
  // `ctx.claimSpotlightSidebarAd()` guards against duplicate rendering when
  // more than one SectionGrid (or a SectionGrid alongside BlogGrid) appears
  // on the same page — only the first to render claims the slot.
  const { job: spotlightSidebarJob, campaign: spotlightSidebarCampaign } = (ctx?.currentStory && ctx?.claimSpotlightSidebarAd?.() !== false)
    ? resolveActiveSpotlightCampaign(ctx?.campaigns || [])
    : { job: null, campaign: null };
  const spotlightSidebarAdHtml = spotlightSidebarJob
    ? buildSpotlightDesktopFallbackHtml(spotlightSidebarJob, spotlightSidebarCampaign)
    : '';

  return `
    <section id="${id}" class="w-full bg-white lg:pt-8 px-4 lg:px-16 pb-12 ${props.className ?? ''}">
      <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col lg:flex-row gap-8 lg:gap-0">

          <!-- LEFT COLUMN - Only Top Bar -->
          <div class="w-full flex flex-col gap-2">
            <!-- Top bar 1 -->
            <div class="h-auto w-full min-h-[2.2rem]">
              ${leftTop1}
            </div>
          </div>

          <!-- RIGHT COLUMN -->
          <div class="w-full lg:w-[30%] flex flex-col gap-5">
            <!-- Spotlight Ad — sticky at the top of the column at a lower top
                 offset/z-index than the sticky block below. As the user scrolls,
                 the right-1..right-4/right-5 sticky block (higher z-index, larger
                 top offset) catches up and slides over/covers this card. -->
            ${spotlightSidebarAdHtml ? `<div class="relative lg:sticky lg:top-[96px] lg:self-start z-0 w-full lg:max-w-md hidden lg:block" data-ad-block="Spotlight-Sidebar">${spotlightSidebarAdHtml}</div>` : ''}

            <!-- STICKY SECTION - keeps the remaining right-column cards pinned
                 together and above the Spotlight card as the page scrolls. -->
            <div class="lg:sticky lg:top-[96px] lg:self-start bg-white z-10 flex flex-col gap-5">
              <!-- Tall block -->
              <div class="h-auto ">
                ${right1}
              </div>

              <!-- Small blocks -->
              <div>
                <div class="h-auto">
                  ${right2}
                </div>
                <div class="h-auto ">
                  ${right3}
                </div>
              </div>

              <div class="h-auto -mt-3 ">
                ${right4}
              </div>

              <!-- Tall bottom block -->
              <div class="h-auto">
                ${right5}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  `;
}

export function renderSectionBottomGrid(props, zones, storiesById, ctx) {
  const id = props.id || `section-bottom-${Math.random().toString(36).substr(2, 9)}`;

  function renderZone(zoneName) {
    const zoneKey = `${id}:${zoneName}`;
    const zoneItems = zones[zoneKey] || [];
    if (!zoneItems.length) return "";
    return zoneItems
      .map((item) => renderComponent(item, zones, storiesById, ctx))
      .join("");
  }

  const leftTop1 = renderZone("section-bottom-left-top-1");

  // If leftTop1 has content, use it; otherwise render BottomCardList
  const content = (leftTop1 && leftTop1.trim().length > 0)
    ? leftTop1
    : renderBottomCardList({ authorId: ctx?.authorId, authorName: ctx?.authorName }, storiesById);

  return `
    <section id="${id}" class="w-full bg-white pt-8 lg:pr-24 pb-12 ${props.className ?? ''}">
        <div class="mx-auto w-full max-w-7xl">
            <div class="flex flex-col lg:flex-row gap-8 lg:gap-0">
                <div class="w-full flex flex-col gap-2">
                    <div class="h-auto w-full min-h-[2.2rem]">
                        ${content}
                    </div>
                </div>
            </div>
        </div>
    </section>
  `;
}

export function renderFooter(props) {
  const {
    id,
    copyrightText = "© 2026 OpenPress. All rights reserved."
  } = props;

  const SECTIONS = [
    ['News', '/news/'],
    ['Opinion', '/opinion/'],
    ['Business', '/business/'],
    ['Sports', '/sports/'],
    ['Technology', '/technology/'],
    ['Arts & Culture', '/arts-culture/'],
    ['Politics', '/politics/'],
    ['Lifestyle', '/lifestyle/'],
    ['World', '/world/'],
  ];

  const COMPANY = [
    ['About us', '/about'],
    ['Our authors', '/authors'],
    ['Editorial standards', '/media-council'],
    ['Privacy policy', '/privacy-policy'],
    ['Contact us', '/contact-us'],
  ];

  const sectionLinks = SECTIONS
    .map(([label, href]) => `<a href="${href}" class="text-xs text-[#515154] hover:text-black hover:underline transition-colors">${label.replace('&', '&amp;')}</a>`)
    .join('<span class="text-[#d2d2d7] select-none text-[10px]">•</span>');

  const companyLinks = COMPANY
    .map(([label, href]) => `<a href="${href}" class="text-xs text-[#6e6e73] hover:text-black hover:underline transition-colors">${label}</a>`)
    .join('<span class="text-[#d2d2d7] select-none text-[10px]">•</span>');

  return `
    <div class="mt-10 sm:mt-14 relative clear-both">
      <footer ${id ? `id="${id}"` : ""} class="op-footer w-full bg-[#f8f9fa] text-[#6e6e73] border-t border-[#e2e2e7]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <!-- Top Compact Row: Logo, Mission, Social -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6 pb-4 border-b border-[#e5e5ea]">
            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-4 text-center sm:text-left">
              <a href="/" aria-label="OpenPress home" class="shrink-0 flex items-center">
                <img id="footer-logo-mark" src="/openpress-logo-full-nobg-trim.png" alt="OpenPress" class="op-footer-logo h-7 sm:h-8 w-auto object-contain" />
              </a>
              <span class="hidden sm:inline text-[#d2d2d7] select-none">|</span>
              <p class="text-[12px] text-[#6e6e73] font-merriweather italic">
                Free, independent journalism open to everyone.
              </p>
            </div>
            <div class="flex items-center gap-3 shrink-0 text-xs font-share tracking-wider uppercase text-[#555]">
              <a href="https://www.facebook.com/shreyanshtri26" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 hover:text-black transition-colors" aria-label="Facebook">
                <svg class="w-4 h-4 text-[#1877f2]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9c1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12c0-5.5-4.5-10-10-10z"/></svg>
                <span class="hidden md:inline text-[11px] font-semibold">Facebook</span>
              </a>
              <a href="https://www.linkedin.com/in/shreyanshtri26" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 hover:text-black transition-colors" aria-label="LinkedIn">
                <svg class="w-4 h-4 text-[#0a66c2]" fill="currentColor" viewBox="0 0 24 24"><path d="M19.7,3H4.3C3.582,3,3,3.582,3,4.3v15.4C3,20.418,3.582,21,4.3,21h15.4c0.718,0,1.3-0.582,1.3-1.3V4.3C21,3.582,20.418,3,19.7,3z M8.339,18.338H5.667v-8.59h2.672V18.338z M7.004,8.574c-0.857,0-1.549-0.694-1.549-1.548c0-0.855,0.691-1.548,1.549-1.548c0.854,0,1.547,0.694,1.547,1.548C8.551,7.881,7.858,8.574,7.004,8.574z M18.339,18.338h-2.669v-4.177c0-0.996-0.017-2.278-1.387-2.278c-1.389,0-1.601,1.086-1.601,2.206v4.249h-2.667v-8.59h2.559v1.174h0.037c0.356-0.675,1.227-1.387,2.526-1.387c2.703,0,3.203,1.779,3.203,4.092V18.338z"/></svg>
                <span class="hidden md:inline text-[11px] font-semibold">LinkedIn</span>
              </a>
            </div>
          </div>

          <!-- Middle Compact Links -->
          <div class="py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            <nav aria-label="Sections" class="flex flex-wrap items-center justify-center md:justify-start gap-x-2.5 gap-y-1 font-share uppercase tracking-wider text-[11px]">
              <span class="font-bold text-neutral-800 text-[10px] tracking-widest mr-1">SECTIONS</span>
              ${sectionLinks}
            </nav>
            <nav aria-label="OpenPress Links" class="flex flex-wrap items-center justify-center md:justify-end gap-x-2.5 gap-y-1 text-xs">
              ${companyLinks}
            </nav>
          </div>

          <!-- Bottom Hairline Bar -->
          <div class="pt-3 border-t border-[#e5e5ea] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#86868b] gap-1.5 text-center sm:text-left">
            <p>${copyrightText}</p>
            <p class="font-medium text-[#6e6e73]">Free to read. Always.</p>
          </div>
        </div>
      </footer>
    </div>
  `;
}


/* ------------------------------------------------
 * HELPERS FOR SECTION BOTTOM GRID
 * ------------------------------------------------ */

export function renderBottomCardList(props, storiesById) {
  // In OpenPress, we use storiesById as the library of stories for initial render.
  const rawStories = Object.values(storiesById || {});

  // Support author filtering by authorId or authorName (integrated from openPress-Page Studio)
  const filteredStories = (props?.authorId || props?.authorName)
    ? rawStories.filter((s) => {
      const sAuthorId = (s.authorId || '').trim().toLowerCase();
      const expectedId = String(props?.authorId || '').trim().toLowerCase();
      const matchedById = sAuthorId !== '' && expectedId !== '' && sAuthorId === expectedId;

      const expectedName = String(props?.authorName || '').trim().toLowerCase();
      const sAuthorName = (s.authorName || s.author || '').trim().toLowerCase();
      const matchedByName = expectedName !== '' && sAuthorName === expectedName;

      const matchedByLine = expectedName !== '' && (s.byLine?.some((name) => String(name || '').trim().toLowerCase() === expectedName) || false);

      return matchedById || matchedByName || matchedByLine;
    })
    : rawStories;

  const sortedStories = [...filteredStories].sort((a, b) => {
    const dateA = new Date(a.proposedFilingDate || a.publishDate || a.publishedAt || a.createdAt || a.updatedAt || 0).getTime();
    const dateB = new Date(b.proposedFilingDate || b.publishDate || b.publishedAt || b.createdAt || b.updatedAt || 0).getTime();
    return dateB - dateA;
  });

  const instanceId = `bottom-card-list-${Math.random().toString(36).substr(2, 9)}`;
  const initialVisibleCount = 10;
  const hasMore = sortedStories.length > initialVisibleCount;

  const cardsHtml = sortedStories.map((story, index) => {
    const isHidden = index >= initialVisibleCount;
    return `
      <div
        class="${isHidden ? 'hidden-story' : ''}"
        style="${isHidden ? 'display: none;' : ''}"
        data-story-id="${story.id}"
      >
        ${renderBottomCard({ storyId: story.id }, storiesById)}
      </div>
    `;
  }).join('');

  return `
    <div id="${props.id ?? instanceId}" class="flex flex-col gap-6 relative">
      <div id="${instanceId}-container" class="grid grid-cols-1 gap-4 lg:flex lg:flex-col lg:gap-6">
        ${cardsHtml}
      </div>

      <button
        id="${instanceId}-btn"
        class="mt-1 px-4 h-[25px] font-share border border-gray-700 text-gray-700 font-semibold transition-colors duration-200 self-center hover:bg-gray-100"
        style="${hasMore ? '' : 'display: none;'}"
      >
        LOAD MORE
      </button>

      <script>
        (function() {
          var container = document.getElementById('${instanceId}-container');
          var btn = document.getElementById('${instanceId}-btn');

          if (!container || !btn) return;

          // "Load More" button logic
          btn.addEventListener('click', function() {
            var hiddenItems = container.querySelectorAll('.hidden-story');
            var count = 0;

            for (var i = 0; i < hiddenItems.length; i++) {
              if (count >= 10) break;
              hiddenItems[i].style.display = 'block';
              hiddenItems[i].classList.remove('hidden-story');
              count++;
            }

            var remainingHidden = container.querySelectorAll('.hidden-story').length;
            if (remainingHidden === 0) {
              btn.style.display = 'none';
            }
          });
        })();
      </script>
    </div>
  `;
}

export function renderBottomCard(props, storiesById) {
  // Try to find story if storyId is provided
  const story = props.storyId ? storiesById[props.storyId] : undefined;

  const formatDate = (dateString) => {
    if (!dateString) return 'Jan 12, 2025';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Jan 12, 2025';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    } catch {
      return 'Jan 12, 2025';
    }
  };

  function calculateReadTime(text = "") {
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 220));
    return `${minutes} min read`;
  }

  // Fallbacks similar to React component
  const displayImage = story?.imageUrl || story?.image || props.imageUrl || '/story-images/modi.png';
  const displayTitle = props.title || story?.headline || story?.title || 'Featured story';
  const normalizedDescription = cleanTextSummary(props.description || story?.storySummary || story?.summary || '')
    || 'Lorem ipsum dolor sit amet consectetur adipiscing elit quisque elit quisque faucibus.';

  const displayDate = formatDate(props.date || story?.proposedFilingDate || story?.publishDate || story?.publishedAt || story?.createdAt || story?.updatedAt);
  let fallbackText = '';
  if (!story?.fullDescription) {
    if (story?.storySummary && typeof story.storySummary === 'string') {
      fallbackText = story.storySummary;
    } else if (story?.summary && typeof story.summary === 'string') {
      fallbackText = story.summary;
    } else if (story?.description?.blocks && Array.isArray(story.description.blocks)) {
      fallbackText = story.description.blocks
        .filter((block) => block?.data?.text)
        .map((block) => block.data.text)
        .join(' ')
        .replace(/<[^>]+>/g, '');
    } else if (typeof story?.description === 'string') {
      fallbackText = story.description;
    } else if (typeof story?.content === 'string') {
      fallbackText = story.content;
    }
  }

  const displayReadTime = story?.readTime || story?.READ_TIME || (story?.fullDescription
    ? calculateReadTime(story.fullDescription)
    : (fallbackText ? calculateReadTime(fallbackText) : (props.readTime || '1 min read')));

  // Support both publishUrl (from transformed story) and redirectUrl (from raw if applicable)
  const publishUrl = story?.publishUrl || story?.redirectUrl;

  return `
    <div
      class="flex flex-col lg:flex-row gap-4 bg-white border-b border-gray-200 pb-4 ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity"
      ${publishUrl ? `onclick="window.location.href='${publishUrl}'"` : ''}
      role="${publishUrl ? "button" : ""}"
      tabindex="${publishUrl ? "0" : ""}"
    >
      <!-- Image Section - Stack on mobile, Left on desktop -->
      <div class="flex-shrink-0 w-full lg:w-[250px] h-auto aspect-video lg:h-[170px] overflow-hidden">
        <img
          src="${escapeHtml(displayImage)}"
          alt="${escapeHtml(displayTitle)}"
          class="w-full h-full object-cover transition-opacity duration-500 opacity-100"
          loading="lazy"
        />
      </div>

      <!-- Content Section - Right Side -->
      <div class="flex-1 flex flex-col justify-between py-1">
        <!-- Title -->
        <h3 class="text-[22px] font-extrabold font-libre text-black leading-tight mb-2">
          ${escapeHtml(displayTitle)}
        </h3>

        <!-- Description -->
        <p class="text-m text-gray-700 font-[Merriweather] mb-3">
          ${normalizedDescription}
        </p>

        <!-- Meta Information -->
        <div class="flex items-center gap-2 font-share text-[12px] text-black">
          <span>${escapeHtml(displayDate)}</span>
          <span>|</span>
          <span>${escapeHtml(displayReadTime)}</span>
        </div>
      </div>
    </div>
  `;
}


// src/helpers/renderers/renderBorder.ts
export function renderBorder(props) {
  const height = props.height ?? '1px'
  const color = props.color ?? 'gray'

  return `
    <section id="${props.id ?? ''}" class="w-full bg-white pt-6 px-16 pb-3 relative">
      <div class="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-4">
        <div class="absolute inset-0 pointer-events-none">
          <div
            class="hidden lg:block mx-8 absolute left-0 right-0 top-0"
            style="border-bottom: ${height} solid ${color}"
          ></div>
        </div>
      </div>
    </section>
  `
}
/**
 * Login Form Renderer
 */
export function renderLoginForm(props, ctx) {
  const backendApi = ctx.backendApi || '';

  return `
        <div class="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 bg-white">
            <div class="w-full max-w-md">
                <div class="text-center mb-10">
                    <h1 class="text-4xl font-black text-black mb-2">OpenPress</h1>
                    <p class="text-gray-600">Enter your credentials to access your account</p>
                </div>

                <form id="login-form" class="space-y-6">
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-900 mb-2">Email*</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            class="w-full px-4 py-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-900 mb-2">Password*</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            class="w-full px-4 py-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <div id="login-error" class="hidden text-red-600 text-sm font-medium"></div>

                    <button
                        type="submit"
                        id="login-submit-btn"
                        class="w-full py-3 bg-black text-white rounded-md font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Log in
                    </button>
                </form>

                <div class="mt-8 text-center">
                    <a href="/auth/forgot-password" class="text-sm text-gray-600 hover:text-black hover:underline transition-colors">
                        Forgot your password?
                    </a>
                </div>

                <div class="mt-12 text-center text-xs text-gray-400">
                    © 2025 OpenPress
                </div>
            </div>
        </div>

        <script>
            (function() {
                const form = document.getElementById('login-form');
                const errorDiv = document.getElementById('login-error');
                const submitBtn = document.getElementById('login-submit-btn');
                const backendApi = '${backendApi}';

                if (!form) return;

                form.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;

                    errorDiv.classList.add('hidden');
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Logging in...';

                    try {
                        const response = await fetch(\`\${backendApi}/login\`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password }),
                        });

                        const res = await response.json();

                        if (!response.ok || !res?.user) {
                            throw new Error(res?.message || 'Invalid username or password');
                        }

                        // Store session data
                        localStorage.setItem('website_token', res.token);
                        localStorage.setItem('user_name', res.user.fullName || res.user.userName);
                        localStorage.setItem('user_email', res.user.email);
                        localStorage.setItem('user_role', res.user.role);
                        localStorage.setItem('user_id', res.user.personalizeUserId);

                        // Redirect back to where they came from or home
                        const lastRoute = localStorage.getItem('lastRoute');
                        if (lastRoute && lastRoute !== '/login') {
                            localStorage.removeItem('lastRoute');
                            window.location.href = lastRoute;
                        } else {
                            window.location.href = '/';
                        }
                    } catch (err) {
                        errorDiv.textContent = err.message;
                        errorDiv.classList.remove('hidden');
                    } finally {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Log in';
                    }
                });
            })();
        </script>
    `;
}

/**
 * Account Card Renderer
 */
export function renderAccountCard(props, ctx) {
  return `
        <div class="min-h-[60vh] bg-white px-4 py-12">
            <div class="max-w-2xl mx-auto border border-black p-8">
                <div class="flex items-center gap-6 mb-10 border-b border-gray-100 pb-8">
                    <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h1 id="account-name" class="text-2xl font-bold text-black">Loading...</h1>
                        <p id="account-email" class="text-gray-500 font-share">...</p>
                        <span id="account-role" class="inline-block mt-2 px-2 py-1 bg-gray-100 text-[10px] uppercase font-share text-gray-600 rounded">...</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-4">
                        <h2 class="font-bold uppercase text-xs tracking-widest text-gray-400">Subscription Status</h2>
                        <div class="p-4 bg-gray-50 rounded-md border border-gray-100">
                            <p class="font-bold text-black">Free Plan</p>
                            <p class="text-xs text-gray-500 mt-1">Upgrade to Premium for full access to all stories.</p>
                        </div>
                        <button class="w-full py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors">
                            Upgrade Now
                        </button>
                    </div>

                    <div class="space-y-4">
                        <h2 class="font-bold uppercase text-xs tracking-widest text-gray-400">Account Actions</h2>
                        <button onclick="handleLogout()" class="w-full py-2 border border-black text-black text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <script>
            (function() {
                function loadAccountData() {
                    const name = localStorage.getItem('user_name') || 'Guest User';
                    const email = localStorage.getItem('user_email') || 'Not signed in';
                    const role = localStorage.getItem('user_role') || 'reader';

                    document.getElementById('account-name').textContent = name;
                    document.getElementById('account-email').textContent = email;
                    document.getElementById('account-role').textContent = role;

                    if (!localStorage.getItem('website_token') && !localStorage.getItem('token')) {
                        window.location.href = '/login';
                    }
                }

                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', loadAccountData);
                } else {
                    loadAccountData();
                }
            })();

            window.handleLogout = function() {
                localStorage.removeItem('website_token');
                localStorage.removeItem('user_name');
                localStorage.removeItem('user_email');
                localStorage.removeItem('user_role');
                localStorage.removeItem('user_id');
                window.location.href = '/';
            }
        </script>
    `;
}


