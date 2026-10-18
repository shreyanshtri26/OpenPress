import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import DataGrid, {
    Column,
    ColumnChooser,
    Export,
    FilterRow,
    Grouping,
    GroupPanel,
    HeaderFilter,
    Pager,
    Paging,
    Selection,
    FilterPanel,
    FilterBuilderPopup,
} from '@/components/ui/dx/data-grid';
import { exportDataGrid as exportDataGridXLSX } from '@/components/ui/dx/excel-exporter';
import { exportDataGrid as exportDataGridPDF } from '@/components/ui/dx/pdf-exporter';
import { Workbook } from 'exceljs';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { BarChart2, Edit2, Eye, Link2, Pause, Play, Plus, Trash2, X, Copy, Check, FileSpreadsheet } from 'lucide-react';
import { AdminMobileSidebarToggle } from '../SideBar/AdminDashboardLayout';
import { AllStoriesHeader } from '../dashboard/all-stories/AllStoriesHeader';
import { useRouter } from '../../hooks/useRouter';
import toast from 'react-hot-toast';
import SurveyForm from './SurveyForm';
import SurveyResults from './SurveyResults';
import CustomButton from '../common/CustomButton';
import { UserContext } from '../../context/UserContext';
import {
  createSurveyRequest,
  deleteSurveyRequest,
  fetchSurveys,
  publishSurveyPage,
  sendSurveyInvites,
  updateSurveyRequest,
} from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'multiple_choice_grid'
  | 'checkbox_grid'
  | 'rating_scale'
  | 'short_text'
  | 'paragraph';

// Shared user-facing labels for question types. Used by both the survey editor
// and the results page so the displayed label always matches what was selected.
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Multiple choice',
  multiple_choice: 'Checkboxes',
  dropdown: 'Dropdown',
  multiple_choice_grid: 'Multiple choice grid',
  checkbox_grid: 'Checkbox grid',
  rating_scale: 'Linear scale',
  short_text: 'Short answer',
  paragraph: 'Paragraph',
};

// 'scheduled' is a client-derived display status (see resolveSurveyStatus in api.ts) for an
// active survey whose startTime hasn't arrived yet — it is never persisted directly.
export type SurveyStatus = 'draft' | 'active' | 'paused' | 'closed' | 'scheduled';

export interface SurveyOption {
  id: string;
  label: string;
}

export type ValidationType = 'email' | 'phone' | 'number' | 'length' | 'regex' | 'selection_count';

export type NumberValidationSubType = 'is_number' | 'greater_than' | 'less_than' | 'between';
export type LengthValidationSubType = 'min_length' | 'max_length';
export type RegexValidationSubType = 'matches' | 'contains' | 'not_contains';
export type SelectionValidationSubType = 'min_select' | 'max_select' | 'exact_select' | 'between';

export interface QuestionValidation {
  type: ValidationType;
  subType?: NumberValidationSubType | LengthValidationSubType | RegexValidationSubType | SelectionValidationSubType;
  min?: number;
  max?: number;
  regex?: string;
  errorMessage?: string;
}

export interface SurveyQuestion {
  questionId: string;
  order: number;
  type: QuestionType;
  text: string;
  description?: string;
  required: boolean;
  options?: SurveyOption[];
  rows?: SurveyOption[];
  historicalOptions?: SurveyOption[];
  historicalRows?: SurveyOption[];
  validation?: QuestionValidation;
}

export interface SurveyChoiceResult {
  label: string;
  count: number;
  percentage: number;
}

export interface SurveyRatingResult {
  avg: number;
  distribution: Array<{ score: number; count: number }>;
}

export interface SurveyQuestionResult {
  answerCount?: number;
  choiceResults?: SurveyChoiceResult[];
  ratingResults?: SurveyRatingResult;
  textResponses?: string[];
  gridResults?: { rowId: string; rowLabel: string; choiceResults: SurveyChoiceResult[] }[];
}

export interface SurveyAIResponseSummary {
  summary: string;
  generatedAt: string;
  responseCount: number;
}

