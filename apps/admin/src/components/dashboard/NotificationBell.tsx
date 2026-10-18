
import { useEffect, useMemo, useRef, useState } from 'react';

export interface NotificationPreview {
  id: string;
  title: string;
  authorName?: string;
  assignedToName?: string[];
  status?: string;
  updatedAt?: string;
  isAssignedToCurrentUser?: boolean;
}

interface NotificationBellProps {
  notifications: NotificationPreview[];
  unreadCount: number;
  readIds: string[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onOpenNotification?: (id: string) => void;
}

const formatDateLabel = (value?: string) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return `${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} • ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

const NotificationBell = ({
  notifications,
  unreadCount,
  readIds,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenNotification,
}: NotificationBellProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const readSet = useMemo(() => new Set(readIds), [readIds]);
  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !readSet.has(notification.id)),
    [notifications, readSet],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (
        open &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleItemClick = (id: string) => {
    onMarkAsRead(id);
    onOpenNotification?.(id);
    setOpen(false);
  };

  const renderEmptyState = () => (
    <div className="px-4 py-6 text-center text-sm text-gray-500">
      You're all caught up.
    </div>
  );

  return (
    <div className="relative flex items-center" ref={containerRef}>
      <button
        type="button"
        aria-label="Notifications"
        className="relative flex items-center justify-center transition-colors z-[60]"
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg fill="#000000" width="30px" height="25px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
          <g id="SVGRepo_iconCarrier">
            <path d="M28.3 22.247c-1.167-1.419-2.765-3.429-2.765-5.48v-6.53c0-5.625-4.207-10.202-9.584-10.202-5.378 0-9.552 4.577-9.552 10.202v6.53c0 2.016-1.734 3.921-2.833 5.4-0.989 1.328-1.77 2.378-1.242 3.427 0.463 0.923 1.624 1.041 2.583 1.041h5.73c0.002 2.944 2.389 5.331 5.333 5.331s5.333-2.386 5.334-5.331h5.864c0.61 0 2.036 0 2.527-1.038 0.495-1.050-0.297-2.016-1.395-3.351zM15.969 29.871c-1.788 0-3.239-1.448-3.241-3.235h6.482c-0.003 1.787-1.452 3.235-3.241 3.235zM27.168 24.506h-22.262c-0.153 0-0.281-0.005-0.386-0.012 0.206-0.319 0.508-0.727 0.755-1.058 1.218-1.637 3.255-3.949 3.255-6.669v-6.53c0-4.452 3.22-8.073 7.423-8.073s7.455 3.622 7.455 8.073v6.53c0 2.813 1.878 5.164 3.249 6.832 0.231 0.281 0.507 0.617 0.722 0.905-0.064 0.002-0.134 0.003-0.209 0.003z">
            </path>
          </g>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-[-0.5rem] -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F04438] px-1 text-[11px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-4 md:left-auto md:right-[14px] top-2 z-[40] w-80 overflow-hidden rounded-sm md:border-l border-r md:border-r-0 border-b border-black bg-white shadow-xl after:content-[''] after:absolute after:top-0 after:left-[15px] after:right-0 after:h-[1px] after:bg-black md:after:hidden md:before:content-[''] md:before:absolute md:before:top-0 md:before:left-0 md:before:right-[15px] md:before:h-[1px] md:before:bg-black">
          <div className="relative before:content-[''] before:absolute before:top-[22px] before:left-0 before:bottom-0 before:w-[1px] before:bg-black md:before:hidden md:after:content-[''] md:after:absolute md:after:top-[22px] md:after:right-0 md:after:bottom-0 md:after:w-[1px] md:after:bg-black">
            <div className="flex items-center justify-between border-b border-black/30 px-4 py-2">
              <p className="text-sm font-semibold text-black">Notifications</p>
              {unreadNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="text-xs font-medium uppercase tracking-wide text-gray-600 hover:text-black"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {unreadNotifications.length === 0 && renderEmptyState()}
              {unreadNotifications.map((notification) => {
                const unread = !readSet.has(notification.id);
                const assignedLabel = notification.assignedToName?.length
                  ? notification.assignedToName.join(', ')
                  : 'Unassigned';
                return (
                  <div
                    key={notification.id}
                    className={`border-b border-gray-100 px-4 py-3 text-sm last:border-b-0`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => handleItemClick(notification.id)}
                    >
                      <p className="font-semibold text-black">
                        {notification.title}
                      </p>

                      <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-400">
                        {formatDateLabel(notification.updatedAt)}
                      </p>
                    </button>
                    {unread && (
                      <button
                        type="button"
                        className="mt-2 text-xs font-medium text-gray-500 underline"
                        onClick={() => onMarkAsRead(notification.id)}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
