
function slugify(value) {
    if (!value) return "";
    return value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}

export function renderAuthorProfile(props) {
    const { name, bio, image, twitter, linkedin } = props;
    const displayName = name || 'Author Name';
    const displayBio = bio || 'Author Bio';
    const displayImage = image || 'https://via.placeholder.com/150';
    const displayTwitter = twitter;
    const displayLinkedin = linkedin;

    let socialHtml = '';
    if (displayTwitter) {
        socialHtml += `
        <a href="https://twitter.com/${displayTwitter.replace('@', '')}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 font-share text-sm md:text-[16px] text-black hover:underline">
            Twitter
        </a>
     `;
    }
    if (displayLinkedin) {
        socialHtml += `
        <a href="${displayLinkedin}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 font-share text-sm md:text-[16px] text-black hover:underline">
            LinkedIn
        </a>
     `;
    }

    return `
    <div class="max-w-6xl lg:pl-32 py-6 flex flex-col md:flex-row items-center md:items-start gap-5 md:gap-8 my-4 md:my-8 w-full overflow-hidden">
        <div class="flex-shrink-0 w-24 h-24 md:w-36 md:h-36">
            <img
                src="${displayImage}"
                alt="${displayName}"
                class="w-full h-full rounded-full object-cover border-2 border-gray-100 shadow-sm"
            />
        </div>
        <div class="flex-grow w-full text-center md:text-left flex flex-col items-center md:items-start px-2 md:px-0">
            <h1 class="text-2xl md:text-[30px] font-extrabold font-libre text-black leading-tight break-words text-center md:text-left w-full">${displayName}</h1>
            <p class="mt-3 text-base text-gray-700 font-[Merriweather] leading-relaxed max-w-2xl mx-auto md:mx-0 text-center md:text-left">${displayBio}</p>
            <div class="mt-5 md:mt-4 flex flex-wrap gap-4 justify-center md:justify-start w-full">
                ${socialHtml}
            </div>
        </div>
    </div>
  `;
}

export function renderAuthorCard(props) {
    const { authorId, name, bio, image } = props;
    const displayName = name || 'Author Name';
    const displayBio = bio || 'Lorem ipsum dolor sit amet.';
    const displayImage = image || 'https://via.placeholder.com/150';

    let authorLink = "";
    if (displayName) {
        const authorSlug = slugify(displayName);
        authorLink = `/authors/${authorSlug}`;
    }

    const Tag = authorLink ? 'a' : 'div';
    const actionAttr = authorLink ? `href="${authorLink}"` : '';

    return `
    <${Tag} 
        class="group flex flex-col items-start w-full cursor-pointer block"
        ${actionAttr}
    >
        <!-- Image Container with Blue Tint (Duotone Style) -->
        <div class="w-full aspect-square mb-3 overflow-hidden bg-blue-50 relative group-hover:bg-transparent transition-colors duration-500">
            <!-- Blue Color Overlay -->
            <div class="absolute inset-0 bg-blue-600/60 z-10 pointer-events-none mix-blend-screen group-hover:opacity-0 transition-opacity duration-300"></div>

            <img
                class="w-full h-full object-cover transition-all duration-500 ease-in-out filter grayscale contrast-125 group-hover:filter-none group-hover:grayscale-0"
                src="${displayImage}"
                alt="${displayName}"
            />
        </div>

        <!-- Name and Arrow Row -->
        <div class="w-full flex justify-between items-center mb-1 border-b border-gray-100 pb-1 group-hover:border-black transition-colors duration-300">
            <h3 class="text-[18px] font-extrabold font-libre text-black leading-tight pr-2">
                ${displayName}
            </h3>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300 flex-shrink-0"
            >
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
        </div>

        <!-- Role / Bio - Very small text -->
        <p class="text-m text-gray-700 font-merriweather leading-relaxed max-w-2xl line-clamp-3">
            ${displayBio}
        </p>
    </${Tag}>
  `;
}