export interface Survey {
  surveyId: string;
  title: string;
  description: string;
  status: SurveyStatus;
  targetType: 'global' | 'category' | 'article';
  targetValues: string[];
  startTime: string;
  endTime: string;
  maxResponses: number | null;
  collectEmails?: boolean;
  createdAt: string;
  questions: SurveyQuestion[];
  totalResponses: number;
  publishedUrl?: string;
  completionRate?: number | null;
  invitedEmails?: string[];
  responses?: any[];
  questionResults?: Record<string, SurveyQuestionResult>;
  aiResponseSummary?: SurveyAIResponseSummary;
}

// ─── Share Link Modal ─────────────────────────────────────────────────────────

function ShareLinkModal({
  survey,
  token,
  onClose,
  onSurveyUpdated,
}: {
  survey: Survey;
  token: string | null;
  onClose: () => void;
  onSurveyUpdated?: (survey: Survey) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'invite'>('link');
  const [emailText, setEmailText] = useState('');
  const [emailSubject, setEmailSubject] = useState(
    `Invitation to participate in survey: ${survey.title || 'New Survey'}`
  );
  const [emailBody, setEmailBody] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [excelImportStatus, setExcelImportStatus] = useState<string | null>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const shareUrl = survey.publishedUrl || '';

  const isUpcoming =
    survey.startTime &&
    !Number.isNaN(new Date(survey.startTime).getTime()) &&
    new Date(survey.startTime) > new Date();

  const formattedStart = survey.startTime
    ? new Date(survey.startTime).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

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
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
      const existing = new Set(
        emailText
          .split(/[\n,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
      );
      const newEmails = found.filter((e) => !existing.has(e));
      if (newEmails.length === 0) {
        toast('All emails from the file are already added');
        return;
      }
      setExcelImportStatus(
        `Imported ${newEmails.length} email${newEmails.length !== 1 ? 's' : ''} from "${file.name}"`
      );
      setEmailText((prevText) => {
        const trimmed = prevText.trim();
        const joined = newEmails.join(', ');
        return trimmed ? `${trimmed}, ${joined}` : joined;
      });
    } catch (err) {
      console.error('Failed to parse file:', err);
      toast.error('Could not read the file. Make sure it is a valid .xlsx, .xls or .csv.');
    }
  };

  const handleCopy = async () => {
    if (isUpcoming) {
      toast.error(`Survey link cannot be shared until start time (${formattedStart})`);
      return;
    }
    if (!shareUrl) {
      toast.error('Share URL is not ready yet');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleSendMoreInvites = async () => {
    if (!shareUrl) {
      toast.error('Survey link is not published yet');
      return;
    }
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const parsedEmails = emailText
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => EMAIL_RE.test(e));

    if (parsedEmails.length === 0) {
      toast.error('Please enter at least one valid email address');
      return;
    }

    setSendingInvites(true);
    try {
      const res = await sendSurveyInvites(
        {
          emails: parsedEmails,
          surveyUrl: shareUrl,
          surveyTitle: survey.title,
          surveyId: survey.surveyId,
          subject: emailSubject.trim() || undefined,
          body: emailBody.trim() || undefined,
        },
        token
      );
      toast.success(`Survey link sent to ${res.sent} recipient${res.sent !== 1 ? 's' : ''}`);
      setEmailText('');
      const existingInvited = Array.isArray(survey.invitedEmails) ? survey.invitedEmails : [];
      const updatedSurvey = {
        ...survey,
        invitedEmails: [...new Set([...existingInvited, ...parsedEmails])],
      };
      if (onSurveyUpdated) onSurveyUpdated(updatedSurvey);
    } catch (err) {
      console.error('Failed to send invites:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send invite emails');
    } finally {
      setSendingInvites(false);
    }
  };

  const handlePreview = async () => {
    try {
      const { generateSurveyPageHtml } = await import('../../helpers/generateSurveyPageHtml');
      const html = generateSurveyPageHtml(survey);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Revoke after short delay so the tab has time to load
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      toast.error('Failed to generate preview');
    }
  };

  const totalInvitedCount = (survey.invitedEmails || []).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className={`bg-white border border-gray-200 rounded-xl shadow-2xl w-full overflow-hidden font-libre transition-all duration-200 ${
          activeTab === 'invite' ? 'max-w-2xl' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-3.5 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#F3F4F6' }}
            >
              <Link2 size={15} style={{ color: '#111827' }} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Share Survey</h2>
              <p className="text-xs text-gray-500">{survey.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 text-center transition-colors ${
              activeTab === 'link'
                ? 'bg-white text-gray-900 border-b-2 border-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Share Link
          </button>
          <button
            onClick={() => setActiveTab('invite')}
            className={`flex-1 py-2 text-center transition-colors ${
              activeTab === 'invite'
                ? 'bg-white text-gray-900 border-b-2 border-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Send Email Invites {totalInvitedCount > 0 ? `(${totalInvitedCount})` : ''}
          </button>
        </div>

        <div className={`px-6 space-y-3 ${activeTab === 'invite' ? 'py-3.5 max-h-[80vh] overflow-y-auto' : 'py-5 space-y-4'}`}>
          {activeTab === 'link' ? (
            <>
              {isUpcoming ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">Survey not started yet</p>
                  <p>
                    The share link will become available once the survey starts on{' '}
                    <strong>{formattedStart}</strong>.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Share this link directly or embed it so readers can fill out the survey.
                </p>
              )}

              {/* Link box */}
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <span className="flex-1 text-xs text-gray-700 truncate select-all font-mono">
                  {isUpcoming
                    ? `Link available on ${formattedStart}`
                    : shareUrl || 'Publish to generate share URL'}
                </span>
                {!isUpcoming && (
                  <button
                    onClick={handleCopy}
                    disabled={!shareUrl}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md text-white transition-colors flex-shrink-0"
                    style={{
                      backgroundColor: copied ? '#16a34a' : shareUrl ? '#111827' : '#9ca3af',
                    }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-400">
                Make sure the survey is <span className="font-medium text-green-600">Active</span> before sharing.
              </p>

              {/* Preview button */}
              <button
                onClick={handlePreview}
                className="w-full flex items-center justify-center gap-2 border border-black rounded-md py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
              >
                <Eye size={14} /> Preview Page (S3 HTML)
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-600">
                Send email invitations to recipients. Responses matching these emails will count toward the survey completion rate.
              </p>

              {totalInvitedCount > 0 && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  Currently <strong>{totalInvitedCount}</strong> recipient{totalInvitedCount !== 1 ? 's' : ''} invited. Adding more emails will increase your total invited pool.
                </div>
              )}

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
                className="w-full max-w-sm mx-auto border-2 border-dashed rounded-lg py-4 px-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors select-none"
                style={{
                  borderColor: isDragOver ? '#111827' : '#D1D5DB',
                  backgroundColor: isDragOver ? '#F9FAFB' : 'transparent',
                }}
              >
                <FileSpreadsheet
                  size={26}
                  style={{ color: isDragOver ? '#111827' : '#9CA3AF' }}
                />
                <p className="text-xs font-medium text-gray-700 text-center">
                  {isDragOver ? 'Release to import emails' : 'Drop Excel or CSV file here'}
                </p>
                <span className="text-[11px] text-gray-500 underline underline-offset-2">
                  or click to browse
                </span>
                <p className="text-[10px] text-gray-400 text-center">
                  .xlsx &nbsp;·&nbsp; .xls &nbsp;·&nbsp; .csv &mdash; auto-detects email columns
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
                <span className="text-xs text-gray-400">or enter manually</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Recipient emails (separated by commas or new lines):
                </label>
                <textarea
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  placeholder="user1@example.com, user2@example.com"
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <CustomButton
                onClick={handleSendMoreInvites}
                disabled={sendingInvites || !shareUrl}
                className="w-full py-1.5 text-xs font-semibold"
              >
                {sendingInvites ? 'Sending Invites...' : 'Send Email Invites'}
              </CustomButton>
            </>
          )}

          <CustomButton
            onClick={onClose}
            variant="white"
            className="w-full py-1.5 text-xs font-medium"
          >
            Done
          </CustomButton>
        </div>
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<SurveyStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  paused: 'bg-orange-100 text-orange-800',
  closed: 'bg-red-100 text-red-800',
};

const STATUS_LOOKUP_DATA = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
];

function StatusBadge({ status }: { status: SurveyStatus }) {
  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded uppercase ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {status}
    </span>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['all', 'draft', 'active', 'paused', 'closed'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type View = 'list' | 'create' | 'edit' | 'results';

// ─── Main component ───────────────────────────────────────────────────────────

export default function SurveysManager() {
  const router = useRouter();
  const userContext = useContext(UserContext);
  const token = userContext?.user?.token ?? null;
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [view, setView] = useState<View>('list');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [shareSurvey, setShareSurvey] = useState<Survey | null>(null);

  const handleBack = useCallback(() => router.push('/dashboard'), [router]);

  const loadSurveys = useCallback(async () => {
    if (!token) {
      setSurveys([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextSurveys = await fetchSurveys(token);
      setSurveys(nextSurveys);
    } catch (error) {
      console.error('Failed to fetch surveys', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [surveys, statusFilter, searchQuery]);

  const handleCreate = () => {
    setSelectedSurvey(null);
    setView('create');
  };

  const handleEdit = (survey: Survey) => {
    // 'scheduled' is only a derived display status (see resolveSurveyStatus in api.ts);
    // the editor only deals with the real persisted statuses, so treat it as 'active'.
    const editable = survey.status === 'scheduled' ? { ...survey, status: 'active' as SurveyStatus } : survey;
    setSelectedSurvey(editable);
    setView('edit');
  };

  const handleViewResults = (survey: Survey) => {
    setSelectedSurvey(survey);
    setView('results');
  };

  const upsertSurvey = useCallback((survey: Survey) => {
    setSurveys((prev) => {
      const exists = prev.some((item) => item.surveyId === survey.surveyId);
      return exists
        ? prev.map((item) => (item.surveyId === survey.surveyId ? survey : item))
        : [survey, ...prev];
    });
    setSelectedSurvey((current) => (current?.surveyId === survey.surveyId ? survey : current));
  }, []);

  const handleToggleStatus = async (survey: Survey) => {
    if (!token) {
      toast.error('You must be logged in to manage surveys');
      return;
    }

    // Draft surveys have never passed the publish validation (question text,
    // at least two filled options, etc.). Activating one directly from the
    // list toggle would bypass those checks, so send the user to the editor's
    // "Publish Survey" flow instead of silently activating it here.
    if (survey.status === 'draft') {
      toast.error('Open the survey and use “Publish Survey” to activate a draft');
      handleEdit(survey);
      return;
    }

    let nextStatus: SurveyStatus | null = null;
    if (survey.status === 'active') {
      if (!window.confirm(`Pause survey "${survey.title}"?`)) return;
      nextStatus = 'paused';
    } else if (survey.status === 'paused') {
      if (!survey.questions || survey.questions.length === 0) {
        toast.error('Add at least one question before activating the survey');
        return;
      }
      const NEEDS_OPTIONS = new Set(['single_choice', 'multiple_choice', 'dropdown', 'multiple_choice_grid']);
      for (const q of survey.questions) {
        if (!q.text?.trim()) {
          toast.error('Question text cannot be blank');
          return;
        }
        if (NEEDS_OPTIONS.has(q.type)) {
          const filledOptions = (q.options ?? []).filter((opt) => opt.label?.trim().length > 0);
          if (q.type === 'multiple_choice_grid') {
            const filledRows = (q.rows ?? []).filter((r) => r.label?.trim().length > 0);
            if (filledRows.length < 1 || filledOptions.length < 1) {
              toast.error('Multiple choice grid needs at least 1 row and 1 column');
              return;
            }
          } else if (filledOptions.length < 2) {
            toast.error('Multiple choice/Checkboxes need at least 2 filled options');
            return;
          }
        }
      }
      nextStatus = 'active';
    }

    if (!nextStatus) return;

    setMutating(true);
    try {
      const updatedSurvey = await updateSurveyRequest({ ...survey, status: nextStatus }, token);
      upsertSurvey(updatedSurvey);
      toast.success(nextStatus === 'active' ? 'Survey activated' : 'Survey paused');
      // Publish static HTML page to S3 when survey goes active
      if (nextStatus === 'active') {
        publishSurveyPage(updatedSurvey, token)
          .then((publishedUrl) => {
            if (publishedUrl) upsertSurvey({ ...updatedSurvey, publishedUrl });
          })
          .catch((err) => console.warn('Survey page publish failed (non-blocking):', err));
      }
    } catch (error) {
      console.error('Failed to update survey status', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update survey');
    } finally {
      setMutating(false);
    }
  };

  const handleDelete = async (survey: Survey) => {
    if (!token) {
      toast.error('You must be logged in to manage surveys');
      return;
    }

    if (!window.confirm(`Delete survey "${survey.title}"? This cannot be undone.`)) return;

    setMutating(true);
    try {
      await deleteSurveyRequest(survey.surveyId, token);
      setSurveys((prev) => prev.filter((item) => item.surveyId !== survey.surveyId));
      setSelectedSurvey((current) => (current?.surveyId === survey.surveyId ? null : current));
      toast.success('Survey deleted');
    } catch (error) {
      console.error('Failed to delete survey', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete survey');
    } finally {
      setMutating(false);
    }
  };

  const handleShareSurvey = async (survey: Survey) => {
    if (!token) {
      toast.error('You must be logged in to share surveys');
      return;
    }

    setMutating(true);
    try {
      const publishedUrl = await publishSurveyPage(survey, token);
      if (!publishedUrl) {
        throw new Error('Could not generate survey share URL');
      }
      const nextSurvey = { ...survey, publishedUrl };
      upsertSurvey(nextSurvey);
      setShareSurvey(nextSurvey);
    } catch (error) {
      console.error('Failed to prepare survey share link', error);
      toast.error(error instanceof Error ? error.message : 'Failed to prepare share link');
    } finally {
      setMutating(false);
    }
  };

  const handleSaveSurvey = async (
    survey: Survey,
    inviteEmails: string[] = [],
    emailConfig?: { subject?: string; body?: string }
  ) => {
    if (!token) {
      toast.error('You must be logged in to manage surveys');
      return;
    }

    const isEdit = view === 'edit';
    setMutating(true);
    try {
      const savedSurvey = isEdit
        ? await updateSurveyRequest(survey, token)
        : await createSurveyRequest(survey, token);
      upsertSurvey(savedSurvey);
      setView('list');
      toast.success(isEdit ? 'Survey updated' : 'Survey created');
      // Publish static HTML page to S3 when survey is active
      if (savedSurvey.status === 'active') {
        publishSurveyPage(savedSurvey, token)
          .then((publishedUrl) => {
            if (publishedUrl) {
              const nextSurvey = { ...savedSurvey, publishedUrl };
              upsertSurvey(nextSurvey);
              if (!isEdit) setShareSurvey(nextSurvey);
              // Send email invites after we have the published URL
              if (inviteEmails.length > 0) {
                sendSurveyInvites(
                  {
                    emails: inviteEmails,
                    surveyUrl: publishedUrl,
                    surveyTitle: savedSurvey.title,
                    surveyId: savedSurvey.surveyId,
                    subject: emailConfig?.subject,
                    body: emailConfig?.body,
                  },
                  token
                )
                  .then(({ sent }) => {
                    toast.success(`Survey link sent to ${sent} recipient${sent !== 1 ? 's' : ''}`);
                  })
                  .catch((err) => {
                    console.warn('Failed to send survey invites:', err);
                    toast.error(
                      err instanceof Error ? err.message : 'Failed to send invite emails'
                    );
                  });
              }
            }
          })
          .catch((err) => console.warn('Survey page publish failed (non-blocking):', err));
      }
      if (!isEdit && savedSurvey.status !== 'active') {
        setShareSurvey(savedSurvey);
      }
    } catch (error) {
      console.error('Failed to save survey', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save survey');
    } finally {
      setMutating(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleExporting = useCallback((e: any) => {
    const selectedRowsOnly = e.selectedRowsOnly ?? false;
    if (e.format === 'xlsx') {
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Surveys');
      exportDataGridXLSX({
        component: e.component,
        worksheet,
        autoFilterEnabled: true,
        selectedRowsOnly,
      }).then(() => {
        workbook.xlsx.writeBuffer().then((buffer) => {
          saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Surveys.xlsx');
        });
      });
      e.cancel = true;
    } else if (e.format === 'pdf') {
      const doc = new jsPDF('l', 'mm', 'a4');
      exportDataGridPDF({
        jsPDFDocument: doc,
        component: e.component,
        selectedRowsOnly,
        indent: 5,
      }).then(() => {
        doc.save('Surveys.pdf');
      });
      e.cancel = true;
    }
  }, []);

  // ── Sub-view routing ────────────────────────────────────────────────────────

  if (view === 'create' || view === 'edit') {
    return (
      <SurveyForm
        survey={selectedSurvey}
        onSave={handleSaveSurvey}
        onCancel={() => setView('list')}
        saving={mutating}
      />
    );
  }

  if (view === 'results' && selectedSurvey) {
    return <SurveyResults survey={selectedSurvey} onBack={() => setView('list')} />;
  }

  // ── List view ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 font-libre">

      <AllStoriesHeader onBack={handleBack} />

      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="mb-4 md:hidden">
            <AdminMobileSidebarToggle className="border border-gray-300" />
          </div>

          {/* Page header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Surveys</h1>
              <p className="text-sm text-gray-500 mt-1">
                Create and manage audience surveys &amp; polls
              </p>
            </div>
            <CustomButton
              onClick={handleCreate}
              disabled={mutating || loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap"
            >
              <Plus size={16} />
              New Survey
            </CustomButton>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Surveys', value: surveys.length },
              { label: 'Active', value: surveys.filter((s) => s.status === 'active').length },
              {
                label: 'Total Responses',
                value: surveys.reduce((acc, s) => acc + s.totalResponses, 0).toLocaleString(),
              },
              { label: 'Drafts', value: surveys.filter((s) => s.status === 'draft').length },
            ].map((stat) => (
              <div key={stat.label} className="border border-gray-200 bg-white p-4">
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Search + status filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input
              type="text"
              placeholder="Search surveys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-72 px-3 py-2 border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((f) => (
                <CustomButton
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  variant={statusFilter === f ? 'black' : 'white'}
                  disableHover
                  className="px-4 py-2 text-xs font-semibold capitalize"
                >
                  {f}
                </CustomButton>
              ))}
            </div>
          </div>

          {/* Data table */}
          <div className="bg-white border border-black overflow-x-auto">
            <DataGrid
              dataSource={filteredSurveys}
              keyExpr="surveyId"
              showBorders={false}
              showColumnLines={false}
              showRowLines={false}
              hoverStateEnabled={true}
              allowColumnResizing={true}
              columnResizingMode="nextColumn"
              allowColumnReordering={true}
              wordWrapEnabled={false}
              columnAutoWidth={true}
              width="100%"
              noDataText={loading ? 'Loading surveys...' : 'No surveys found'}
              height="auto"
              elementAttr={{ class: 'allstories-datagrid' }}
              onExporting={handleExporting}
            >
              <GroupPanel visible={true} emptyPanelText="Drag a column header here to group by that column" />
              <Grouping autoExpandAll={false} />
              <ColumnChooser enabled={true} mode="select" />
              <Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData={true} />
              <Selection mode="multiple" showCheckBoxesMode="always" />
              <FilterRow visible={true} applyFilter="auto" />
              <FilterPanel visible={true} />
              <FilterBuilderPopup width={700} height={500} />
              <HeaderFilter visible={true} />
              <Paging defaultPageSize={10} />
              <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />

              <Column
                dataField="title"
                caption="Survey Title"
                minWidth={180}
                width={210}
                allowSorting={true}
                allowFiltering={true}
                allowGrouping={true}
                cssClass="font-medium"
              />
              <Column
                dataField="status"
                caption="Status"
                minWidth={110}
                width={120}
                alignment="center"
                allowSorting={true}
                allowFiltering={true}
                allowGrouping={true}
                cellRender={(data) => <StatusBadge status={data.value as SurveyStatus} />}
                lookup={{
                  dataSource: STATUS_LOOKUP_DATA,
                  valueExpr: 'value',
                  displayExpr: 'label',
                }}
              />
              <Column
                dataField="startTime"
                caption="Start Date"
                minWidth={120}
                width={130}
                dataType="date"
                format="shortDate"
                allowSorting={true}
                allowFiltering={true}
                allowGrouping={true}
                calculateCellValue={(rowData: Survey) => (rowData.startTime ? new Date(rowData.startTime) : null)}
                cellRender={(data) => <span>{data.data.startTime ? formatDate(data.data.startTime) : '—'}</span>}
              />
              <Column
                dataField="endTime"
                caption="End Date"
                minWidth={120}
                width={130}
                dataType="date"
                format="shortDate"
                allowSorting={true}
                allowFiltering={true}
                allowGrouping={true}
                calculateCellValue={(rowData: Survey) => (rowData.endTime ? new Date(rowData.endTime) : null)}
                cellRender={(data) => <span>{data.data.endTime ? formatDate(data.data.endTime) : '—'}</span>}
              />
              <Column
                dataField="totalResponses"
                caption="Responses"
                minWidth={130}
                width={145}
                alignment="center"
                dataType="number"
                format="#,##0"
                allowSorting={true}
                allowFiltering={true}
                allowGrouping={true}
              />
              <Column
                name="questionCount"
                caption="Questions"
                minWidth={130}
                width={145}
                alignment="center"
                dataType="number"
                allowSorting={true}
                allowFiltering={true}
                allowGrouping={true}
                calculateCellValue={(rowData: Survey) => (rowData.questions || []).length}
                cellRender={(data) => <span>{data.value ?? (data.data?.questions || []).length}</span>}
              />
              <Column
                caption="Actions"
                minWidth={115}
                width={125}
                alignment="center"
                allowFiltering={false}
                allowSorting={false}
                allowGrouping={false}
                allowExporting={false}
                allowHiding={false}
                cellRender={(data) => {
                  const survey = data.data as Survey;
                  // Draft surveys are intentionally excluded here: they must be
                  // activated through the validated "Publish Survey" flow in the
                  // editor, not the pause/unpause toggle.
                  const canToggle =
                    survey.status === 'active' || survey.status === 'paused';
                  return (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareSurvey(survey);
                        }}
                        disabled={mutating}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        style={{ color: '#111827' }}
                        title="Share link"
                      >
                        <Link2 size={15} />
                      </button>
                      {survey.totalResponses > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewResults(survey);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded text-blue-600 transition-colors"
                          title="View Results"
                        >
                          <BarChart2 size={15} />
                        </button>
                      )}
                      {survey.status !== 'closed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(survey);
                          }}
                          disabled={mutating}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                      {canToggle && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(survey);
                          }}
                          disabled={mutating}
                          className={`p-1.5 hover:bg-gray-100 rounded transition-colors ${
                            survey.status === 'active' ? 'text-orange-600' : 'text-green-600'
                          }`}
                          title={survey.status === 'active' ? 'Pause' : 'Activate'}
                        >
                          {survey.status === 'active' ? <Pause size={15} /> : <Play size={15} />}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(survey);
                        }}
                        disabled={mutating}
                        className="p-1.5 hover:bg-gray-100 rounded text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                }}
              />
            </DataGrid>
          </div>
        </div>
      </div>
      {shareSurvey && (
        <ShareLinkModal
          survey={shareSurvey}
          token={token}
          onClose={() => setShareSurvey(null)}
          onSurveyUpdated={upsertSurvey}
        />
      )}
    </div>
  );
}
