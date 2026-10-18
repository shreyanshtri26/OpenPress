import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, AlignLeft, CheckSquare, Circle, Star, Type, Mail, X, Send, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { AllStoriesHeader } from '../dashboard/all-stories/AllStoriesHeader';
import { AdminMobileSidebarToggle } from '../SideBar/AdminDashboardLayout';
import type {
  Survey,
  SurveyQuestion,
  SurveyOption,
  QuestionType,
  SurveyStatus,
  ValidationType,
  NumberValidationSubType,
  LengthValidationSubType,
  RegexValidationSubType,
  SelectionValidationSubType,
} from './SurveysManager';
import { QUESTION_TYPE_LABELS } from './SurveysManager';
import CustomButton from '../common/CustomButton';
// Scheduling (manual start/end date picking) is disabled — CustomCalendar was only used for that UI.
// import CustomCalendar from '../common/CustomCalendar';
import toast from 'react-hot-toast';

const ACCENT = '#000000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).substring(2, 10);

const QUESTION_TYPES: QuestionType[] = [
  'single_choice',
  'multiple_choice',
  'dropdown',
  'multiple_choice_grid',
  'checkbox_grid',
  'rating_scale',
  'short_text',
  'paragraph',
];

const NEEDS_OPTIONS = new Set<QuestionType>(['single_choice', 'multiple_choice', 'dropdown', 'multiple_choice_grid', 'checkbox_grid']);

function createEmptyQuestion(order: number): SurveyQuestion {
  return {
    questionId: `q_${genId()}`,
    order,
    type: 'single_choice',
    text: '',
    description: '',
    required: false,
    options: [
      { id: genId(), label: '' },
      { id: genId(), label: '' },
    ],
  };
}

function CheckboxControl({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-5 h-5 border border-black bg-white flex items-center justify-center flex-shrink-0"
      aria-pressed={checked}
      aria-label="Toggle option"
    >
      {checked ? <span className="text-xs leading-none">✓</span> : null}
    </button>
  );
}

