import React from "react";

export function SectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio-layout">
      {children}
    </div>
  );
}

export default SectionLayout;
