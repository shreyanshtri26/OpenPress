// Paid third-party features are optional: each is on only when its settings are present.
// Routes that exist only for a disabled feature answer 503 from the router (see index.mjs);
// handlers that use a feature as a side step check isEnabled() and skip it.
const FEATURES = {
  analysis: { label: 'AI image and video analysis', enabled: () => process.env.ENABLE_IMAGE_ANALYSIS === 'true' },
  transcoding: { label: 'Video transcoding', enabled: () => Boolean(process.env.TRANSCODE_ENDPOINT && process.env.TRANSCODE_ROLE_ARN) },
  ai: { label: 'AI features (Gemini)', enabled: () => Boolean(process.env.GEMINI_API_KEY) },
  payments: { label: 'Support payments (YouPI PG)', enabled: () => Boolean(process.env.YOUPI_WEBHOOK_SECRET) },
  email: { label: 'Email sending', enabled: () => Boolean(process.env.EMAIL_SENDER) },
  search: { label: 'Web search', enabled: () => Boolean(process.env.BRAVE_API_KEY || process.env.GEMINI_API_KEY) },
};

const ROUTES = [
  [/^\/api\/analysis\//, 'analysis'],
  [/^\/api\/(transcodingTrigger|transcodingProcessor|getTranscodeEndpoint)$/, 'transcoding'],
  [/^\/ai\//, 'ai'],
  [/^\/api\/utils\/search$/, 'search'],
  [/^\/youpi\//, 'payments'],
  [/^\/surveys\/invite$/, 'email'],
];

export const isEnabled = (name) => Boolean(FEATURES[name]?.enabled());

export const featureForRoute = (path) => ROUTES.find(([re]) => re.test(path))?.[1] ?? null;

export const disabledResponse = (name) => ({
  statusCode: 503,
  body: JSON.stringify({ message: `${FEATURES[name].label} is turned off on this deployment`, feature: name, disabled: true }),
});
