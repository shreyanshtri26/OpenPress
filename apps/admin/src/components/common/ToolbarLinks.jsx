import { useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { useRouter } from '@/hooks/useRouter';
import env from '@/utils/env';
import LaunchBuilder from '../../assets/LaunchBuilder.svg';
import Documents from '../../assets/Documents.svg';

// The two tools that sit outside the editorial workflow: Page Studio and the live site.
const base =
  'inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide shadow-sm transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900';

const primary = `${base} bg-gray-900 text-white ring-1 ring-black/10 hover:bg-black`;
const secondary = `${base} border border-gray-300 bg-white text-gray-900 hover:border-gray-900`;

const ExternalIcon = () => (
  <svg viewBox="0 0 16 16" className="h-3 w-3 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10M9 2h5v5M14 2 7.5 8.5" />
  </svg>
);

// Page Studio: the in-app Page Studio. Super Users only.
export const PageStudioButton = ({ className = '' }) => {
  const router = useRouter();
  const user = useContext(UserContext)?.user;
  if (user?.role?.toLowerCase() !== 'super user') return null;

  return (
    <button type="button" onClick={() => router.push('/build')} title="Design the home page, sections and articles" className={`${primary} ${className}`}>
      <img src={LaunchBuilder} alt="" className="h-4 w-4 brightness-0 invert" />
      Page Studio
    </button>
  );
};

// ePaper: the published newspaper, opened in a new tab.
export const EPaperButton = ({ className = '' }) => (
  <a href={env.siteBaseUrl} target="_blank" rel="noopener noreferrer" title="Open the published newspaper in a new tab" className={`${secondary} ${className}`}>
    <img src={Documents} alt="" className="h-4 w-4" />
    ePaper
    <ExternalIcon />
  </a>
);
