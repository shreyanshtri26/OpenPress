import Image from '@/components/common/Image';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { checkStoryPermission } from '../../utils/storyPermissions';
import { useRouter } from '@/hooks/useRouter';
import env from '@/utils/env';
import toast from 'react-hot-toast';
import apiFetch from '../../utils/api';
import Search from '../../assets/Search.svg';
import { KanbanBoard } from '../../components/KanbanBoard/KanbanBoard';
import {
  AdminDashboardLayout,
  AdminMobileSidebarToggle,
} from '../../components/SideBar/AdminDashboardLayout';
import RaiseStory from '../../components/StoryEditor/RaiseStory';
import AllStories from '../../components/dashboard/AllStories';
import MediaLibrary from '../../components/dashboard/MediaLibrary';
import { AuthGuard } from '../../context/AuthGuard';
import { Story, useKanbanContext } from '../../context/KanbanContext';
import { UserContext } from '../../context/UserContext';
import CustomButton from '../../components/common/CustomButton';
import AnalyticsDashboard from '../../components/dashboard/AnalyticsDashboard';
import Chat from '../../components/dashboard/Chat';
import NotificationBell, { NotificationPreview } from '../../components/dashboard/NotificationBell';
import {
  getStoriesCache,
  setStoriesCache,
} from '../../utils/storiesCache';

type DashboardView = 'kanban' | 'raiseStory' | 'allStories' | 'mediaLibrary' | 'chatAI' | 'analytics';

