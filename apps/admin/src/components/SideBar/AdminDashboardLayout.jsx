
import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { SideBar } from './SideBar';
import { PageStudioButton, EPaperButton } from '../common/ToolbarLinks';
import PWAInstall from '../elements/PWAInstall';

const AdminLayoutContext = createContext(undefined);

// Tools outside the editorial workflow live in a slim strip above every page: Page Studio (Super Users) and ePaper.
const TopActions = () => (
  <div className="flex shrink-0 items-center justify-end gap-2 px-4 pt-2">
    <PageStudioButton />
    <EPaperButton />
  </div>
);

export const useAdminLayout = () => {
  const context = useContext(AdminLayoutContext);
  if (!context) {
    throw new Error('useAdminLayout must be used within AdminDashboardLayout');
  }
  return context;
};

export const AdminDashboardLayout = ({
  children,
  onShowDashboard = () => { },
  onShowAllStories = () => { },
  onShowMediaLibrary = () => { },
  onShowAnalytics = () => { },
  defaultSidebarOpen = true,
}) => {

  // fetching state from local storage
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = window.localStorage.getItem('sidebar-state');
      if (savedState !== null) {
        return JSON.parse(savedState);
      }
    }
    return defaultSidebarOpen;
  });


  // useEffect(() => {
  //   setSidebarOpen(defaultSidebarOpen);
  // }, [defaultSidebarOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const savedState = window.localStorage.getItem('sidebar-state');
      if (savedState === null) {
        setSidebarOpen(false);
      }
    }
  }, []);

  // save the state to local storage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sidebar-state', JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  const contextValue = useMemo(
    () => ({
      isSidebarOpen,
      toggleSidebar: () => setSidebarOpen((prev) => !prev),
    }),
    [isSidebarOpen],
  );

  return (
    <AdminLayoutContext.Provider value={contextValue}>
      <div className="relative flex h-screen overflow-hidden">
        <SideBar
          isOpen={isSidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          onShowDashboard={onShowDashboard}
          onShowAllStories={onShowAllStories}
          onShowMediaLibrary={onShowMediaLibrary}
          onShowAnalytics={onShowAnalytics}
        />
        {isSidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ease-in-out md:hidden"
            aria-hidden="true"
          />
        )}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <TopActions />
          {children}
          <PWAInstall />
        </div>
      </div>
    </AdminLayoutContext.Provider>
  );
};

export const AdminMobileSidebarToggle = ({ className = '' }) => {
  const { isSidebarOpen, toggleSidebar } = useAdminLayout();

  if (isSidebarOpen) {
    return null;
  }

  return (
    <button
      onClick={toggleSidebar}
      className={`md:hidden p-2 text-gray-800 focus:outline-none z-50 ${className}`}
      aria-controls="sidebar"
      aria-expanded="false"
      aria-label="Open sidebar"
    >
      <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
};
