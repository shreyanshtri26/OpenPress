// src/components/StoryEditor/PublishStoryModal.tsx

import React, { useContext } from 'react';
import { SelectBox } from '@/components/ui/kit/select-box';
import apiFetch from '../../utils/api';
import { DateBox } from '@/components/ui/kit/date-box';
import { Check, Pause, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { UserContext } from '../../context/UserContext';
import env from '@/utils/env';

// Assuming these types are moved to a shared types file or defined here
interface EditorOption {
  userId: string;
  fullName?: string;
}
type ValidationErrors = Partial<
  Record<'section' | 'category' | 'proposedDate' | 'assignedEditor', string>
>;

interface PublishStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  sections: string[];
  categories: string[];
  editors: EditorOption[];
  storyId: string;
  storyDetails: {
    section: string;
    category: string;
    proposedDate: string;
    assignedEditor: string;
  };
  setStoryDetails: (details: PublishStoryModalProps['storyDetails']) => void;
  validationErrors: ValidationErrors;
}

type StoryStatus = 'In_progress' | 'On_hold' | 'Rejected' | string;

export const PublishStoryModal = ({
  isOpen,
  onClose,
  onBack,
  onSubmit,
  isSubmitting,
  sections,
  categories,
  editors,
  storyId,
  storyDetails,
  setStoryDetails,
  validationErrors,
}: PublishStoryModalProps) => {
  if (!isOpen) return null;

  // ✅ Correctly access context and user
  const userContext = useContext(UserContext);
  const user = userContext?.user;

  const handleChange = (field: keyof typeof storyDetails, value: any) => {
    setStoryDetails({ ...storyDetails, [field]: value });
  };


  const handleStoryAction = async (status: StoryStatus, additionalData = {}) => {
    // if (isReadOnly) return; // Disable in read-only mode

    try {
      const payload = {
        status: status,
        ...additionalData
      };

      const res = await apiFetch(`${env.backendApi}/api/updateStory?storyId=${storyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          // ...(user?.role && { 'x-user-role': user.role }),
          // ...(user?.id && { 'x-user-id': user.id }),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`Story ${status.toLowerCase().replace('_', ' ')} successfully!`);
        onClose();
        onBack();
      } else {
        const errorData = await res.json();
        toast.error(`Failed to ${status.toLowerCase().replace('_', ' ')} story: ${errorData.message || 'Unknown error'}`);
      }

    } catch (error: unknown) {
      // ✅ Safe error handling
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error updating story:', error);
      toast.error(`Failed to ${status.toLowerCase().replace('_', ' ')} story: ${message}`);
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-8 m-4">
        <h2 className="text-2xl font-bold mb-6 font-sans">Story Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section *
            </label>
            <SelectBox
              dataSource={sections}
              value={storyDetails.section}
              onValueChanged={(e) => handleChange('section', e.value ?? '')}
              stylingMode="outlined"
              width="100%"
              validationError={validationErrors.section}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <SelectBox
              dataSource={categories}
              value={storyDetails.category}
              onValueChanged={(e) => handleChange('category', e.value ?? '')}
              stylingMode="outlined"
              width="100%"
              validationError={validationErrors.category}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Date *
            </label>
            <DateBox
              value={
                storyDetails.proposedDate
                  ? new Date(storyDetails.proposedDate)
                  : null
              }
              onValueChanged={(e) =>
                handleChange(
                  'proposedDate',
                  e.value ? e.value.toISOString().split('T')[0] : '',
                )
              }
              type="date"
              min={new Date()}
              stylingMode="outlined"
              width="100%"
              validationError={validationErrors.proposedDate}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Editor *
            </label>
            <SelectBox
              dataSource={editors}
              displayExpr="fullName"
              valueExpr="userId"
              value={storyDetails.assignedEditor}
              onValueChanged={(e) =>
                handleChange('assignedEditor', e.value ?? '')
              }
              stylingMode="outlined"
              width="100%"
              validationError={validationErrors.assignedEditor}
            />
          </div>
        </div>

        {
          user?.userId === storyDetails?.assignedEditor ?
            <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t">
              <button
                onClick={() => handleStoryAction('In_progress')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Accept
                <Check size={16} className="ml-2" />
              </button>
              <button
                onClick={() => handleStoryAction('On_hold')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                Hold
                <Pause size={16} className="ml-2" />
              </button>
              <button
                onClick={() => handleStoryAction('Rejected')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Reject
                <X size={16} className="ml-2" />
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Story'}
                <Send size={16} className="ml-2" />
              </button>
            </div>
            :
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Story'}
                <Send size={16} className="ml-2" />
              </button>
            </div>
        }

      </div>
    </div>
  );
};