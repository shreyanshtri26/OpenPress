import { useEffect } from 'react';

export const AboutUs = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="font-sans text-black bg-white min-h-screen flex flex-col">

            <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header Section */}
                <div className="mb-10 border-b border-dotted border-black pb-8">
                    <h2 className="font-bold text-sm uppercase mb-2 tracking-wider">About OpenPress</h2>
                    <h1 className="font-merriweather text-3xl md:text-4xl font-bold leading-tight italic">
                        Independent journalism that is free for everyone to read.
                    </h1>
                </div>

                <div className="blog-body-content text-[19px] font-merriweather leading-[1.8rem] text-[#222] outline-none">
                    <p className="font-bold">
                        OpenPress is a free, open publishing platform for independent journalism.
                    </p>

                    <p>
                        Every article is available to everyone, with no paywall and no sign-in. We believe good reporting should be easy to find, easy to read and easy to share.
                    </p>

                    <p>
                        Our tools are built so that small teams and individual writers can publish with the same care and polish as larger outlets. Stories are written, edited and reviewed by people, and we aim to be accurate, fair and open about our sources and our corrections.
                    </p>

                    <h2 className="text-2xl font-bold uppercase mt-12 mb-4">Be part of our journey</h2>

                    <p>
                        If you have a story, a correction or a question, we want to hear from you. You don't need to be a journalist. You just need honesty and the willingness to think out loud.
                    </p>

                    <p>
                        Visit our <a href="/contact-us" className="underline font-medium">Contact Us</a> page and tell us what you'd like to explore. We're listening.
                    </p>
                </div>
            </main>

        </div>
    );
};
