import React from "react";

export function AuthorLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ width: "100%", margin: "0 auto", padding: 0 }}>
            {children}
        </div>
    );
}

export default AuthorLayout;
