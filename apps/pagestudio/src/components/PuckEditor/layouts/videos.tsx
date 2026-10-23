import React from "react";

export function VideosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio-layout">
      {children}
    </div>
  );
}

export default VideosLayout;