function DashboardPageContent() {
  const router = useRouter();
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const permissions = userContext?.permissions;
  const updatePermissions = userContext?.updatePermissions;
  const { stories, setStories } = useKanbanContext();
  const API = `${env.backendApi}`;

  const [activeView, setActiveView] = useState<DashboardView>('kanban');
  const [storyToEdit, setStoryToEdit] = useState<Story | null>(null);
  const [initialQuery, setInitialQuery] = useState<string | null>(null);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [isStoreHydrated, setIsStoreHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingStory, setIsLoadingStory] = useState(false); // ✅ New loading state
  const [hasMore, setHasMore] = useState(true);
  const hasFetchedRef = useRef(false);

  const ITEMS_PER_PAGE = 100;
  const [currentOffset, setCurrentOffset] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('kanban_story_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        setReadNotifications(parsed);
      }
    } catch (error) {
      console.error('Failed to parse stored notifications', error);
    } finally {
      setIsStoreHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isStoreHydrated) return;
    localStorage.setItem('kanban_story_notifications', JSON.stringify(readNotifications));
  }, [readNotifications, isStoreHydrated]);

  const notificationItems = useMemo<NotificationPreview[]>(() => {
    type ReviewState = 'accepted' | 'on_hold' | 'rejected' | 'decision_awaited' | undefined;

    const toReviewState = (raw?: string): ReviewState => {
      const v = raw?.toLowerCase()?.trim();
      if (v === 'accepted') return 'accepted';
      if (v === 'on_hold' || v === 'on hold') return 'on_hold';
      if (v === 'rejected') return 'rejected';
      if (v === 'decision_awaited') return 'decision_awaited';
      return undefined;
    };

    const getReporterName = (story: any) => story.authorName || 'Unknown reporter';

    const getEditorName = (story: any) => {
      const name = Array.isArray(story.assignedToName)
        ? story.assignedToName[0]
        : story.assignedToName;
      return name || 'Unknown editor';
    };

    const buildNotificationTitle = (story: any) => {
      const status = story.status?.toLowerCase();
      const state = toReviewState(story.state);

      const storyTitle = story.title?.replace(/&nbsp;/g, ' ').trim() || 'Untitled story';
      const reporterName = getReporterName(story);
      const editorName = getEditorName(story);

      if (status === 'ideas') {
        return `${reporterName} submitted a new story idea ${storyTitle} for your review.`;
      }
      if (status === 'in_progress') {
        if (state === 'decision_awaited') return `${editorName} accepted your story idea ${storyTitle} and moved it into In Progress.`;
        if (state === 'on_hold') return `${editorName} put your story idea ${storyTitle} on hold for now.`;
        if (state === 'rejected') return `${editorName} rejected your story idea ${storyTitle}.`;
        return `${editorName} accepted your story idea ${storyTitle} and moved it into ${story.status}.`;
      }

      if (status === 'in_review') {
        return `${reporterName} submitted your ${storyTitle} for your review.`;
      }

      if (status === 'ready_to_publish') {
        if (state === 'on_hold') return `${editorName} put your story ${storyTitle} on hold for now.`;
        if (state === 'rejected') return `${editorName} rejected your story ${storyTitle}.`;
        return `${editorName} accepted your story ${storyTitle} and moved it into Ready to Publish.`;
      }

      return `${storyTitle} was updated.`;
    };

    const statusWhitelist = new Set([
      'raise_a_story',
      'in_progress',
      'in_review',
      'ready_to_publish',
      'ideas',
    ]);

    return stories
      .filter((story) => {
        const normalizedStatus = story.status?.toLowerCase();

        if (story.authorName?.toLowerCase() === 'super user') return false;
        if (!normalizedStatus || !statusWhitelist.has(normalizedStatus)) return false;

        if (normalizedStatus === 'ideas' && story.assignedTo === user?.userId) return true;
        if (normalizedStatus === 'in_progress' && story.authorId === user?.userId) return true;
        if (normalizedStatus === 'in_review' && story.assignedTo === user?.userId) return true;
        if (normalizedStatus === 'ready_to_publish' && story.authorId === user?.userId) return true;

        return false;
      })
      .map((story) => {
        const displayTitle = buildNotificationTitle(story);

        return {
          id: story.storyId,
          title: displayTitle,
          authorName: story.authorName || 'Unknown author',
          assignedToName: Array.isArray(story.assignedToName)
            ? story.assignedToName
            : story.assignedToName
              ? [story.assignedToName]
              : [],
          status: story.status,
          updatedAt: story.updatedAt,
          isAssignedToCurrentUser: true,
        };
      })
      .sort((a, b) => {
        const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bDate - aDate;
      });
  }, [stories, user?.userId]);

  const unreadCount = useMemo(() => {
    const readSet = new Set(readNotifications);
    return notificationItems.reduce(
      (count, item) => (readSet.has(item.id) ? count : count + 1),
      0,
    );
  }, [notificationItems, readNotifications]);

  const markNotificationAsRead = (storyId: string) => {
    setReadNotifications((prev) => {
      if (prev.includes(storyId)) {
        return prev;
      }
      const newList = [...prev, storyId];
      return newList;
    });
  };

  const markAllNotificationsAsRead = () => {
    setReadNotifications((prev) => {
      const merged = new Set(prev);
      notificationItems.forEach((item) => merged.add(item.id));
      const newList = Array.from(merged);
      return newList;
    });
  };

  // ✅ UPDATE: Initial fetch function
  useEffect(() => {
    let isCancelled = false;

    const fetchAllStories = async () => {
      if (isCancelled || isLoading || hasFetchedRef.current) return;
      if (!user?.token) return;

      const cacheKey = `${user.role}-${user.userId}-${activeView}`;
      const cached = getStoriesCache(cacheKey);

      if (cached) {
        console.log('✅ Using cached stories');
        if (!isCancelled) {
          setStories(cached.data);
          setCurrentOffset(cached.data.length); // ✅ Fix: Set offset to cached length
          setHasMore(cached.data.length >= ITEMS_PER_PAGE);
          hasFetchedRef.current = true;
        }
        return;
      }

      console.log('🔄 Fetching fresh stories...');
      setIsLoading(true);

      try {
        const workflowStatuses = [
          'ideas',
          'in_progress',
          'in_review',
          'ready_to_publish',
          'raise_a_story',
        ];

        const params = new URLSearchParams();
        params.set('limit', String(ITEMS_PER_PAGE));
        params.set('offset', '0'); // ✅ Always start from 0 for initial load
        params.set('status', workflowStatuses.join(','));
        params.set('state', 'approved,decision_awaited');

        if (user.role === 'journalist') {
          params.set('authorId', user.userId);
        }

        const res = await apiFetch(`${API}/story/fetchStories?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
        });

        if (!res.ok) throw new Error('Failed to fetch stories');

        const response = await res.json();

        if (!isCancelled && response.data) {
          const mappedStories = response.data.map((story: any) => ({
            ...story,
            authorName:
              story.authorName?.trim() ||
              (Array.isArray(story.reporterName)
                ? story.reporterName.join(', ')
                : story.reporterName) ||
              'Unknown',
          }));

          setStoriesCache(cacheKey, mappedStories);

          setStories(mappedStories);
          setCurrentOffset(mappedStories.length); // ✅ Set offset to loaded count

          // ✅ Fix: Check if there are more stories
          const totalStories = response.count || response.total || 0;
          setHasMore(mappedStories.length < totalStories);

          hasFetchedRef.current = true;

          const responseSize = JSON.stringify(response).length;
          console.log(`📦 Response size: ${(responseSize / 1024).toFixed(2)} KB`);
          console.log(`📊 Stories loaded: ${mappedStories.length} / ${totalStories}`);
          if (response.data?.length) console.log(`📏 Avg story size: ${(responseSize / response.data.length / 1024).toFixed(2)} KB`);
          console.log(`✅ Loaded ${mappedStories.length} stories for Kanban`);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Fetch error:', error);
          const message =
            error instanceof Error ? error.message : 'Could not load stories.';
          toast.error(`Could not load stories. ${message}`.trim());
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    if (activeView === 'kanban') {
      fetchAllStories();
    }

    return () => {
      isCancelled = true;
    };
  }, [activeView, user?.token]); // ✅ Add user?.token to dependencies


  const loadMoreStories = async () => {
    if (isLoadingMore || !hasMore) {
      console.log('⚠️ Load More blocked:', { isLoadingMore, hasMore });
      return;
    }

    console.log(`🔄 Loading more stories... (current offset: ${currentOffset})`);
    setIsLoadingMore(true);

    try {
      const workflowStatuses = [
        'ideas',
        'in_progress',
        'in_review',
        'ready_to_publish',
        'raise_a_story',
      ];

      const params = new URLSearchParams();
      params.set('limit', String(ITEMS_PER_PAGE));
      params.set('offset', String(currentOffset)); // ✅ Use current offset
      params.set('status', workflowStatuses.join(','));
      params.set('state', 'approved,decision_awaited');

      if (user?.role === 'journalist') {
        params.set('authorId', user.userId);
      }

      console.log('📡 Fetching with params:', {
        limit: ITEMS_PER_PAGE,
        offset: currentOffset,
        status: workflowStatuses.join(','),
      });

      const res = await apiFetch(`${API}/story/fetchStories?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
      });

      if (!res.ok) throw new Error('Failed to fetch stories');

      const response = await res.json();

      if (response.data && response.data.length > 0) {
        const mappedStories = response.data.map((story: any) => ({
          ...story,
          authorName:
            story.authorName?.trim() ||
            (Array.isArray(story.reporterName)
              ? story.reporterName.join(', ')
              : story.reporterName) ||
            'Unknown',
        }));

        setStories((prevStories) => {
          const combined = [...prevStories, ...mappedStories];
          const uniqueMap = new Map();
          combined.forEach((story: any) => {
            const key = story.storyId || story.id || story._id;
            if (key && !uniqueMap.has(key)) {
              uniqueMap.set(key, story);
            } else if (!key) {
              uniqueMap.set(Math.random(), story);
            }
          });
          return Array.from(uniqueMap.values());
        });
        setCurrentOffset((prevOffset) => prevOffset + mappedStories.length);

        // ✅ Fix: Check if there are more stories
        const totalLoaded = currentOffset + mappedStories.length;
        const totalStories = response.count || response.total || 0;
        const hasMoreStories = totalLoaded < totalStories;

        setHasMore(hasMoreStories);

        console.log(`✅ Loaded ${mappedStories.length} more stories`);
        console.log(`📊 Total loaded: ${totalLoaded} / ${totalStories}`);
        console.log(`🔄 Has more: ${hasMoreStories}`);

        toast.success(`Loaded ${mappedStories.length} more stories`);
      } else {
        console.log('📭 No more stories to load');
        setHasMore(false);
        toast.success('No more stories to load');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      const message = error instanceof Error ? error.message : 'Could not load more stories.';
      toast.error(`Could not load more stories. ${message}`.trim());
    } finally {
      setIsLoadingMore(false);
    }
  };


  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.sessionStorage.getItem('dashboard_edit_story');
        if (raw) {
          window.sessionStorage.removeItem('dashboard_edit_story');
          const parsed = JSON.parse(raw) as Story;
          setStoryToEdit(parsed);
          setActiveView('raiseStory');
        }
      }
    } catch { }
  }, []);

  useEffect(() => {
    if (activeView !== 'kanban') {
      hasFetchedRef.current = false;
    }
  }, [activeView]);




  const handleShowDashboard = () => {
    setStoryToEdit(null);
    setActiveView('kanban');

    try {
      router.push('/dashboard');
    } catch { }
  };

  const handleRaiseStory = () => {
    console.log("11111111");
    // Check "Open" permission for "raise_a_story" status (same pattern as KanbanBoard)
    const hasOpenPermission = checkStoryPermission(
      permissions ?? null,
      'raise_a_story',
      'Create',
      user?.role
    );

    if (user?.role !== 'super user' && !hasOpenPermission) {
      toast.error('You do not have permission to raise a story');
      return;
    }

    setStoryToEdit(null);
    setActiveView('raiseStory');
  };

  const handleOpenChat = () => {
    setActiveView('chatAI');
  };

  const handleOpenAnalytics = () => {
    setActiveView('analytics');
  };

  const handleShowAllStories = () => {
    try {
      router.push('/all_stories');
    } catch { }
  };

  const handleShowMediaLibrary = () => {
    try {
      router.push('/media');
    } catch { }
  };

  // ✅ UPDATED: Fetch full story before opening editor
  const handleEditStory = async (storyData: Story) => {
    console.log('📖 Opening story:', storyData.storyId);

    // ✅ Show loading state
    setIsLoadingStory(true);

    try {
      // ✅ Fetch full story with description
      const res = await apiFetch(
        `${API}/story/fetchStoryById?storyId=${storyData.storyId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
        }
      );

      if (!res.ok) throw new Error('Failed to fetch full story');

      const response = await res.json();

      if (response.data) {
        console.log('✅ Loaded full story with description');
        setStoryToEdit(response.data); // ✅ Set full story with ALL fields
        setActiveView('raiseStory');
      } else {
        throw new Error('No story data in response');
      }
    } catch (error) {
      console.error('Fetch full story error:', error);
      toast.error('Could not load full story details. Opening with available data...');

      // ✅ Fallback: open with partial data
      setStoryToEdit(storyData);
      setActiveView('raiseStory');
    } finally {
      setIsLoadingStory(false);
    }
  };

  const handleNotificationOpen = (storyId: string) => {
    markNotificationAsRead(storyId);
    const targetStory = stories.find((story) => story.storyId === storyId);
    if (targetStory) {
      handleEditStory(targetStory);
    }
  };

  const renderKanbanContent = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <AdminMobileSidebarToggle />

      {/* Desktop Header Layout */}
      <div className="hidden md:flex px-4 my-3 items-center">
        <div className="flex items-center space-x-3">
          <form
            className="w-96"
            onSubmit={(e) => {
              e.preventDefault();
              const query = e.currentTarget.search.value.trim();
              if (!query) {
                toast.error('Please type something before searching');
                return;
              }
              setInitialQuery(query);
              setActiveView('chatAI');
            }}
          >
            <div className="relative flex w-full items-center border border-gray-300 rounded-md bg-white hover:border-gray-400 focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all px-2.5 h-10">
              <button type="submit" className="pr-3 pl-1">
                <Image
                  src={Search}
                  alt="Search Icon"
                  className="w-4 text-gray-400" width={undefined} height={undefined} placeholder={undefined} blurDataURL={undefined} layout={undefined} objectFit={undefined} priority={undefined} sizes={undefined} fill={undefined} style={undefined} />
              </button>
              <input
                type="search"
                name="search"
                placeholder="Search With aI..."
                className="w-full bg-transparent text-sm pr-2 focus:outline-none"
              />
            </div>
          </form>
        </div>

        <div className="flex flex-1 justify-end items-center gap-3">
          <NotificationBell
            notifications={notificationItems}
            unreadCount={unreadCount}
            readIds={readNotifications}
            onMarkAsRead={markNotificationAsRead}
            onMarkAllAsRead={markAllNotificationsAsRead}
            onOpenNotification={handleNotificationOpen}
          />
          <CustomButton onClick={handleRaiseStory}>
            Raise A Story
          </CustomButton>
        </div>
      </div>

      {/* Mobile Header Layout */}
      <div className="md:hidden flex flex-col px-4 my-3 space-y-3">
        <div className="flex items-center justify-start">
          <form
            className="w-full max-w-xs"
            onSubmit={(e) => {
              e.preventDefault();
              const query = e.currentTarget.search.value.trim();
              if (!query) {
                toast.error('Please type something before searching');
                return;
              }
              setInitialQuery(query);
              setActiveView('chatAI');
            }}
          >
            <div className="relative flex w-full items-center border border-gray-300 rounded-md bg-white hover:border-gray-400 focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all px-2.5 h-10">
              <button type="submit" className="pr-3 pl-1">
                <Image
                  src={Search}
                  alt="Search Icon"
                  className="w-4 text-gray-400" width={undefined} height={undefined} placeholder={undefined} blurDataURL={undefined} layout={undefined} objectFit={undefined} priority={undefined} sizes={undefined} fill={undefined} style={undefined} />
              </button>
              <input
                type="search"
                name="search"
                placeholder="Search With aI..."
                className="w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
          </form>
        </div>
        <div className="flex items-center justify-between gap-3">
          <NotificationBell
            notifications={notificationItems}
            unreadCount={unreadCount}
            readIds={readNotifications}
            onMarkAsRead={markNotificationAsRead}
            onMarkAllAsRead={markAllNotificationsAsRead}
            onOpenNotification={handleNotificationOpen}
          />
          <CustomButton onClick={handleRaiseStory}>
            Raise A Story
          </CustomButton>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto">
        <KanbanBoard handleEditStoryClick={handleEditStory} />
      </div>




    </div>
  );

  // ✅ Show loading overlay when fetching full story


  const renderContent = () => {
    switch (activeView) {
      case 'raiseStory':
        return (
          <RaiseStory
            key={storyToEdit?.storyId || 'new-story'}
            onBack={handleShowDashboard}
            storyData={storyToEdit}
            handleShowAllStories={handleShowAllStories}
            permissions={permissions}
          />
        );
      case 'allStories':
        return (
          <AllStories
            onBack={handleShowDashboard}
            handleEditStory={handleEditStory}
          />
        );
      case 'chatAI':
        return (
          <Chat onBack={handleShowDashboard} initialQuery={initialQuery} />
        );
      case 'mediaLibrary':
        return <MediaLibrary onBack={handleShowDashboard} />;
      case 'analytics':
        return <AnalyticsDashboard onBack={handleShowDashboard} />;
      case 'kanban':
      default:
        return renderKanbanContent();
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      if (!roleId) {
        toast.error('No role found for current user.');
        return null;
      }

      const formattedRoleId = roleId
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const response = await apiFetch(
        `${env.backendApi}/getRole?roleId=${encodeURIComponent(formattedRoleId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          toast.error(`Role '${formattedRoleId}' not found.`);
        } else {
          toast.error(data.message || 'Failed to fetch role permissions.');
        }
        return null;
      }

      console.log('✅ Role fetched successfully:', data.role);

      return data.permissions;
    } catch (error) {
      console.error('❌ Error fetching role permissions:', error);
      toast.error('An error occurred while fetching role permissions.');
      return null;
    }
  };

  useEffect(() => {
    const loadRolePermissions = async () => {
      if (!user?.role) return;
      const rolePermissions = await fetchRolePermissions(user.role);
      if (rolePermissions && updatePermissions) {
        updatePermissions(rolePermissions);
        console.log('🔐 Stored role permissions:', rolePermissions);
      }
    };

    loadRolePermissions();
  }, [user?.role]);
  if (isLoadingStory) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-700 font-medium">Loading story details...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminDashboardLayout
      onShowDashboard={handleShowDashboard}
      onShowAllStories={handleShowAllStories}
      onShowMediaLibrary={handleShowMediaLibrary}
      onShowAnalytics={handleOpenAnalytics}
    >
      {renderContent()}
    </AdminDashboardLayout>
  );
}

const DashboardPage = () => (
  <AuthGuard allowedRoles={['admin', 'editor', 'journalist']}>
    <DashboardPageContent />
  </AuthGuard>
);

export default DashboardPage;
