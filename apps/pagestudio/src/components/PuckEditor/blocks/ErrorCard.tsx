// import React from "react";
 
export type ErrorCardProps = {
    title?: string;
    description?: string;
    linkText?: string;
    linkUrl?: string;
    className?: string;
};
 
export function ErrorCard({
    title = "Page not found",
    description = "We're sorry we seem to have lost this page.",
    linkText = "GO TO HOMEPAGE",
    linkUrl = "/",
    className = "",
}: ErrorCardProps) {
    // Handle click to navigate
    const handleClick = () => {
        if (linkUrl) {
            window.location.href = linkUrl;
        }
    };
 
    return (
        <div
            className={`w-full min-h-[400px] flex flex-col items-center justify-center bg-white py-16 px-4 ${className}`}
        >
            {/* Title */}
            <h1 className="font-libre text-3xl sm:text-4xl lg:text-5xl font-extrabold text-black text-center mb-6">
                {title}
            </h1>
 
            {/* Description */}
            <p className="font-[Merriweather] text-base sm:text-lg text-black text-center mb-8">
                {description}
            </p>
 
            {/* Link */}
            <button
                onClick={handleClick}
                className="font-share text-[11px] sm:text-[12px] uppercase tracking-wider text-black underline underline-offset-4 hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-none"
            >
                {linkText}
            </button>
        </div>
    );
}
 
export default ErrorCard;
 
 