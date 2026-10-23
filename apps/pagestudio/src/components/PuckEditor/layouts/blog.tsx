import React from "react";

export function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio-layout">
      {children}
    </div>
  );
}

export default BlogLayout;
