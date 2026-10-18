import { fetchAuthors, type AuthorPayload } from './apiService'

export type Author = {
    id: string;
    name: string;
    bio: string;
    image: string;
    role?: string;
    email?: string;
    twitter?: string;
    linkedin?: string;
};

let cachedAuthors: Author[] = [];

function mapAuthor(author: AuthorPayload): Author {
    return {
        id: author.id,
        name: author.name,
        bio: author.bio,
        image: author.image,
        role: author.role,
        email: author.email,
        twitter: author.twitter,
        linkedin: author.linkedin,
    };
}

// Global, session-scoped data — not page-specific and nothing invalidates it
// mid-session — so skip re-fetching once populated, and dedupe concurrent
// calls (avoids firing this again if a second page switch happens before
// the first fetch resolves).
let authorsInFlight: Promise<Author[]> | null = null;

export async function initializeAuthors(): Promise<Author[]> {
    if (cachedAuthors.length > 0) return cachedAuthors;
    if (authorsInFlight) return authorsInFlight;

    authorsInFlight = fetchAuthors()
        .then((apiAuthors) => {
            if (apiAuthors.length) {
                cachedAuthors = apiAuthors.map(mapAuthor);
            }
            return cachedAuthors;
        })
        .catch((error) => {
            console.error('Failed to fetch authors:', error);
            // Keep whatever was already cached — a transient failure
            // shouldn't wipe out a good previous result.
            return cachedAuthors;
        })
        .finally(() => {
            authorsInFlight = null;
        });
    return authorsInFlight;
}


export function getAuthors(): Author[] {
    return cachedAuthors;
}

// Fills the store directly, for callers that already hold the author list and
// cannot run `initializeAuthors()` — specifically the published-page renderer
// bundle running in the backend republish-all worker, where there is no browser
// session to fetch with. The author renderers (`findAuthorById`, `getAuthors`)
// read only from this store, so without seeding it they render blank cards.
export function setAuthors(authors: Author[]): void {
    cachedAuthors = authors;
}

export function findAuthorById(id: string): Author | undefined {
    return cachedAuthors.find((author) => author.id === id);
}

export function getAuthorOptions(): { label: string; value: string }[] {
    return cachedAuthors.map((author) => ({
        label: author.name,
        value: author.id,
    }));
}
