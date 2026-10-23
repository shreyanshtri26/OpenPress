import React from "react";

export function ErrorLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="studio-layout">
            {children}
        </div>
    );
}

export default ErrorLayout;
