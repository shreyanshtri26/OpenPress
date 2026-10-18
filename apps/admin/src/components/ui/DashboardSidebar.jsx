import { useContext, useState, useCallback, useEffect } from 'react';
import { useRouter } from '@/hooks/useRouter';
import { UserContext } from '../../context/UserContext';
import openpressLogo from '../../assets/openpress-logo.png';

export default function DashboardSidebar({ onCollapseChange }) {
  const { user, logout } = useContext(UserContext);
  const router = useRouter();
  const role = user?.role;

  const [opened, setOpened] = useState(true);

  // ✅ Fix: Proper toggle handler with callback to parent
  const handleToggle = useCallback(() => {
    setOpened(prevOpened => {
      const newOpened = !prevOpened;
      // Notify parent component about the change
      if (onCollapseChange) {
        onCollapseChange(!newOpened); // collapsed = !opened
      }
      return newOpened;
    });
  }, [onCollapseChange]);

  // ✅ Fix: Ensure parent is notified on initial load
  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(!opened);
    }
  }, []); // Only run once on mount

  const handleLogout = () => {

    logout();
    router.replace('/login');
  };

  // Navigation items for journalist
  const navigationItems =
    role === 'journalist'
      ? [
        {
          text: 'Dashboard',
          path: '/dashboard/journalist',
          isActive: router.pathname === '/dashboard/journalist',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 10.75v10.5c0 .138.112.25.25.25h5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v5.5c0 .138.112.25.25.25h5a.25.25 0 0 0 .25-.25v-10.5M22 9l-9.1-6.825a1.5 1.5 0 0 0-1.8 0L2 9"
              ></path>
            </svg>
          ),
          activeIcon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                stroke="currentColor"
                strokeLinejoin="round"
                d="M4.5 21.25V10.875a.25.25 0 0 1 .1-.2l7.25-5.438a.25.25 0 0 1 .3 0l7.25 5.438a.25.25 0 0 1 .1.2V21.25a.25.25 0 0 1-.25.25h-4.5a.25.25 0 0 1-.25-.25v-5.5a.25.25 0 0 0-.25-.25h-4.5a.25.25 0 0 0-.25.25v5.5a.25.25 0 0 1-.25.25h-4.5a.25.25 0 0 1-.25-.25Z"
              ></path>
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m22 9-9.1-6.825a1.5 1.5 0 0 0-1.8 0L2 9"
              ></path>
            </svg>
          ),
        },
        {
          text: 'My Stories',
          path: '/dashboard/journalist/allStories/',
          isActive:
            router.pathname === '/dashboard/journalist/drafts' ||
            router.pathname.startsWith('/dashboard/journalist/drafts/'),
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" d="M4.75 21.5h14.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25H4.75a.25.25 0 0 0-.25.25v18.5c0 .138.112.25.25.25Z"></path>
              <path stroke="currentColor" strokeLinecap="round" d="M8 8.5h8M8 15.5h5M8 12h8"></path>
            </svg>
          ),
          activeIcon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M4 2.75A.75.75 0 0 1 4.75 2h14.5a.75.75 0 0 1 .75.75v18.5a.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1-.75-.75zM7 8.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0 7a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5M7 12a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 7 12"
                clipRule="evenodd"
              ></path>
            </svg>
          ),
        },
        {
          text: 'Scraped Stories',
          path: '/dashboard/scraped-stories',
          isActive: router.pathname === '/dashboard/scraped-stories',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" d="M4.75 21.5h14.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25H4.75a.25.25 0 0 0-.25.25v18.5c0 .138.112.25.25.25Z"></path>
              <path stroke="currentColor" strokeLinecap="round" d="M8 8.5h8M8 15.5h5M8 12h8"></path>
            </svg>
          ),
          activeIcon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M4 2.75A.75.75 0 0 1 4.75 2h14.5a.75.75 0 0 1 .75.75v18.5a.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1-.75-.75zM7 8.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0 7a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5M7 12a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 7 12"
                clipRule="evenodd"
              ></path>
            </svg>
          ),
        },
        {
          text: "Media",
          path: "/dashboard/journalist/media",
          isActive: router.pathname === "/dashboard/journalist/media",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" d="M4.75 21.5h14.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25H4.75a.25.25 0 0 0-.25.25v18.5c0 .138.112.25.25.25Z"></path>
              <path stroke="currentColor" strokeLinecap="round" d="M8 8.5h8M8 15.5h5M8 12h8"></path>
            </svg>
          ),
          activeIcon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path fill="currentColor" fillRule="evenodd" d="M4 2.75A.75.75 0 0 1 4.75 2h14.5a.75.75 0 0 1 .75.75v18.5a.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1-.75-.75zM7 8.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0 7a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5M7 12a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 7 12" clipRule="evenodd"></path>
            </svg>
          ),
        },
      ]
      : [];

  // ✅ Fixed: Sidebar content component with useCallback
  const SidebarContent = useCallback(() => (
    <aside
      className={`h-full flex flex-col bg-white transition-all duration-300 ${opened ? 'w-64' : 'w-20'
        }`}
      style={{
        fontFamily: 'sohne, "Helvetica Neue", Helvetica, Arial, sans-serif',
        borderRight: '1px solid rgba(230, 230, 230, 0.5)',
      }}
    >
      {/* Header */}
      <div className={`flex items-center ${opened ? 'justify-between px-5 py-5' : 'flex-col gap-3 justify-center px-2 py-5'}`}>
        {opened ? (
          <img src={openpressLogo} alt="OpenPress" className="h-10 w-auto max-w-[170px] object-contain object-left transition-all duration-300" />
        ) : (
          <img src="/openpress-quill-nobg-trim.png" alt="OpenPress" className="h-8 w-8 object-contain transition-all duration-300" />
        )}
        <button
          onClick={handleToggle}
          className="p-1.5 text-[#6B6B6B] hover:text-[#242424] hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 border-t pt-4">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <div key={item.path}>
              <button
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center text-left transition-colors duration-200 cursor-pointer border-0 bg-transparent outline-none
                  ${opened ? 'justify-start px-6' : 'justify-center px-0'}
                  ${item.isActive ? 'text-[#242424]' : 'text-[#6B6B6B] hover:text-[#242424]'}
                `}
                style={{
                  padding: opened ? '0 28px 0 24px' : '12px 0',
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: 400,
                  lineHeight: '24px',
                  background: 'transparent',
                  border: 'none',
                }}
              >
                {/* Icon */}
                <div className="flex items-center justify-center mr-2" style={{ width: '24px', height: '24px' }}>
                  {item.isActive ? item.activeIcon : item.icon}
                </div>
                {/* Text */}
                {opened && (
                  <span className="font-normal" style={{ fontWeight: 400, fontSize: '16px', color: 'inherit' }}>
                    {item.text}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-200 px-6 py-4">
        <div className="space-y-1 mb-4">
          {/* User Section */}
          <div className={`flex items-center pt-4 border-gray-200 ${opened ? 'justify-between' : 'justify-center h-full'}`}>
            {opened && (
              <>
                <div
                  className="rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-700"
                  style={{ width: '26px', height: '26px', fontSize: '14px', fontWeight: 500 }}
                >
                  {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="ml-3 text-center flex-1">
                  <span
                    className="text-gray-700 capitalize truncate"
                    style={{ fontSize: '14px', fontWeight: 400, fontFamily: 'sohne, "Helvetica Neue", Helvetica, Arial, sans-serif' }}
                  >
                    {user?.role || 'User'}
                  </span>
                </div>
              </>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 transition-colors duration-200 bg-transparent border-0 cursor-pointer outline-none flex items-center justify-center text-[#6B6B6B] hover:text-[#242424]"
              title="Log Out"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-7 h-7"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <path d="M10 17l5-5-5-5M15 12H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  ), [opened, navigationItems, handleToggle, user, handleLogout, router]);

  // ✅ Fixed: Simplified return structure without DevExtreme Drawer
  return (
    <div
      className={`transition-all duration-300 ease-in-out ${opened ? 'w-64' : 'w-20'}`}
      style={{ height: '100vh', position: 'relative' }}
    >
      <div className="h-full">
        <SidebarContent />
      </div>
    </div>
  );
}
