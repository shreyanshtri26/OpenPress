import React from "react";

export function VideoAuthorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", padding: 0 }}>
      {children}
    </div>
  );
}

export default VideoAuthorLayout;
