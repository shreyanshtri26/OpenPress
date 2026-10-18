import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Check } from 'lucide-react';
import type { Survey, SurveyQuestion, QuestionValidation } from './SurveysManager';
import { fetchPublicSurvey, submitSurveyResponse } from './api';

const PURPLE = '#673AB7';

// ─── Answer validation helper ──────────────────────────────────────────────────

function validateQuestionAnswer(val: any, validation?: QuestionValidation): string | null {
  if (!validation || val === undefined || val === null) return null;

  const { type, subType, min, max, regex, errorMessage } = validation;

  if (type === 'selection_count' || (type as string) === 'selection') {
    let count = 0;
    if (Array.isArray(val)) {
      count = val.filter((item) => item !== undefined && item !== null && String(item).trim().length > 0).length;
    } else if (val !== undefined && val !== null && String(val).trim().length > 0) {
      count = 1;
    }

    if (subType === 'min_select' || (subType as string) === 'at_least') {
      if (min !== undefined && count < min) {
        return errorMessage || `Please select at least ${min} option${min === 1 ? '' : 's'}.`;
      }
    } else if (subType === 'max_select' || (subType as string) === 'at_most') {
      if (max !== undefined && count > max) {
        return errorMessage || `Please select at most ${max} option${max === 1 ? '' : 's'}.`;
      }
    } else if (subType === 'exact_select' || (subType as string) === 'exact') {
      const target = min !== undefined ? min : max;
      if (target !== undefined && count !== target) {
        return errorMessage || `Please select exactly ${target} option${target === 1 ? '' : 's'}.`;
      }
    } else if (subType === 'between') {
      // Defensive check: if min > max, the validation is impossible
      if (min !== undefined && max !== undefined && min > max) {
        console.error(`Invalid selection count range: min (${min}) > max (${max})`);
        return `Validation error: Invalid range configuration. Please contact support.`;
      }
      if (min !== undefined && count < min) {
        return errorMessage || `Please select between ${min} and ${max ?? ''} options.`;
      }
      if (max !== undefined && count > max) {
        return errorMessage || `Please select between ${min ?? ''} and ${max} options.`;
      }
    } else {
      if (min !== undefined && count < min) {
        return errorMessage || `Please select at least ${min} option${min === 1 ? '' : 's'}.`;
      }
      if (max !== undefined && count > max) {
        return errorMessage || `Please select at most ${max} option${max === 1 ? '' : 's'}.`;
      }
    }
    return null;
  }

  const valStr = String(val).trim();
  if (valStr.length === 0) return null; // Blank values are handled by 'required' check

  if (type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(valStr)) {
      return errorMessage || 'Please enter a valid email address.';
    }
  } else if (type === 'phone') {
    const phoneRegex = /^\+?[\d\s\-()]{7,20}$/;
    if (!phoneRegex.test(valStr)) {
      return errorMessage || 'Please enter a valid phone number.';
    }
  } else if (type === 'number') {
    const num = Number(valStr);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      return errorMessage || 'Must be a valid number.';
    }
    if (subType === 'greater_than' && min !== undefined && num < min) {
      return errorMessage || `Must be greater than or equal to ${min}.`;
    }
    if (subType === 'less_than' && max !== undefined && num > max) {
      return errorMessage || `Must be less than or equal to ${max}.`;
    }
    if (subType === 'between') {
      // Defensive check: if min > max, the validation is impossible
      if (min !== undefined && max !== undefined && min > max) {
        console.error(`Invalid validation range: min (${min}) > max (${max})`);
        return `Validation error: Invalid range configuration. Please contact support.`;
      }
      if (min !== undefined && num < min) return errorMessage || `Must be between ${min} and ${max ?? ''}.`;
      if (max !== undefined && num > max) return errorMessage || `Must be between ${min ?? ''} and ${max}.`;
    }
  } else if (type === 'length') {
    if (subType === 'min_length' && min !== undefined && valStr.length < min) {
      return errorMessage || `Minimum character count is ${min}.`;
    }
    if (subType === 'max_length' && max !== undefined && valStr.length > max) {
      return errorMessage || `Maximum character count is ${max}.`;
    }
    if (subType === 'max_length' && min !== undefined && max !== undefined && min > max) {
      console.error(`Invalid length validation range: min (${min}) > max (${max})`);
      return `Validation error: Invalid length range configuration. Please contact support.`;
    }
  } else if (type === 'regex' && regex) {
    try {
      if (subType === 'contains') {
        if (!valStr.includes(regex)) return errorMessage || `Must contain "${regex}".`;
      } else if (subType === 'not_contains') {
        if (valStr.includes(regex)) return errorMessage || `Must not contain "${regex}".`;
      } else {
        const re = new RegExp(regex);
        if (!re.test(valStr)) {
          return errorMessage || 'Must match the required format.';
        }
      }
    } catch {
      // Invalid regex pattern, skip
    }
  }

  return null;
}

