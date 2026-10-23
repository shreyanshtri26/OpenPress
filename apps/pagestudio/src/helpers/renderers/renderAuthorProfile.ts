import { findAuthorById } from '../../components/PuckEditor/authorData'

export function renderAuthorProfile(props: {
    authorId?: string
    name?: string
    bio?: string
    image?: string
    role?: string
    twitter?: string
    linkedin?: string
}): string {
    const author = props.authorId ? findAuthorById(props.authorId) : null
    const displayName = props.name || author?.name || 'Author Name'
    const displayBio = props.bio || author?.bio || 'Author Bio'
    const displayImage = props.image || author?.image || '/openpress-quill-nobg-trim.png'
    const displayTwitter = props.twitter || author?.twitter
    const displayLinkedin = props.linkedin || author?.linkedin


    let socialHtml = ''
    if (displayTwitter) {
        socialHtml += `
        <a href="https://twitter.com/${displayTwitter.replace('@', '')}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 font-share text-sm md:text-[16px] text-black hover:underline">
            Twitter
        </a>
     `
    }
    if (displayLinkedin) {
        socialHtml += `
        <a href="${displayLinkedin}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 font-share text-sm md:text-[16px] text-black hover:underline">
            LinkedIn
        </a>
     `
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
  `
}
