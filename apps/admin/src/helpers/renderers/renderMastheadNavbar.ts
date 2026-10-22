// src/helpers/renderers/renderMastheadNavbar.ts

type RenderMastheadNavbarArgs = {
  id?: string
  sections: string[]
  activeSection?: string
  showBanner?: boolean
  showSignIn?: boolean
  showSupportUs?: boolean
  showBecomeMember?: boolean
  showFacebook?: boolean
  showLinkedIn?: boolean
  storiesById?: Record<string, any>
  bannerText?: string
  bannerBgColor?: string
  bannerTextColor?: string
  supportUsText?: string
  supportUsBgColor?: string
  supportUsTextColor?: string
  signInText?: string
  signInBgColor?: string
  signInTextColor?: string
  becomeMemberText?: string
  becomeMemberBgColor?: string
  becomeMemberTextColor?: string
  themeColor?: string
}

type SearchStory = {
  title: string
  section: string
  image: string
  publishUrl: string
  description: string
  author: string
  dateStr: string
  minRead: string
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function extractSearchDescription(story: any): string {
  if (story?.storySummary && typeof story.storySummary === 'string') return story.storySummary
  if (story?.summary && typeof story.summary === 'string') return story.summary
  if (story?.description?.blocks && Array.isArray(story.description.blocks)) {
    return story.description.blocks
      .filter((block: any) => block?.data?.text)
      .map((block: any) => block.data.text)
      .join(' ')
      .replace(/<[^>]+>/g, '')
  }
  return firstString(story?.description, story?.fullDescription, story?.excerpt, story?.content)
}

function normalizeSearchStory(story: any): SearchStory | null {
  const title = firstString(story?.title, story?.headline)
  const publishUrl = firstString(
    story?.publishUrl,
    story?.publishedUrl,
    story?.published_url,
    story?.redirectUrl,
    story?.['Published URL'],
    story?.['Published Url'],
    story?.slug ? (String(story.slug).startsWith('/') ? story.slug : `/${story.slug}`) : ''
  )

  if (!title || !publishUrl) return null

  const description = extractSearchDescription(story)
  let descriptionForReadTime = story?.description
  if (typeof descriptionForReadTime === 'string') {
    try {
      const parsedDescription = JSON.parse(descriptionForReadTime.trim())
      if (parsedDescription && typeof parsedDescription === 'object') {
        descriptionForReadTime = parsedDescription
      }
    } catch (e) {}
  }

  const descriptionBlocks = Array.isArray(descriptionForReadTime)
    ? descriptionForReadTime
    : descriptionForReadTime && descriptionForReadTime.blocks
  let fullText = ''
  if (Array.isArray(descriptionBlocks)) {
    fullText = descriptionBlocks.map((block: any) => {
      if (!block || typeof block !== 'object') return ''
      const blockData = block.data || {}
      if (typeof blockData.text === 'string') return blockData.text
      if (typeof blockData.caption === 'string') return blockData.caption
      if (typeof blockData.content === 'string') return blockData.content
      return typeof block.text === 'string' ? block.text : ''
    }).map((text: string) => text.trim()).filter(Boolean).join(' ')
  } else if (typeof descriptionForReadTime === 'string') {
    fullText = descriptionForReadTime
  }
  if (!fullText && typeof story?.fullDescription === 'string') fullText = story.fullDescription
  if (!fullText && typeof story?.content === 'string') fullText = story.content

  const words = fullText.trim() ? fullText.trim().split(/\s+/).length : 0
  const minRead = `${Math.max(1, Math.ceil(words / 220))} min read`
  const dateValue = firstString(story?.date, story?.publishedAt, story?.createdAt)
  let dateStr = ''

  if (dateValue) {
    const date = new Date(dateValue)
    if (!Number.isNaN(date.getTime())) {
      dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
  }
}

function getContrastColor(hexColor?: string): string {
  if (!hexColor) return '#FFFFFF'
  const hex = hexColor.trim()
  if (!hex.startsWith('#')) return '#FFFFFF'
  let cleanHex = hex.slice(1)
  if (cleanHex.length === 3) {
    cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2]
  }
  if (cleanHex.length !== 6) return '#FFFFFF'
  const r = parseInt(cleanHex.slice(0, 2), 16)
  const g = parseInt(cleanHex.slice(2, 4), 16)
  const b = parseInt(cleanHex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#000000' : '#FFFFFF'
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export function renderMastheadNavbar({
  id,
  sections = [],
  activeSection = 'HOME',
  showBanner = false,
  showSignIn = false,
  showSupportUs = false,
  showBecomeMember = true,
  showFacebook = true,
  showLinkedIn = true,
  storiesById = {},
  bannerText = 'Our journalism is free. It needs your support. Consider becoming a member?',
  bannerBgColor = '#000000',
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
  themeColor = '#0057FF',
}: RenderMastheadNavbarArgs): string {
  // Reader sign-in is enabled for ePaper readers
  showSignIn = true;
  showSupportUs = false;
  showBecomeMember = false;
  const resolvedTheme = themeColor || '#0057FF';
  const resolvedBannerBg = bannerBgColor || '#000000';
  const resolvedBannerText = bannerTextColor || getContrastColor(resolvedBannerBg);

  const resolvedSupportUsBg = supportUsBgColor || resolvedTheme;
  const resolvedSupportUsText = supportUsTextColor || getContrastColor(resolvedSupportUsBg);

  const resolvedBecomeMemberBg = becomeMemberBgColor || resolvedTheme;
  const resolvedBecomeMemberText = becomeMemberTextColor || getContrastColor(resolvedBecomeMemberBg);

  const resolvedSignInBg = signInBgColor || '#FFFFFF';
  const resolvedSignInText = signInTextColor || resolvedTheme;
  const backendApi = (import.meta as any).env?.VITE_BACKEND_API || '';

  // Normalize sections and activeSection to uppercase for consistent matching
  const normalizedActiveSection = String(activeSection || 'HOME').trim().toUpperCase();
  const normalizedSections = sections.map((s) => s.trim().toUpperCase());

  // Pre-map storiesById into the lightweight shape the search overlay needs.
  // Serialising this into the HTML avoids an API fetch on the published page,
  // which would fail for unauthenticated visitors.
  const preloadedStories = Object.values(storiesById)
    .map(normalizeSearchStory)
    .filter(Boolean);
  const preloadedStoriesJson = serializeForInlineScript(preloadedStories);
  const mobileDrawerLoginHtml = serializeForInlineScript(
    `<button id="mobile-drawer-login-btn" onclick="closeMobileMenu(); openEpaperAuthModal();" type="button" class="font-share text-xs tracking-wider px-4 min-h-[36px] shrink-0 whitespace-nowrap transition-colors uppercase font-bold rounded-full cursor-pointer" style="background-color: ${resolvedSignInBg}; color: ${resolvedSignInText};">${signInText}</button>`
  );

  // Get first 3 sections for top nav; remaining sections go into the hamburger
  const topSections = normalizedSections.slice(0, 3);
  const overflowSections = normalizedSections.slice(3);
  const showHamburger = normalizedSections.length > 3;

  const renderNavButton = (label: string) => {
    const isActive = normalizedActiveSection === label;
    const slug = label === 'HOME' ? '' : label.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    return `
      <button
        onclick="handleNavClick('${label}', '${slug}')"
        class="nav-btn relative flex items-center justify-center px-1 lg:px-2 h-[64px] sm:h-[96px] lg:h-[130px] transition-all duration-300 whitespace-nowrap overflow-visible ${isActive ? 'text-black' : 'hover:text-black'}"
        data-section="${label}"
      >
        <span class="nav-box absolute capitalize top-[-10px] h-[60px] lg:h-[80px] inset-x-0 border-2 border-t-0 border-black bg-white transition-all duration-300" style="z-index: 0; display: ${isActive ? 'block' : 'none'};"></span>
        <span class="relative z-10">${label.toUpperCase()}</span>
      </button>
    `;
  };

  const renderMobileMenuItem = (label: string) => {
    const isActive = normalizedActiveSection === label;
    const slug = label === 'HOME' ? '' : label.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `
      <button
        onclick="closeMobileMenu(); handleNavClick('${label}', '${slug}')"
        data-section="${label}"
        class="text-left py-3 px-4 rounded-xl font-share uppercase transition-colors shrink-0 ${isActive ? 'bg-neutral-100 text-black font-bold' : 'hover:bg-gray-100'}"
      >
        ${label}
      </button>
    `;
  };

  const renderDesktopMenuItem = (label: string) => {
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
    style="background-color: ${resolvedBannerBg}; color: ${resolvedBannerText}; height: auto; min-height: 48px; opacity: 1; padding-top: 12px; padding-bottom: 12px; pointer-events: auto;"
  >
    <div class="mx-auto w-full flex flex-wrap sm:flex-nowrap items-center justify-between font-share text-xs tracking-wider uppercase gap-y-2 sm:gap-y-0">
      <!-- Center: Banner Text -->
      <div class="hidden sm:block sm:w-auto sm:flex-initial sm:pl-4 text-left italic font-merriweather font-semibold text-[16px] sm:text-sm normal-case px-2 order-1 sm:order-2">
        ${bannerText}
      </div>

      <!-- Left: SUPPORT US -->
      <div class="w-1/2 sm:w-auto sm:flex-initial flex justify-start order-2 sm:order-1">
        ${showSupportUs ? '<a id="banner-support-btn" href="/support-us" class="font-share text-[13px] sm:text-sm lg:text-base px-4 py-1.5 sm:py-2 font-bold transition-all duration-200 whitespace-nowrap inline-flex items-center justify-center text-center leading-none" style="background-color: ' + resolvedSupportUsBg + '; color: ' + resolvedSupportUsText + ';">' + supportUsText + '</a>' : ''}
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
  <script>window.currentActiveSection = '${normalizedActiveSection}'; window.showSignIn = ${showSignIn}; window.__openPress_API__ = '${backendApi}';</script>

  <!-- Decorative lines -->
  <div class="absolute top-[50px] sm:top-[65px] lg:top-[100px] left-0 w-[40%] sm:w-[47%] lg:w-[42%] h-[2px] bg-black transition-opacity duration-300 navbar-dec-line"></div>
  <div class="absolute top-[50px] sm:top-[65px] lg:top-[100px] right-0 w-[40%] sm:w-[38%] lg:w-[42%] h-[2px] bg-black transition-opacity duration-300 navbar-dec-line"></div>

  <!-- Top row -->
  <div id="navbar-top-row" class="mx-auto flex items-center w-full px-4 sm:px-6 lg:w-[84%] lg:px-0 pt-2 pb-4 transition-all duration-300 relative">

    <!-- Mobile menu + social icons for mobile -->
    <div class="absolute left-2 top-[29px] -translate-y-1/2 sm:relative sm:left-auto sm:top-auto sm:translate-y-0 sm:mt-0 flex sm:hidden justify-start items-center gap-2 z-10">
      <button onclick="toggleMobileMenu()" class="p-1 text-black" aria-label="Toggle menu">
        <svg
          class="w-10 h-10"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="14" y1="20" x2="50" y2="20" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" />
          <line x1="14" y1="32" x2="50" y2="32" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" />
          <line x1="14" y1="44" x2="50" y2="44" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- Masthead date (filled in the browser) -->
    <div id="navbar-date" class="hidden sm:block" aria-hidden="true"></div>
    <script>(function(){var el=document.getElementById("navbar-date");if(el)el.textContent=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});})();</script>

    <!-- Desktop nav -->
    <div id="navbar-nav-wrap" class="hidden sm:flex flex-1 justify-start items-center gap-4">
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
    <div id="navbar-logo-wrap" class="flex justify-center flex-1 items-center overflow-visible">
      <div id="navbar-logo-container" onclick="handleNavClick('HOME', '')" class="cursor-pointer flex items-center justify-center relative w-[190px] sm:w-[290px] lg:w-[390px] h-[64px] sm:h-[96px] lg:h-[130px] transition-all duration-300 ease-in-out">
        <!-- Logo: one image; it shrinks on scroll -->
        <img
          id="navbar-logo-mark"
          src="/openpress-logo-full-nobg-trim.png"
          alt="OpenPress Logo"
          class="h-[64px] sm:h-[96px] lg:h-[130px] w-auto object-contain absolute"
          style="transform-origin: center;"
        />
        <!-- Compact mark: fades in as the full logo fades out on scroll -->
        <img
          id="navbar-logo-quill"
          src="/openpress-quill-nobg-trim.png"
          alt=""
          aria-hidden="true"
          class="h-[40px] sm:h-[48px] lg:h-[58px] w-auto object-contain absolute"
          style="opacity: 0; transform-origin: center;"
        />
      </div>
    </div>

    <!-- Right side: Social icons + Sign In / My Account + Support Us -->
    <div id="navbar-right-wrap" class="absolute right-2 top-[27px] -translate-y-1/2 sm:relative sm:right-auto sm:top-auto sm:translate-y-0 sm:mt-0 flex sm:flex-1 items-center justify-end gap-1.5 sm:gap-3 text-sm lg:text-[1rem] text-slate-900">


      <!-- Social Icons (desktop) -->
      ${showFacebook || showLinkedIn ? `
      <div id="navbar-social-icons" class="hidden sm:flex items-center gap-2">
        ${showFacebook ? `
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
        ${showLinkedIn ? `
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

  <!-- Mobile menu drawer: outside <header>, whose backdrop-filter would make these fixed layers relative to the header instead of the viewport -->
  <div id="mobile-menu-dim" onclick="closeMobileMenu()" class="sm:hidden fixed inset-0 z-[59] bg-black/60 transition-opacity duration-300 opacity-0 pointer-events-none" style="-webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px);"></div>
  <div id="mobile-menu-overlay" class="sm:hidden fixed inset-x-0 bottom-0 z-[60] flex justify-end transition-opacity duration-300 opacity-0 pointer-events-none">
    <div class="absolute inset-0" onclick="closeMobileMenu()"></div>
    <div id="mobile-menu-drawer" class="relative w-[75%] max-w-sm bg-white h-full overflow-y-auto shadow-xl flex flex-col transition-transform duration-300 translate-x-full">
      <!-- Header section (Black background) -->
      <div class="bg-white text-black px-4 pt-4 pb-3 flex flex-col gap-3 shrink-0 border-b border-neutral-200">
        <!-- Top row -->
        <div class="flex items-center justify-between h-[40px]">
          <!-- Close Button on Left -->
          <button onclick="closeMobileMenu()" class="p-2 -ml-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-black hover:bg-neutral-100 rounded-xl transition-colors animate-none" aria-label="Close menu">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Title in Center (the page header above already shows the logo) -->
          <span class="font-share text-sm tracking-[0.2em] uppercase text-black">Menu</span>

          <!-- Right Avatar/Initials or SIGN IN button -->
          <div id="drawer-avatar-container" class="flex items-center justify-end min-w-[40px]">
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

        <!-- Search Input Box below it -->
        <div id="drawer-search-container" class="relative flex items-center bg-neutral-100 text-neutral-500 rounded-xl px-4 min-h-[44px] text-base transition-all duration-200 border border-neutral-200 focus-within:border-black">
          <svg id="drawer-search-icon" class="w-4 h-4 mr-2.5 text-neutral-450 flex-shrink-0 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="drawer-search-input"
            type="text"
            oninput="handleDrawerSearch(this.value)"
            placeholder="Search stories..."
            class="w-full bg-transparent outline-none text-black text-base placeholder-neutral-500 transition-colors duration-200 appearance-none"
            style="font-size: 16px; -webkit-appearance: none;"
          />
          <button
            id="drawer-search-clear-btn"
            onclick="clearDrawerSearch()"
            style="display: none;"
            class="text-neutral-500 hover:text-black transition-colors duration-200"
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
                <span class="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">Signed in</span>
              </div>
            </div>
            <button onclick="closeMobileMenu(); handleLogout();" type="button" class="mt-3 w-full py-2 px-3 text-xs font-semibold text-red-600 bg-white border border-neutral-300 rounded-lg hover:bg-red-50 text-center transition cursor-pointer">
              Sign Out
            </button>
          </div>

          ${renderMobileMenuItem('HOME')}
          ${normalizedSections.map(renderMobileMenuItem).join('')}
          ${showSupportUs ? `
          <a
            href="/support-us"
            class="mt-4 text-center border font-share text-sm px-4 py-3 transition-colors whitespace-nowrap block"
            style="background-color: ${resolvedBecomeMemberBg}; color: ${resolvedBecomeMemberText}; border-color: ${resolvedBecomeMemberBg};"
          >
            ${becomeMemberText}
          </a>
          ` : ''}
        </nav>
        <div id="drawer-search-results" class="hidden flex flex-col p-4 gap-2 overflow-y-auto flex-1 h-full"></div>
      </div>
      <!-- Social icons in mobile menu footer -->
      ${showFacebook || showLinkedIn ? `
      <div class="flex items-center gap-3 px-4 py-4 border-t border-gray-100">
        ${showFacebook ? `
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
        ${showLinkedIn ? `
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



<!-- Search overlay (outside <header> to avoid stacking context conflicts) -->
<div id="search-overlay" class="hidden fixed inset-0 z-[200] flex-col bg-white" style="height:100dvh">
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
          style="font-size:16px; border-radius: 0; -webkit-appearance: none;"
          class="flex-1 outline-none text-base sm:text-xl font-merriweather text-white bg-transparent placeholder-neutral-500 appearance-none rounded-none"
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
  #navbar-top-banner, #navbar-logo-mark, #navbar-logo-quill, #navbar-logo-word, #navbar-logo-container,
  #navbar-social-icons, #auth-container, #navbar-support-btn,
  .navbar-dec-line, .nav-btn, .nav-box,
  #navbar-top-row, #desktop-hamburger-btn, #navbar-search-btn { transition: none !important; }

  #navbar-logo-mark, #navbar-logo-quill, #navbar-logo-word { will-change: transform; }

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
      return pre || [];
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
        overlay.style.display = 'flex';
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
        overlay.style.display = 'none';
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
            '<div class="flex-1 min-w-0">' + sectionBadge + '<p class="font-merriweather text-black text-xs leading-snug line-clamp-2">' + s.title + '</p></div>' +
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
        // Revert to blurred styles
        var container = document.getElementById('drawer-search-container');
        var icon = document.getElementById('drawer-search-icon');
        var clearBtn = document.getElementById('drawer-search-clear-btn');
        if (container) {
          container.classList.remove('bg-white', 'text-neutral-600', 'border-neutral-300', 'shadow-sm');
          container.classList.add('bg-neutral-800', 'text-neutral-450', 'border-transparent');
        }
        if (icon) {
          icon.classList.remove('text-neutral-500');
          icon.classList.add('text-neutral-450');
        }
        if (input) {
          input.classList.remove('text-black');
          input.classList.add('text-white');
        }
        if (clearBtn) {
          clearBtn.classList.remove('text-neutral-500', 'hover:text-neutral-800');
          clearBtn.classList.add('text-neutral-450', 'hover:text-white');
        }
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
          (q !== '' ? '<p class="font-merriweather text-lg font-bold text-black">\u201c' + query + '\u201d</p>' : '') +
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
      var ids = ['navbar-top-banner', 'navbar-logo-mark','navbar-logo-quill','navbar-logo-word','navbar-logo-container',
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
      var topBanner   = document.getElementById('navbar-top-banner');
      var logoMark    = document.getElementById('navbar-logo-mark');
      var logoWord    = document.getElementById('navbar-logo-word');
      var decLines    = document.querySelectorAll('.navbar-dec-line');
      var socialIcons = document.getElementById('navbar-social-icons');
      var authArea    = document.getElementById('auth-container');
      var supportBtn  = document.getElementById('navbar-support-btn');
      var header      = document.querySelector('header');

      if (topBanner) {
        var bannerHeight = (40 - 40 * t).toFixed(1) + 'px';
        var bannerMarginTop = (10 - 10 * t).toFixed(1) + 'px';
        var bannerPaddingTop = (12 - 12 * t).toFixed(1) + 'px';
        var bannerPaddingBottom = (12 - 12 * t).toFixed(1) + 'px';
        var bannerOpacity = (1 - t).toFixed(4);

        topBanner.style.marginTop = bannerMarginTop;
        topBanner.style.height = t === 0 ? '' : bannerHeight;
        topBanner.style.paddingTop = bannerPaddingTop;
        topBanner.style.paddingBottom = bannerPaddingBottom;
        topBanner.style.opacity = bannerOpacity;
        topBanner.style.pointerEvents = t >= 0.99 ? 'none' : 'auto';
      }

      /* One logo: shrinks as the page scrolls */
      document.documentElement.classList.toggle('op-scrolled', t > 0.5);
      var fade = Math.min(1, t * 1.8);
      if (logoMark) { logoMark.style.transform = 'scale(' + (1 - 0.35 * fade).toFixed(4) + ')'; logoMark.style.opacity = (1 - fade).toFixed(3); }
      var logoQuill = document.getElementById('navbar-logo-quill');
      if (logoQuill) { var q = Math.max(0, (t - 0.35) / 0.65); logoQuill.style.opacity = q.toFixed(3); logoQuill.style.transform = 'scale(' + (0.85 + 0.15 * q).toFixed(3) + ')'; }
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
          loginBtn.style.display = 'flex';
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
        var topBanner = document.getElementById('navbar-top-banner');
        var logoMark = document.getElementById('navbar-logo-mark');
        var logoWord = document.getElementById('navbar-logo-word');
        var decLines = document.querySelectorAll('.navbar-dec-line');
        var logoContainer = document.getElementById('navbar-logo-container');
        var topRow = document.getElementById('navbar-top-row');
        var header = document.querySelector('header');

        if (topBanner) {
          topBanner.style.height = '';
          topBanner.style.marginTop = '10px';
          topBanner.style.paddingTop = '12px';
          topBanner.style.paddingBottom = '12px';
          topBanner.style.opacity = '';
          topBanner.style.pointerEvents = '';
        }
        if (logoMark) { logoMark.style.transform = ''; logoMark.style.opacity = ''; }
        var logoQuillReset = document.getElementById('navbar-logo-quill');
        if (logoQuillReset) { logoQuillReset.style.transform = ''; logoQuillReset.style.opacity = '0'; }
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
        var loginBtn = document.getElementById('login-btn');
        if (loginBtn) loginBtn.style.display = (window.showSignIn && !(localStorage.getItem('website_token') || getCookie('website_token'))) ? 'flex' : 'none';
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
          if (btn.classList.contains('bg-neutral-100')) { /* mobile drawer active item: already styled */ }
          else { btn.classList.add('text-black', 'font-bold'); btn.classList.remove('hover:text-black'); }
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
        // Position overlay to start below the banner so banner stays visible
        var banner = document.getElementById('navbar-top-banner');
        var header = document.querySelector('header');
        var topOffset = 0;
        if (banner && banner.offsetHeight > 0) {
          topOffset = banner.getBoundingClientRect().bottom;
        } else if (header) {
          topOffset = header.getBoundingClientRect().bottom;
        }
        topOffset = Math.max(0, topOffset);
        overlay.style.top = topOffset + 'px';
        overlay.style.height = 'calc(100dvh - ' + topOffset + 'px)';
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
        var dim = document.getElementById('mobile-menu-dim');
        if (dim) { dim.classList.remove('opacity-0', 'pointer-events-none'); dim.classList.add('opacity-100', 'pointer-events-auto'); }
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
        var dim = document.getElementById('mobile-menu-dim');
        if (dim) { dim.classList.add('opacity-0', 'pointer-events-none'); dim.classList.remove('opacity-100', 'pointer-events-auto'); }
        drawer.classList.add('translate-x-full');
        drawer.classList.remove('translate-x-0');
        document.body.style.overflow = 'unset';
      }
      if (window.clearDrawerSearch) {
        window.clearDrawerSearch();
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
        if (!window.showSignIn) {
          if (authContainer) authContainer.style.display = 'none';
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
        const mobileLoginBtn = document.getElementById('mobile-login-btn');
        const mobileAccountContainer = document.getElementById('mobile-account-container');

        if (token) {
          if (loginBtn) loginBtn.style.display = 'none';
          if (bannerLoginBtn) bannerLoginBtn.style.display = 'none';
          if (accountContainer) {
            accountContainer.style.display = 'block';
            // Update user info
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

            const drawerAvatarContainer = document.getElementById('drawer-avatar-container');
            if (drawerAvatarContainer) drawerAvatarContainer.innerHTML = '';

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
          if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';
          if (mobileAccountContainer) mobileAccountContainer.style.display = 'flex';
        } else {
          if (loginBtn) {
            loginBtn.style.display = window.showSignIn ? 'flex' : 'none';
          }
          if (bannerLoginBtn) bannerLoginBtn.style.display = 'inline-flex';
          if (accountContainer) accountContainer.style.display = 'none';
          if (mobileLoginBtn) mobileLoginBtn.style.display = 'flex';
          if (mobileAccountContainer) mobileAccountContainer.style.display = 'none';
          const drawerAvatarContainer = document.getElementById('drawer-avatar-container');
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

    // Initial call to catch state before DOMContentLoaded
    window.updateAuthUI();

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

      // Lock support button width to prevent layout shifts ("dancing buttons") on scroll
      var navbarBtn = document.getElementById('navbar-support-btn');
      if (navbarBtn && window.innerWidth >= 1024) {
        var measureSupportBtn = function() {
          navbarBtn.style.minWidth = '';
          if (navbarBtn.offsetWidth > 0) {
            navbarBtn.style.minWidth = navbarBtn.offsetWidth + 'px';
          }
        };
        measureSupportBtn();
        if (document.fonts) {
          document.fonts.ready.then(measureSupportBtn);
        }
      }
      
      // Check donor status and hide Support Us + Become a Member buttons if donor
      (function() {
        try {
          function hideDonorButtons() {
            var topBannerEl = document.getElementById('navbar-top-banner');
            var bannerBtn = document.getElementById('banner-support-btn');
            var navbarBtn = document.getElementById('navbar-support-btn');
            var drawerSupport = document.querySelector('[data-drawer-support-btn]');
            var drawerMember = document.querySelector('[data-drawer-become-member-btn]');
            if (topBannerEl) { topBannerEl.style.display = 'none'; topBannerEl.style.height = '0'; topBannerEl.style.overflow = 'hidden'; }
            if (bannerBtn) bannerBtn.style.display = 'none';
            if (navbarBtn) navbarBtn.style.display = 'none';
            if (drawerSupport) drawerSupport.style.display = 'none';
            if (drawerMember) drawerMember.style.display = 'none';
            document.querySelectorAll('.instory-ad, .ad-block-container, [data-ad-block], .ad-container, [data-ad-type], #instory-ad, #leaderboard-ad, #sidebar-ad').forEach(function(el) {
              el.style.display = 'none';
            });
          }
          // Fast path: check website_user / auth_user / user for donation status
          var storedKeys = ['website_user', 'auth_user', 'user'];
          for (var ki = 0; ki < storedKeys.length; ki++) {
            try {
              var parsed = JSON.parse(localStorage.getItem(storedKeys[ki]) || '{}');
              if (parsed && (
                parsed.isDonor === true ||
                parsed.adFree === true ||
                parsed.suppressCampaigns === true ||
                Number(parsed.donationTotalAmount || 0) > 0 ||
                Number(parsed.donationCount || 0) > 0 ||
                Number(parsed.lastDonationAmount || 0) > 0
              )) {
                hideDonorButtons();
                return;
              }
            } catch(e) {}
          }
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
                var isDonor = data.users.some(function(u) { return u.email && u.email.toLowerCase() === email.toLowerCase(); });
                if (isDonor) hideDonorButtons();
              }
            }).catch(function(e) { console.error('Error checking donor status:', e); });
          }
        } catch (e) { console.error('Failed donor check:', e); }
      })();

      // Background loading of stories immediately on page load to get full list
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
              var fetched = rawStories.map(function(s) {
                var extractedText = '';
                if (s.storySummary && typeof s.storySummary === 'string') {
                  extractedText = s.storySummary;
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
                  } catch (e) {}
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

                var words = fullText.trim() ? fullText.trim().split(/\\s+/).length : 0;
                var minRead = Math.max(1, Math.ceil(words / 220)) + ' min read';
                
                var dateStr = '';
                if (s.date || s.publishedAt || s.createdAt) {
                  var d = new Date(s.date || s.publishedAt || s.createdAt);
                  if (!isNaN(d.getTime())) {
                    dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  }
                }

                var title = s.title || s.headline || '';
                var publishUrl = s.publishUrl || s.publishedUrl || s.published_url || s.redirectUrl || s['Published URL'] || s['Published Url'] || (s.slug ? (String(s.slug).charAt(0) === '/' ? s.slug : '/' + s.slug) : '') || '';

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

              if (fetched.length > 0) {
                var hadStories = _searchStories && _searchStories.length > 0;
                _searchStories = fetched;
                hasLoadedSearchStories = true;

                if (isSearchOpen && !hadStories) {
                  var input = document.getElementById('search-input');
                  window.handleSearchInput(input ? input.value : '');
                }
                var drawerInput = document.getElementById('drawer-search-input');
                if (drawerInput && (isDrawerSearchActive || drawerInput.value) && !hadStories) {
                  window.handleDrawerSearch(drawerInput.value);
                }
              }
            }).catch(function() {});
        } catch(e) {}
      })();

      /* Kill all CSS transitions on nav elements via inline !important.
         Must run before first scroll event to prevent Tailwind transition-all
         from animating JS-written style changes. */
      _initNavTransitions();

      // Register scroll listener — throttled to one DOM update per animation frame
      let scrollRAF = null;
      window.addEventListener('scroll', function() {
        if (scrollRAF) cancelAnimationFrame(scrollRAF);
        scrollRAF = requestAnimationFrame(window.updateScrollState);
      }, { passive: true });

      // scrollend fires only after ALL scroll inertia stops — the correct moment to snap.
      // This eliminates the mid-momentum false-snap that caused flickering.
      if ('onscrollend' in window) {
        window.addEventListener('scrollend', _onNavScrollEnd, { passive: true });
      }

      window.updateScrollState();

      // Drawer search input focus/blur event listeners
      var drawerInput = document.getElementById('drawer-search-input');
      if (drawerInput) {
        drawerInput.addEventListener('focus', function() {
          isDrawerSearchActive = true;
          // Apply focused styles
          var container = document.getElementById('drawer-search-container');
          var icon = document.getElementById('drawer-search-icon');
          var clearBtn = document.getElementById('drawer-search-clear-btn');
          if (container) {
            container.classList.remove('bg-neutral-800', 'text-neutral-450', 'border-transparent');
            container.classList.add('bg-white', 'text-neutral-600', 'border-neutral-300', 'shadow-sm');
          }
          if (icon) {
            icon.classList.remove('text-neutral-450');
            icon.classList.add('text-neutral-500');
          }
          if (drawerInput) {
            drawerInput.classList.remove('text-white');
            drawerInput.classList.add('text-black');
          }
          if (clearBtn) {
            clearBtn.classList.remove('text-neutral-450', 'hover:text-white');
            clearBtn.classList.add('text-neutral-500', 'hover:text-neutral-800');
          }
          window.handleDrawerSearch(this.value);
        });
        drawerInput.addEventListener('blur', function() {
          setTimeout(function() {
            isDrawerSearchActive = false;
            // Revert to blurred styles
            var container = document.getElementById('drawer-search-container');
            var icon = document.getElementById('drawer-search-icon');
            var clearBtn = document.getElementById('drawer-search-clear-btn');
            if (container) {
              container.classList.remove('bg-white', 'text-neutral-600', 'border-neutral-300', 'shadow-sm');
              container.classList.add('bg-neutral-800', 'text-neutral-450', 'border-transparent');
            }
            if (icon) {
              icon.classList.remove('text-neutral-500');
              icon.classList.add('text-neutral-450');
            }
            if (drawerInput) {
              drawerInput.classList.remove('text-black');
              drawerInput.classList.add('text-white');
            }
            if (clearBtn) {
              clearBtn.classList.remove('text-neutral-500', 'hover:text-neutral-800');
              clearBtn.classList.add('text-neutral-450', 'hover:text-white');
            }
            var inputVal = document.getElementById('drawer-search-input') ? document.getElementById('drawer-search-input').value : '';
            window.handleDrawerSearch(inputVal);
          }, 200);
        });
      }

      const loginButtons = ['login-btn'];
      loginButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.addEventListener('click', function(e) {
            localStorage.setItem('sso_return_to', window.location.href);
          });
        }
      });

      // Periodic check for auth changes (helps with fast redirects and late hydration)
      setInterval(window.updateAuthUI, 1000);

      // Listener for cross-tab or same-tab storage changes
      window.addEventListener('storage', (e) => {
        if (e.key === 'website_token' || e.key === 'auth_user') {
          window.updateAuthUI();
        }
      });

      // ESC key closes search (or mobile menu)
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          if (isSearchOpen) { window.closeSearch(); }
          else if (isMobileMenuOpen) { window.closeMobileMenu(); }
        }
      });

      // Leaving the phone layout while the menu is open must not leave the page scroll-locked.
      window.addEventListener('resize', function() {
        if (isMobileMenuOpen && window.innerWidth >= 640) window.closeMobileMenu();
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

      // Click on search overlay backdrop (not on the panel content) closes search
      const searchOverlay = document.getElementById('search-overlay');
      if (searchOverlay && isSearchOpen && event.target === searchOverlay) {
        window.closeSearch();
      }
    });
  })();
</script>
`
}

