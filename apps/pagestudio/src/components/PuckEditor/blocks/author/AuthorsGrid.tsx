import { getAuthors } from "../../authorData";

export type AuthorsGridProps = {
    title?: string;
};

export function AuthorsGrid({ title = "The Voices Behind OpenPress" }: AuthorsGridProps) {
    const authors = getAuthors();

    return (
        <div className="op-container relative py-16">
            {/* Background Layer - Decreased height */}
            <div className="absolute inset-0 h-[361px] bg-graph-paper -z-10"></div>
            <div className="max-w-5xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-16 relative">
                    <h2 className="text-4xl md:text-5xl font-extrabold font-libre text-black tracking-tight leading-tight whitespace-pre-line">
                        {title}
                    </h2>
                </div>

                {/* Grid Section - 4 Columns, constrained width to keep cards small */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
                    {authors.map((author) => (
                        <div key={author.id} className="group flex flex-col items-start w-full">
                            {/* Image Container with Blue Tint (Duotone Style) */}
                            <div className="w-full aspect-square mb-3 overflow-hidden bg-blue-50 relative group-hover:bg-transparent transition-colors duration-500">
                                {/* Blue Color Overlay */}
                                <div className="absolute inset-0 bg-blue-600/60 z-10 pointer-events-none mix-blend-screen group-hover:opacity-0 transition-opacity duration-300"></div>

                                <img
                                    className="w-full h-full object-cover transition-all duration-500 ease-in-out filter grayscale contrast-125 group-hover:filter-none group-hover:grayscale-0"
                                    src={author.image}
                                    alt={author.name}
                                />
                            </div>

                            {/* Name and Arrow Row */}
                            <div className="w-full flex justify-between items-center mb-1 border-b border-gray-100 pb-1 group-hover:border-black transition-colors duration-300">
                                <h3 className="text-[18px] font-extrabold font-libre text-black leading-tight pr-2">
                                    {author.name}
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
                            <p className="text-m text-gray-700  font-[Merriweather] leading-relaxed max-w-2xl line-clamp-5 md:line-clamp-3">
                                {author.bio || "Lorem ipsum dolor sit amet consectetur adipiscing elit."}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AuthorsGrid;
