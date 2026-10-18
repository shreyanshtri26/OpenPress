// src/components/SideBar/SideBar.tsx
import { JSX, useCallback, useContext, useEffect, useState, useRef } from 'react';
import Image from '@/components/common/Image';
import type { StaticImageData } from '@/types/images';
import Link from '@/components/common/Link';
import { useRouter } from '@/hooks/useRouter';
import { UserContext } from '../../context/UserContext';

// --- SVG imports ---
import Home from '../../assets/Home.svg';
import Documents from '../../assets/Documents.svg';
import Wifi from '../../assets/Wifi.svg';
import Projects from '../../assets/Projects.svg';
import Support from '../../assets/Support.svg';
import Settings from '../../assets/Settings.svg';
import LogoutIcon from '../../assets/Logout.svg';
import Analytics from '../../assets/Analytics.svg';
import Trends from '../../assets/Trends.svg';
import Search from '../../assets/Search.svg';
import Profile from '../../assets/Profile.svg';
import SurveysIcon from '../../assets/Surveys.svg';



interface SideBarProps {
  isOpen: boolean;
  onToggle: () => void;
  onShowDashboard?: () => void;
  onShowAllStories?: () => void;
  onShowMediaLibrary?: () => void;
  onShowAnalytics?: () => void;
}

interface SideBarItemsProps {
  isOpen: boolean;
  onToggle?: () => void;
  onShowDashboard?: () => void;
  onShowAllStories?: () => void;
  onShowMediaLibrary?: () => void;
  onShowAnalytics?: () => void;
}

type SideBarNavItem =
  | {
    title: string;
    logo: StaticImageData;
    action: () => void;
    activePath?: string;
  }
  | {
    title: string;
    logo: StaticImageData;
    path: string;
    target?: string;
    rel?: string;
    activePath?: string;
    disabled?: boolean
  };

