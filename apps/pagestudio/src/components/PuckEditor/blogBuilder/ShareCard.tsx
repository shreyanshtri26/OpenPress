import { useState } from 'react';

export type CardProps = {
  id?: string;
  title: string;
  url: string;
  onCopy?: () => void;
  onShare?: () => void;
};

export default function ShareCard({
  title = "OpenPress | Free, independent news for everyone",
  url = typeof window !== 'undefined' ? window.location.href : '',
  onShare
}: CardProps) {

  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if ((window as any).cwr) {
      (window as any).cwr('recordEvent', {
        type: "share_button_click",
        data: {
          platform: "copy_link",
          page: window.location.pathname
        }
      });
    }
    navigator.clipboard.writeText(url);
    setIsCopied(true);
  };

  const handleShare = () => {
    if ((window as any).cwr) {
      (window as any).cwr('recordEvent', {
        type: "share_button_click",
        data: {
          platform: "native_share",
          page: window.location.pathname
        }
      });
    }
    if (navigator.share) {
      navigator.share({ title, url }).catch(console.error);
    } else {
      onShare?.();
    }
  };

  return (
    <div className="flex flex-col items-start space-y-3 py-2">

      <button
        onClick={handleShare}
        className="flex items-center justify-center w-[25px] h-[23px]  border-[0.5px] border border-black p-0 cursor-pointer"
        title="Share"
        aria-label="Share"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          className="w-[14px] h-[14px] fill-black"
        >
          <path d="M12 6V2l7 7l-7 7v-4c-5 0-8.5 1.5-11 5l.8-3l.2-.4A12 12 0 0 1 12 6"></path>
        </svg>
      </button>

      <button
        onClick={handleCopy}
        className="flex items-center justify-center w-[28px] h-[28px] bg-transparent border-0 text-gray-600 p-0 cursor-pointer"
        title="Copy link"
        aria-label="Copy link"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-[16px] h-[18px] fill-black scale-[1.4]"
        >
          <path d="M15 20H5V7c0-.55-.45-1-1-1s-1 .45-1 1v13c0 1.1.9 2 2 2h10c.55 0 1-.45 1-1s-.45-1-1-1m5-4V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2m-2 0H9V4h9z"></path>
        </svg>
      </button>

      {isCopied && (
        <span className="text-sm text-green-600">Copied!</span>
      )}
    </div>
  );
}
