// import React from "react";
import { findAuthorById } from "../../authorData";

export type AuthorCardProps = {
    authorId?: string;
    name?: string;
    bio?: string;
    image?: string;
};

// Simplified AuthorCard specifically for the draggable grid
function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}

export function AuthorCard({ authorId, name, bio, image }: AuthorCardProps) {
    const author = authorId ? findAuthorById(authorId) : null;
    const displayName = name || author?.name || "Author Name";
    const displayBio = bio || author?.bio || "Lorem ipsum dolor sit amet.";
    const displayImage = image || author?.image || "/openpress-quill-nobg-trim.png";

    const handleRedirect = () => {
        if (displayName) {
            const authorSlug = slugify(displayName);
            window.location.hash = `/authors/${authorSlug}`;
        }
    };

    return (
        <div
            className="group flex flex-col items-start w-full cursor-pointer"
            onClick={handleRedirect}
        >
            {/* Image Container with Blue Tint (Duotone Style) */}
            <div className="w-full aspect-square mb-3 overflow-hidden bg-blue-50 relative group-hover:bg-transparent transition-colors duration-500">
                {/* Blue Color Overlay */}
                <div className="absolute inset-0 bg-blue-600/60 z-10 pointer-events-none mix-blend-screen group-hover:opacity-0 transition-opacity duration-300"></div>

                <img
                    className="w-full h-full object-cover transition-all duration-500 ease-in-out filter grayscale contrast-125 group-hover:filter-none group-hover:grayscale-0"
                    src={displayImage}
                    alt={displayName}
                />
            </div>

            {/* Name and Arrow Row */}
            <div className="w-full flex justify-between items-center mb-1 border-b border-gray-100 pb-1 group-hover:border-black transition-colors duration-300">
                <h3 className="text-[18px] font-extrabold font-libre text-black leading-tight pr-2">
                    {displayName}
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
                    className="transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300 flex-shrink-0"
                >
                    <line x1="7" y1="17" x2="17" y2="7"></line>
                    <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
            </div>

            {/* Role / Bio - Very small text */}
            <p className="text-m text-gray-700 font-merriweather leading-relaxed max-w-2xl line-clamp-3">
                {displayBio}
            </p>
        </div>
    );
}

export default AuthorCard;
