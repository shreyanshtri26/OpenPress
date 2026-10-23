import React from "react";

export function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio-layout">
      {children}
    </div>
  );
}

export default HomeLayout;
