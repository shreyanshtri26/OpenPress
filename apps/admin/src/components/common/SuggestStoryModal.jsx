import { Suspense, useState, useEffect, useContext, useCallback, useRef, lazy } from 'react';
import { ChevronDown, X, Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import env from '@/utils/env';
import apiFetch from '../../utils/api';
const Editor = lazy(() => import("../ui/EditorWrapper"));
import { normalizeDescription } from "../../utils/normalizeDescription";



import { UserContext } from '../../context/UserContext';

// DevExpress imports
import { Popup } from '@/components/ui/kit/popup';
import { SelectBox } from '@/components/ui/kit/select-box';
import { DateBox } from '@/components/ui/kit/date-box';
import { Button } from '@/components/ui/kit/button';
import { ValidationSummary } from '@/components/ui/kit/validation-summary';
import { Validator, RequiredRule, StringLengthRule } from '@/components/ui/kit/validator';

export default function SuggestStoryModal({ isOpen, onClose, prefillData }) {
  const { user } = useContext(UserContext);
  const [storyId, setStoryId] = useState('');
  const [description, setDescription] = useState({ blocks: [] });


  const [section, setSection] = useState('');
  const [category, setCategory] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [assignedEditor, setAssignedEditor] = useState('');
  const [initialValues, setInitialValues] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [editors, setEditors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status management states
  const [currentStatus, setCurrentStatus] = useState('draft');
  const [isComplete, setIsComplete] = useState(false);
  const [storyState, setStoryState] = useState('Not_opened');

  // ✅ NEW: Track if story has been submitted or completed
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Validation and auto-save states
  const [validationErrors, setValidationErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [draftCreated, setDraftCreated] = useState(false);
  const autoSaveTimeoutRef = useRef(null);

  const TITLE_MAX_LENGTH = 100;
  const DESCRIPTION_MAX_LENGTH = 240;

  const sections = ['Local', 'National', 'International'];
  const categories = ['Politics', 'Business', 'Culture', 'Health', 'Tech', 'Sports'];

  // Helper function to get plain text from HTML content
  // const getPlainTextFromHtml = (html) => {
  //   const tempDiv = document.createElement('div');
  //   tempDiv.innerHTML = html;
  //   return tempDiv.textContent || tempDiv.innerText || '';
  // };
  // ----------------- Editor.js helpers (Title + Body) -----------------
  // 🔧 Improved plain-text extractor with safe space handling

  const aiConfig = {
    apiUrl: `${env.aiApi}/normal_stream`,
    maxTokens: 1024,
    temperature: 0.7,
    topP: 0.9,
    // apiKey: 'your-api-key-if-needed' // Optional if you need authentication
  };


  const decodeHtml = (html = '') => {
    if (typeof window === "undefined") return html; // SSR safety
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  const getPlainTextFromBlocks = (blocks = []) =>
    blocks
      .map((block) => {
        if (block?.type === "paragraph" || block?.type === "header") {
          // decode HTML entities (handles &nbsp;)
          return decodeHtml(block?.data?.text || "");
        }
        return "";
      })
      .join(" ")
      .replace(/\u00A0/g, " ")   // normalize non-breaking spaces → normal space
      .replace(/\s+/g, " ")      // collapse multiple spaces
      .trim();


  /**
   * Derive title and body blocks from a full Editor.js document
   * Rule:
   * - Use the FIRST block's text as title if it has any text (header/paragraph).
   * - The rest of the blocks become the body.
   */
  const deriveTitleAndBody = (data) => {
    const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
    if (blocks.length === 0) return { title: '', bodyBlocks: [] };

    const [first, ...rest] = blocks;
    const titleCandidate =
      (first?.type === 'header' || first?.type === 'paragraph') ? (first?.data?.text || '').trim() : '';

    if (titleCandidate) {
      return { title: titleCandidate, bodyBlocks: rest };
    }
    // If first block has no text, we consider full as body (no title yet)
    return { title: '', bodyBlocks: blocks };
  };

  // Backwards compatibility name (used in a few places below)
  const getPlainTextFromEditorData = (data) => getPlainTextFromBlocks(data?.blocks || []);

  /**
   * Create a full Editor.js doc by prepending a title block on top of the body
   * Used when pre-filling existing stories so the user edits title inline.
   */
  const mergeTitleAndBody = (titleText, bodyData) => {
    const safeBodyBlocks = Array.isArray(bodyData?.blocks) ? bodyData.blocks : [];
    const headerBlock = {
      type: 'header',
      data: { text: titleText || '', level: 2 }, // feels like Medium's H2
    };
    return { blocks: [headerBlock, ...safeBodyBlocks] };
  };


  // ✅ UPDATED: Check if story should be read-only or hide draft options
  useEffect(() => {
    if (prefillData) {
      const status = prefillData.status;

      // Set read-only for submitted stories
      if (status === 'Suggested' || status === 'Completed' || status === 'Published') {
        setIsReadOnly(true);
        setHasSubmitted(true);
        console.log('🔒 Story has been submitted - disabling draft options');
      } else {
        setIsReadOnly(false);
        setHasSubmitted(false);
      }
    }
  }, [prefillData]);

  // ✅ UPDATED: Check if ALL required fields are filled

  const checkStoryCompleteness = useCallback(() => {
    if (hasSubmitted) {
      setIsComplete(false);
      return false;
    }

    const { title: derivedTitle, bodyBlocks } = deriveTitleAndBody(description);
    const bodyPlain = getPlainTextFromBlocks(bodyBlocks);



    // ✅ Helper function to safely check if field is filled
    const safeTrim = (value) => (typeof value === 'string') ? value.trim() : '';

    // ✅ ALL required fields must be filled
    const requiredFields = [
      safeTrim(derivedTitle),
      safeTrim(bodyPlain),

      section,
      category,
      proposedDate,
      assignedEditor
    ];

    // ✅ Check that ALL fields have values
    const allFieldsFilled = requiredFields.every(field => {
      if (typeof field === 'string') {
        return field.length > 0;
      }
      return field !== null && field !== undefined && field !== '';
    });

    // ✅ Additional check for description content (HTML)
    const hasValidDescription = getPlainTextFromBlocks(bodyBlocks).length > 0;



    // ✅ Only complete when ALL fields are filled AND description has content
    const finalComplete = allFieldsFilled && hasValidDescription;

    setIsComplete(finalComplete);
    return finalComplete;
  },
    [description, category, section, proposedDate, assignedEditor, hasSubmitted]);


  // Validation function (disabled for submitted stories)
  const validateBasicFields = () => {
    if (hasSubmitted) return {};

    const errors = {};
    const { title: derivedTitle, bodyBlocks } = deriveTitleAndBody(description);
    const bodyPlainTextLength = getPlainTextFromBlocks(bodyBlocks).length;

    if (derivedTitle.length > TITLE_MAX_LENGTH) {
      errors.title = `Title exceeds ${TITLE_MAX_LENGTH} characters`;
    }
    if (bodyPlainTextLength > DESCRIPTION_MAX_LENGTH) {
      errors.description = `Description exceeds ${DESCRIPTION_MAX_LENGTH} characters`;
    }
    return errors;
  };


  const fetchEditors = async () => {
    try {
      const res = await apiFetch(
        `${env.backendApi}/api/getAllUsers`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
        }
      );
      const data = await res.json();
      const editor = (data?.data || []).filter(u => u.role === "editor");
      setEditors(editor);
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    fetchEditors();
  }, [])

  const validateForSubmit = () => {
    if (hasSubmitted) return {};

    const errors = {};
    const { title: derivedTitle, bodyBlocks } = deriveTitleAndBody(description);
    const safeTrim = (v) => (typeof v === 'string' ? v.trim() : '');

    const bodyPlain = getPlainTextFromBlocks(bodyBlocks);
    const bodyPlainTextLength = bodyPlain.length;

    if (!safeTrim(derivedTitle)) {
      errors.title = 'Title is required';
    } else if (derivedTitle.length > TITLE_MAX_LENGTH) {
      errors.title = `Title exceeds ${TITLE_MAX_LENGTH} characters`;
    }

    if (bodyPlainTextLength === 0) {
      errors.description = 'Description is required';
    } else if (bodyPlainTextLength > DESCRIPTION_MAX_LENGTH) {
      errors.description = `Description exceeds ${DESCRIPTION_MAX_LENGTH} characters`;
    }

    if (!section) errors.section = 'Section is required';
    if (!category) errors.category = 'Category is required';
    if (!proposedDate) errors.proposedDate = 'Proposed date is required';
    if (!assignedEditor) errors.assignedEditor = 'Editor assignment is required';

    return errors;
  };




  // Description change handler (disabled for submitted stories)
  const handleDescriptionChange = (content) => {
    if (hasSubmitted || isReadOnly) return;

    setDescription(content);

    if (validationErrors.description) {
      const newErrors = validateBasicFields();
      setValidationErrors(prev => ({ ...prev, description: newErrors.description }));
    }
  };

  // Field change handler (disabled for submitted stories)
  const handleFieldChange = (fieldName, value, setterFunction) => {
    if (hasSubmitted || isReadOnly) return;

    setterFunction(value);
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const loadExistingDraft = useCallback(async () => {
    if (!user?.userId || prefillData) return null;

    try {
      console.log('Checking for existing drafts...');

      const res = await apiFetch(
        `${env.backendApi}/api/fetchDrafts?userId=${user.userId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            // ...(user?.role && { 'x-user-role': user.role }),
            // ...(user?.id && { 'x-user-id': user.id }),
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const drafts = data.data || [];

        const recentDrafts = drafts
          .filter(d => d.status === 'draft')
          .filter(d => {
            const hasMinimalTitle = !d.title || d.title.startsWith('Untitled');
            const hasContent = d.description && d.description.length > 20;
            return hasMinimalTitle && hasContent;
          })
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));




        if (recentDrafts.length > 0) {
          const mostRecentDraft = recentDrafts[0];

          console.log('Found existing auto-save candidate:', mostRecentDraft.title);

          return {
            storyId: mostRecentDraft._id,
            title: mostRecentDraft.title || '',
            description: mostRecentDraft.description || '',
            section: mostRecentDraft.section || '',
            category: mostRecentDraft.category || '',
            proposedDate: mostRecentDraft.proposedFilingDate?.split('T')[0] || '',
            assignedEditor: mostRecentDraft.assignedTo || '', // ✅ Map assignedTo → assignedEditor
            status: mostRecentDraft.status,
            state: mostRecentDraft.state
          };
        }
      }
    } catch (err) {
      console.error('Error loading existing draft:', err);
    }

    return null;
  }, [user]);

  // ✅ UPDATED: Create draft story - reuse existing untitled drafts
  const createDraftStory = useCallback(async () => {
    const { title: derivedTitle, bodyBlocks } = deriveTitleAndBody(description);

    if (draftCreated || prefillData) return;

    // ✅ Check if we already have an untitled draft to reuse
    const existingDraft = await loadExistingDraft();
    if (existingDraft) {
      // Reuse existing draft instead of creating new one
      setStoryId(existingDraft.storyId);
      setDraftCreated(true);
      setCurrentStatus('draft');
      console.log('Reusing existing draft for auto-save');

      // Now update it with current content
      await autoSaveDraft();
      return;
    }

    try {
      setIsAutoSaving(true);

      const draftData = {
        // ✅ Changed: when creating a blank/auto draft, send an empty title rather than 'Untitled Draft'
        title: (derivedTitle || '').trim(),
        description: { blocks: bodyBlocks },
        category: category || '',
        section: section || '',
        proposedFilingDate: proposedDate || null,
        assignedTo: assignedEditor || null,
        authorId: user.userId,
        status: 'draft',
        state: 'Not_opened'
      };

      const res = await apiFetch(
        `${env.backendApi}/api/articles/postStory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            // ...(user?.role && { 'x-user-role': user.role }),
            // ...(user?.userId && { 'x-user-id': user.userId }),
          },
          body: JSON.stringify(draftData),
        }
      );

      console.log("res>>>", res);

      if (res.ok) {
        const responseData = await res.json();
        console.log("this is my response data", responseData)
        setStoryId(responseData.storyId || responseData.data?._id);
        setCurrentStatus(responseData.status || 'draft');
        setDraftCreated(true);
        setLastSaved(new Date());
        console.log('New auto-save draft created');
      }
    } catch (err) {
      console.error('Error creating draft:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [description, section, category, proposedDate, assignedEditor, user, draftCreated, prefillData, loadExistingDraft]);

  // ✅ UPDATED: Auto-save existing draft - preserve current status
  const autoSaveDraft = useCallback(async () => {
    if (!draftCreated || !storyId || hasSubmitted) return;
    const { title: derivedTitle, bodyBlocks } = deriveTitleAndBody(description);

    try {
      setIsAutoSaving(true);

      // ✅ PRESERVE CURRENT STATUS - don't force to 'draft'
      const updatedData = {
        // ✅ Changed: do not force 'Untitled Draft' as value for title — keep empty if user hasn't entered one
        title: (derivedTitle || '').trim(),
        description: { blocks: bodyBlocks },
        category,
        section,
        proposedFilingDate: proposedDate,
        assignedTo: assignedEditor || null,
        status: currentStatus,
        state: storyState
      };

      console.log(`Auto-saving with preserved status: ${currentStatus}`);

      const res = await apiFetch(
        `${env.backendApi}/api/updateStory?storyId=${storyId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            // ...(user?.role && { 'x-user-role': user.role }),
            // ...(user?.id && { 'x-user-id': user.id }),
          },
          body: JSON.stringify(updatedData),
        }
      );

      if (res.ok) {
        setLastSaved(new Date());
        console.log(`Auto-saved with status: ${currentStatus}`);
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [description, section, category, proposedDate, assignedEditor, storyId, user, draftCreated, storyState, hasSubmitted, currentStatus]);

  // ✅ UPDATED: Auto-save for existing stories - preserve original status  
  const autosaveStory = useCallback(async () => {
    if (!prefillData || hasSubmitted) return;

    setIsAutoSaving(true);

    try {
      // ✅ DON'T INCLUDE STATUS - let backend preserve it
      const { title: derivedTitle, bodyBlocks } = deriveTitleAndBody(description);
      const storyData = {
        title: (derivedTitle || '').trim(),
        description: { blocks: bodyBlocks },
        category,
        section,
        proposedFilingDate: proposedDate,
        assignedTo: assignedEditor || null,
      };


      console.log(`Auto-saving existing story without changing status`);

      const res = await apiFetch(
        `${env.backendApi}/api/updateStory?storyId=${storyId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            // ...(user?.role && { 'x-user-role': user.role }),
            // ...(user?.id && { 'x-user-id': user.id }),
          },
          body: JSON.stringify(storyData),
        }
      );

      if (res.ok) {
        setLastSaved(new Date());
        console.log(`Auto-saved existing story while preserving status`);
      }
    } catch (err) {
      console.error('Autosave failed:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [description, section, category, proposedDate, storyId, user, prefillData, hasSubmitted]);

  // Auto-save effects - disabled when submitted
  useEffect(() => {
    if (isSubmitting || hasSubmitted) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    const { title: derivedTitle, bodyBlocks } = deriveTitleAndBody(description);
    const bodyPlain = getPlainTextFromBlocks(bodyBlocks);
    const hasContent = (derivedTitle && derivedTitle.trim()) || (bodyPlain && bodyPlain.trim());

    if (!hasContent) return;

    if (!prefillData && hasContent) {
      if (!draftCreated) {
        autoSaveTimeoutRef.current = setTimeout(() => {
          createDraftStory();
        }, 3000);
      } else if (draftCreated && storyId) {
        autoSaveTimeoutRef.current = setTimeout(() => {
          autoSaveDraft();
        }, 2000);
      }
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [description, section, category, proposedDate, assignedEditor, draftCreated, createDraftStory, autoSaveDraft, prefillData, isSubmitting, hasSubmitted]);

  useEffect(() => {
    if (!prefillData || hasSubmitted) return;

    const timeoutId = setTimeout(() => {
      if (isDirty) {
        autosaveStory();
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [description, section, category, proposedDate, isDirty, autosaveStory, prefillData, hasSubmitted]);

  // Check completeness on field changes
  useEffect(() => {
    checkStoryCompleteness();
  }, [checkStoryCompleteness]);

  useEffect(() => {
    if (isOpen) {
      if (prefillData) {
        // Map assignedTo field correctly for edit mode

        console.log("1");
        const initial = {
          storyId: prefillData.storyId || '',
          title: prefillData.title || '',
          description: prefillData.description || '',
          section: prefillData.section || '',
          category: prefillData.category || '',
          proposedDate: prefillData.proposedDate || '',
          assignedEditor: prefillData.assignedEditor || prefillData.assignedTo || '',
        };

        console.log('🔍 Prefill data mapping:');
        console.log('  - prefillData.assignedTo:', prefillData.assignedTo);
        console.log('  - prefillData.assignedEditor:', prefillData.assignedEditor);
        console.log('  - final assignedEditor:', initial.assignedEditor);

        setStoryId(initial.storyId);

        // ✅ FIXED: Handle title and description properly
        const normalizedDescription = normalizeDescription(initial.description);

        // Check if description already contains the title as first block
        const { title: existingTitleInDescription } = deriveTitleAndBody(normalizedDescription);

        if (existingTitleInDescription && existingTitleInDescription.trim() === initial.title.trim()) {
          // Title is already in description, use as-is
          console.log('✅ Title already exists in description blocks, using as-is');
          setDescription(normalizedDescription);
        } else if (initial.title && initial.title.trim()) {
          // Title exists but not in description, merge it
          console.log('✅ Merging separate title with description blocks');
          setDescription(mergeTitleAndBody(initial.title, normalizedDescription));
        } else {
          // No title or title in description, use description as-is
          console.log('✅ Using description blocks as-is (no separate title)');
          setDescription(normalizedDescription);
        }

        setSection(initial.section);
        setCategory(initial.category);
        setProposedDate(initial.proposedDate);
        setAssignedEditor(initial.assignedEditor);
        setInitialValues(initial);
        setDraftCreated(true);
        setCurrentStatus(prefillData.status || 'draft');
        setStoryState(prefillData.state || 'Not_opened');

        // Set read-only status for submitted stories
        const status = prefillData.status;
        if (status === 'Suggested' || status === 'Completed' || status === 'Published') {
          setIsReadOnly(true);
          setHasSubmitted(true);
          console.log('🔒 Story has been submitted - disabling draft options');
        } else {
          setIsReadOnly(false);
          setHasSubmitted(false);
        }

        console.log('✅ Loaded specific draft for editing with assignedEditor:', initial.assignedEditor);
        console.log("description>>", description);

      } else {
        // NEW: When opening as "Raise Story" (new), DO NOT auto-load drafts.
        // Start completely clean so users see an empty title + description.
        setStoryId('');
        // Start with an empty header so user sees a 'title position' first
        setDescription(mergeTitleAndBody('', { blocks: [] }));

        setSection('');
        setCategory('');
        setProposedDate('');
        setAssignedEditor('');
        setInitialValues({});
        setDraftCreated(false);
        setCurrentStatus('draft');
        setStoryState('Not_opened');
        setIsReadOnly(false);
        setHasSubmitted(false);
        setLastSaved(null);

        console.log('✅ Opening new blank story (no auto-loaded drafts)');
      }

      // Reset validation / submit state
      setValidationErrors({});
      setSubmitAttempted(false);
    }
  }, [isOpen, prefillData]);

  useEffect(() => {
    if (!prefillData || hasSubmitted) return;
    const dirty =
      description !== initialValues.description ||
      section !== initialValues.section ||
      category !== initialValues.category ||
      proposedDate !== initialValues.proposedDate ||
      assignedEditor !== initialValues.assignedEditor;

    setIsDirty(dirty);
  }, [description, section, category, proposedDate, assignedEditor, prefillData, initialValues, hasSubmitted]);

  // ✅ UPDATED: Use PUT for existing drafts, POST for new ones
  const handleSaveDraft = async () => {


    const safeTrim = (value) => (typeof value === 'string') ? value.trim() : '';

    const basicErrors = validateBasicFields();
    setValidationErrors(basicErrors);

    if (Object.keys(basicErrors).length > 0) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    const { title: derivedTitle, bodyBlocks } = deriveTitleAndBody(description);
    const draftData = {
      title: safeTrim(derivedTitle) || `Draft - ${new Date().toLocaleDateString()}`,
      description: { blocks: bodyBlocks },
      category: category || '',
      section: section || '',
      proposedFilingDate: proposedDate || null,
      assignedTo: assignedEditor || null,
      authorId: user.userId,
      status: 'draft',
      state: 'Not_opened',
      draftSource: 'manual_save'
    };


    try {
      let res;
      console.log("i am seeing my story id: ", storyId)
      // ✅ Check if we have existing draft (storyId exists)
      if (storyId) {
        console.log('📝 Updating existing draft with PUT method');
        // UPDATE existing draft
        res = await apiFetch(
          `${env.backendApi}/api/updateStory?storyId=${storyId}`,
          {
            method: 'PUT', // ✅ Use PUT to update
            headers: {
              'Content-Type': 'application/json',
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
              // ...(user?.role && { 'x-user-role': user.role }),
              // ...(user?.id && { 'x-user-id': user.id }),
            },
            body: JSON.stringify(draftData),
          }
        );
      } else {
        console.log('🆕 Creating new draft with POST method');
        // CREATE new draft
        res = await apiFetch(
          `${env.backendApi}/api/articles/postStory`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
              // ...(user?.role && { 'x-user-role': user.role }),
              // ...(user?.id && { 'x-user-id': user.id }),
            },
            body: JSON.stringify(draftData),
          }
        );

        // ✅ Set storyId for future saves if this was a new draft
        if (res.ok) {
          const responseData = await res.json();
          const newStoryId = responseData.storyId || responseData.data?._id;
          if (newStoryId) {
            setStoryId(newStoryId);
            setDraftCreated(true);
          }
        }
      }

      if (res.ok) {
        toast.success('Draft saved successfully!');
        console.log('✅ Draft saved successfully');
      } else {
        const errorData = await res.json();
        console.error('Save failed:', errorData);
        toast.error('Failed to save draft: ' + (errorData.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      toast.error('Error saving draft');
    }
  };

  const handleSubmit = useCallback(async (e) => {
    // DevExpress Button events don't have preventDefault, so we check if it exists
    console.log("Clicked!");

    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (isSubmitting || hasSubmitted) return;

    setIsSubmitting(true);
    setSubmitAttempted(true);

    try {
      const errors = validateForSubmit();
      setValidationErrors(errors);

      if (Object.keys(errors).length > 0) {
        toast.error('Please complete all required fields before submitting');
        return;
      }

      const { title: derivedTitle, bodyBlocks } = deriveTitleAndBody(description);
      const finalData = {
        title: (derivedTitle || '').trim(),
        description: { blocks: bodyBlocks },
        section,
        category,
        proposedFilingDate: proposedDate,
        assignedTo: assignedEditor || null,
        authorId: user.userId,
        status: 'Suggested',
        state: 'Not_opened'
      };


      console.log('Submitting story with status: Suggested');

      let res;
      if (prefillData && storyId) {
        // UPDATE existing draft to Suggested
        res = await apiFetch(
          `${env.backendApi}/api/updateStory?storyId=${storyId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
              // ...(user?.role && { 'x-user-role': user.role }),
              // ...(user?.id && { 'x-user-id': user.id }),
            },
            body: JSON.stringify(finalData),
          }
        );
      } else if (storyId) {
        res = await apiFetch(
          `${env.backendApi}/api/updateStory?storyId=${storyId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
              // ...(user?.role && { 'x-user-role': user.role }),
              // ...(user?.id && { 'x-user-id': user.id }),
            },
            body: JSON.stringify(finalData),
          }
        );

      } else {
        // CREATE new story with Suggested status
        res = await apiFetch(
          `${env.backendApi}/api/articles/postStory`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
              // ...(user?.role && { 'x-user-role': user.role }),
              // ...(user?.id && { 'x-user-id': user.id }),
            },
            body: JSON.stringify(finalData),
          }
        );
      }

      if (res.ok) {
        const responseData = await res.json();
        console.log('Story submitted successfully:', responseData);

        // ✅ UPDATE LOCAL STATUS TO REFLECT SUBMISSION
        setCurrentStatus('Suggested');
        setHasSubmitted(true);
        setIsReadOnly(true);

        if (prefillData) {
          toast.success('Story submitted successfully!');
        } else {
          toast.success('New story idea raised successfully');
        }

        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const errorData = await res.json();
        console.error('Submit failed:', errorData);
        toast.error('Failed to submit story: ' + (errorData.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error submitting story:', err);
      toast.error(`Failed to submit story: ${err?.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, hasSubmitted, description, section, category, proposedDate, assignedEditor, user, validateForSubmit, prefillData, storyId]);

  // (IMPORTANT) Do NOT return null on closed — always mount the Popup and let its `visible` prop control rendering.
  // This reduces mount/unmount flicker when toggling the dialog open (fixes the "blinks twice" issue).
  // if (!isOpen) return null;

  const { title: derivedTitleUI, bodyBlocks: bodyBlocksUI } = deriveTitleAndBody(description);
  const rawPlainText = getPlainTextFromBlocks(bodyBlocksUI);
  const descriptionCharCount = rawPlainText.replace(/\s/g, "").length;


  console.log("storyId >>", storyId);
  console.log("prefilledData>>", prefillData);

  return (
    <Popup
      visible={isOpen}
      onHiding={onClose}
      showTitle={false}
      dragEnabled={false}
      scrollingEnabled={false}

      height="auto"
      width="auto"

      hideOnOutsideClick={true}
      showCloseButton={false}
      // width="90%"
      // height="90%"
      maxWidth={700}
      deferRendering={false} // ensure content is available immediately when visible toggles (helps prevent flicker)
      // Disable animation to avoid visual double-open blink on some environments
      animation={{
        show: { type: 'fade', duration: 0 },
        hide: { type: 'fade', duration: 0 }
      }}
      shading={true}
      position={{
        my: 'center',
        at: 'center',
        of: window
      }}
      contentRender={() => (
        <div className="p-8 h-full overflow-y-auto bg-white">
          {/* ✅ UPDATED: Header with submission status */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">
                {hasSubmitted ? 'View Submitted Story' : prefillData ? 'Edit Story' : 'Suggest a Story'}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                {hasSubmitted && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <Lock className="w-3 h-3 mr-1 inline" />
                    Status: {currentStatus}
                  </span>
                )}
              </div>
            </div>
            <Button
              icon="close"
              type="default"
              stylingMode="text"
              onClick={onClose}
              elementAttr={{ style: { padding: '8px', borderRadius: '50%' } }}
            />
          </div>

          {/* Form */}
          <div className="space-y-4">

            {/* Medium-like Editor (Title as first block + Body) */}
            <div className="mb-6">
              <div className="relative  max-h-[350px] overflow-y-auto border border-gray-200 rounded-lg p-2">

                <Suspense fallback={<div className="p-4 text-center">Loading editor...</div>}>
                  <Editor
                    data={description}
                    onChange={setDescription}
                    holder="story-editor"
                    readOnly={isReadOnly}
                    aiConfig={aiConfig}
                  // Tip: Ensure your EditorWrapper has Header + Paragraph tools enabled
                  />
                </Suspense>


                {!isReadOnly && (
                  <div
                    className={`absolute bottom-2 right-2 text-xs font-medium bg-white px-2 py-1 rounded shadow-sm ${descriptionCharCount > DESCRIPTION_MAX_LENGTH
                      ? 'text-red-500'
                      : descriptionCharCount > DESCRIPTION_MAX_LENGTH * 0.8
                        ? 'text-yellow-500'
                        : 'text-gray-400'
                      }`}
                  >
                    {descriptionCharCount}/{DESCRIPTION_MAX_LENGTH}
                  </div>
                )}
              </div>

              {/* Validation messages */}
              {validationErrors.title && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
              )}
              {validationErrors.description && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
              )}

              {/* Auto-save indicator (unchanged logic) */}
              {!hasSubmitted && (
                <div className="mt-1 flex items-center justify-end text-xs">
                  <div className="text-gray-500">
                    {isAutoSaving ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {draftCreated ? 'Saving...' : 'Creating draft...'}
                      </span>
                    ) : lastSaved ? (
                      <span>{draftCreated && !prefillData ? 'Draft saved' : 'Saved'} {new Date(lastSaved).toLocaleTimeString()}</span>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 border-t pt-4">
              <div className="text-sm text-gray-500 mb-2">Details</div>
              <div className="grid grid-cols-2 gap-4">
                {/* Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section <span className="text-red-500">*</span>
                  </label>
                  <SelectBox
                    dataSource={sections}
                    value={section}
                    onValueChanged={(e) => handleFieldChange('section', e.value, setSection)}
                    readOnly={isReadOnly}
                    disabled={isReadOnly}
                    placeholder="Select section"
                    stylingMode="outlined"
                    elementAttr={{
                      style: {
                        backgroundColor: isReadOnly ? '#f3f4f6' : 'white'
                      }
                    }}
                  >
                    <Validator>
                      <RequiredRule message="Section is required" />
                    </Validator>
                  </SelectBox>
                  {validationErrors.section && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.section}</p>
                  )}
                </div>


                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <SelectBox
                    dataSource={categories}
                    value={category}
                    onValueChanged={(e) => handleFieldChange('category', e.value, setCategory)}
                    readOnly={isReadOnly}
                    disabled={isReadOnly}
                    placeholder="Select category"
                    stylingMode="outlined"
                    elementAttr={{
                      style: {
                        backgroundColor: isReadOnly ? '#f3f4f6' : 'white'
                      }
                    }}
                  >
                    <Validator>
                      <RequiredRule message="Category is required" />
                    </Validator>
                  </SelectBox>
                  {validationErrors.category && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.category}</p>
                  )}
                </div>
                {/* Proposed Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proposed Date <span className="text-red-500">*</span>
                  </label>
                  <DateBox
                    value={proposedDate ? new Date(proposedDate) : null}
                    onValueChanged={(e) => {
                      const dateValue = e.value ? e.value.toISOString().split('T')[0] : '';
                      handleFieldChange('proposedDate', dateValue, setProposedDate);
                    }}
                    readOnly={isReadOnly}
                    disabled={isReadOnly}
                    type="date"
                    // restored clearer placeholder as requested
                    min={new Date()} // 🔑 Disable past dates

                    placeholder="dd-mm-yyyy"
                    stylingMode="outlined"
                    elementAttr={{
                      style: {
                        backgroundColor: isReadOnly ? '#f3f4f6' : 'white'
                      }
                    }}
                  >
                    <Validator>
                      <RequiredRule message="Proposed date is required" />
                    </Validator>
                  </DateBox>
                  {validationErrors.proposedDate && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.proposedDate}</p>
                  )}
                </div>

                {/* Assigned Editor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Editor <span className="text-red-500">*</span>
                  </label>
                  <SelectBox
                    dataSource={editors}
                    displayExpr="fullName"
                    valueExpr="userId"
                    value={assignedEditor}
                    onValueChanged={(e) => {
                      console.log('🔧 Editor selected:', e.value);
                      handleFieldChange('assignedEditor', e.value, setAssignedEditor);
                      setAssignedEditor(e.value);
                    }}
                    readOnly={isReadOnly}
                    disabled={isReadOnly}
                    placeholder="Select editor"
                    stylingMode="outlined"
                    elementAttr={{
                      style: {
                        backgroundColor: isReadOnly ? '#f3f4f6' : 'white'
                      }
                    }}
                  >
                    <Validator>
                      <RequiredRule message="Editor assignment is required" />
                    </Validator>
                  </SelectBox>
                  {validationErrors.assignedEditor && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.assignedEditor}</p>
                  )}
                </div>
              </div>
            </div>




          </div>
          {/* ✅ UPDATED: Buttons - Always show Save Draft when not submitted */}
          <div className="flex justify-between gap-3 mt-8">
            <Button
              text={hasSubmitted ? 'Close' : 'Cancel'}
              type="normal"
              stylingMode="outlined"
              onClick={onClose}
              elementAttr={{ style: { padding: '10px 24px', fontWeight: '500' } }}
            />

            <div className="flex gap-3">
              {/* ✅ Save Draft Button - secondary (outlined) */}
              {!hasSubmitted && (
                <Button
                  text={isAutoSaving ? 'Saving...' : 'Save Draft'}
                  type="normal"
                  stylingMode="outlined"
                  disabled={isAutoSaving || hasSubmitted}
                  onClick={handleSaveDraft}
                  elementAttr={{
                    style: {
                      padding: '10px 24px',
                      fontWeight: '500',
                      // neutral outlined look
                    }
                  }}
                />
              )}


              {/* ✅ Submit Button - primary action (contained) */}
              {!hasSubmitted && isComplete && (
                <Button
                  text={isSubmitting ? 'Submitting...' : 'Submit'}
                  type="default"
                  stylingMode="contained"
                  disabled={!isComplete || isAutoSaving || isSubmitting || hasSubmitted}
                  onClick={handleSubmit}
                  elementAttr={{
                    style: {
                      padding: '10px 24px',
                      fontWeight: '500',
                      backgroundColor: '#2563eb',
                      borderColor: '#2563eb',
                      color: '#ffffff'
                    }
                  }}
                />
              )}

              {/* ✅ Show disabled submit button when incomplete (for better UX) */}
              {!hasSubmitted && !isComplete && (
                <Button
                  text="Submit"
                  type="default"
                  stylingMode="contained"
                  disabled={true}
                  elementAttr={{
                    style: {
                      padding: '10px 24px',
                      fontWeight: '500',
                      backgroundColor: '#d1d5db',
                      borderColor: '#d1d5db',
                      color: '#6b7280'
                    },
                    title: 'Complete all required fields to submit'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    />
  );

}
