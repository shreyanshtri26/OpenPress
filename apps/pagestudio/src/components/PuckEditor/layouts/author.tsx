import React from "react";

export function AuthorLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="studio-layout">
            {children}
        </div>
    );
}

export default AuthorLayout;