// Profile card at the bottom of the sidebar. It opens a menu with Settings and Logout, using the sidebar's own icons.
const UserMenu = ({
  isOpen,
  onNavigate,
  onLogout,
}: {
  isOpen: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}) => {
  const user = useContext(UserContext)?.user;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; bottom: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest('[data-user-menu]')) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const name = user.userName || 'User';
  const initials = name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U';
  const role = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
  const settingsActive = router.pathname === '/settings';
  const itemClass =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors apple-pressable';

  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setAnchor({ left: isOpen ? r.left : r.right + 8, bottom: window.innerHeight - r.bottom, width: isOpen ? r.width : 240 });
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={ref} className="mt-auto border-t border-black/10 pb-3 pt-2">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        title={name}
        className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-black/5 apple-pressable ${isOpen ? '' : 'justify-center'}`}
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
          {initials}
        </span>
        {isOpen && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-gray-900">{name}</span>
              <span className="block truncate text-xs text-gray-500">{role}</span>
            </span>
            <svg className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform ${open ? '' : 'rotate-180'}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 5-5 5 5" />
            </svg>
          </>
        )}
      </button>

      {open && anchor && (
        <div
          data-user-menu
          role="menu"
          style={{ position: 'fixed', left: anchor.left, bottom: anchor.bottom + 56, width: anchor.width }}
          className="z-[90] rounded-xl border border-black/10 bg-white p-1.5 shadow-xl"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
            {user.email && <p className="truncate text-xs text-gray-500">{user.email}</p>}
          </div>
          <div className="my-1 h-px bg-black/10" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate('/settings');
            }}
            className={`${itemClass} ${settingsActive ? 'bg-black text-white' : 'text-gray-800 hover:bg-black/5'}`}
          >
            <Image src={Settings} alt="" width={24} height={24} className={`h-5 w-5 flex-shrink-0 ${settingsActive ? 'brightness-0 invert' : 'filter grayscale opacity-75'}`} />
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className={`${itemClass} text-gray-800 hover:bg-black/5`}
          >
            <Image src={LogoutIcon} alt="" width={24} height={24} className="h-5 w-5 flex-shrink-0 filter grayscale opacity-75" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

const SideBarItems = ({
  isOpen,
  onToggle,
  onShowDashboard = () => undefined,
  onShowAllStories = () => undefined,
  onShowMediaLibrary = () => undefined,
  onShowAnalytics = () => undefined,
}: SideBarItemsProps) => {
  const router = useRouter();
  const userContext = useContext(UserContext);
  const logout = userContext?.logout;


  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const handleMobileToggle = () => {
    if (isMobile) {
      onToggle?.();
    }
  };


  const handleLogout = useCallback(() => {
    logout?.();
    router.replace('/login');
  }, [logout, router]);

  const goDashboard = useCallback(() => {
    if (router.pathname === '/dashboard') {
      onShowDashboard?.();
    } else {
      router.push('/dashboard');
    }
  }, [router, onShowDashboard]);

  const goAllStories = useCallback(() => {
    router.push('/all_stories');
  }, [router]);

  const goMedia = useCallback(() => {
    router.push('/media');
  }, [router]);

  const goWires = useCallback(() => {
    router.push('/wires');
  }, [router]);

  const goResearch = useCallback(() => {
    router.push('/research');
  }, [router]);

  const goAnalytics = useCallback(() => {
    router.push('/analytics');
  }, [router]);

  const goContactInquiries = useCallback(() => {
    router.push('/contact_inquiries');
  }, [router]);

  const goSurveys = useCallback(() => {
    router.push('/surveys');
  }, [router]);





  const sideBarOptions: SideBarNavItem[] = [
    { title: 'Dashboard', logo: Home, action: goDashboard, activePath: '/dashboard' },
    { title: 'Campaign Hub', logo: Analytics, path: '/campaign-hub', activePath: '/campaign-hub' },
    { title: 'All Stories', logo: Documents, action: goAllStories, activePath: '/all_stories' },
    { title: 'Media', logo: Projects, action: goMedia, activePath: '/media' },
    { title: 'Wires', logo: Wifi, action: goWires, activePath: '/wires' },
    { title: 'Research', logo: Search, action: goResearch, activePath: '/research' },
    { title: 'Analytics', logo: Trends, action: goAnalytics, activePath: '/analytics' },
    { title: 'Feedback', logo: Profile, action: goContactInquiries, activePath: '/contact_inquiries' },
    { title: 'Surveys', logo: SurveysIcon, action: goSurveys, activePath: '/surveys' },

  ];


  const smallerIconTitles = new Set(['Research', 'Queries', 'Analytics', 'Feedback', 'Surveys']);
  const getIconSizeClass = (title: string) => {
    return 'h-6 w-6';
  };

  return (
    <div className="flex flex-col h-full pt-2">
      <div className="flex flex-col">
        {sideBarOptions.map((item) => {
          const activePath = 'activePath' in item && item.activePath
            ? item.activePath
            : 'path' in item
              ? item.path
              : undefined;
          const isActive = !!(
            activePath &&
            activePath.startsWith('/') &&
            (router.pathname === activePath ||
              (activePath === '/wires' && router.pathname === '/signals') ||
              (activePath === '/research' && router.pathname === '/queries') ||
              (activePath === '/media' && router.pathname === '/library') ||
              (activePath === '/campaign-hub' && (router.pathname === '/campaigns' || router.pathname.startsWith('/campaigns'))))
          );
          const baseItemClass = 'flex items-center w-full mb-1.5 px-3 py-2.5 rounded-lg transition-all duration-150 apple-pressable active:scale-[0.98]';
          const stateClasses = isActive
            ? 'bg-black text-white font-medium shadow-sm'
            : 'hover:bg-black/5 text-gray-800';
          const layoutClasses = isOpen ? 'pl-3.5' : 'justify-center';

          return 'action' in item ? (
            <button
              key={item.title}
              title={item.title}
              onClick={() => {
                item.action();
                handleMobileToggle();
              }}
              className={`${baseItemClass} ${layoutClasses} ${stateClasses}`}
            >
              <Image
                src={item.logo}
                alt={item.title}
                width={24}
                height={24}
                className={`${getIconSizeClass(item.title)} flex-shrink-0 transition-opacity ${isActive ? 'brightness-0 invert' : 'filter grayscale opacity-75'}`}
              />
              {isOpen && (
                <span className={`ml-3 text-sm font-medium whitespace-nowrap ${isActive ? 'text-white' : 'text-gray-800'}`}>
                  {item.title}
                </span>
              )}
            </button>
          ) : (
            <Link
              href={item.path}
              key={item.title}
              title={item.title}
              target={item.target}
              rel={item.rel}
            >
              <div
                className={`${baseItemClass} ${layoutClasses} ${stateClasses}`}
              >
                <Image
                  src={item.logo}
                  alt={item.title}
                  width={24}
                  height={24}
                  className={`${getIconSizeClass(item.title)} flex-shrink-0 transition-opacity ${isActive ? 'brightness-0 invert' : 'filter grayscale opacity-75'}`}
                />
                {isOpen && (
                  <span className={`ml-3 text-sm font-medium whitespace-nowrap ${isActive ? 'text-white' : 'text-gray-800'}`}>
                    {item.title}
                  </span>
                )}
              </div>
            </Link>
          );
        }
        )}
      </div>
      <UserMenu
        isOpen={isOpen}
        onNavigate={(path) => {
          router.push(path);
          handleMobileToggle();
        }}
        onLogout={handleLogout}
      />
    </div>
  );
};

export const SideBar = ({
  isOpen,
  onToggle,
  onShowDashboard,
  onShowAllStories,
  onShowMediaLibrary,
  onShowAnalytics,
}: SideBarProps): JSX.Element => {

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isOpen ? '320px' : '80px'
    );
  }, [isOpen]);
  return (
    <aside
      id="sidebar"
      className={`border-r border-black/10 bg-white/85 backdrop-blur-xl flex flex-col flex-shrink-0 h-screen transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-[70] md:sticky md:top-0 ${isOpen ? 'w-[300px]' : 'w-20'} fixed md:relative ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      aria-label="Sidebar"
    >
      <div
        className={`flex items-center px-4 py-3.5 ${isOpen ? 'justify-between' : 'flex-col gap-3 justify-center'}`}
      >
        <div
          className="flex items-center cursor-pointer apple-pressable active:scale-[0.98] min-w-0"
          onClick={!isOpen ? onToggle : undefined}
          title="OpenPress"
        >
          {isOpen ? (
            <img
              src="/openpress-logo-full-nobg-trim.png"
              alt="OpenPress"
              className="h-10 w-auto max-w-[210px] object-contain object-left transition-all duration-300"
            />
          ) : (
            <img
              src="/openpress-quill-nobg-trim.png"
              alt="OpenPress"
              className="h-8 w-8 flex-shrink-0 object-contain transition-all duration-300"
            />
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 text-gray-700 hover:bg-black/5 rounded-lg flex-shrink-0 apple-pressable active:scale-90 transition-all"
          aria-label="Toggle sidebar"
        >
          <svg
            className="h-6 w-6"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto overflow-x-hidden flex-1 px-2">
        <SideBarItems
          isOpen={isOpen}
          onToggle={onToggle}
          onShowDashboard={onShowDashboard}
          onShowAllStories={onShowAllStories}
          onShowMediaLibrary={onShowMediaLibrary}
          onShowAnalytics={onShowAnalytics}
        />
      </div>
    </aside>
  );
};