function PreviewDropdown({ options }: { options?: SurveyOption[] }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const validOptions = (options ?? []).filter((opt) => opt.label && opt.label.trim().length > 0);
  const selectedOpt = validOptions.find((o) => o.id === selectedId);

  return (
    <div ref={wrapperRef} className="relative w-64 select-none">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-sm text-left flex items-center justify-between focus:outline-none hover:border-gray-400 transition-colors"
      >
        <span className={selectedOpt ? 'text-gray-900 font-medium truncate' : 'text-gray-500'}>
          {selectedOpt ? selectedOpt.label : 'Choose option'}
        </span>
        <span className="text-gray-400 text-xs ml-2">▼</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-300 rounded shadow-lg z-20 max-h-48 overflow-y-auto">
          {validOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 italic">No options defined</div>
          ) : (
            validOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSelectedId(opt.id);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-100 transition-colors ${
                  selectedId === opt.id ? 'bg-gray-100 font-medium text-black' : 'text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SurveyFormProps {
  survey?: Survey | null;
  onSave: (
    survey: Survey,
    inviteEmails: string[],
    emailConfig?: { subject?: string; body?: string }
  ) => void;
  onCancel: () => void;
  saving?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SurveyForm({ survey, onSave, onCancel, saving = false }: SurveyFormProps) {
  const isEdit = !!survey;
  const [step, setStep] = useState(1);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  // Step 1 — survey details
  const [title, setTitle] = useState(survey?.title ?? '');
  const [description, setDescription] = useState(survey?.description ?? '');
  // Scheduling disabled: start/end time are no longer user-editable (see handleSubmit),
  // so the state that used to back the Start/End Date & Time pickers has been removed.
  const [status, setStatus] = useState<SurveyStatus>(survey?.status ?? 'draft');
  const [maxResponses, setMaxResponses] = useState<number | ''>(survey?.maxResponses ?? '');
  const [collectEmails, setCollectEmails] = useState<boolean>(survey?.collectEmails ?? false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Step 2 — questions
  const [questions, setQuestions] = useState<SurveyQuestion[]>(
    survey?.questions?.length ? survey.questions : [createEmptyQuestion(1)]
  );

  // Invite emails & customizable invitation content
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState(
    survey?.title ? `Invitation to participate in survey: ${survey.title}` : ''
  );
  const [emailBody, setEmailBody] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailInputError, setEmailInputError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [excelImportStatus, setExcelImportStatus] = useState<string | null>(null);
  const excelFileInputRef = React.useRef<HTMLInputElement>(null);

  // Validation
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [openQuestionTypeDropdownId, setOpenQuestionTypeDropdownId] = useState<string | null>(null);

  const statusDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const questionTypeDropdownRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        showStatusDropdown &&
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(target)
      ) {
        setShowStatusDropdown(false);
      }
      if (openQuestionTypeDropdownId) {
        const activeDropdown = questionTypeDropdownRefs.current[openQuestionTypeDropdownId];
        if (activeDropdown && !activeDropdown.contains(target)) {
          setOpenQuestionTypeDropdownId(null);
        }
      }
    };

    if (showStatusDropdown || openQuestionTypeDropdownId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showStatusDropdown, openQuestionTypeDropdownId]);

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Survey title is required';
    // Scheduling disabled: start time is captured automatically at creation and there is
    // no end time (surveys are closed manually), so no date validation is needed here.
    if (maxResponses !== '') {
      const normalized = Number(maxResponses);
      if (!Number.isInteger(normalized) || normalized < 1) {
        errors.maxResponses = 'Max Responses must be a positive whole number';
      }
    }
    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => s + 1);
  };

  const STATUS_OPTIONS: SurveyStatus[] = ['draft', 'active', 'paused', 'closed'];
  // Once a survey has been published (any non-draft status) it can no longer be
  // reverted to a draft, so the "draft" option is hidden for published surveys.
  const isPublished = !!survey && survey.status !== 'draft';
  const availableStatusOptions = isPublished
    ? STATUS_OPTIONS.filter((option) => option !== 'draft')
    : STATUS_OPTIONS;

  // ── Question operations ───────────────────────────────────────────────────

  const addQuestion = () => {
    const newQ = createEmptyQuestion(questions.length + 1);
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionId(newQ.questionId);
  };

  const updateQuestion = (id: string, updates: Partial<SurveyQuestion>) => {
    const hasResponses = (survey?.totalResponses ?? 0) > 0 || (survey?.responses?.length ?? 0) > 0;
    if (updates.type && hasResponses && survey?.questions?.some((question) => question.questionId === id)) {
      return;
    }

    setQuestions((prev) =>
      prev.map((q) => {
        if (q.questionId !== id) return q;
        const updated = { ...q, ...updates };
        if (updates.type && !NEEDS_OPTIONS.has(updates.type)) {
          updated.options = undefined;
          updated.rows = undefined;
        }
        if (updates.type && NEEDS_OPTIONS.has(updates.type) && !q.options?.length) {
          updated.options = [
            { id: genId(), label: '' },
            { id: genId(), label: '' },
          ];
        }
        if ((updates.type === 'multiple_choice_grid' || updates.type === 'checkbox_grid') && !q.rows?.length) {
          updated.rows = [
            { id: genId(), label: '' },
            { id: genId(), label: '' },
          ];
        }
        if (updates.type) {
          if (updates.type === 'multiple_choice') {
            if (updated.validation && updated.validation.type !== 'selection_count') {
              updated.validation = {
                type: 'selection_count',
                subType: 'min_select',
                min: 1,
                errorMessage: 'Please select at least 1 option',
              };
            }
          } else if (updates.type === 'short_text' || updates.type === 'paragraph') {
            if (updated.validation && updated.validation.type === 'selection_count') {
              updated.validation = {
                type: 'email',
                errorMessage: 'Please enter a valid email address',
              };
            }
          } else {
            updated.validation = undefined;
          }
        }
        return updated;
      })
    );
  };

  const removeQuestion = (id: string) => {
    // Deleted questions are dropped outright — they are no longer archived or shown anywhere.
    setQuestions((prev) => {
      const filtered = prev.filter((q) => q.questionId !== id);
      if (activeQuestionId === id) setActiveQuestionId(filtered[0]?.questionId ?? null);
      return filtered.map((q, i) => ({ ...q, order: i + 1 }));
    });
  };

  const addOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.questionId === questionId
          ? { ...q, options: [...(q.options ?? []), { id: genId(), label: '' }] }
          : q
      )
    );
  };

  const updateOption = (questionId: string, optId: string, label: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.questionId === questionId
          ? { ...q, options: q.options?.map((o) => (o.id === optId ? { ...o, label } : o)) }
          : q
      )
    );
  };

  const removeOption = (questionId: string, optId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.questionId !== questionId) return q;
        const targetOpt = q.options?.find((o) => o.id === optId);
        const nextHistorical = targetOpt
          ? [...(q.historicalOptions ?? []), targetOpt]
          : q.historicalOptions;
        return {
          ...q,
          options: q.options?.filter((o) => o.id !== optId),
          historicalOptions: nextHistorical,
        };
      })
    );
  };

  const addRow = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.questionId === questionId
          ? { ...q, rows: [...(q.rows ?? []), { id: genId(), label: '' }] }
          : q
      )
    );
  };

  const updateRow = (questionId: string, rowId: string, label: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.questionId === questionId
          ? { ...q, rows: q.rows?.map((r) => (r.id === rowId ? { ...r, label } : r)) }
          : q
      )
    );
  };

  const removeRow = (questionId: string, rowId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.questionId !== questionId) return q;
        const targetRow = q.rows?.find((r) => r.id === rowId);
        const nextHistorical = targetRow
          ? [...(q.historicalRows ?? []), targetRow]
          : q.historicalRows;
        return {
          ...q,
          rows: q.rows?.filter((r) => r.id !== rowId),
          historicalRows: nextHistorical,
        };
      })
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const validateQuestionsForPublish = (): boolean => {
    if (questions.length === 0) {
      toast.error('Add at least one question before publishing or saving');
      setStep(2);
      return false;
    }

    for (const q of questions) {
      if (!q.text.trim()) {
        toast.error('Question text cannot be blank');
        setStep(2);
        setActiveQuestionId(q.questionId);
        return false;
      }

      if (NEEDS_OPTIONS.has(q.type)) {
        const filledOptions = (q.options ?? []).filter((opt) => opt.label.trim().length > 0);
        if (q.type === 'multiple_choice_grid' || q.type === 'checkbox_grid') {
          const filledRows = (q.rows ?? []).filter((r) => r.label.trim().length > 0);
          if (filledRows.length < 1 || filledOptions.length < 1) {
            toast.error(`${q.type === 'multiple_choice_grid' ? 'Multiple choice' : 'Checkbox'} grid needs at least 1 row and 1 column`);
            setStep(2);
            setActiveQuestionId(q.questionId);
            return false;
          }
        } else if (filledOptions.length < 2) {
          toast.error('Multiple choice/Checkboxes need at least 2 filled options');
          setStep(2);
          setActiveQuestionId(q.questionId);
          return false;
        }
      }

      if (q.type === 'multiple_choice' && q.validation?.type === 'selection_count') {
        const { subType, min, max } = q.validation;
        const totalOptions = (q.options ?? []).filter((opt) => opt.label.trim().length > 0).length;

        if (subType === 'min_select' || subType === 'exact_select' || !subType) {
          if (min === undefined || min < 1) {
            toast.error(`Please specify a valid selection count (at least 1) for "${q.text || 'question'}"`);
            setStep(2);
            setActiveQuestionId(q.questionId);
            return false;
          }
          if (min > totalOptions) {
            toast.error(`Selection count (${min}) cannot exceed available options (${totalOptions}) for "${q.text || 'question'}"`);
            setStep(2);
            setActiveQuestionId(q.questionId);
            return false;
          }
        } else if (subType === 'max_select') {
          if (max === undefined || max < 1) {
            toast.error(`Please specify a valid maximum selection count (at least 1) for "${q.text || 'question'}"`);
            setStep(2);
            setActiveQuestionId(q.questionId);
            return false;
          }
        } else if (subType === 'between') {
          if (min === undefined || min < 1 || max === undefined || max < 1) {
            toast.error(`Please specify valid min and max selections for "${q.text || 'question'}"`);
            setStep(2);
            setActiveQuestionId(q.questionId);
            return false;
          }
          if (min > max) {
            toast.error(`Min selections (${min}) cannot be greater than max selections (${max}) for "${q.text || 'question'}"`);
            setStep(2);
            setActiveQuestionId(q.questionId);
            return false;
          }
        }
      }

      // Validate number validation for short_text and paragraph questions
      if ((q.type === 'short_text' || q.type === 'paragraph') && q.validation?.type === 'number') {
        const { subType, min, max } = q.validation;

        if (subType === 'greater_than') {
          if (min === undefined) {
            toast.error(`Please specify a min value for greater than validation on "${q.text || 'question'}"`);
            setStep(2);
            setActiveQuestionId(q.questionId);
            return false;
          }
        } else if (subType === 'less_than') {
          if (max === undefined) {
            toast.error(`Please specify a max value for less than validation on "${q.text || 'question'}"`);
            setStep(2);
            setActiveQuestionId(q.questionId);
            return false;
          }
        } else if (subType === 'between') {
          if (min === undefined || max === undefined) {
            toast.error(`Please specify both min and max values for number validation on "${q.text || 'question'}"`);
            setStep(2);
            setActiveQuestionId(q.questionId);
            return false;
          }

          if (min > max) {
            toast.error(`Min value (${min}) cannot be greater than max value (${max}) for "${q.text || 'question'}"`);
            setStep(2);
            setActiveQuestionId(q.questionId);
            return false;
          }
        }
      }

      // Validate length validation for short_text and paragraph questions
      if ((q.type === 'short_text' || q.type === 'paragraph') && q.validation?.type === 'length') {
        const { min, max } = q.validation;

        if (min !== undefined && max !== undefined && min > max) {
          toast.error(`Min character count (${min}) cannot be greater than max character count (${max}) for "${q.text || 'question'}"`);
          setStep(2);
          setActiveQuestionId(q.questionId);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = (publishStatus?: SurveyStatus) => {
    if ((publishStatus === 'active' || publishStatus === 'paused') && !validateQuestionsForPublish()) {
      return;
    }

    const finalSurvey: Survey = {
      surveyId: survey?.surveyId ?? `survey_${genId()}`,
      title: title.trim(),
      description: description.trim(),
      status: publishStatus ?? status,
      targetType: 'global',
      targetValues: [],
      // Scheduling disabled: start time is captured automatically at creation (not user-chosen),
      // and there is no end time — surveys are closed manually instead.
      startTime: survey?.startTime || new Date().toISOString(),
      endTime:
        (publishStatus ?? status) === 'closed'
          ? (survey?.status === 'closed' && survey.endTime) || new Date().toISOString()
          : '',
      maxResponses: maxResponses === '' ? null : Number(maxResponses),
      collectEmails,
      createdAt: survey?.createdAt ?? new Date().toISOString(),
      questions: questions.map((q, i) => ({ ...q, order: i + 1 })),
      totalResponses: Math.max(survey?.totalResponses ?? 0, survey?.responses?.length ?? 0),
      responses: survey?.responses ?? [],
      questionResults: survey?.questionResults ?? {},
    };
    // Only pass invite emails and custom email content on active publish
    onSave(
      finalSurvey,
      publishStatus === 'active' ? inviteEmails : [],
      publishStatus === 'active' && inviteEmails.length > 0
        ? {
            subject: emailSubject.trim() || undefined,
            body: emailBody.trim() || undefined,
          }
        : undefined
    );
  };

  // ── Email invite helpers ──────────────────────────────────────────────────

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const addInviteEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!EMAIL_RE.test(trimmed)) {
      setEmailInputError('Please enter a valid email address');
      return;
    }
    if (inviteEmails.includes(trimmed)) {
      setEmailInputError('This email has already been added');
      return;
    }
    setInviteEmails((prev) => [...prev, trimmed]);
    setEmailInput('');
    setEmailInputError('');
  };

  const removeInviteEmail = (email: string) => {
    setInviteEmails((prev) => prev.filter((e) => e !== email));
  };

  const parseExcelFile = async (file: File): Promise<void> => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error('Please drop an Excel (.xlsx, .xls) or CSV (.csv) file');
      return;
    }
    try {
      const { read, utils } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = read(new Uint8Array(buffer), { type: 'array' });
      const found: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const rows = utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1 });
        for (const row of rows) {
          for (const cell of row as unknown[]) {
            const val = String(cell ?? '').trim().toLowerCase();
            if (EMAIL_RE.test(val)) found.push(val);
          }
        }
      }
      if (found.length === 0) {
        toast.error('No email addresses found in the file');
        return;
      }
      setInviteEmails((prev) => {
        const existing = new Set(prev);
        const newEmails = found.filter((e) => !existing.has(e));
        if (newEmails.length === 0) {
          toast('All emails from the file are already added');
          return prev;
        }
        setExcelImportStatus(
          `Imported ${newEmails.length} email${newEmails.length !== 1 ? 's' : ''} from "${file.name}"`
        );
        return [...prev, ...newEmails];
      });
    } catch (err) {
      console.error('Failed to parse file:', err);
      toast.error('Could not read the file. Make sure it is a valid .xlsx, .xls or .csv.');
    }
  };

  // ── Step indicator ────────────────────────────────────────────────────────

  const STEPS = ['Details', 'Questions', 'Preview'];

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 font-libre">
      <style>
        {`
          .survey-dropdown-item:hover {
            background-color: #f9fafb !important;
          }
          .survey-dropdown-item.selected {
            background-color: #f3f4f6 !important;
            font-weight: 500 !important;
          }
        `}
      </style>
      {/* Header bar — back button only */}
      <AllStoriesHeader onBack={onCancel} />

      {/* Share button strip — only on step 3, right-aligned below header */}
      {step === 3 && (
        <div className="flex justify-end px-4 sm:px-6 py-2">
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 border border-black rounded text-sm font-medium text-black hover:bg-gray-50 transition-colors"
          >
            <Send size={14} />
            Share
            {inviteEmails.length > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-black text-white text-[10px] flex items-center justify-center leading-none">
                {inviteEmails.length}
              </span>
            )}
          </button>
        </div>
      )}

      <div className="flex-1 -mt-4 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="mb-2 md:hidden">
            <AdminMobileSidebarToggle className="border border-gray-300" />
          </div>

          {/* ── Step progress bar ────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {STEPS.map((label, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === step;
              const isDone = stepNum < step;
              return (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                      style={{
                        backgroundColor: isActive || isDone ? ACCENT : '#D1D5DB',
                        color: 'white',
                      }}
                    >
                      {isDone ? '✓' : stepNum}
                    </div>
                    <span
                      className="text-sm font-medium hidden sm:block"
                      style={{ color: isActive ? ACCENT : '#6B7280' }}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="h-0.5 w-12"
                      style={{ backgroundColor: isDone ? ACCENT : '#D1D5DB' }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* ─── Step 1: Survey Details ─────────────────────────────────────── */}
          {step === 1 && (
            <>
              {/* Title card */}
              <div className="bg-white border border-gray-200 shadow-md overflow-hidden">
                <div className="h-2 w-full" style={{ backgroundColor: ACCENT }} />
                <div className="p-6 space-y-4">
                  <div>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Form title"
                      className="w-full text-2xl font-normal border-0 border-b-2 focus:outline-none pb-1 bg-transparent transition-colors"
                      style={{
                        borderBottomColor: step1Errors.title ? '#E53E3E' : '#E2E8F0',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderBottomColor = ACCENT)}
                      onBlur={(e) =>
                        (e.currentTarget.style.borderBottomColor = step1Errors.title
                          ? '#E53E3E'
                          : '#E2E8F0')
                      }
                    />
                    {step1Errors.title && (
                      <p className="text-red-500 text-xs mt-1">{step1Errors.title}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Form description (optional)"
                      className="w-full text-sm border-0 border-b focus:outline-none pb-1 bg-transparent transition-colors text-gray-600"
                      style={{ borderBottomColor: '#E2E8F0' }}
                      onFocus={(e) => (e.currentTarget.style.borderBottomColor = ACCENT)}
                      onBlur={(e) => (e.currentTarget.style.borderBottomColor = '#E2E8F0')}
                    />
                  </div>
                </div>
              </div>

              {/* Settings card */}
              <div className="bg-white border border-gray-200 p-6 space-y-5">
                <h3
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: ACCENT }}
                >
                  Schedule &amp; Settings
                </h3>

                {/*
                  Scheduling disabled: surveys can only be created directly as draft/active/
                  paused/closed. Start time is captured automatically at creation and there is
                  no end time (surveys are closed manually), so the Start/End Date & Time
                  pickers that used to live here have been removed.
                */}

                {/* Status + Max responses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <div className="relative" ref={statusDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowStatusDropdown((v) => !v)}
                        className="w-full border border-black bg-white px-4 py-2.5 flex items-center justify-between text-sm text-left"
                      >
                        <span className="capitalize">{status.replace('_', ' ')}</span>
                        <span className="text-gray-400">▼</span>
                      </button>
                      {showStatusDropdown && (
                        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-black shadow-lg z-20 max-h-56 overflow-y-auto">
                          {availableStatusOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              className={`survey-dropdown-item w-full px-4 py-2.5 text-left text-sm capitalize ${
                                status === option ? 'selected' : ''
                              }`}
                              onClick={() => {
                                setStatus(option);
                                setShowStatusDropdown(false);
                              }}
                            >
                              {option.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Responses
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={maxResponses}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setMaxResponses(nextValue === '' ? '' : Number(nextValue));
                        if (step1Errors.maxResponses) {
                          setStep1Errors((prev) => {
                            const { maxResponses: _maxResponses, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      placeholder="Unlimited"
                      className={`w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 ${
                        step1Errors.maxResponses
                          ? 'border-red-400 focus:ring-red-200'
                          : 'border-gray-300 focus:ring-gray-200'
                      }`}
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave empty for unlimited</p>
                    {step1Errors.maxResponses && (
                      <p className="text-red-500 text-xs mt-1">{step1Errors.maxResponses}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCollectEmails((v) => !v)}
                    className="w-5 h-5 border border-black bg-white flex items-center justify-center flex-shrink-0"
                    aria-pressed={collectEmails}
                  >
                    {collectEmails ? <span className="text-xs leading-none">✓</span> : null}
                  </button>
                  <label
                    className="text-sm font-medium text-gray-700 cursor-pointer select-none"
                    onClick={() => setCollectEmails((v) => !v)}
                  >
                    Require and collect respondent email addresses
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <CustomButton
                    onClick={goNext}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium"
                  >
                    Next: Add Questions <ChevronRight size={16} />
                  </CustomButton>
                </div>
              </div>
            </>
          )}

          {/* ─── Step 2: Questions Builder ──────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-3">
              {/* Title preview */}
              <div className="bg-white border border-gray-200 shadow-md overflow-hidden">
                <div className="h-2 w-full" style={{ backgroundColor: ACCENT }} />
                <div className="px-6 py-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {title || 'Untitled Form'}
                  </h2>
                  {description && (
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                  )}
                </div>
              </div>

              {/* Question cards */}
              {questions.map((q, idx) => {
                const isActive = activeQuestionId === q.questionId;
                const isQuestionTypeLocked =
                  ((survey?.totalResponses ?? 0) > 0 || (survey?.responses?.length ?? 0) > 0) &&
                  !!survey?.questions?.some((question) => question.questionId === q.questionId);
                return (
                  <div
                    key={q.questionId}
                    onClick={() => setActiveQuestionId(q.questionId)}
                    className="bg-white border border-gray-200 shadow-md overflow-visible cursor-pointer transition-shadow hover:shadow-lg"
                    style={{
                      borderLeft: `4px solid ${isActive ? ACCENT : 'transparent'}`,
                    }}
                  >
                    <div className="p-5 space-y-4">
                      {/* Question header row */}
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-medium text-gray-400 mt-2.5 w-5 flex-shrink-0">
                          {idx + 1}.
                        </span>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={q.text}
                            onChange={(e) =>
                              updateQuestion(q.questionId, { text: e.target.value })
                            }
                            placeholder="Question"
                            className="w-full text-base border-0 border-b-2 border-gray-200 focus:outline-none pb-1 bg-transparent transition-colors"
                            onFocus={(e) => {
                              setActiveQuestionId(q.questionId);
                              e.currentTarget.style.borderBottomColor = ACCENT;
                            }}
                            onBlur={(e) =>
                              (e.currentTarget.style.borderBottomColor = '#E5E7EB')
                            }
                          />
                          <input
                            type="text"
                            value={q.description ?? ''}
                            onChange={(e) =>
                              updateQuestion(q.questionId, { description: e.target.value })
                            }
                            placeholder="Description / subtitle (optional)"
                            className="w-full text-xs border-0 border-b border-gray-200 focus:outline-none pb-1 bg-transparent transition-colors text-gray-500"
                            onFocus={(e) => {
                              setActiveQuestionId(q.questionId);
                              e.currentTarget.style.borderBottomColor = ACCENT;
                            }}
                            onBlur={(e) =>
                              (e.currentTarget.style.borderBottomColor = '#E5E7EB')
                            }
                          />
                        </div>
                        <div
                          className="flex-shrink-0 relative"
                          ref={(el) => {
                            questionTypeDropdownRefs.current[q.questionId] = el;
                          }}
                        >
                          <button
                            type="button"
                            disabled={isQuestionTypeLocked}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isQuestionTypeLocked) return;
                              setOpenQuestionTypeDropdownId((current) =>
                                current === q.questionId ? null : q.questionId
                              );
                            }}
                            title={isQuestionTypeLocked ? 'Question type cannot be changed after responses have been submitted' : undefined}
                            className={`min-w-[132px] border border-black bg-white px-3 py-1.5 text-xs text-left flex items-center justify-between ${isQuestionTypeLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                          >
                            <span>{QUESTION_TYPE_LABELS[q.type]}</span>
                            <span className="text-gray-400">▼</span>
                          </button>

                          {!isQuestionTypeLocked && openQuestionTypeDropdownId === q.questionId && (
                            <div className="absolute top-full mt-1 right-0 min-w-[160px] bg-white border border-black shadow-lg z-20 max-h-56 overflow-y-auto">
                              {QUESTION_TYPES.map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuestion(q.questionId, { type: t });
                                    setOpenQuestionTypeDropdownId(null);
                                  }}
                                  className={`survey-dropdown-item w-full px-3 py-2 text-left text-xs ${
                                    q.type === t ? 'selected' : ''
                                  }`}
                                >
                                  {QUESTION_TYPE_LABELS[t]}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Options editor for choice types */}
                      {NEEDS_OPTIONS.has(q.type) && q.type !== 'multiple_choice_grid' && q.type !== 'checkbox_grid' && (
                        <div className="space-y-2 ml-8">
                          {(q.options ?? []).map((opt, oi) => (
                            <div key={opt.id} className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 flex-shrink-0 border-2 border-gray-400 flex items-center justify-center text-xs"
                                style={{
                                  borderRadius: q.type === 'multiple_choice' ? '3px' : '50%',
                                }}
                              >
                                {q.type === 'dropdown' ? oi + 1 : ''}
                              </div>
                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) =>
                                  updateOption(q.questionId, opt.id, e.target.value)
                                }
                                placeholder={`Option ${oi + 1}`}
                                className="flex-1 text-sm border-0 border-b border-gray-200 focus:outline-none pb-0.5 bg-transparent focus:border-gray-800 transition-colors"
                              />
                              {(q.options ?? []).length > 2 && (
                                <button
                                  onClick={() => removeOption(q.questionId, opt.id)}
                                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => addOption(q.questionId)}
                            disabled={saving}
                            className="flex items-center gap-1 text-xs ml-7 mt-1 transition-colors"
                            style={{ color: ACCENT }}
                          >
                            <Plus size={12} /> Add option
                          </button>
                        </div>
                      )}

                      {/* Options editor for multiple_choice_grid and checkbox_grid */}
                      {(q.type === 'multiple_choice_grid' || q.type === 'checkbox_grid') && (
                        <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                          {/* Rows */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 mb-3">Rows</h4>
                            <div className="space-y-2">
                              {(q.rows ?? []).map((r, ri) => (
                                <div key={r.id} className="flex items-center gap-3">
                                  <span className="text-xs text-gray-400 w-4">{ri + 1}.</span>
                                  <input
                                    type="text"
                                    value={r.label}
                                    onChange={(e) =>
                                      updateRow(q.questionId, r.id, e.target.value)
                                    }
                                    placeholder={`Row ${ri + 1}`}
                                    className="flex-1 text-sm border-0 border-b border-gray-200 focus:outline-none pb-0.5 bg-transparent focus:border-gray-800 transition-colors"
                                  />
                                  {(q.rows ?? []).length > 1 && (
                                    <button
                                      onClick={() => removeRow(q.questionId, r.id)}
                                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                                    >
                                      <X size={13} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                onClick={() => addRow(q.questionId)}
                                disabled={saving}
                                className="flex items-center gap-1 text-xs ml-7 mt-2 transition-colors"
                                style={{ color: ACCENT }}
                              >
                                <Plus size={12} /> Add row
                              </button>
                            </div>
                          </div>
                          {/* Columns */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 mb-3">Columns</h4>
                            <div className="space-y-2">
                              {(q.options ?? []).map((opt, oi) => (
                                <div key={opt.id} className="flex items-center gap-3">
                                  <div className="w-4 h-4 flex-shrink-0 border-2 border-gray-400 rounded-full" />
                                  <input
                                    type="text"
                                    value={opt.label}
                                    onChange={(e) =>
                                      updateOption(q.questionId, opt.id, e.target.value)
                                    }
                                    placeholder={`Column ${oi + 1}`}
                                    className="flex-1 text-sm border-0 border-b border-gray-200 focus:outline-none pb-0.5 bg-transparent focus:border-gray-800 transition-colors"
                                  />
                                  {(q.options ?? []).length > 1 && (
                                    <button
                                      onClick={() => removeOption(q.questionId, opt.id)}
                                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                                    >
                                      <X size={13} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                onClick={() => addOption(q.questionId)}
                                disabled={saving}
                                className="flex items-center gap-1 text-xs ml-7 mt-2 transition-colors"
                                style={{ color: ACCENT }}
                              >
                                <Plus size={12} /> Add column
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Rating scale preview */}
                      {q.type === 'rating_scale' && (
                        <div className="ml-8 flex items-center gap-3">
                          <span className="text-xs text-gray-400">1</span>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <div
                                key={n}
                                className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-sm text-gray-400 font-medium"
                              >
                                {n}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">5</span>
                        </div>
                      )}

                      {/* Short text preview */}
                      {q.type === 'short_text' && (
                        <div className="ml-8">
                          <div
                            className="pb-0.5 text-xs text-gray-300 w-48"
                            style={{ borderBottom: '1px solid #D1D5DB' }}
                          >
                            Short answer text
                          </div>
                        </div>
                      )}

                      {/* Paragraph preview */}
                      {q.type === 'paragraph' && (
                        <div className="ml-8">
                          <div
                            className="pb-6 text-xs text-gray-300 w-full"
                            style={{ borderBottom: '1px solid #D1D5DB' }}
                          >
                            Long answer text
                          </div>
                        </div>
                      )}

                      {/* Response Validation Box */}
                      {q.validation && (q.type === 'short_text' || q.type === 'paragraph' || q.type === 'multiple_choice') && (
                        <div className="ml-8 mt-3 p-3 bg-gray-50 border border-gray-200 rounded-sm space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldAlert size={13} className="text-gray-500" />
                              Response Validation
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuestion(q.questionId, { validation: undefined })}
                              className="text-gray-400 hover:text-red-500 text-xs transition-colors p-1"
                              title="Remove validation rule"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {/* Checkbox (multiple_choice) validation options */}
                            {q.type === 'multiple_choice' && (
                              <>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Rule Type</label>
                                  <select
                                    value={q.validation.type}
                                    onChange={() => {
                                      updateQuestion(q.questionId, {
                                        validation: {
                                          type: 'selection_count',
                                          subType: 'min_select',
                                          min: 1,
                                          errorMessage: 'Please select at least 1 option',
                                        },
                                      });
                                    }}
                                    className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                  >
                                    <option value="selection_count">Selection count</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Condition</label>
                                  <select
                                    value={q.validation.subType || 'min_select'}
                                    onChange={(e) => {
                                      const subType = e.target.value as SelectionValidationSubType;
                                      let defaultMsg = '';
                                      if (subType === 'min_select') defaultMsg = `Please select at least ${q.validation?.min ?? 1} option${(q.validation?.min ?? 1) === 1 ? '' : 's'}`;
                                      else if (subType === 'max_select') defaultMsg = `Please select at most ${q.validation?.max ?? 2} option${(q.validation?.max ?? 2) === 1 ? '' : 's'}`;
                                      else if (subType === 'exact_select') defaultMsg = `Please select exactly ${q.validation?.min ?? 2} option${(q.validation?.min ?? 2) === 1 ? '' : 's'}`;
                                      else if (subType === 'between') defaultMsg = `Please select between ${q.validation?.min ?? 1} and ${q.validation?.max ?? 2} options`;

                                      updateQuestion(q.questionId, {
                                        validation: {
                                          ...q.validation!,
                                          subType,
                                          min: subType === 'max_select' ? undefined : (q.validation?.min ?? (subType === 'between' ? 1 : 1)),
                                          max: subType === 'min_select' || subType === 'exact_select' ? undefined : (q.validation?.max ?? 2),
                                          errorMessage: defaultMsg,
                                        },
                                      });
                                    }}
                                    className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                  >
                                    <option value="min_select">Select at least (Min)</option>
                                    <option value="max_select">Select at most (Max)</option>
                                    <option value="exact_select">Select exactly</option>
                                    <option value="between">Between (Min &amp; Max)</option>
                                  </select>
                                </div>

                                {(q.validation.subType === 'min_select' || q.validation.subType === 'exact_select' || !q.validation.subType) && (
                                  <div>
                                    <label className="block text-[11px] font-medium text-gray-500 mb-1">
                                      {q.validation.subType === 'exact_select' ? 'Exact Selections' : 'Min Selections'}
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={q.validation.min ?? ''}
                                      onChange={(e) =>
                                        updateQuestion(q.questionId, {
                                          validation: {
                                            ...q.validation!,
                                            min: e.target.value === '' ? undefined : Number(e.target.value),
                                          },
                                        })
                                      }
                                      placeholder="e.g. 1"
                                      className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                    />
                                  </div>
                                )}

                                {q.validation.subType === 'max_select' && (
                                  <div>
                                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Max Selections</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={q.validation.max ?? ''}
                                      onChange={(e) =>
                                        updateQuestion(q.questionId, {
                                          validation: {
                                            ...q.validation!,
                                            max: e.target.value === '' ? undefined : Number(e.target.value),
                                          },
                                        })
                                      }
                                      placeholder="e.g. 2"
                                      className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                    />
                                  </div>
                                )}

                                {q.validation.subType === 'between' && (
                                  <>
                                    <div>
                                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Min Selections</label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={q.validation.min ?? ''}
                                        onChange={(e) =>
                                          updateQuestion(q.questionId, {
                                            validation: {
                                              ...q.validation!,
                                              min: e.target.value === '' ? undefined : Number(e.target.value),
                                            },
                                          })
                                        }
                                        placeholder="e.g. 1"
                                        className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Max Selections</label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={q.validation.max ?? ''}
                                        onChange={(e) =>
                                          updateQuestion(q.questionId, {
                                            validation: {
                                              ...q.validation!,
                                              max: e.target.value === '' ? undefined : Number(e.target.value),
                                            },
                                          })
                                        }
                                        placeholder="e.g. 3"
                                        className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                      />
                                    </div>
                                  </>
                                )}
                              </>
                            )}

                            {/* Short text & Paragraph category / main type */}
                            {(q.type === 'short_text' || q.type === 'paragraph') && (
                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Rule Type</label>
                                <select
                                  value={q.validation.type}
                                  onChange={(e) => {
                                    const newType = e.target.value as ValidationType;
                                    let defaultSubType: any = undefined;
                                    let defaultMsg = '';
                                    if (newType === 'email') defaultMsg = 'Please enter a valid email address';
                                    else if (newType === 'phone') defaultMsg = 'Please enter a valid phone number';
                                    else if (newType === 'number') {
                                      defaultSubType = 'is_number';
                                      defaultMsg = 'Must be a valid number';
                                    } else if (newType === 'length') {
                                      defaultSubType = 'min_length';
                                      defaultMsg = 'Minimum character count not met';
                                    } else if (newType === 'regex') {
                                      defaultSubType = 'matches';
                                      defaultMsg = 'Must match the required format';
                                    }
                                    updateQuestion(q.questionId, {
                                      validation: {
                                        type: newType,
                                        subType: defaultSubType,
                                        errorMessage: defaultMsg,
                                        min: newType === 'length' ? 5 : undefined,
                                        regex: newType === 'regex' ? '' : undefined,
                                      },
                                    });
                                  }}
                                  className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                >
                                  <option value="email">Email format</option>
                                  <option value="phone">Phone number format</option>
                                  <option value="number">Number</option>
                                  <option value="length">Length / Character count</option>
                                  <option value="regex">Regular expression</option>
                                </select>
                              </div>
                            )}

                            {/* Sub-type / Operator */}
                            {(q.type === 'short_text' || q.type === 'paragraph') && q.validation.type === 'number' && (
                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Condition</label>
                                <select
                                  value={q.validation.subType || 'is_number'}
                                  onChange={(e) => {
                                    const subType = e.target.value as NumberValidationSubType;
                                    updateQuestion(q.questionId, {
                                      validation: {
                                        ...q.validation!,
                                        subType,
                                        min: subType === 'greater_than' || subType === 'between' ? (q.validation?.min ?? 0) : undefined,
                                        max: subType === 'less_than' || subType === 'between' ? (q.validation?.max ?? 100) : undefined,
                                      },
                                    });
                                  }}
                                  className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                >
                                  <option value="is_number">Is a number (numeric only)</option>
                                  <option value="greater_than">Greater than or equal to (Min)</option>
                                  <option value="less_than">Less than or equal to (Max)</option>
                                  <option value="between">Between (Min &amp; Max)</option>
                                </select>
                              </div>
                            )}

                            {(q.type === 'short_text' || q.type === 'paragraph') && q.validation.type === 'length' && (
                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Condition</label>
                                <select
                                  value={q.validation.subType || 'min_length'}
                                  onChange={(e) => {
                                    const subType = e.target.value as LengthValidationSubType;
                                    updateQuestion(q.questionId, {
                                      validation: {
                                        ...q.validation!,
                                        subType,
                                        min: subType === 'min_length' ? (q.validation?.min ?? 5) : undefined,
                                        max: subType === 'max_length' ? (q.validation?.max ?? 100) : undefined,
                                      },
                                    });
                                  }}
                                  className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                >
                                  <option value="min_length">Minimum character count</option>
                                  <option value="max_length">Maximum character count</option>
                                </select>
                              </div>
                            )}

                            {(q.type === 'short_text' || q.type === 'paragraph') && q.validation.type === 'regex' && (
                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Condition</label>
                                <select
                                  value={q.validation.subType || 'matches'}
                                  onChange={(e) => {
                                    const subType = e.target.value as RegexValidationSubType;
                                    updateQuestion(q.questionId, {
                                      validation: {
                                        ...q.validation!,
                                        subType,
                                      },
                                    });
                                  }}
                                  className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                >
                                  <option value="matches">Matches pattern</option>
                                  <option value="contains">Contains</option>
                                  <option value="not_contains">Doesn't contain</option>
                                </select>
                              </div>
                            )}

                            {/* Parameter inputs for text types */}
                            {(q.type === 'short_text' || q.type === 'paragraph') && q.validation.type === 'number' && (q.validation.subType === 'greater_than' || q.validation.subType === 'between') && (
                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Min Number</label>
                                <input
                                  type="number"
                                  value={q.validation.min ?? ''}
                                  onChange={(e) =>
                                    updateQuestion(q.questionId, {
                                      validation: {
                                        ...q.validation!,
                                        min: e.target.value === '' ? undefined : Number(e.target.value),
                                      },
                                    })
                                  }
                                  placeholder="e.g. 18"
                                  className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                />
                              </div>
                            )}

                            {(q.type === 'short_text' || q.type === 'paragraph') && q.validation.type === 'number' && (q.validation.subType === 'less_than' || q.validation.subType === 'between') && (
                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Max Number</label>
                                <input
                                  type="number"
                                  value={q.validation.max ?? ''}
                                  onChange={(e) =>
                                    updateQuestion(q.questionId, {
                                      validation: {
                                        ...q.validation!,
                                        max: e.target.value === '' ? undefined : Number(e.target.value),
                                      },
                                    })
                                  }
                                  placeholder="e.g. 100"
                                  className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                />
                              </div>
                            )}

                            {(q.type === 'short_text' || q.type === 'paragraph') && q.validation.type === 'length' && q.validation.subType === 'min_length' && (
                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Min Characters</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={q.validation.min ?? ''}
                                  onChange={(e) =>
                                    updateQuestion(q.questionId, {
                                      validation: {
                                        ...q.validation!,
                                        min: e.target.value === '' ? undefined : Number(e.target.value),
                                      },
                                    })
                                  }
                                  placeholder="e.g. 10"
                                  className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                />
                              </div>
                            )}

                            {(q.type === 'short_text' || q.type === 'paragraph') && q.validation.type === 'length' && q.validation.subType === 'max_length' && (
                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Max Characters</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={q.validation.max ?? ''}
                                  onChange={(e) =>
                                    updateQuestion(q.questionId, {
                                      validation: {
                                        ...q.validation!,
                                        max: e.target.value === '' ? undefined : Number(e.target.value),
                                      },
                                    })
                                  }
                                  placeholder="e.g. 500"
                                  className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                />
                              </div>
                            )}

                            {(q.type === 'short_text' || q.type === 'paragraph') && q.validation.type === 'regex' && (
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">
                                  {q.validation.subType === 'contains'
                                    ? 'Text to contain'
                                    : q.validation.subType === 'not_contains'
                                    ? 'Text not to contain'
                                    : 'Regular expression pattern'}
                                </label>
                                <input
                                  type="text"
                                  value={q.validation.regex ?? ''}
                                  onChange={(e) =>
                                    updateQuestion(q.questionId, {
                                      validation: {
                                        ...q.validation!,
                                        regex: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder={
                                    q.validation.subType === 'contains'
                                      ? 'e.g. https://'
                                      : q.validation.subType === 'not_contains'
                                      ? 'e.g. spam'
                                      : 'e.g. ^[A-Z]{3}-\\d{4}$'
                                  }
                                  className="w-full text-xs font-mono bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                                />
                              </div>
                            )}
                          </div>

                          {/* Custom error message input */}
                          <div className="pt-1">
                            <label className="block text-[11px] font-medium text-gray-500 mb-1">Custom error text</label>
                            <input
                              type="text"
                              value={q.validation.errorMessage ?? ''}
                              onChange={(e) =>
                                updateQuestion(q.questionId, {
                                  validation: {
                                    ...q.validation!,
                                    errorMessage: e.target.value,
                                  },
                                })
                              }
                              placeholder="Custom error message (e.g. Please select at most 2 options)"
                              className="w-full text-xs bg-white border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-black placeholder:text-gray-400"
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer: validation toggle + required toggle + delete (shown when active) */}
                      {isActive && (
                        <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100 mt-2">
                          <div>
                            {(q.type === 'short_text' || q.type === 'paragraph' || q.type === 'multiple_choice') && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (q.validation) {
                                    updateQuestion(q.questionId, { validation: undefined });
                                  } else {
                                    if (q.type === 'multiple_choice') {
                                      updateQuestion(q.questionId, {
                                        validation: {
                                          type: 'selection_count',
                                          subType: 'min_select',
                                          min: 1,
                                          errorMessage: 'Please select at least 1 option',
                                        },
                                      });
                                    } else {
                                      updateQuestion(q.questionId, {
                                        validation: {
                                          type: 'email',
                                          errorMessage: 'Please enter a valid email address',
                                        },
                                      });
                                    }
                                  }
                                }}
                                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors ${
                                  q.validation
                                    ? 'bg-black text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                <ShieldAlert size={13} />
                                {q.validation ? 'Validation enabled' : 'Response validation'}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeQuestion(q.questionId);
                              }}
                              disabled={questions.length === 1 || saving}
                              className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
                              title="Delete question"
                            >
                              <Trash2 size={16} />
                            </button>
                            <div className="w-px h-5 bg-gray-200" />
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                              <span>Required</span>
                              <CheckboxControl
                                checked={q.required}
                                onChange={() =>
                                  updateQuestion(q.questionId, { required: !q.required })
                                }
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add question */}
              <button
                onClick={addQuestion}
                disabled={saving}
                className="w-full bg-white border border-gray-200 py-3.5 text-sm flex items-center justify-center gap-2 transition-shadow hover:shadow-lg font-medium text-black"
              >
                <Plus size={18} /> Add Question
              </button>

              <div className="flex justify-between pt-2">
                <CustomButton
                  onClick={() => setStep(1)}
                  disabled={saving}
                  variant="white"
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium"
                >
                  <ChevronLeft size={16} /> Back
                </CustomButton>
                <CustomButton
                  onClick={goNext}
                  disabled={questions.length === 0 || saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium"
                >
                  Preview <ChevronRight size={16} />
                </CustomButton>
              </div>
            </div>
          )}

          {/* ─── Step 3: Preview & Publish ──────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">

              {/* ── Email Invite Modal ──────────────────────────────────────── */}
              {showInviteModal && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                  onClick={() => setShowInviteModal(false)}
                >
                  <div
                    className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden font-libre"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Modal header */}
                    <div className="px-6 py-3.5 flex items-center justify-between border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Mail size={15} style={{ color: '#111827' }} />
                        </div>
                        <div>
                          <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Send Email Invites</h2>
                          <p className="text-xs text-gray-500">Optional &mdash; customize subject, message, and recipients</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowInviteModal(false)}
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Modal body */}
                    <div className="px-6 py-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
                      <p className="text-xs text-gray-600">
                        Customize your invitation subject and message. When you click{' '}
                        <span className="font-medium text-gray-900">Publish Survey</span>, each
                        recipient will receive an invitation email with a direct link.
                      </p>

                      {/* Customizable Subject */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-700">Email Subject Line:</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>

                      {/* Customizable Body */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-700">Email Message Body:</label>
                        <textarea
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          rows={4}
                          className="w-full p-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-black resize-y"
                        />
                      </div>

                      {/* Excel / CSV drop zone */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOver(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) parseExcelFile(file);
                        }}
                        onClick={() => excelFileInputRef.current?.click()}
                        className="w-full max-w-sm mx-auto border-2 border-dashed rounded-lg py-3 px-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors select-none"
                        style={{
                          borderColor: isDragOver ? '#111827' : '#D1D5DB',
                          backgroundColor: isDragOver ? '#F9FAFB' : 'transparent',
                        }}
                      >
                        <FileSpreadsheet
                          size={24}
                          style={{ color: isDragOver ? '#111827' : '#9CA3AF' }}
                        />
                        <p className="text-xs font-medium text-gray-700 text-center">
                          {isDragOver ? 'Release to import emails' : 'Drop Excel or CSV file here'}
                        </p>
                        <span className="text-[11px] text-gray-500 underline underline-offset-2">
                          or click to browse
                        </span>
                        <p className="text-[10px] text-gray-400 text-center">
                          .xlsx &nbsp;·&nbsp; .xls &nbsp;·&nbsp; .csv &mdash; all email columns auto-detected
                        </p>
                        <input
                          ref={excelFileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) parseExcelFile(file);
                            e.target.value = '';
                          }}
                        />
                      </div>

                      {/* Import status feedback */}
                      {excelImportStatus && (
                        <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded px-2.5 py-1.5">
                          <span className="text-xs text-green-700">{excelImportStatus}</span>
                          <button
                            type="button"
                            onClick={() => setExcelImportStatus(null)}
                            className="text-green-400 hover:text-green-700"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400">or add manually</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>

                      {/* Input row */}
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => {
                              setEmailInput(e.target.value);
                              if (emailInputError) setEmailInputError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addInviteEmail();
                              }
                            }}
                            placeholder="name@example.com"
                            className={`flex-1 px-2.5 py-1.5 border text-xs focus:outline-none focus:ring-1 focus:ring-black ${
                              emailInputError
                                ? 'border-red-400 focus:ring-red-200'
                                : 'border-gray-300 focus:ring-gray-200'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={addInviteEmail}
                            className="px-3.5 py-1.5 bg-black text-white text-xs font-medium flex items-center gap-1.5 hover:bg-gray-800 transition-colors"
                          >
                            <Plus size={13} /> Add
                          </button>
                        </div>
                        {emailInputError && (
                          <p className="text-red-500 text-xs">{emailInputError}</p>
                        )}
                      </div>

                      {/* Email list */}
                      {inviteEmails.length > 0 ? (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {inviteEmails.map((email) => (
                            <div
                              key={email}
                              className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-xs"
                            >
                              <span className="text-gray-700 truncate">{email}</span>
                              <button
                                type="button"
                                onClick={() => removeInviteEmail(email)}
                                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                title="Remove"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                          <p className="text-[11px] text-gray-400 pt-0.5">
                            {inviteEmails.length} recipient{inviteEmails.length !== 1 ? 's' : ''} added
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No recipients added yet</p>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowInviteModal(false)}
                        className="w-full mt-1 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <p className="text-sm text-center text-gray-500">
                Preview how your survey looks to respondents
              </p>

              {/* Google Forms-style preview */}
              <div className="max-w-xl mx-auto space-y-3">
                {/* Title card */}
                <div className="bg-white border border-gray-200 shadow-md overflow-hidden">
                  <div className="h-2 w-full" style={{ backgroundColor: ACCENT }} />
                  <div className="p-6">
                    <h2 className="text-2xl font-normal text-gray-800">
                      {title || 'Untitled Form'}
                    </h2>
                    {description && (
                      <p className="text-sm text-gray-600 mt-2">{description}</p>
                    )}
                    <p className="text-xs text-red-500 mt-4">* Required</p>
                  </div>
                </div>

                {/* Question preview cards */}
                {questions.map((q, idx) => (
                  <div key={q.questionId} className="bg-white rounded-lg shadow-md p-5 space-y-3">
                    <p className="text-sm font-medium text-gray-800">
                      {q.text || `Question ${idx + 1}`}
                      {q.required && <span className="text-red-500 ml-1">*</span>}
                    </p>

                    {q.type === 'single_choice' &&
                      q.options?.map((opt) => (
                        <label
                          key={opt.id}
                          className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                        >
                          <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex-shrink-0" />
                          {opt.label || '—'}
                        </label>
                      ))}

                    {q.type === 'multiple_choice' &&
                      q.options?.map((opt) => (
                        <label
                          key={opt.id}
                          className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                        >
                          <div className="w-4 h-4 rounded border-2 border-gray-400 flex-shrink-0" />
                          {opt.label || '—'}
                        </label>
                      ))}
                    {q.type === 'dropdown' && (
                      <PreviewDropdown options={q.options} />
                    )}

                    {(q.type === 'multiple_choice_grid' || q.type === 'checkbox_grid') && (
                      <div className="overflow-x-auto mt-2">
                        <table className="w-full text-center border-collapse">
                          <thead>
                            <tr>
                              <th className="p-1 border-b border-gray-200"></th>
                              {(q.options ?? []).map((col) => (
                                <th key={col.id} className="p-1 font-medium text-xs text-gray-500 border-b border-gray-200">
                                  {col.label || '—'}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(q.rows ?? []).map((row, ri) => (
                              <tr key={row.id} className={ri % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                <td className="p-1.5 text-left text-xs text-gray-700 border-b border-gray-100 min-w-[100px]">
                                  {row.label || '—'}
                                </td>
                                {(q.options ?? []).map((col) => (
                                  <td key={col.id} className="p-1.5 border-b border-gray-100">
                                    <div
                                      className={`w-3.5 h-3.5 mx-auto border-2 border-gray-300 ${
                                        q.type === 'multiple_choice_grid' ? 'rounded-full' : 'rounded-sm'
                                      }`}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {q.type === 'rating_scale' && (
                      <div className="flex gap-3">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div
                            key={n}
                            className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-sm text-gray-500"
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'short_text' && (
                      <div
                        className="text-sm text-gray-300 w-64 pb-1"
                        style={{ borderBottom: '1px solid #D1D5DB' }}
                      >
                        Your answer
                      </div>
                    )}

                    {q.type === 'paragraph' && (
                      <div
                        className="text-sm text-gray-300 w-full pb-6"
                        style={{ borderBottom: '1px solid #D1D5DB' }}
                      >
                        Your answer
                      </div>
                    )}
                  </div>
                ))}

                {/* Submit button preview */}
                <div className="flex justify-center">
                  <button
                    disabled
                    className="text-white px-6 py-2 text-sm font-medium opacity-70 cursor-not-allowed bg-black"
                  >
                    Submit
                  </button>
                </div>
              </div>

              {/* Summary info */}
              <div className="bg-white border border-gray-200 p-5 max-w-xl mx-auto text-sm space-y-2">
                <h3 className="font-semibold text-gray-700 mb-3">Summary</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-gray-600">
                  <div>
                    <span className="font-medium">Status: </span>
                    <span className="capitalize">{status}</span>
                  </div>
                  <div>
                    <span className="font-medium">Start: </span>
                    {survey?.startTime ? new Date(survey.startTime).toLocaleString('en-IN') : 'Set automatically on creation'}
                  </div>
                  {/* End date scheduling disabled — surveys have no end time, they are paused/closed manually. */}
                  <div>
                    <span className="font-medium">Questions: </span>
                    {questions.length}
                  </div>
                  {maxResponses !== '' && (
                    <div>
                      <span className="font-medium">Max responses: </span>
                      {maxResponses}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 max-w-xl mx-auto">
                <CustomButton
                  onClick={() => setStep(2)}
                  disabled={saving}
                  variant="white"
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium"
                >
                  <ChevronLeft size={16} /> Edit Questions
                </CustomButton>
                <div className="flex gap-3">
                  {!isPublished && (
                    <CustomButton
                      onClick={() => handleSubmit('draft')}
                      disabled={saving}
                      variant="white"
                      className="px-5 py-2 text-sm font-medium"
                    >
                      {saving ? 'Saving...' : 'Save as Draft'}
                    </CustomButton>
                  )}
                  {isPublished ? (
                    <CustomButton
                      onClick={() => handleSubmit(status)}
                      disabled={saving}
                      className="px-5 py-2 text-sm font-medium"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </CustomButton>
                  ) : (
                    <CustomButton
                      onClick={() => handleSubmit('active')}
                      disabled={saving}
                      className="px-5 py-2 text-sm font-medium"
                    >
                      {saving ? 'Publishing...' : 'Publish Survey'}
                    </CustomButton>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Scheduling disabled: these helpers only existed to back the Start/End Date & Time pickers.
// function toDateFromLocalDateTime(value: string): Date | null {
//   if (!value) return null;
//   const parsed = new Date(value);
//   return Number.isNaN(parsed.getTime()) ? null : parsed;
// }
//
// function toLocalDateTimeString(value: Date | null): string {
//   if (!value || Number.isNaN(value.getTime())) return '';
//   const year = value.getFullYear();
//   const month = String(value.getMonth() + 1).padStart(2, '0');
//   const day = String(value.getDate()).padStart(2, '0');
//   const hours = String(value.getHours()).padStart(2, '0');
//   const minutes = String(value.getMinutes()).padStart(2, '0');
//   return `${year}-${month}-${day}T${hours}:${minutes}`;
// }

