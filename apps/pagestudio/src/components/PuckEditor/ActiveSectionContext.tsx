import { createContext, useContext } from "react";

type ActiveSectionContextType = {
    activeSection: string | null;
    setActiveSection: (section: string | null) => void;
    activeAuthor: string | null;
    setActiveAuthor: (author: string | null) => void;
};

export const ActiveSectionContext = createContext<ActiveSectionContextType | null>(null);

export function useActiveSection() {
    const context = useContext(ActiveSectionContext);
    if (!context) {
        // Return a no-op if context is not available (e.g., in published page view)
        return {
            activeSection: null,
            setActiveSection: () => { },
            activeAuthor: null,
            setActiveAuthor: () => { },
        };
    }
    return context;
}
