import { createContext, useContext } from "react";

type LayoutContextType = {};

export const LayoutContext = createContext<LayoutContextType>({});

export function useLayout() {
    return useContext(LayoutContext);
}
