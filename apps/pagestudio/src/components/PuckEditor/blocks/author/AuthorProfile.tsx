// import React from "react";
import { findAuthorById } from "../../authorData";
import { useActiveSection } from "../../ActiveSectionContext";

export interface AuthorProfileProps {
    authorId?: string;
    name?: string;
    bio?: string;
    image?: string;
    twitter?: string;
    linkedin?: string;
}

export function AuthorProfile({ authorId: authorIdProp, name, bio, image, twitter, linkedin }: AuthorProfileProps) {
    const { activeAuthor } = useActiveSection();

    // Prioritize context's activeAuthor if available on Author pages, 
    // otherwise fallback to prop or null
    const authorId = activeAuthor || authorIdProp;

    // If authorId is provided, try to look up the author
    const author = authorId ? findAuthorById(authorId) : null;

    // Use props as fallback or overrides
    const displayName = name || author?.name || "Author Name";
    const displayBio = bio || author?.bio || "Author Bio";
    const displayImage = image || author?.image || "/openpress-quill-nobg-trim.png";
    const displayTwitter = twitter || author?.twitter;
    const displayLinkedin = linkedin || author?.linkedin;

    return (
        <div className="max-w-6xl lg:pl-32 py-6 flex flex-col md:flex-row items-center md:items-start gap-5 md:gap-8 my-4 md:my-8 w-full overflow-hidden">
            <div className="flex-shrink-0 w-24 h-24 md:w-36 md:h-36">
                <img
                    src={displayImage}
                    alt={displayName}
                    className="w-full h-full rounded-full object-cover border-2 border-gray-100 shadow-sm"
                />
            </div>
            <div className="flex-grow w-full text-center md:text-left flex flex-col items-center md:items-start px-2 md:px-0">
                <h1 className="text-2xl md:text-[30px] font-extrabold font-libre text-black leading-tight break-words text-center md:text-left w-full">{displayName}</h1>
                <p className="mt-3 text-base text-gray-700 font-[Merriweather] leading-relaxed max-w-2xl mx-auto md:mx-0 text-center md:text-left">{displayBio}</p>

                <div className="mt-5 md:mt-4 flex flex-wrap gap-4 justify-center md:justify-start w-full">
                    {displayTwitter && (
                        <a href={`https://twitter.com/${displayTwitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-share text-sm md:text-[16px] text-black hover:underline">
                            Twitter
                        </a>
                    )}
                    {displayLinkedin && (
                        <a href={displayLinkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-share text-sm md:text-[16px] text-black hover:underline">
                            LinkedIn
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AuthorProfile;
