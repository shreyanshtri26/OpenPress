// src/components/StoryEditor/StoryHeader.tsx

import CustomButton from '../common/CustomButton';
import toast from 'react-hot-toast';
import { RolePermissions } from '../../context/UserContext';
import { checkStoryPermission } from '../../utils/storyPermissions';


type StoryStatus = 'In_progress' | 'On_hold' | 'In_review' | 'Rejected' | string;

interface EditorHeaderProps {
  onBack: () => void;
  onSaveDraft: () => void;
  onPublishClick: () => void;
  handleStoryAction: (status: StoryStatus, additionalData?: Record<string, any>) => void;
  isSaving: boolean;
  lastSaved: Date | null;
  isAssignedEditor: boolean;
  isRejectedStory: boolean;
  storyStatus: string; // ✅ fixed: it’s a value, not a function
  autoSaveStatus?: 'idle' | 'saving' | 'saved';
  permissions?: RolePermissions | null; // ✨ ADD THIS NEW PROP
  userRole?: string;

}

const normalizeStatus = (status: string | null | undefined): string =>
  status?.toLowerCase().replace(/\s+/g, '_') ?? '';

export const StoryHeader = ({
  onBack,
  onSaveDraft,
  onPublishClick,
  handleStoryAction,
  isSaving,
  lastSaved,
  isAssignedEditor,
  isRejectedStory,
  storyStatus,
  autoSaveStatus = 'idle', // 🆕 NEW: Destructure with default value
  permissions,
  userRole
}: EditorHeaderProps) => {

  const normalizedStatus = normalizeStatus(storyStatus);

  function getTimeAgo(date: Date) {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    return `${diffMins} minutes ago`;
  }

  // ✅ Map status to display text
  const getStatusLabel = () => {
    switch (normalizedStatus) {
      case 'in_progress':
        return 'In Progress';
      case 'in_review':
        return 'In Review';
      case 'ready_to_publish':
        return 'Ready to publish';
      case 'raise_a_story':
        return 'Raise A Story';
      case 'published':
        return 'Published ';
      case 'scheduled':
        return 'Scheduled';
      default:
        return 'Ideas';
    }
  };

  // PROTECTED BUTTON WRAPPER 
  const ProtectedButton = ({
    allowed,
    children,
    onClick,
  }: {
    allowed: boolean;
    children: React.ReactNode;
    onClick: () => void;
  }) => {
    return (
      <div
        onClick={() => {
          if (!allowed) {
            toast.error("You are not authorized to perform this action");
          }
        }}
        className="cursor-pointer"
      >
        <div className={allowed ? "" : "opacity-50 pointer-events-none"}>
          <div onClick={allowed ? onClick : undefined}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  const canDecide = checkStoryPermission(permissions ?? null, normalizedStatus, 'Decide', userRole);

  return (
    <div className="w-full z-10 bg-white/70 backdrop-blur-lg ">
      <div className="w-full flex sm:justify-center ">
        <div
          className="
              w-full
              px-6 sm:px-10 lg:pl-[146px] lg:pr-20 xl:pr-32
              pt-4 pb-2 sm:py-6
              flex flex-col sm:flex-row
              sm:items-center sm:justify-between
              gap-3
              transition-all duration-300 ease-in-out
              max-w-5xl"
        >

          {/* Left Side */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onBack}
                className="text-xs sm:text-sm hover:underline"
                style={{ fontFamily: 'inherit' }}
              >
                Dashboard
              </button>
              {/* 👇 Dynamic breadcrumb based on storyStatus */}
              <span className="text-xs sm:text-sm">{'>' + ' '} <span className="underline">{getStatusLabel()}</span></span>
            </div>
            <div className="text-xs sm:text-sm text-gray-400">
              {autoSaveStatus === 'saving' && (
                <span className="italic">Autosaving...</span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="font-bold text-gray-400 text-xs sm:text-sm">
                  {lastSaved ? `Autosaved ${getTimeAgo(lastSaved)}` : 'Autosaved just now'}
                </span>
              )}
              {autoSaveStatus === 'idle' && lastSaved && (
                <span className=' text-xs sm:text-sm'>Autosaved {getTimeAgo(lastSaved)}</span>
              )}
            </div>

          </div>

          {/* Right Side Buttons */}
          <div className="flex items-center sm:justify-end justify-start gap-2 ">
            {/* {normalizedStatus === 'published' ? (
              <ProtectedButton allowed={true} onClick={() => { }}>
                <CustomButton variant="black" onClick={() => { }}>
                  Preview
                </CustomButton>
              </ProtectedButton>
            ) : null} */}

            {normalizedStatus === 'in_progress' ? (
              <ProtectedButton allowed={canDecide} onClick={() => handleStoryAction('in_review')}>
                <CustomButton variant="black" onClick={() => { }} disabled={isSaving}>
                  Submit
                </CustomButton>
              </ProtectedButton>
            ) : null}





            {/* --------- DEFAULT ACTIONS --------- */}
            {normalizedStatus !== 'published' &&
              normalizedStatus !== 'in_progress' &&
              normalizedStatus !== 'ready_to_publish' &&
              normalizedStatus !== 'scheduled' && (
                <div className="flex gap-2 flex-wrap">
                  <ProtectedButton allowed={canDecide} onClick={() => handleStoryAction('approved')}>
                    <CustomButton variant="white" onClick={() => { }}>
                      Approve
                    </CustomButton>
                  </ProtectedButton>

                  <ProtectedButton allowed={canDecide} onClick={() => handleStoryAction('on_hold')}>
                    <CustomButton variant="white" onClick={() => { }}>
                      Hold
                    </CustomButton>
                  </ProtectedButton>

                  <ProtectedButton allowed={canDecide} onClick={() => handleStoryAction('rejected')}>
                    <CustomButton variant="white" onClick={() => { }}>
                      Reject
                    </CustomButton>
                  </ProtectedButton>
                </div>
              )}
          </div>

        </div>
      </div>
    </div>
  );
};
