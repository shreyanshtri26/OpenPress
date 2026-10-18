import { AuthorsGrid } from "../PuckEditor/blocks/author/AuthorsGrid";
import { FooterBlock } from "../PuckEditor/blocks/FooterBlock";
import { MastheadNavbarBlock as MastheadNavbar } from "../PuckEditor/blocks/MastheadNavbarBlock";

export const Authors = () => {
    return (
        <div className="font-sans text-black bg-white min-h-screen flex flex-col">
            <MastheadNavbar
                id="authors-navbar"
            />

            <main className="flex-grow py-12">
                <AuthorsGrid title="The Voices Behind OpenPress" />
            </main>

            <FooterBlock id="authors-footer" />
        </div>
    );
};

export default Authors;