export function renderAuthorsGrid(props, allAuthors = []) {
    const title = props.title || 'The Voices Behind OpenPress';
    const authors = allAuthors;

    const authorsHtml = authors.map(author => `
    <div class="group flex flex-col items-start w-full">
        <!-- Image Container with Blue Tint (Duotone Style) -->
        <div class="w-full aspect-square mb-3 overflow-hidden bg-blue-50 relative group-hover:bg-transparent transition-colors duration-500">
            <!-- Blue Color Overlay -->
            <div class="absolute inset-0 bg-blue-600/60 z-10 pointer-events-none mix-blend-screen group-hover:opacity-0 transition-opacity duration-300"></div>

            <img
                class="w-full h-full object-cover transition-all duration-500 ease-in-out filter grayscale contrast-125 group-hover:filter-none group-hover:grayscale-0"
                src="${author.image || author.imageUrl || '/openpress-logo-full-nobg-trim.png'}"
                alt="${author.name || author.authorName || ''}"
            />
        </div>

        <!-- Name and Arrow Row -->
        <div class="w-full flex justify-between items-center mb-1 border-b border-gray-100 pb-1 group-hover:border-black transition-colors duration-300">
            <h3 class="text-[18px] font-extrabold font-libre text-black leading-tight pr-2">
                ${author.name || author.authorName || ''}
            </h3>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                class="transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300 flex-shrink-0"
            >
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
        </div>

        <!-- Role / Bio - Very small text -->
        <p class="text-m text-gray-700 font-merriweather leading-relaxed max-w-2xl line-clamp-3">
            ${author.bio || "Staff Writer"}
        </p>
    </div>
  `).join('');

    return `
    <div class="w-full relative py-16 px-4 sm:px-6 lg:px-8">
        <!-- Background Layer - Decreased height -->
        <div class="absolute inset-0 h-[361px] bg-graph-paper -z-10"></div>
        <div class="max-w-5xl mx-auto">
            <!-- Header Section -->
            <div class="text-center mb-16 relative">
                <h2 class="text-4xl md:text-5xl font-extrabold font-libre text-black tracking-tight leading-tight whitespace-pre-line">
                    ${title}
                </h2>
            </div>

            <!-- Grid Section - 4 Columns, constrained width to keep cards small -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
                ${authorsHtml}
            </div>
        </div>
    </div>
  `;
}

export function renderAuthorsGridManual(props, renderZoneFn) {
    const rowCount = Math.max(props.rowCount || 3, 1);
    const title = props.title || "The Voices Behind OpenPress";

    let rowsHtml = '';

    for (let i = 0; i < rowCount; i++) {
        let rowSlotsHtml = '';
        for (let j = 0; j < 4; j++) {
            const slotIndex = i * 4 + j;
            const content = renderZoneFn(`${props.id}:author-slot-${slotIndex}`);

            if (content && content.trim() !== '') {
                rowSlotsHtml += `
                    <div class="flex-1 min-w-0">
                        ${content}
                    </div>
                 `;
            }
        }

        if (rowSlotsHtml !== '') {
            rowsHtml += `
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 w-full ${rowsHtml !== '' ? "mt-10" : ""}">
                    ${rowSlotsHtml}
                </div>
            `;
        }
    }

    return `
        <div class="w-full relative py-16 px-4 sm:px-6 lg:px-8">
            <!-- Background Layer - Decreased height -->
            <div class="absolute inset-0 h-[361px] bg-graph-paper -z-10"></div>
            <div class="max-w-5xl mx-auto">
                <div class="text-center mb-16 relative">
                    <h2 class="text-4xl md:text-5xl font-extrabold font-libre text-black tracking-tight leading-tight whitespace-pre-line">
                        ${title}
                    </h2>
                </div>
                <div class="flex flex-col w-full">
                    ${rowsHtml}
                </div>
            </div>
        </div>
    `;
}

