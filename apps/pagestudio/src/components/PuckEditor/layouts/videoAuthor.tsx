import React from "react";

export function VideoAuthorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio-layout">
      {children}
    </div>
  );
}

export default VideoAuthorLayout;
