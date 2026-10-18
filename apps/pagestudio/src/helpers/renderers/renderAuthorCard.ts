import { findAuthorById } from '../../components/PuckEditor/authorData'

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}

export function renderAuthorCard(props: {
    authorId?: string
    name?: string
    bio?: string
    image?: string
}): string {
    const author = props.authorId ? findAuthorById(props.authorId) : null
    const displayName = props.name || author?.name || 'Author Name'
    const displayBio = props.bio || author?.bio || 'Lorem ipsum dolor sit amet.'
    const displayImage = props.image || author?.image || 'https://via.placeholder.com/150'

    let authorLink = "";
    if (props.authorId && displayName) {
        // const userId = props.authorId;
        const baseSlug = slugify(displayName);
        // const uniqueSuffix = userId.slice(-4);
        const authorSlug = `${baseSlug}`;
        authorLink = `/authors/${authorSlug}`;
    }

    const Tag = authorLink ? 'a' : 'div'
    const actionAttr = authorLink ? `href="${authorLink}"` : ''

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
  `
}
