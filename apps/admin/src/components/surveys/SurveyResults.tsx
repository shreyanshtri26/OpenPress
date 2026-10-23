import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Paperclip, Send, Sparkles, X } from 'lucide-react';
import PieChart, {
  Series as PieSeries,
  Label as PieLabel,
  Connector,
  Legend as PieLegend,
  Tooltip as PieTooltip,
  Animation as PieAnimation,
} from '@/components/ui/kit/pie-chart';
import {
  Chart,
  Series as ChartSeries,
  ArgumentAxis,
  ValueAxis,
  Legend as ChartLegend,
  Tooltip as ChartTooltip,
  Label as ChartLabel,
  Animation as ChartAnimation,
  Grid as ChartGrid,
} from '@/components/ui/kit/chart';
import { AllStoriesHeader } from '../dashboard/all-stories/AllStoriesHeader';
import { AdminMobileSidebarToggle } from '../SideBar/AdminDashboardLayout';
import type { Survey, SurveyAIResponseSummary, SurveyQuestion } from './SurveysManager';
import { QUESTION_TYPE_LABELS } from './SurveysManager';
import toast from 'react-hot-toast';
import CustomButton from '../common/CustomButton';
import { UserContext } from '../../context/UserContext';
import {
  askSurveySummaryQuestion,
  fetchSurveyChatMessages,
  fetchSurveyResponses,
  generateSurveyResponseSummary,
  deleteSurveyChatAsset,
  saveSurveyChatMessage,
  uploadSurveyChatAsset,
  type SurveyChatAsset,
  type SurveyChatMessage,
  type SurveyResponseEntry,
} from './api';

// ─── Color Palette for Charts ────────────────────────────────────────────────

const CHART_PALETTE = [
  '#2563EB', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#E11D48', // Rose
  '#84CC16', // Lime
  '#A855F7', // Violet
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SurveyResultsProps {
  survey: Survey;
  onBack: () => void;
}

interface SurveySummaryChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
  assets?: SurveyChatAsset[];
}

function renderAiInlineText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function AiResponseText({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const heading = line.match(/^\*\*(.+?)\*\*:?\s*$/);
        if (heading) {
          return <h3 key={index} className="font-semibold text-gray-900">{heading[1]}</h3>;
        }
        if (line.startsWith('- ')) {
          return (
            <div key={index} className="flex gap-2">
              <span aria-hidden="true">&#8226;</span>
              <span>{renderAiInlineText(line.slice(2))}</span>
            </div>
          );
        }
        if (!line.trim()) return <div key={index} className="h-1" />;
        return <p key={index}>{renderAiInlineText(line)}</p>;
      })}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="w-full bg-gray-100 h-2 overflow-hidden">
      <div
        className="h-2 bg-gray-900 transition-all duration-500"
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

function ChoiceResults({
  results,
}: {
  results: { label: string; count: number; percentage: number }[];
}) {
  return (
    <div className="space-y-3">
      {results.map((r, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-800 font-medium">{r.label}</span>
            <span className="text-gray-500 text-xs">
              {r.percentage.toFixed(1)}%&ensp;({r.count})
            </span>
          </div>
          <ProgressBar percentage={r.percentage} />
        </div>
      ))}
    </div>
  );
}