// ─── Answer types ─────────────────────────────────────────────────────────────

type AnswerValue = string | string[] | number;

// ─── Question renderers ───────────────────────────────────────────────────────

function SingleChoiceQuestion({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2.5 mt-3">
      {(question.options ?? []).map((opt) => (
        <label
          key={opt.id}
          className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer group"
        >
          <div
            className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              borderColor: value === opt.id ? PURPLE : '#9CA3AF',
              backgroundColor: value === opt.id ? PURPLE : 'transparent',
            }}
            onClick={() => onChange(opt.id)}
          >
            {value === opt.id && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>
          <input
            type="radio"
            name={`q_${question.questionId}`}
            value={opt.id}
            checked={value === opt.id}
            onChange={() => onChange(opt.id)}
            className="sr-only"
          />
          <span className="group-hover:text-gray-900 transition-colors">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function DropdownQuestion({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const selectedOpt = (question.options ?? []).find(o => o.id === value);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div ref={wrapperRef} className={`mt-3 relative w-1/2 custom-dropdown-${question.questionId} select-none`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-white border rounded-md py-2.5 px-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-left transition-colors"
        style={{ 
          borderColor: open ? '#111827' : '#D1D5DB',
          boxShadow: open ? '0 0 0 1px #111827' : 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1rem'
        }}
      >
        <span className="text-gray-900 block truncate">
          {selectedOpt ? selectedOpt.label : 'Choose'}
        </span>
      </button>
      
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {(question.options ?? []).map((opt) => (
            <div
              key={opt.id}
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-100 ${
                value === opt.id ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-700'
              }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MultipleChoiceQuestion({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-2.5 mt-3">
      {(question.options ?? []).map((opt) => {
        const checked = value.includes(opt.id);
        return (
          <label
            key={opt.id}
            className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer group"
            onClick={() => toggle(opt.id)}
          >
            <div
              className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                borderColor: checked ? PURPLE : '#9CA3AF',
                backgroundColor: checked ? PURPLE : 'transparent',
              }}
            >
              {checked && (
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  className="w-3 h-3"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span className="group-hover:text-gray-900 transition-colors">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function RatingScaleQuestion({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 mt-3 flex-wrap">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors"
          style={{
            borderColor: value === n ? PURPLE : '#D1D5DB',
            backgroundColor: value === n ? PURPLE : 'white',
            color: value === n ? 'white' : '#374151',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function MultipleChoiceGridQuestion({
  question,
  answers,
  onChange,
}: {
  question: SurveyQuestion;
  answers: Record<string, AnswerValue>;
  onChange: (rowId: string, colId: string) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-center border-collapse min-w-[400px]">
        <thead>
          <tr>
            <th className="p-2 text-left border-b border-gray-200"></th>
            {(question.options ?? []).map((col) => (
              <th key={col.id} className="p-2 font-medium text-sm text-gray-600 border-b border-gray-200">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(question.rows ?? []).map((row, ri) => (
            <tr key={row.id} className={ri % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              <td className="p-3 text-left text-sm text-gray-800 border-b border-gray-200 min-w-[120px]">
                {row.label}
              </td>
              {(question.options ?? []).map((col) => {
                const checked = answers[`${question.questionId}_${row.id}`] === col.id;
                return (
                  <td key={col.id} className="p-3 border-b border-gray-200">
                    <button
                      type="button"
                      onClick={() => onChange(row.id, col.id)}
                      className="w-full h-full flex items-center justify-center focus:outline-none group"
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors group-hover:border-gray-500"
                        style={{
                          borderColor: checked ? PURPLE : '#9CA3AF',
                        }}
                      >
                        {checked && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PURPLE }} />}
                      </div>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckboxGridQuestion({
  question,
  answers,
  onChange,
}: {
  question: SurveyQuestion;
  answers: Record<string, AnswerValue>;
  onChange: (rowId: string, colIds: string[]) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-center border-collapse min-w-[400px]">
        <thead>
          <tr>
            <th className="p-2 text-left border-b border-gray-200"></th>
            {(question.options ?? []).map((col) => (
              <th key={col.id} className="p-2 font-medium text-sm text-gray-600 border-b border-gray-200">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(question.rows ?? []).map((row, ri) => {
            const currentAnswers = (answers[`${question.questionId}_${row.id}`] as string[]) ?? [];
            return (
              <tr key={row.id} className={ri % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="p-3 text-left text-sm text-gray-800 border-b border-gray-200 min-w-[120px]">
                  {row.label}
                </td>
                {(question.options ?? []).map((col) => {
                  const checked = currentAnswers.includes(col.id);
                  const toggle = () => {
                    const next = checked
                      ? currentAnswers.filter((c) => c !== col.id)
                      : [...currentAnswers, col.id];
                    onChange(row.id, next);
                  };
                  return (
                    <td key={col.id} className="p-3 border-b border-gray-200">
                      <button
                        type="button"
                        onClick={toggle}
                        className="w-full h-full flex items-center justify-center focus:outline-none group"
                      >
                        <div
                          className="w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-colors group-hover:border-gray-500"
                          style={{
                            borderColor: checked ? PURPLE : '#9CA3AF',
                            backgroundColor: checked ? PURPLE : 'transparent',
                          }}
                        >
                          {checked && <Check size={14} color="white" strokeWidth={3} />}
                        </div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SurveyPublicViewProps {
  surveyId: string;
}

export default function SurveyPublicView({ surveyId }: SurveyPublicViewProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPublicSurvey(surveyId)
      .then((data) => {
        setSurvey(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setLoadError(err.message || 'Failed to load survey');
        setLoading(false);
      });
  }, [surveyId]);

  const setAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const validate = (): boolean => {
    if (!survey) return false;
    let isValid = true;
    const errs: Record<string, string> = {};

    if (survey.collectEmails) {
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const trimmed = email.trim();
      if (!trimmed) {
        setEmailError('Email address is required.');
        isValid = false;
      } else if (!EMAIL_RE.test(trimmed)) {
        setEmailError('Please enter a valid email address.');
        isValid = false;
      } else {
        setEmailError(null);
      }
    }

    for (const q of survey.questions) {
      if (q.type === 'multiple_choice_grid' || q.type === 'checkbox_grid') {
        if (q.required) {
          let missing = false;
          (q.rows ?? []).forEach((r) => {
            const a = answers[`${q.questionId}_${r.id}`];
            if (q.type === 'checkbox_grid') {
              if (!Array.isArray(a) || a.length === 0) missing = true;
            } else {
              if (a === undefined || a === null || a === '') missing = true;
            }
          });
          if (missing) {
            errs[q.questionId] =
              q.type === 'checkbox_grid'
                ? 'Please select at least one option for each row.'
                : 'Please select an option for each row.';
            isValid = false;
          }
        }
      } else {
        const answer = answers[q.questionId];
        const isEmpty =
          answer === undefined ||
          answer === null ||
          answer === '' ||
          (Array.isArray(answer) && answer.length === 0);

        if (q.required && isEmpty) {
          errs[q.questionId] = 'This is a required question.';
          isValid = false;
        } else if (!isEmpty && q.validation) {
          const valError = validateQuestionAnswer(answer, q.validation);
          if (valError) {
            errs[q.questionId] = valError;
            isValid = false;
          }
        }
      }
    }
    setErrors(errs);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey || !validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const questionLabels: Record<string, string> = {};
      const optionLabels: Record<string, string> = {};
      const rowLabels: Record<string, string> = {};
      const allSurveyQuestions = survey.questions || [];
      allSurveyQuestions.forEach((q) => {
        if (q.questionId && q.text) questionLabels[q.questionId] = q.text;
        (q.options || []).forEach((o: any) => { if (o.id && o.label) optionLabels[o.id] = o.label; });
        (q.historicalOptions || []).forEach((o: any) => { if (o.id && o.label) optionLabels[o.id] = o.label; });
        (q.rows || []).forEach((r: any) => { if (r.id && r.label) rowLabels[r.id] = r.label; });
        (q.historicalRows || []).forEach((r: any) => { if (r.id && r.label) rowLabels[r.id] = r.label; });
      });

      const payload: any = {
        answers,
        questionLabels,
        optionLabels,
        rowLabels,
      };
      if (survey.collectEmails) {
        payload.respondentId = email.trim().toLowerCase();
      }
      await submitSurveyResponse(surveyId, payload);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0EBF8' }}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 size={32} className="animate-spin" style={{ color: PURPLE }} />
          <span className="text-sm">Loading survey…</span>
        </div>
      </div>
    );
  }

  // ── Load error ────────────────────────────────────────────────────────────
  if (loadError || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F0EBF8' }}>
        <div className="bg-white rounded-xl shadow-md p-8 max-w-sm w-full text-center space-y-3">
          <AlertCircle size={36} className="mx-auto text-red-500" />
          <h2 className="font-semibold text-gray-800">Survey not found</h2>
          <p className="text-sm text-gray-500">
            {loadError ?? 'This survey does not exist or is no longer available.'}
          </p>
        </div>
      </div>
    );
  }

  // ── Not started yet ───────────────────────────────────────────────────────
  const isUpcoming =
    survey.startTime &&
    !Number.isNaN(new Date(survey.startTime).getTime()) &&
    new Date(survey.startTime) > new Date();

  if (isUpcoming) {
    const formattedStart = new Date(survey.startTime).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F0EBF8' }}>
        <div className="bg-white rounded-xl shadow-md overflow-hidden max-w-sm w-full text-center">
          <div className="h-2 w-full" style={{ backgroundColor: PURPLE }} />
          <div className="p-8 space-y-3">
            <h2 className="font-semibold text-gray-800 text-lg">{survey.title}</h2>
            <p className="text-sm text-gray-500">
              This survey has not started yet. It is scheduled to begin on{' '}
              <strong className="text-gray-700">{formattedStart}</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Not active ────────────────────────────────────────────────────────────
  if (survey.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F0EBF8' }}>
        <div className="bg-white rounded-xl shadow-md overflow-hidden max-w-sm w-full text-center">
          <div className="h-2 w-full" style={{ backgroundColor: PURPLE }} />
          <div className="p-8 space-y-3">
            <h2 className="font-semibold text-gray-800 text-lg">{survey.title}</h2>
            <p className="text-sm text-gray-500">
              This survey is currently{' '}
              <span className="font-medium capitalize">{survey.status}</span> and is not
              accepting responses at this time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitted ─────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F0EBF8' }}>
        <div className="bg-white rounded-xl shadow-md overflow-hidden max-w-sm w-full text-center">
          <div className="h-2 w-full" style={{ backgroundColor: PURPLE }} />
          <div className="p-8 space-y-4">
            <CheckCircle2 size={40} className="mx-auto" style={{ color: PURPLE }} />
            <h2 className="font-semibold text-gray-800 text-lg">Response submitted!</h2>
            <p className="text-sm text-gray-500">
              Your response has been recorded. Thank you for taking the time to complete this
              survey.
            </p>
            <p className="text-xs text-gray-400">You may now close this tab.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Survey form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: '#F0EBF8' }}>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
        {/* Title card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="h-2.5 w-full" style={{ backgroundColor: PURPLE }} />
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-normal text-gray-800">{survey.title}</h1>
            {survey.description && (
              <p className="text-sm text-gray-600 mt-3">{survey.description}</p>
            )}
            <p className="text-xs text-red-500 mt-4">* Required</p>
          </div>
        </div>

        {/* Email Address Card */}
        {survey.collectEmails && (
          <div
            className="bg-white rounded-xl shadow-md p-5 sm:p-6 transition-all"
            style={emailError ? { borderLeft: '4px solid #EF4444' } : undefined}
          >
            <label className="block text-sm font-medium text-gray-800">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              className="mt-3 w-full border-0 border-b-2 border-gray-200 focus:outline-none pb-1 text-sm bg-transparent transition-colors"
              onFocus={(e) => (e.currentTarget.style.borderBottomColor = PURPLE)}
              onBlur={(e) => (e.currentTarget.style.borderBottomColor = '#E5E7EB')}
            />
            {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
          </div>
        )}

        {/* Question cards */}
        {survey.questions
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((q) => {
            const hasError = !!errors[q.questionId];
            return (
              <div
                key={q.questionId}
                className="bg-white rounded-xl shadow-md p-5 sm:p-6"
                style={hasError ? { borderLeft: '4px solid #EF4444' } : undefined}
              >
                <p className="text-sm font-medium text-gray-800">
                  {q.text}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </p>
                {q.description && (
                  <p className="text-xs text-gray-500 mt-1">{q.description}</p>
                )}

                {q.type === 'single_choice' && (
                  <SingleChoiceQuestion
                    question={q}
                    value={(answers[q.questionId] as string) ?? ''}
                    onChange={(v) => setAnswer(q.questionId, v)}
                  />
                )}

                {q.type === 'dropdown' && (
                  <DropdownQuestion
                    question={q}
                    value={(answers[q.questionId] as string) ?? ''}
                    onChange={(v) => setAnswer(q.questionId, v)}
                  />
                )}

                {q.type === 'multiple_choice' && (
                  <MultipleChoiceQuestion
                    question={q}
                    value={(answers[q.questionId] as string[]) ?? []}
                    onChange={(v) => setAnswer(q.questionId, v)}
                  />
                )}

                {q.type === 'multiple_choice_grid' && (
                  <MultipleChoiceGridQuestion
                    question={q}
                    answers={answers}
                    onChange={(rowId, colId) => setAnswer(`${q.questionId}_${rowId}`, colId)}
                  />
                )}

                {q.type === 'checkbox_grid' && (
                  <CheckboxGridQuestion
                    question={q}
                    answers={answers}
                    onChange={(rowId, colIds) => setAnswer(`${q.questionId}_${rowId}`, colIds)}
                  />
                )}

                {q.type === 'rating_scale' && (
                  <RatingScaleQuestion
                    question={q}
                    value={(answers[q.questionId] as number) ?? null}
                    onChange={(v) => setAnswer(q.questionId, v)}
                  />
                )}

                {q.type === 'short_text' && (
                  <input
                    type="text"
                    placeholder="Your answer"
                    value={(answers[q.questionId] as string) ?? ''}
                    onChange={(e) => setAnswer(q.questionId, e.target.value)}
                    className="mt-3 w-full border-0 border-b-2 border-gray-200 focus:outline-none pb-1 text-sm bg-transparent transition-colors"
                    onFocus={(e) => (e.currentTarget.style.borderBottomColor = PURPLE)}
                    onBlur={(e) => (e.currentTarget.style.borderBottomColor = '#E5E7EB')}
                  />
                )}

                {q.type === 'paragraph' && (
                  <textarea
                    placeholder="Your answer"
                    rows={4}
                    value={(answers[q.questionId] as string) ?? ''}
                    onChange={(e) => setAnswer(q.questionId, e.target.value)}
                    className="mt-3 w-full border-0 border-b-2 border-gray-200 focus:outline-none pb-1 text-sm bg-transparent transition-colors resize-none"
                    onFocus={(e) => (e.currentTarget.style.borderBottomColor = PURPLE)}
                    onBlur={(e) => (e.currentTarget.style.borderBottomColor = '#E5E7EB')}
                  />
                )}

                {hasError && (
                  <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors[q.questionId]}
                  </p>
                )}
              </div>
            );
          })}

        {/* Submit */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={15} /> {submitError}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 text-white px-7 py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: PURPLE }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Submitting…
              </>
            ) : (
              'Submit'
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setErrors({});
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
          >
            Clear form
          </button>
        </div>

        <p className="text-xs text-gray-400 pb-8">
          Never submit passwords through surveys.
        </p>
      </form>
    </div>
  );
}