function RatingResults({
  results,
}: {
  results: { avg: number; distribution: { score: number; count: number }[] };
}) {
  const total = results.distribution.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-gray-900">{results.avg.toFixed(1)}</span>
        <span className="text-gray-500 text-sm pb-1">/ 5 average</span>
      </div>
      <div className="space-y-2">
        {results.distribution
          .slice()
          .reverse()
          .map((d) => (
            <div key={d.score} className="flex items-center gap-3 text-sm">
              <span className="text-gray-600 w-4 text-right font-medium">{d.score}</span>
              <div className="flex-1">
                <ProgressBar percentage={total > 0 ? (d.count / total) * 100 : 0} />
              </div>
              <span className="text-gray-400 text-xs w-8">{d.count}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function TextResults({ responses }: { responses: string[] }) {
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {responses.map((r, i) => (
        <div key={i} className="text-sm text-gray-700 border-l-2 border-gray-300 pl-3 py-1">
          &ldquo;{r}&rdquo;
        </div>
      ))}
    </div>
  );
}

// ─── Chart Components ─────────────────────────────────────────────────────────

function SingleChoicePieChart({
  results,
  totalAnswers,
}: {
  results: { label: string; count: number; percentage: number }[];
  totalAnswers: number;
}) {
  const hasData = results.length > 0 && results.some((r) => r.count > 0);

  if (!hasData) {
    return (
      <div className="text-center py-8 text-gray-400 text-xs italic bg-gray-50 border border-dashed border-gray-200">
        No answers recorded yet for this question.
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-1">
      <div className="w-full flex justify-center">
        <PieChart
          dataSource={results}
          palette={CHART_PALETTE}
          height={290}
          type="pie"
        >
          <PieAnimation enabled={true} />
          <PieSeries argumentField="label" valueField="count">
            <PieLabel
              visible={true}
              position="outside"
              customizeText={(pointInfo: any) =>
                `${pointInfo.valueText} (${pointInfo.percentText})`
              }
            >
              <Connector visible={true} width={1} />
            </PieLabel>
          </PieSeries>
          <PieLegend
            visible={true}
            horizontalAlignment="center"
            verticalAlignment="bottom"
            itemTextPosition="right"
            margin={{ top: 12 }}
          />
          <PieTooltip
            enabled={true}
            customizeTooltip={(pointInfo: any) => ({
              text: `<b>${pointInfo.argumentText}</b><br/>${pointInfo.valueText} responses (${(pointInfo.percent * 100).toFixed(1)}%)`,
            })}
          />
        </PieChart>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100">
        {results.map((r, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 text-xs border border-gray-100">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
              />
              <span className="font-medium text-gray-800 truncate" title={r.label}>
                {r.label}
              </span>
            </div>
            <span className="text-gray-600 font-semibold flex-shrink-0">
              {r.percentage.toFixed(1)}% ({r.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckboxHorizontalBarChart({
  results,
  totalAnswers,
}: {
  results: { label: string; count: number; percentage: number }[];
  totalAnswers: number;
}) {
  const hasData = results.length > 0 && results.some((r) => r.count > 0);

  if (!hasData) {
    return (
      <div className="text-center py-8 text-gray-400 text-xs italic bg-gray-50 border border-dashed border-gray-200">
        No answers recorded yet for this question.
      </div>
    );
  }

  const chartHeight = Math.max(200, Math.min(500, results.length * 48 + 80));

  return (
    <div className="space-y-4 pt-1">
      <Chart
        dataSource={results}
        rotated={true}
        height={chartHeight}
        palette={CHART_PALETTE}
      >
        <ChartAnimation enabled={true} />
        <ArgumentAxis>
          <ChartGrid visible={false} />
          <ChartLabel overlappingBehavior="rotate" />
        </ArgumentAxis>
        <ValueAxis allowDecimals={false}>
          <ChartGrid visible={true} />
        </ValueAxis>
        <ChartSeries
          valueField="count"
          argumentField="label"
          type="bar"
          color="#2563EB"
          cornerRadius={4}
        >
          <ChartLabel
            visible={true}
            position="outside"
            customizeText={(e: any) => {
              const item = results.find((r) => r.label === e.argumentText);
              return `${e.valueText} (${item ? item.percentage.toFixed(1) : '0.0'}%)`;
            }}
          />
        </ChartSeries>
        <ChartLegend visible={false} />
        <ChartTooltip
          enabled={true}
          customizeTooltip={(pointInfo: any) => {
            const item = results.find((r) => r.label === pointInfo.argumentText);
            return {
              text: `<b>${pointInfo.argumentText}</b><br/>${pointInfo.valueText} selections (${item ? item.percentage.toFixed(1) : '0.0'}%)`,
            };
          }}
        />
      </Chart>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100">
        {results.map((r, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 text-xs border border-gray-100">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: '#2563EB' }}
              />
              <span className="font-medium text-gray-800 truncate" title={r.label}>
                {r.label}
              </span>
            </div>
            <span className="text-gray-600 font-semibold flex-shrink-0">
              {r.percentage.toFixed(1)}% ({r.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DropdownPieChart({
  results,
  totalAnswers,
}: {
  results: { label: string; count: number; percentage: number }[];
  totalAnswers: number;
}) {
  const hasData = results.length > 0 && results.some((r) => r.count > 0);

  if (!hasData) {
    return (
      <div className="text-center py-8 text-gray-400 text-xs italic bg-gray-50 border border-dashed border-gray-200">
        No answers recorded yet for this question.
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-1">
      <div className="w-full flex justify-center">
        <PieChart
          dataSource={results}
          palette={CHART_PALETTE}
          height={290}
          type="doughnut"
        >
          <PieAnimation enabled={true} />
          <PieSeries argumentField="label" valueField="count">
            <PieLabel
              visible={true}
              position="outside"
              customizeText={(pointInfo: any) =>
                `${pointInfo.valueText} (${pointInfo.percentText})`
              }
            >
              <Connector visible={true} width={1} />
            </PieLabel>
          </PieSeries>
          <PieLegend
            visible={true}
            horizontalAlignment="center"
            verticalAlignment="bottom"
            itemTextPosition="right"
            margin={{ top: 12 }}
          />
          <PieTooltip
            enabled={true}
            customizeTooltip={(pointInfo: any) => ({
              text: `<b>${pointInfo.argumentText}</b><br/>${pointInfo.valueText} selections (${(pointInfo.percent * 100).toFixed(1)}%)`,
            })}
          />
        </PieChart>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100">
        {results.map((r, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 text-xs border border-gray-100">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
              />
              <span className="font-medium text-gray-800 truncate" title={r.label}>
                {r.label}
              </span>
            </div>
            <span className="text-gray-600 font-semibold flex-shrink-0">
              {r.percentage.toFixed(1)}% ({r.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GridVerticalBarChart({
  gridResults,
  isCheckbox,
  totalAnswers,
}: {
  gridResults: {
    rowId: string;
    rowLabel: string;
    choiceResults: { label: string; count: number; percentage: number }[];
  }[];
  isCheckbox: boolean;
  totalAnswers: number;
}) {
  const hasData =
    gridResults.length > 0 &&
    gridResults.some((gr) => gr.choiceResults.some((cr) => cr.count > 0));

  if (!hasData) {
    return (
      <div className="text-center py-8 text-gray-400 text-xs italic bg-gray-50 border border-dashed border-gray-200">
        No answers recorded yet for this question.
      </div>
    );
  }

  // Find all unique option labels across rows
  const allOptionLabels: string[] = [];
  gridResults.forEach((gr) => {
    gr.choiceResults.forEach((cr) => {
      if (!allOptionLabels.includes(cr.label)) {
        allOptionLabels.push(cr.label);
      }
    });
  });

  const chartDataSource = gridResults.map((gr) => {
    const rowObj: Record<string, string | number> = { row: gr.rowLabel };
    gr.choiceResults.forEach((cr) => {
      rowObj[cr.label] = cr.count;
    });
    return rowObj;
  });

  return (
    <div className="space-y-6 pt-1">
      <Chart
        dataSource={chartDataSource}
        height={320}
        palette={CHART_PALETTE}
      >
        <ChartAnimation enabled={true} />
        <ArgumentAxis>
          <ChartGrid visible={false} />
          <ChartLabel overlappingBehavior="rotate" />
        </ArgumentAxis>
        <ValueAxis allowDecimals={false}>
          <ChartGrid visible={true} />
        </ValueAxis>
        {allOptionLabels.map((optLabel) => (
          <ChartSeries
            key={optLabel}
            valueField={optLabel}
            argumentField="row"
            name={optLabel}
            type="bar"
            cornerRadius={3}
          />
        ))}
        <ChartLegend
          visible={true}
          horizontalAlignment="center"
          verticalAlignment="bottom"
          itemTextPosition="right"
          margin={{ top: 12 }}
        />
        <ChartTooltip
          enabled={true}
          customizeTooltip={(pointInfo: any) => ({
            text: `<b>${pointInfo.argumentText}</b><br/>${pointInfo.seriesName}: <b>${pointInfo.valueText}</b> responses`,
          })}
        />
      </Chart>

      {/* Row by row breakdown */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        {gridResults.map((gr) => (
          <div key={gr.rowId} className="border border-gray-100 bg-gray-50 p-3 space-y-2">
            <h4 className="text-xs font-semibold text-gray-800">{gr.rowLabel}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {gr.choiceResults.map((cr, idx) => (
                <div key={idx} className="flex items-center justify-between p-1.5 bg-white text-xs border border-gray-200">
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          CHART_PALETTE[allOptionLabels.indexOf(cr.label) % CHART_PALETTE.length],
                      }}
                    />
                    <span className="font-medium text-gray-700 truncate" title={cr.label}>
                      {cr.label}
                    </span>
                  </div>
                  <span className="text-gray-500 flex-shrink-0">
                    {isCheckbox ? cr.count : `${cr.percentage.toFixed(0)}% (${cr.count})`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatingScaleBarChart({
  results,
  totalAnswers,
}: {
  results: { avg: number; distribution: { score: number; count: number }[] };
  totalAnswers: number;
}) {
  const total = results.distribution.reduce((acc, d) => acc + d.count, 0);
  const hasData = total > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8 text-gray-400 text-xs italic bg-gray-50 border border-dashed border-gray-200">
        No answers recorded yet for this question.
      </div>
    );
  }

  const chartData = results.distribution.map((d) => ({
    scoreLabel: `${d.score}`,
    score: d.score,
    count: d.count,
    percentage: total > 0 ? (d.count / total) * 100 : 0,
  }));

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-gray-900">{results.avg.toFixed(1)}</span>
          <span className="text-gray-500 text-xs font-medium">/ 5.0 Average</span>
        </div>
        <div className="h-6 w-px bg-gray-200 mx-2" />
        <div className="text-xs text-gray-500">
          Based on <b>{total.toLocaleString()}</b> rating{total === 1 ? '' : 's'}
        </div>
      </div>

      <Chart
        dataSource={chartData}
        height={240}
        palette={['#2563EB']}
      >
        <ChartAnimation enabled={true} />
        <ArgumentAxis>
          <ChartGrid visible={false} />
        </ArgumentAxis>
        <ValueAxis allowDecimals={false}>
          <ChartGrid visible={true} />
        </ValueAxis>
        <ChartSeries
          valueField="count"
          argumentField="scoreLabel"
          type="bar"
          color="#2563EB"
          cornerRadius={4}
        >
          <ChartLabel
            visible={true}
            position="outside"
            customizeText={(e: any) => {
              const item = chartData.find((d) => d.scoreLabel === e.argumentText);
              return `${e.valueText} (${item ? item.percentage.toFixed(0) : '0'}%)`;
            }}
          />
        </ChartSeries>
        <ChartLegend visible={false} />
        <ChartTooltip
          enabled={true}
          customizeTooltip={(pointInfo: any) => {
            const item = chartData.find((d) => d.scoreLabel === pointInfo.argumentText);
            return {
              text: `<b>Rating ${pointInfo.argumentText}</b><br/>${pointInfo.valueText} votes (${item ? item.percentage.toFixed(1) : '0.0'}%)`,
            };
          }}
        />
      </Chart>

      <div className="grid grid-cols-5 gap-2 pt-2 border-t border-gray-100 text-center">
        {chartData.map((d) => (
          <div key={d.score} className="p-2 bg-gray-50 border border-gray-100">
            <div className="text-xs font-bold text-gray-800">{d.scoreLabel}</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">{d.count}</div>
            <div className="text-[11px] text-gray-500">{d.percentage.toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextResponsesChart({
  responses,
  totalAnswers,
}: {
  responses: string[];
  totalAnswers: number;
}) {
  const hasData = responses.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8 text-gray-400 text-xs italic bg-gray-50 border border-dashed border-gray-200">
        No text responses recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-2.5 border border-gray-100">
        <span><b>{responses.length}</b> total text submission{responses.length === 1 ? '' : 's'}</span>
        <span className="italic text-gray-400">Showing all responses</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {responses.map((r, i) => (
          <div key={i} className="text-xs text-gray-700 bg-gray-50 border-l-2 border-gray-900 p-2.5">
            &ldquo;{r}&rdquo;
          </div>
        ))}
      </div>
    </div>
  );
}

function hasMeaningfulAnswerValue(value: unknown) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) {
    return value.some((item) => String(item ?? '').trim().length > 0);
  }
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  return String(value).trim().length > 0;
}

function hasMeaningfulAnswersMap(answers?: Record<string, string | string[] | number>) {
  if (!answers) return false;
  return Object.values(answers).some((value) => hasMeaningfulAnswerValue(value));
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SurveyResults({ survey, onBack }: SurveyResultsProps) {
  const userContext = useContext(UserContext);
  const token = userContext?.user?.token ?? null;
  const [activeView, setActiveView] = useState<'summary' | 'responses' | 'ai_summary'>('summary');
  const [responses, setResponses] = useState<SurveyResponseEntry[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [aiResponseSummary, setAiResponseSummary] = useState<SurveyAIResponseSummary | undefined>(survey.aiResponseSummary);
  const [generatingAiSummary, setGeneratingAiSummary] = useState(false);
  const [summaryChatMessages, setSummaryChatMessages] = useState<SurveySummaryChatMessage[]>([]);
  const [summaryChatInput, setSummaryChatInput] = useState('');
  const [isSummaryChatLoading, setIsSummaryChatLoading] = useState(false);
  const [selectedChatFile, setSelectedChatFile] = useState<File | null>(null);
  const [selectedChatAsset, setSelectedChatAsset] = useState<SurveyChatAsset | null>(null);
  const [isChatAssetUploading, setIsChatAssetUploading] = useState(false);
  const summaryChatEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const chatSessionIdRef = useRef<string | null>(null);
  if (chatSessionIdRef.current === null) {
    const storageKey = `survey-chat-session:${survey.surveyId}`;
    const storedSessionId = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    const sessionId = storedSessionId || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (!storedSessionId && typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, sessionId);
    }
    chatSessionIdRef.current = sessionId;
  }

  const formatDate = (iso: string) =>
    iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    let mounted = true;

    const loadResponses = async () => {
      if (!token) return;
      setLoadingResponses(true);
      setResponseError(null);
      try {
        const data = await fetchSurveyResponses(survey.surveyId, token);
        if (mounted) {
          setResponses(data);
        }
      } catch (error) {
        if (mounted) {
          setResponseError(error instanceof Error ? error.message : 'Failed to load responses');
        }
      } finally {
        if (mounted) {
          setLoadingResponses(false);
        }
      }
    };

    loadResponses();
    return () => {
      mounted = false;
    };
  }, [survey.surveyId, token]);

  useEffect(() => {
    summaryChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [summaryChatMessages]);

  useEffect(() => {
    if (!token || !chatSessionIdRef.current) return;
    let mounted = true;
    fetchSurveyChatMessages(survey.surveyId, chatSessionIdRef.current, token)
      .then((messages) => {
        if (!mounted) return;
        setSummaryChatMessages(messages.map((message: SurveyChatMessage) => ({
          id: message.messageId,
          content: message.content,
          role: message.role,
          createdAt: message.createdAt,
          assets: message.assets,
        })));
      })
      .catch((error) => console.warn('Failed to load survey chat history:', error));
    return () => {
      mounted = false;
    };
  }, [survey.surveyId, token]);

  const sortedResponses = useMemo(() => {
    return [...responses]
      .filter((response) => hasMeaningfulAnswersMap(response.answers))
      .sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
      });
  }, [responses]);

  const embeddedResponses = useMemo(() => {
    const raw = (survey as Survey & { responses?: unknown[] }).responses;
    if (!Array.isArray(raw)) return [];

    return raw
      .map((entry, index) => {
      const item = entry as Record<string, unknown>;
      const answers =
        item && typeof item.answers === 'object' && !Array.isArray(item.answers)
          ? (item.answers as Record<string, string | string[] | number>)
          : {};

      return {
        responseId: String(item?.responseId ?? item?.id ?? `embedded_${index + 1}`),
        respondentId:
          typeof item?.respondentId === 'string' ? item.respondentId : undefined,
        submittedAt:
          typeof item?.submittedAt === 'string'
            ? item.submittedAt
            : typeof item?.createdAt === 'string'
            ? item.createdAt
            : undefined,
        answers,
        questionLabels:
          item?.questionLabels && typeof item.questionLabels === 'object'
            ? (item.questionLabels as Record<string, string>)
            : undefined,
        optionLabels:
          item?.optionLabels && typeof item.optionLabels === 'object'
            ? (item.optionLabels as Record<string, string>)
            : undefined,
        rowLabels:
          item?.rowLabels && typeof item.rowLabels === 'object'
            ? (item.rowLabels as Record<string, string>)
            : undefined,
      } as SurveyResponseEntry;
      })
      .filter((response) => hasMeaningfulAnswersMap(response.answers));
  }, [survey]);

  const displayResponses = useMemo(() => {
    if (sortedResponses.length > 0) return sortedResponses;
    if (embeddedResponses.length > 0) {
      return [...embeddedResponses].sort((a, b) => {
        const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return bTime - aTime;
      });
    }
    return [];
  }, [embeddedResponses, sortedResponses]);

  const liveTotalResponses = Math.max(survey.totalResponses ?? 0, displayResponses.length);

  const activeQuestions = useMemo(() => survey.questions || [], [survey.questions]);

  // Deleted questions are never archived or displayed — results only ever reflect the current active question set.
  const allDisplayQuestions = useMemo(() => survey.questions || [], [survey.questions]);

  // Option label resolver that handles current options, historical options, and submission snapshots
  const resolveOptionLabel = (
    rawVal: string | number | undefined | null,
    response?: SurveyResponseEntry,
    question?: SurveyQuestion
  ): string => {
    if (rawVal === undefined || rawVal === null) return '';
    const rawStr = String(rawVal);

    if (response?.optionLabels?.[rawStr]) {
      return response.optionLabels[rawStr];
    }

    const currentOpt = question?.options?.find((opt) => opt.id === rawStr);
    if (currentOpt?.label) {
      return currentOpt.label;
    }

    const histOpt = question?.historicalOptions?.find((opt) => opt.id === rawStr);
    if (histOpt?.label) {
      return histOpt.label;
    }

    for (const q of survey.questions || []) {
      const found =
        q.options?.find((o) => o.id === rawStr) ||
        q.historicalOptions?.find((o) => o.id === rawStr);
      if (found?.label) return found.label;
    }

    return rawStr;
  };

  const resolveRowLabel = (
    rowId: string,
    response?: SurveyResponseEntry,
    question?: SurveyQuestion
  ): string => {
    if (response?.rowLabels?.[rowId]) {
      return response.rowLabels[rowId];
    }
    const current = question?.rows?.find((r) => r.id === rowId);
    if (current?.label) return current.label;
    const hist = question?.historicalRows?.find((r) => r.id === rowId);
    if (hist?.label) return hist.label;

    for (const q of survey.questions || []) {
      const found =
        q.rows?.find((r) => r.id === rowId) ||
        q.historicalRows?.find((r) => r.id === rowId);
      if (found?.label) return found.label;
    }

    return rowId;
  };

  const getAllQuestionRows = (question: SurveyQuestion) => {
    const rowMap = new Map<string, { id: string; label: string }>();
    (question.rows || []).forEach((r) => {
      if (r && r.id) rowMap.set(r.id, { id: r.id, label: r.label || r.id });
    });
    (question.historicalRows || []).forEach((r) => {
      if (r && r.id && !rowMap.has(r.id)) {
        rowMap.set(r.id, { id: r.id, label: r.label || r.id });
      }
    });
    displayResponses.forEach((res) => {
      if (res.answers && typeof res.answers === 'object') {
        const prefix = `${question.questionId}_`;
        Object.keys(res.answers).forEach((k) => {
          if (k.startsWith(prefix)) {
            const rowId = k.substring(prefix.length);
            if (rowId && !rowMap.has(rowId)) {
              const label = resolveRowLabel(rowId, res, question);
              rowMap.set(rowId, { id: rowId, label });
            }
          }
        });
      }
    });
    return Array.from(rowMap.values());
  };

  const computedQuestionResults = useMemo(() => {
    const source = displayResponses;
    if (source.length === 0) return survey.questionResults ?? {};

    type ComputedQuestionResult = {
      answerCount?: number;
      choiceResults?: { label: string; count: number; percentage: number }[];
      ratingResults?: { avg: number; distribution: { score: number; count: number }[] };
      textResponses?: string[];
      gridResults?: { rowId: string; rowLabel: string; choiceResults: { label: string; count: number; percentage: number }[] }[];
    };

    const byQuestion: Record<string, ComputedQuestionResult> = {};

    allDisplayQuestions.forEach((question) => {
      const answeredValues = source
        .map((response) => response.answers?.[question.questionId])
        .filter((value) => {
          if (value === undefined || value === null) return false;
          if (Array.isArray(value)) return value.length > 0;
          if (typeof value === 'string') return value.trim().length > 0;
          return true;
        });

      const answerCount = answeredValues.length;

      if (question.type === 'single_choice' || question.type === 'multiple_choice' || question.type === 'dropdown') {
        const optionCounts = new Map<string, number>();

        // Seed defined current and historical options
        (question.options || []).forEach((opt) => {
          if (opt.label) optionCounts.set(opt.label, 0);
        });
        (question.historicalOptions || []).forEach((opt) => {
          if (opt.label && !optionCounts.has(opt.label)) {
            optionCounts.set(opt.label, 0);
          }
        });

        source.forEach((response) => {
          const val = response.answers?.[question.questionId];
          if (val === undefined || val === null) return;

          if (Array.isArray(val)) {
            val.forEach((item) => {
              const label = resolveOptionLabel(item, response, question);
              if (label) {
                optionCounts.set(label, (optionCounts.get(label) || 0) + 1);
              }
            });
          } else {
            const label = resolveOptionLabel(val, response, question);
            if (label) {
              optionCounts.set(label, (optionCounts.get(label) || 0) + 1);
            }
          }
        });

        const totalSelections = Array.from(optionCounts.values()).reduce((acc, n) => acc + n, 0);
        byQuestion[question.questionId] = {
          answerCount,
          choiceResults: Array.from(optionCounts.entries()).map(([label, count]) => {
            const denominator = question.type === 'multiple_choice' ? answerCount : totalSelections;
            return {
              label,
              count,
              percentage: denominator > 0 ? (count / denominator) * 100 : 0,
            };
          }),
        };
        return;
      }

      if (question.type === 'rating_scale') {
        const distribution = [1, 2, 3, 4, 5].map((score) => ({ score, count: 0 }));
        const scores = answeredValues
          .map((value) => Number(value))
          .filter((score) => Number.isFinite(score) && score >= 1 && score <= 5);

        scores.forEach((score) => {
          const slot = distribution.find((entry) => entry.score === score);
          if (slot) slot.count += 1;
        });

        const total = scores.length;
        byQuestion[question.questionId] = {
          answerCount,
          ratingResults: {
            avg: total > 0 ? scores.reduce((acc, score) => acc + score, 0) / total : 0,
            distribution,
          },
        };
        return;
      }

      if (question.type === 'multiple_choice_grid' || question.type === 'checkbox_grid') {
        const allRows = getAllQuestionRows(question);

        const gridResults = allRows.map((row) => {
          const optionCounts = new Map<string, number>();
          (question.options || []).forEach((opt) => {
            if (opt.label) optionCounts.set(opt.label, 0);
          });
          (question.historicalOptions || []).forEach((opt) => {
            if (opt.label && !optionCounts.has(opt.label)) {
              optionCounts.set(opt.label, 0);
            }
          });

          let rowAnswerCount = 0;
          source.forEach((response) => {
            const val = response.answers?.[`${question.questionId}_${row.id}`];
            if (val === undefined || val === null) return;
            if (Array.isArray(val)) {
              if (val.length > 0) rowAnswerCount++;
              val.forEach((item) => {
                const label = resolveOptionLabel(item, response, question);
                if (label) optionCounts.set(label, (optionCounts.get(label) || 0) + 1);
              });
            } else if (String(val).trim().length > 0) {
              rowAnswerCount++;
              const label = resolveOptionLabel(val, response, question);
              if (label) optionCounts.set(label, (optionCounts.get(label) || 0) + 1);
            }
          });

          const totalSelections = Array.from(optionCounts.values()).reduce((acc, n) => acc + n, 0);
          const denominator = question.type === 'checkbox_grid' ? rowAnswerCount : totalSelections;

          return {
            rowId: row.id,
            rowLabel: row.label,
            choiceResults: Array.from(optionCounts.entries()).map(([label, count]) => ({
              label,
              count,
              percentage: denominator > 0 ? (count / denominator) * 100 : 0,
            })),
          };
        });

        const gridAnswerCount = source.filter((res) =>
          allRows.some((row) => {
            const val = res.answers?.[`${question.questionId}_${row.id}`];
            if (Array.isArray(val)) return val.length > 0;
            return val !== undefined && val !== null && String(val).trim().length > 0;
          })
        ).length;

        byQuestion[question.questionId] = {
          answerCount: gridAnswerCount,
          gridResults,
        };
        return;
      }

      const textResponses = answeredValues.map((value) => String(value)).filter((value) => value.trim());
      byQuestion[question.questionId] = {
        answerCount,
        textResponses,
      };
    });

    return byQuestion;
  }, [allDisplayQuestions, displayResponses, survey.questionResults]);

  const formatAnswer = (response: SurveyResponseEntry, question: SurveyQuestion) => {
    const value = response.answers?.[question.questionId];

    if (question.type === 'multiple_choice_grid' || question.type === 'checkbox_grid') {
      const allRows = getAllQuestionRows(question);

      return allRows
        .map((row) => {
          const rowLabel = resolveRowLabel(row.id, response, question);
          const val = response.answers?.[`${question.questionId}_${row.id}`];
          if (Array.isArray(val)) {
            if (!val.length) return `${rowLabel}: No answer`;
            const mapped = val.map((v) => resolveOptionLabel(v, response, question)).join(', ');
            return `${rowLabel}: ${mapped}`;
          }
          if (!val || String(val).trim() === '') return `${rowLabel}: No answer`;
          const mapped = resolveOptionLabel(val, response, question);
          return `${rowLabel}: ${mapped}`;
        })
        .join(' | ');
    }

    if (value === undefined || value === null) {
      return 'No answer';
    }
    if (Array.isArray(value)) {
      if (!value.length) return 'No answer';
      return value
        .map((item) => resolveOptionLabel(item, response, question))
        .join(', ');
    }
    if (typeof value === 'string') {
      if (!value.trim()) return 'No answer';
      if (
        question.type === 'single_choice' ||
        question.type === 'multiple_choice' ||
        question.type === 'dropdown'
      ) {
        return resolveOptionLabel(value, response, question);
      }
      return value;
    }
    return String(value);
  };

  const hasAnswerForQuestion = (response: SurveyResponseEntry, question: SurveyQuestion): boolean => {
    if (!response.answers || typeof response.answers !== 'object') return false;
    if (question.type === 'multiple_choice_grid' || question.type === 'checkbox_grid') {
      const prefix = `${question.questionId}_`;
      return Object.keys(response.answers).some((key) => {
        if (!key.startsWith(prefix)) return false;
        const val = response.answers[key];
        return hasMeaningfulAnswerValue(val);
      });
    }
    const val = response.answers[question.questionId];
    return hasMeaningfulAnswerValue(val);
  };

  const getQuestionsForResponse = (): SurveyQuestion[] => {
    // Deleted questions are never shown, even if a response has leftover answers for them.
    return allDisplayQuestions;
  };

  const liveCompletionRate = useMemo(() => {
    if (displayResponses.length > 0) {
      let completeCount = 0;
      displayResponses.forEach((response) => {
        const questionsForResp = getQuestionsForResponse();
        if (questionsForResp.length === 0) return;
        // A response is considered complete if all questions for that response version received an answer
        const isComplete = questionsForResp.every((q) => hasAnswerForQuestion(response, q));
        if (isComplete) completeCount++;
      });
      return Math.round((completeCount / displayResponses.length) * 100);
    }

    if (typeof survey.completionRate === 'number') {
      return Math.round(survey.completionRate);
    }

    return null;
  }, [displayResponses, allDisplayQuestions, survey.completionRate, activeQuestions]);

  const completionStats = useMemo(() => {
    const invitedEmails = (survey.invitedEmails || []).map((e) => String(e).trim().toLowerCase()).filter(Boolean);

    if (invitedEmails.length > 0) {
      // 1. Get unique lowercased submitted emails from responses
      const submittedEmailSet = new Set(
        displayResponses
          .map((r) => String(r.respondentId || '').trim().toLowerCase())
          .filter((id) => Boolean(id && id !== 'anonymous'))
      );

      // 2. Count matching invited emails that have submitted
      const submittedCount = invitedEmails.filter((email) => submittedEmailSet.has(email)).length;
      const totalInvited = invitedEmails.length;
      const ratePercent = Math.round((submittedCount / totalInvited) * 100);

      return {
        label: 'Completion Rate',
        ratio: `${submittedCount} / ${totalInvited}`,
        percentage: `${ratePercent}%`,
        isInvitedMode: true,
        submittedCount,
        totalInvited,
      };
    }

    return {
      label: 'Completion Rate',
      ratio: null,
      percentage: typeof liveCompletionRate === 'number' ? `${liveCompletionRate}%` : '—',
      isInvitedMode: false,
    };
  }, [survey.invitedEmails, displayResponses, liveCompletionRate]);

  const downloadCsv = () => {
    const rows: string[][] = [[
      'responseNumber',
      'responseId',
      'submittedAt',
      'respondentId',
      ...allDisplayQuestions.map(
        (question, index) => `Q${index + 1}: ${question.text || `Question ${index + 1}`}`
      ),
    ]];

    if (displayResponses.length === 0) {
      rows.push(['', '', '', '', ...allDisplayQuestions.map(() => 'No responses yet')]);
    } else {
      displayResponses.forEach((response, index) => {
        rows.push([
          String(displayResponses.length - index),
          response.responseId,
          response.submittedAt || '',
          response.respondentId || 'anonymous',
          ...allDisplayQuestions.map((question) => formatAnswer(response, question)),
        ]);
      });
    }

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${survey.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'survey'}-results.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Survey CSV exported');
  };

  const handleGenerateAiSummary = async () => {
    if (!token) {
      toast.error('You must be signed in to generate a survey summary');
      return;
    }
    if (displayResponses.length === 0) {
      toast.error('No responses are available to summarize');
      return;
    }

    setGeneratingAiSummary(true);
    try {
      const summary = await generateSurveyResponseSummary(
        survey.surveyId,
        survey.title,
        allDisplayQuestions,
        displayResponses,
        token,
      );
      setAiResponseSummary(summary);
      toast.success('AI response summary generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate AI response summary');
    } finally {
      setGeneratingAiSummary(false);
    }
  };

  const handleSummaryChatSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const question = summaryChatInput.trim();
    if ((!question && !selectedChatAsset) || !aiResponseSummary || isSummaryChatLoading || isChatAssetUploading) return;
    const effectiveQuestion = question || 'Please analyze this attachment.';

    const userMessageId = `${Date.now()}-user`;
    const assistantMessageId = `${Date.now()}-assistant`;
    const createdAt = new Date().toISOString();
    const assets = selectedChatAsset ? [selectedChatAsset] : [];
    setSummaryChatInput('');
    setSelectedChatFile(null);
    setSelectedChatAsset(null);
    setSummaryChatMessages((current) => [
      ...current,
      { id: userMessageId, content: effectiveQuestion, role: 'user' as const, createdAt, assets },
      { id: assistantMessageId, content: '', role: 'assistant', createdAt },
    ]);
    setIsSummaryChatLoading(true);
    const sessionId = chatSessionIdRef.current;

    try {
      if (sessionId && token) {
        await saveSurveyChatMessage(survey.surveyId, sessionId, {
          messageId: userMessageId,
          content: effectiveQuestion,
          role: 'user',
          createdAt,
          assets,
        }, token);
      }
      let assistantContent = '';
      await askSurveySummaryQuestion(
        survey.title,
        aiResponseSummary.summary,
        effectiveQuestion,
        (chunk) => {
          assistantContent += chunk;
          setSummaryChatMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: message.content + chunk }
                : message
            )
          );
        },
        assets,
      );
      if (sessionId && token && assistantContent) {
        await saveSurveyChatMessage(survey.surveyId, sessionId, {
          messageId: assistantMessageId,
          content: assistantContent,
          role: 'assistant',
          createdAt: new Date().toISOString(),
        }, token);
      }
    } catch (error) {
      setSummaryChatMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: error instanceof Error ? error.message : 'Failed to get an AI response',
              }
            : message
        )
      );
    } finally {
      setIsSummaryChatLoading(false);
    }
  };

  const handleRemoveSelectedChatAsset = () => {
    const asset = selectedChatAsset;
    setSelectedChatFile(null);
    setSelectedChatAsset(null);
    if (asset && token) {
      deleteSurveyChatAsset(survey.surveyId, asset.s3Key, token).catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to remove attachment');
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 font-libre">
      <AllStoriesHeader onBack={onBack} />

      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="mb-4 md:hidden">
            <AdminMobileSidebarToggle className="border border-gray-300" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-merriweather">{survey.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(survey.startTime)} — {formatDate(survey.endTime)}
              </p>
              {survey.description && (
                <p className="text-sm text-gray-500 mt-0.5">{survey.description}</p>
              )}
            </div>
            <CustomButton
              onClick={downloadCsv}
              variant="white"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap flex-shrink-0"
            >
              <Download size={15} />
              Export CSV
            </CustomButton>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-200 bg-white p-4 text-center flex flex-col justify-center items-center">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {liveTotalResponses.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total Responses</div>
            </div>

            <div className="border border-gray-200 bg-white p-4 text-center flex flex-col justify-center items-center">
              {completionStats.ratio ? (
                <div className="flex items-baseline justify-center gap-1.5 leading-tight">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                    {completionStats.ratio}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-gray-500">
                    ({completionStats.percentage})
                  </span>
                </div>
              ) : (
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                  {completionStats.percentage}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">{completionStats.label}</div>
            </div>

            <div className="border border-gray-200 bg-white p-4 text-center flex flex-col justify-center items-center">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {allDisplayQuestions.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">Questions</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CustomButton
              onClick={() => setActiveView('summary')}
              variant={activeView === 'summary' ? 'black' : 'white'}
              disableHover
              className="px-4 py-2 text-xs font-semibold"
            >
              Summary
            </CustomButton>
            <CustomButton
              onClick={() => setActiveView('responses')}
              variant={activeView === 'responses' ? 'black' : 'white'}
              disableHover
              className="px-4 py-2 text-xs font-semibold"
            >
              Responses
            </CustomButton>
            <CustomButton
              onClick={() => setActiveView('ai_summary')}
              variant={activeView === 'ai_summary' ? 'black' : 'white'}
              disableHover
              className="px-4 py-2 text-xs font-semibold"
            >
              AI Summary
            </CustomButton>
          </div>

          {activeView === 'summary' && (
            <>
          {/* Per-question results */}
          {allDisplayQuestions.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 text-sm">
              No questions found for this survey.
            </div>
          ) : (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-800">Question Results</h2>
              {allDisplayQuestions.map((q) => {
                const result = computedQuestionResults?.[q.questionId];
                const choiceResults = result?.choiceResults;
                const ratingResults = result?.ratingResults;
                const textResults = result?.textResponses;
                const gridResults = result?.gridResults;

                const activeIdx = activeQuestions.findIndex((aq) => aq.questionId === q.questionId);
                const qBadge = `Q${activeIdx + 1}`;

                const totalAnswers = result?.answerCount ??
                  (choiceResults
                    ? choiceResults.reduce((acc: number, r: { count: number }) => acc + r.count, 0)
                    : ratingResults
                    ? ratingResults.distribution.reduce((acc: number, d: { count: number }) => acc + d.count, 0)
                    : textResults
                    ? textResults.length
                    : 0);

                return (
                  <div key={q.questionId} className="border border-gray-200 bg-white p-5 space-y-4">
                    {/* Question meta */}
                    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {qBadge}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mt-1 leading-snug">
                          {q.text}
                        </h3>
                        {q.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{q.description}</p>
                        )}
                        <span className="text-xs text-gray-500">
                          {QUESTION_TYPE_LABELS[q.type] ?? q.type.replace(/_/g, ' ')}
                          {q.required && (
                            <span className="ml-1 text-red-400 font-medium">· Required</span>
                          )}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-bold text-gray-900">
                          {totalAnswers.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">answers</div>
                      </div>
                    </div>

                    {/* Chart visual summary */}
                    {q.type === 'single_choice' && (
                      <SingleChoicePieChart results={choiceResults || []} totalAnswers={totalAnswers} />
                    )}

                    {q.type === 'multiple_choice' && (
                      <CheckboxHorizontalBarChart results={choiceResults || []} totalAnswers={totalAnswers} />
                    )}

                    {q.type === 'dropdown' && (
                      <DropdownPieChart results={choiceResults || []} totalAnswers={totalAnswers} />
                    )}

                    {q.type === 'multiple_choice_grid' && (
                      <GridVerticalBarChart gridResults={gridResults || []} isCheckbox={false} totalAnswers={totalAnswers} />
                    )}

                    {q.type === 'checkbox_grid' && (
                      <GridVerticalBarChart gridResults={gridResults || []} isCheckbox={true} totalAnswers={totalAnswers} />
                    )}

                    {q.type === 'rating_scale' && ratingResults && (
                      <RatingScaleBarChart results={ratingResults} totalAnswers={totalAnswers} />
                    )}

                    {(q.type === 'short_text' || q.type === 'paragraph') && (
                      <TextResponsesChart responses={textResults || []} totalAnswers={totalAnswers} />
                    )}

                    {!choiceResults && !ratingResults && !textResults && !gridResults && (
                      <p className="text-sm text-gray-400 italic">No responses yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
            </>
          )}

          {activeView === 'responses' && (
            <div className="space-y-4">
              {loadingResponses && (
                <div className="border border-gray-200 bg-white p-4 text-sm text-gray-500">
                  Loading responses...
                </div>
              )}

              {!loadingResponses && responseError && (
                <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                  {responseError}
                </div>
              )}

              {!loadingResponses && !responseError && displayResponses.length === 0 && (
                <div className="border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
                  No responses submitted yet.
                </div>
              )}

              {!loadingResponses && !responseError && displayResponses.length === 0 && liveTotalResponses > 0 && (
                <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  Responses count exists ({liveTotalResponses.toLocaleString()}) but raw response rows are unavailable for this survey.
                </div>
              )}

              {!loadingResponses && !responseError && displayResponses.length > 0 && (
                <div className="space-y-4">
                  {displayResponses.map((response, responseIndex) => (
                    <div key={response.responseId} className="border border-gray-200 bg-white p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Response #{displayResponses.length - responseIndex}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Submitted: {formatDateTime(response.submittedAt)}
                          </p>
                        </div>
                        {response.respondentId && (
                          <span className="text-xs text-gray-500">Respondent: {response.respondentId}</span>
                        )}
                      </div>

                      <div className="space-y-3">
                        {getQuestionsForResponse().map((question) => {
                          const questionLabel =
                            response.questionLabels?.[question.questionId] || question.text;

                          const activeIdx = activeQuestions.findIndex((aq) => aq.questionId === question.questionId);
                          const qBadge = `Q${activeIdx + 1}`;

                          return (
                            <div
                              key={`${response.responseId}_${question.questionId}`}
                              className="border border-gray-100 p-3"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {qBadge}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900 mt-1">
                                {questionLabel}
                              </p>
                              {question.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{question.description}</p>
                              )}
                              <p className="text-sm text-gray-700 mt-2">
                                {formatAnswer(response, question)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'ai_summary' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <CustomButton
                  onClick={handleGenerateAiSummary}
                  disabled={generatingAiSummary || loadingResponses || displayResponses.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                >
                  <Sparkles size={15} />
                  {generatingAiSummary ? 'Generating Summary...' : 'Generate AI Summary'}
                </CustomButton>
              </div>

              {loadingResponses && (
                <div className="border border-gray-200 bg-white p-4 text-sm text-gray-500">
                  Loading responses...
                </div>
              )}

              {aiResponseSummary && (
                <>
                  <div className="border border-gray-200 bg-white p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-gray-800">AI Response Summary</h2>
                      <span className="text-xs text-gray-500">
                        Based on {aiResponseSummary.responseCount.toLocaleString()} responses
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      <AiResponseText content={aiResponseSummary.summary} />
                    </div>
                    <p className="text-xs text-gray-400">Generated {formatDateTime(aiResponseSummary.generatedAt)}</p>
                  </div>

                  <div className="border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 px-5 py-3">
                      <h2 className="text-sm font-semibold text-gray-800">Ask about this summary</h2>
                    </div>
                    {(summaryChatMessages.length > 0 || isSummaryChatLoading) && (
                      <div className="max-h-80 overflow-y-auto px-5 py-4 space-y-5">
                        {summaryChatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                message.role === 'user' ? 'bg-gray-100 text-black rounded' : 'bg-white text-black'
                              }`}
                            >
                              {message.assets?.map((asset) => (
                                <div key={asset.assetId} className="mb-2">
                                  {asset.contentType.startsWith('image/') ? (
                                    <a href={asset.url} target="_blank" rel="noreferrer">
                                      <img
                                        src={asset.url}
                                        alt={asset.fileName}
                                        className="max-h-48 max-w-full rounded border border-gray-200 object-contain"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      href={asset.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1 text-xs text-gray-600 underline"
                                    >
                                      <Paperclip size={12} />{asset.fileName}
                                    </a>
                                  )}
                                </div>
                              ))}
                              {message.role === 'assistant' ? (
                                <AiResponseText content={message.content} />
                              ) : (
                                message.content
                              )}
                            </div>
                          </div>
                        ))}
                        {isSummaryChatLoading && (
                          <div className="flex justify-start">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-black" />
                          </div>
                        )}
                        <div ref={summaryChatEndRef} />
                      </div>
                    )}
                    {selectedChatFile && (
                      <div className="flex items-center gap-2 border-t border-gray-200 px-4 pt-3 text-xs text-gray-600">
                        <Paperclip size={13} />
                        <span className="truncate">{selectedChatFile.name}</span>
                        <button
                          type="button"
                          onClick={handleRemoveSelectedChatAsset}
                          aria-label="Remove attachment"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleSummaryChatSubmit} className="relative border-t border-gray-200 p-4">
                      <input
                        ref={chatFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv,text/markdown,text/html,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.txt,.csv,.md,.html,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0] || null;
                          event.target.value = '';
                          setSelectedChatFile(file);
                          setSelectedChatAsset(null);
                          if (!file || !chatSessionIdRef.current || !token) return;
                          setIsChatAssetUploading(true);
                          try {
                            const asset = await uploadSurveyChatAsset(
                              survey.surveyId,
                              chatSessionIdRef.current,
                              file,
                              token,
                            );
                            setSelectedChatAsset(asset);
                          } catch (error) {
                            setSelectedChatFile(null);
                            toast.error(error instanceof Error ? error.message : 'Failed to upload attachment');
                          } finally {
                            setIsChatAssetUploading(false);
                          }
                        }}
                      />
                      <button type="button" onClick={() => chatFileInputRef.current?.click()} className="absolute left-6 top-1/2 -translate-y-1/2 p-2 text-gray-900" aria-label="Attach a file">
                        <Paperclip size={16} />
                      </button>
                      <input
                        type="text"
                        value={summaryChatInput}
                        onChange={(event) => setSummaryChatInput(event.target.value)}
                        placeholder="Search With aI..."
                        disabled={isSummaryChatLoading}
                        className="w-full border border-black py-3 pl-12 pr-12 text-sm text-gray-900 placeholder-gray-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={(!summaryChatInput.trim() && !selectedChatAsset) || isSummaryChatLoading || isChatAssetUploading}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-gray-900 disabled:text-gray-300"
                        aria-label="Send message"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                </>
              )}

              {!aiResponseSummary && !loadingResponses && (
                <div className="border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
                  No AI summary generated yet. Click "Generate AI Summary" to create one.
                </div>
              )}
            </div>
          )}

          {/* Privacy note */}
          <div className="text-xs text-gray-400 border-t border-gray-100 pt-4">
            Responses are anonymous and used only to improve OpenPress content. Raw data is not
            shared with advertisers.
          </div>
        </div>
      </div>
    </div>
  );
}
