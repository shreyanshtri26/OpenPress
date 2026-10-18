import jwt from "jsonwebtoken";
import { requestEventForLogging } from './requestLogging.mjs';
import { disabledResponse, featureForRoute, isEnabled } from './lib/features.mjs';

//Articles
import { handler as articleCreate } from './routes/articles/createArticle.mjs';
import { handler as getArticles } from './routes/articles/getArticles.mjs';
import { handler as articleEdit } from './routes/articles/editArticle.mjs';
import { handler as articleUpdate } from './routes/articles/updateArticle.mjs';
import { handler as getArticleById } from './routes/articles/getArticleById.mjs';
import { handler as getArticleBySlug } from './routes/articles/getArticlesBySlug.mjs';
import { handler as getArticleRemarks } from './routes/articles/getArticleRemarks.mjs';
import { handler as getArticlesByEditor } from './routes/articles/getArticlesByEditorOrJournalist.mjs';
import { handler as getJournalistArticles } from './routes/articles/getJournalistArticles.mjs';
import { handler as reviewArticle } from './routes/articles/reviewArticles.mjs';
import { handler as updateArticleStatus } from './routes/articles/updateArticleStatus.mjs';

//Story
import { handler as editComments } from './routes/story/editComment.mjs';
import { handler as deleteComments } from './routes/story/deleteComments.mjs';
import { handler as deleteStory } from './routes/story/deleteStory.mjs';
import { handler as deleteStoryPermanent } from './routes/story/deleteStoryPermanent.mjs';
import { handler as StoryCreate } from './routes/story/storyCreate.mjs';
import { handler as deleteDraft } from './routes/story/deleteDrafts.mjs';
import { handler as fetchStories } from './routes/story/fetchStory.mjs';
import { handler as fetchStoryById } from './routes/story/fetchStoryById.mjs';
import { handler as updateStoryDynamo } from './routes/story/updateStoryDynamo.mjs';
import { handler as getStorybyIdDynamo } from './routes/story/getStorybyIdDynamo.mjs';
import { handler as getStoryComments } from './routes/story/getStoryCommentsDynamo.mjs';
import { handler as postStoryCommentsDynamo } from './routes/story/postStoryCommentsDynamo.mjs';
import { handler as fetchDrafts } from './routes/story/fetchDrafts.mjs';
import { handler as updateStory } from './routes/story/updateStory.mjs';
import { handler as postStoryCommentAction } from './routes/story/postStoryCommentAction.mjs';
import { handler as fetchReadyToPublish } from './routes/story/fetchReadyToPublish.mjs';
import { handler as cronPublishScheduledStories } from './routes/story/cronPublishScheduledStories.mjs';

// Analytics
import { handler as analyticsCollect } from './routes/analytics/collect.mjs';
import { handler as analyticsReport } from './routes/analytics/report.mjs';
// AI (Gemini)
import { normalStream, streamResponse } from './routes/ai/generate.mjs';

// Page Builder`
import { handler as PagebuilderAutosave } from './routes/pagebuilder/autosaveStory.mjs';
import { handler as GetPageHydrated } from './routes/pagebuilder/getPage.mjs';
import { handler as saveHtmlToS3 } from './routes/pagebuilder/saveHtmlToS3.mjs';
import { handler as saveAboutHtmlToS3 } from './routes/pagebuilder/saveAboutHtmlToS3.mjs';
import { handler as saveSupportUsHtmlToS3 } from './routes/pagebuilder/saveSupportUsHtmlToS3.mjs';
import { handler as youpiWebhook } from './routes/youpi/webhook.mjs';
import { handler as savePrivacyPolicyHtmlToS3 } from './routes/pagebuilder/savePrivacyPolicyHtmlToS3.mjs';
import { handler as saveMediaCouncilHtmlToS3 } from './routes/pagebuilder/saveMediaCouncilHtmlToS3.mjs';
import { handler as saveContactUsHtmlToS3 } from './routes/pagebuilder/saveContactUsHtmlToS3.mjs';
import { handler as saveLoginHtmlToS3 } from './routes/pagebuilder/saveLoginHtmlToS3.mjs';
import { handler as saveHomeHtmlToS3 } from './routes/pagebuilder/saveHomeHtmlToS3.mjs';
import { handler as saveErrorHtmlToS3 } from './routes/pagebuilder/saveErrorHtmlToS3.mjs';
import { handler as saveSectionHtmlToS3 } from './routes/pagebuilder/saveSectionHtmlToS3.mjs';
import { handler as saveAuthorsHtmlToS3 } from './routes/pagebuilder/saveAuthorsHtmlToS3.mjs';
import { handler as saveAuthorHtmlToS3 } from './routes/pagebuilder/saveAuthorHtmlToS3.mjs';
import { handler as saveSurveyHtmlToS3 } from './routes/pagebuilder/saveSurveyHtmlToS3.mjs';
import { handler as saveSiteMapToS3 } from './routes/pagebuilder/saveSiteMapToS3.mjs';
import { handler as saveNewsSiteMapToS3 } from './routes/pagebuilder/saveNewsSiteMapToS3.mjs';
import { handler as savePwaFilesToS3 } from './routes/pagebuilder/savePwaFilesToS3.mjs';
import { handler as forceUpdatePwaIcons } from './routes/pagebuilder/forceUpdatePwaIcons.mjs';
import { handler as republishAll } from './routes/pagebuilder/republishAll.mjs';
import { handler as republishAllStatus } from './routes/pagebuilder/republishAllStatus.mjs';
import { runRepublishAllWorker } from './routes/pagebuilder/republishAllWorker.mjs';

//Users
import { handler as login } from './routes/users/login.mjs';
import { handler as getUsers } from './routes/users/getUsers.mjs';
import { handler as addUser } from './routes/users/addUser.mjs';
import { handler as getAllUsers } from './routes/users/getAllUsers.mjs';
import { handler as getAllAuthors } from './routes/users/getAuthors.mjs';
import { handler as deleteUser } from './routes/users/deleteUser.mjs';
import { handler as deleteAuthor } from './routes/users/deleteAuthor.mjs';
import { handler as editUser } from './routes/users/editUser.mjs';
import { handler as forgotPassword } from './routes/users/forgotPassword.mjs';
import { handler as resetPassword } from './routes/users/resetPassword.mjs';
import { handler as uploadUserImage } from './routes/users/uploadUserImage.mjs';
import { handler as updateProfile } from './routes/users/updateProfile.mjs';
import { handler as deleteAccount } from './routes/users/deleteAccount.mjs';
import { handler as getAudienceProfile } from './routes/users/getAudienceProfile.mjs';
import { handler as getAudienceUsers } from './routes/users/getAudienceUsers.mjs';

// Contact
import { handler as submitContactForm } from './routes/contact/submitForm.mjs';
import { handler as getInquiries } from './routes/contact/getInquiries.mjs';


//Roles
import { handler as createRole } from './routes/roles/addRole.mjs';
import { handler as getAllRoles } from './routes/roles/getAllRoles.mjs';
import { handler as deleteRole } from './routes/roles/deleteRole.mjs';
import { handler as updateRole } from './routes/roles/updateRole.mjs';
import { handler as getRoleList } from './routes/roles/getRoleList.mjs';
import { handler as getRolePermission } from "./routes/roles/getRolePermission.mjs";

// Taxonomy
import { handler as addTaxonomy } from './routes/taxonomy/addTaxonomy.mjs';
import { handler as getAllTaxonomies } from "./routes/taxonomy/getAllTaxonomies.mjs";
import { handler as addTaxValue } from "./routes/taxonomy/addTaxonomyValue.mjs";
import { handler as deleteTaxonomy } from "./routes/taxonomy/deleteTaxonomy.mjs";
import { handler as updateTaxonomyName } from "./routes/taxonomy/updateTaxonomy.mjs";
import { handler as deleteTaxonomyValue } from "./routes/taxonomy/deleteTaxonomyValue.mjs";
import { handler as updateTaxonomyValue } from "./routes/taxonomy/updateTaxonomyValue.mjs";
import { handler as updateTaxonomyPermissions } from "./routes/taxonomy/updateTaxonomyPermissions.mjs";
import { handler as getSectionValues } from "./routes/taxonomy/getSectionValues.mjs";
import { handler as taxonomyColors } from "./routes/taxonomy/colors.mjs";

//DAM
import { handler as uploadAsset } from './routes/dam/uploadAsset.mjs';
import { handler as createAsset } from './routes/dam/assetCreate.mjs';
import { handler as fetchAsset } from './routes/dam/fetchAsset.mjs';
import { handler as deleteAsset } from './routes/dam/deleteAsset.mjs';
import { handler as updateAsset } from './routes/dam/updateAsset.mjs';
import { handler as listS3Object } from './routes/dam/listS3Objects.mjs';
import { handler as generateSingleThumbnail } from './routes/dam/generateSingleThumbnail.mjs'
import { handler as generateThumbnail } from './routes/dam/generateThumbnail.mjs';
import { handler as uploadCustomThumbnail } from './routes/dam/uploadCustomThumbnail.mjs';
import { handler as confirmCustomThumbnail } from './routes/dam/confirmCustomThumbnail.mjs';
import { handler as selectThumbnail } from './routes/dam/selectThumbnail.mjs';
import { handler as extractMetadata } from './routes/dam/extractMetadata.mjs';
import { handler as transcodingTriggerHandler } from './routes/dam/transcodingTrigger.mjs';
import { handler as transcodingProcessorHandler } from './routes/dam/transcodingProcessor.mjs';
import { handler as getQualityVariantsHandler } from './routes/dam/getQualityVariants.mjs';
import { handler as getMediaconvertEndpoint } from './routes/dam/getMediaconvert-endpoint.mjs';
import { handler as getAssetStatus } from './routes/dam/getAssetStatus.mjs';
import { handler as getAllVideos } from "./routes/dam/getAllVideos.mjs";

// campaign's
import { handler as uploadCampaignAdImage } from './routes/campaigns/uploadCampaignAdImage.mjs';
import { handler as createCampaign } from './routes/campaigns/createCampaign.mjs';
import { handler as deleteCampaign } from './routes/campaigns/deleteCampaign.mjs';
import { handler as getCampaigns } from './routes/campaigns/getCampaigns.mjs';
import { handler as checkCampaignAvailability } from './routes/campaigns/checkAvailability.mjs';
import { handler as publishCampaign } from './routes/campaigns/publishCampaign.mjs';
import { handler as updateCampaign } from './routes/campaigns/updateCampaign.mjs';
import { handler as trackCampaignEvent } from './routes/campaigns/trackCampaignEvent.mjs';


// Surveys
import { handler as getSurveys } from './routes/surveys/getSurveys.mjs';
import { handler as createSurvey } from './routes/surveys/createSurvey.mjs';
import { handler as updateSurvey } from './routes/surveys/updateSurvey.mjs';
import { handler as deleteSurvey } from './routes/surveys/deleteSurvey.mjs';
import { handler as getPublicSurvey } from './routes/surveys/getPublicSurvey.mjs';
import { handler as submitSurveyResponse } from './routes/surveys/submitSurveyResponse.mjs';
import { handler as getSurveyResponses } from './routes/surveys/getSurveyResponses.mjs';
import { handler as sendSurveyInvites } from './routes/surveys/sendSurveyInvites.mjs';
import { handler as generateSurveyResponseSummary } from './routes/surveys/generateSurveyResponseSummary.mjs';
import { handler as getSurveyChatMessages } from './routes/surveys/getSurveyChatMessages.mjs';
import { handler as saveSurveyChatMessage } from './routes/surveys/saveSurveyChatMessage.mjs';
import { handler as createSurveyChatAssetUpload } from './routes/surveys/createSurveyChatAssetUpload.mjs';
import { handler as deleteSurveyChatAsset } from './routes/surveys/deleteSurveyChatAsset.mjs';

// Placements
import { handler as getPlacements } from './routes/placements/getPlacements.mjs';
import { handler as addPlacement } from './routes/placements/addPlacement.mjs';
import { handler as updatePlacement } from './routes/placements/updatePlacement.mjs';
import { handler as deletePlacement } from './routes/placements/deletePlacement.mjs';

// Utility
import { handler as proxyUrl } from './routes/utility/proxyUrl.mjs';

//AI
import { handler as getVideoAnalysis } from './routes/rekognition/videos/getVideoAnalysis.mjs';

//Faces Collections
import { handler as searchFaceByImage } from './routes/rekognition/faces/searchFaceByImage.mjs';
import { handler as createFaceCollections } from './routes/rekognition/faces/createFaceCollections.mjs';
import { handler as addFaceToCollection } from './routes/rekognition/faces/addFaceToCollection.mjs';
import { handler as listFaceCollections } from './routes/rekognition/faces/listFaceCollections.mjs';

// testing
import { handler as checkFfprobe } from './routes/test/checkFfprobe.mjs';

// Utils
import { handler as webSearch } from './routes/utils/webSearch.mjs';
import { handler as getSearchHistory } from './routes/utils/getSearchHistory.mjs';
import { handler as deleteSearchHistory } from './routes/utils/deleteSearchHistory.mjs';

// ePaper Reader Auth
import { handler as epaperSyncReader } from './routes/epaper/syncReader.mjs';
import { handler as epaperGetReaderProfile } from './routes/epaper/getReaderProfile.mjs';
import { handler as epaperLogoutReader } from './routes/epaper/logoutReader.mjs';


// ✅ GLOBAL CORS WRAPPER
const applyCors = (response, corsHeaders) => ({
  ...response,
  headers: {
    ...(response.headers || {}),
    ...corsHeaders,
  },
});

export const handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(requestEventForLogging(event), null, 2));

  // Early exit for EventBridge scheduled cron (no rawPath, just task marker)
  if (event.task === 'publishScheduledStories') {
    const cronResponse = await cronPublishScheduledStories(event);

    // Advance any pending site-wide republish with the time this invocation has
    // left. The worker swallows its own errors, so stories are never blocked.
    await runRepublishAllWorker(context);

    return cronResponse;
  }

  const rawPath = event.rawPath || event.path || '';
  const path = (rawPath.endsWith('/') && rawPath.length > 1) ? rawPath.slice(0, -1) : rawPath;
  const method = event.requestContext?.http?.method || event.httpMethod;

  // Add CORS authentication for API origin
  // Add JWT authentication for each request
  // Test case: you cannot run API from anywhere outside the browser

  //CORS LOGIC
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim().replace(/\/$/, ""))
    : [];

  const requestOrigin = (event.headers?.origin || event.headers?.Origin || "").replace(/\/$/, "");

  let corsHeaders = {};

  if (allowedOrigins.includes(requestOrigin)) {
    corsHeaders = {
      "Access-Control-Allow-Origin": requestOrigin,
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    };
  }
  if (!corsHeaders["Access-Control-Allow-Origin"] && allowedOrigins.length > 0) {
    corsHeaders["Access-Control-Allow-Origin"] = allowedOrigins[0];
    corsHeaders["Access-Control-Allow-Headers"] = "Authorization,Content-Type";
    corsHeaders["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS";
  }

  // Public survey routes and ePaper reader auth routes are served from S3/CloudFront static pages or ePaper site (port 8080) —
  // override to wildcard so any origin (S3 direct, CloudFront, localhost:8080) can call them.
  if (
    path.startsWith('/surveys/public/') ||
    path.match(/^\/surveys\/[^/]+\/responses$/) ||
    path.startsWith('/epaper/auth/') ||
    path.startsWith('/api/epaper/auth/')
  ) {
    corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    };
  }


  if (method === "OPTIONS") {
    return applyCors({ statusCode: 200, body: "" }, corsHeaders);
  }

  // JWT AUTH LOGIC
  try {
    const publicRoutes = [
      '/pagestudio/forceUpdatePwaIcons', '/pagebuilder/forceUpdatePwaIcons',
      '/api/pagestudio/forceUpdatePwaIcons', '/api/pagebuilder/forceUpdatePwaIcons',
      '/loginDynamo', '/forgotPassword', '/resetPassword', '/contact/submit',
      '/story/fetchReadyToPublish', '/campaigns/trackEvent', '/analytics/collect', '/youpi/webhook',
      '/story/scrapedStories', '/api/scrapedStories', '/api/scraped-stories', '/api/articles/fetchScrapedStories',
    ];
    // Public survey routes — no JWT needed (reader-facing)
    const isPublicSurveyFetch = path.startsWith('/surveys/public/') && method === 'GET';
    const isPublicSurveyResponse = path.match(/^\/surveys\/[^\/]+\/responses$/) && method === 'POST';
    // ePaper reader auth routes handle their own reader JWT/token logic
    const isEpaperAuthRoute = path.startsWith('/epaper/auth/') || path.startsWith('/api/epaper/auth/');
    const isPublicRoute = publicRoutes.includes(path) || (path === '/taxonomy/colors' && method === 'GET') || isPublicSurveyFetch || isPublicSurveyResponse || isEpaperAuthRoute;

    if (!isPublicRoute) {
      const authHeader = event.headers?.Authorization || event.headers?.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return applyCors({
          statusCode: 401,
          body: JSON.stringify({ message: "401 Unauthorized request" }),
        }, corsHeaders);
      }

      const token = authHeader.split(" ")[1];

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        event.user = decoded;
      } catch {
        return applyCors({
          statusCode: 401,
          body: JSON.stringify({ message: "401 Unauthorized request" }),
        }, corsHeaders);
      }
    }
  } catch {
    return applyCors({
      statusCode: 401,
      body: JSON.stringify({ message: "401 Unauthorized request" }),
    }, corsHeaders);
  }

  // ✅ ROLE-BASED ACCESS CONTROL (RBAC) FOR ADMIN OPERATIONS
  const superUserOnlyRoutes = [
    { path: "/addUser", method: "POST" },
    { path: "/deleteUser", method: "DELETE" },
    { path: "/deleteAuthor", method: "DELETE" },
    { path: "/editUser", method: "PUT" },
    { path: "/addRole", method: "POST" },
    { path: "/deleteRole", method: "DELETE" },
    { path: "/updateRole", method: "PUT" },
  ];

  const isRestrictedRoute = superUserOnlyRoutes.some(
    (r) => r.path === path && r.method === method
  );

  if (isRestrictedRoute) {
    const userRole = event.user?.role?.toLowerCase()?.replace(/_/g, ' ');
    if (userRole !== "super user") {
      return applyCors(
        {
          statusCode: 403,
          body: JSON.stringify({
            message: "Forbidden: Only super users can manage users and roles",
          }),
        },
        corsHeaders
      );
    }
  }

  const surveyRoutes = [
    { path: '/surveys', method: 'GET' },
    { path: '/surveys', method: 'POST' },
    { path: '/surveys', method: 'PUT' },
    { path: '/surveys', method: 'DELETE' },
    { path: '/surveys/invite', method: 'POST' },
  ];

  const isSurveyRoute = surveyRoutes.some(
    (route) => route.path === path && route.method === method
  );

  if (isSurveyRoute) {
    const userRole = event.user?.role?.toLowerCase()?.replace(/_/g, ' ');
    const allowedRoles = new Set(['admin', 'editor', 'super user']);

    if (!allowedRoles.has(userRole)) {
      return applyCors(
        {
          statusCode: 403,
          body: JSON.stringify({
            message: 'Forbidden: Only admin/editor users can manage surveys',
          }),
        },
        corsHeaders
      );
    }
  }

  const isSurveyResponsesReadRoute =
    Boolean(path.match(/^\/surveys\/[^/]+\/responses$/)) && method === 'GET';
  const isSurveyResponseSummaryRoute =
    Boolean(path.match(/^\/surveys\/[^/]+\/ai-summary$/)) && method === 'POST';
  const isSurveyChatRoute =
    Boolean(path.match(/^\/surveys\/[^/]+\/chat$/)) && (method === 'GET' || method === 'POST');
  const isSurveyChatAssetRoute =
    Boolean(path.match(/^\/surveys\/[^/]+\/chat\/assets$/)) && (method === 'POST' || method === 'DELETE');

  if (isSurveyResponsesReadRoute || isSurveyResponseSummaryRoute || isSurveyChatRoute || isSurveyChatAssetRoute) {
    const userRole = event.user?.role?.toLowerCase()?.replace(/_/g, ' ');
    const allowedRoles = new Set(['admin', 'editor', 'super user']);

    if (!allowedRoles.has(userRole)) {
      return applyCors(
        {
          statusCode: 403,
          body: JSON.stringify({
            message: 'Forbidden: Only admin/editor users can view survey responses',
          }),
        },
        corsHeaders
      );
    }
  }

  // Paid features that are not configured answer with a clear 503 instead of failing inside AWS calls.
  const disabledFeature = featureForRoute(path);
  if (disabledFeature && !isEnabled(disabledFeature)) {
    return applyCors(disabledResponse(disabledFeature), corsHeaders);
  }

  let response;

  try {

    //Articles
    if (path === '/api/article/create' && method === 'POST') response = await articleCreate(event);
    else if (path === '/api/news' && method === 'GET') response = await getArticles(event);
    else if (path === '/api/articles/edit' && method === 'POST') response = await articleEdit(event);
    else if (path === '/api/articles/update' && method === 'POST') response = await articleUpdate(event);
    else if (path === '/api/articles/getById' && method === 'POST') response = await getArticleById(event);
    else if (path === '/api/articles/get' && method === 'POST') response = await getArticleBySlug(event);
    else if (path === '/api/articles/getRemarks' && method === 'POST') response = await getArticleRemarks(event);
    else if (path === '/api/articles/getArticlesByEditor' && method === 'GET') response = await getArticlesByEditor(event);
    else if ((path === '/api/articles' || path === '/api/journalist/articles') && method === 'GET') response = await getJournalistArticles(event);
    else if (path === '/api/articles/reviewArticle' && method === 'POST') response = await reviewArticle(event);
    else if (path === '/api/articles/updateArticleStatus' && method === 'POST') response = await updateArticleStatus(event);

    //Story
    else if (path.match(/^\/api\/stories\/[^\/]+$/) && method === 'PUT') {
      const storyId = event.queryStringParameters?.storyId;
      response = await updateStory({ ...event, storyId });
    }
    else if (path === '/api/story/postCommentAction' && method === 'POST') response = await postStoryCommentAction(event);
    else if (path === '/api/updateStory' && method === 'PUT') {
      const storyId = event.queryStringParameters?.storyId;
      response = await updateStoryDynamo({ ...event, storyId });
    }
    else if (path === '/api/draft' && method === 'DELETE') response = await deleteDraft(event);
    else if (path === '/api/deleteStory' && method === 'DELETE') response = await deleteStory(event);
    else if (path === '/api/deleteStoryPermanent' && method === 'DELETE') response = await deleteStoryPermanent(event);
    else if (path === '/api/editComment' && method === 'PUT') response = await editComments(event);
    else if (path === '/api/fetchDrafts' && method === 'GET') response = await fetchDrafts(event);
    else if (path === '/api/postCommentsDynamo' && method === 'POST') response = await postStoryCommentsDynamo(event);
    else if ((path === '/api/articles/postStory' || path === '/api/saveDraft') && method === 'POST') response = await StoryCreate(event);
    else if (path === '/api/updateDraft' && method === 'PUT') {
      const storyId = event.queryStringParameters?.storyId;
      response = await updateStoryDynamo({ ...event, storyId });
    }
    else if (path === '/story/fetchStories' && method === 'GET') response = await fetchStories(event);
    else if (path === '/api/storyDynamo' && method === 'GET') response = await getStorybyIdDynamo(event);
    else if (path === '/api/fetchStory' && method === 'GET') response = await fetchStories(event);
    else if (path === '/api/proxy' && method === 'GET') response = await proxyUrl(event);
    else if (path === '/story/fetchStoryById' && method === 'GET') response = await fetchStoryById(event);
    else if (path === '/story/fetchReadyToPublish' && method === 'GET') response = await fetchReadyToPublish(event);
    else if ((path === '/story/scrapedStories' || path === '/api/scrapedStories' || path === '/api/scraped-stories' || path === '/api/articles/fetchScrapedStories') && method === 'GET') {
      response = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'success', data: [] })
      };
    }
    

    // Contact form
    else if (path === '/contact/submit' && method === 'POST') response = await submitContactForm(event);
    else if (path === '/contact/inquiries' && method === 'GET') response = await getInquiries(event);

    // Page Studio & Page Builder routes (supports /pagestudio/*, /pagebuilder/*, and /api/* prefixes)
    else if ((path === '/pagestudio/autosave' || path === '/pagebuilder/autosave' || path === '/api/pagestudio/autosave' || path === '/api/pagebuilder/autosave') && method === 'PUT') response = await PagebuilderAutosave(event);
    else if ((path === '/pagestudio/page' || path === '/pagebuilder/page' || path === '/api/pagestudio/page' || path === '/api/pagebuilder/page') && method === 'GET') response = await GetPageHydrated(event);
    else if ((path === '/pagestudio/saveHtml' || path === '/pagebuilder/saveHtml' || path === '/api/pagestudio/saveHtml' || path === '/api/pagebuilder/saveHtml') && method === 'POST') response = await saveHtmlToS3(event);
    else if ((path === '/pagestudio/saveHomeHtml' || path === '/pagebuilder/saveHomeHtml' || path === '/api/pagestudio/saveHomeHtml' || path === '/api/pagebuilder/saveHomeHtml') && method === 'POST') response = await saveHomeHtmlToS3(event);
    else if ((path === '/pagestudio/saveErrorHtml' || path === '/pagebuilder/saveErrorHtml' || path === '/api/pagestudio/saveErrorHtml' || path === '/api/pagebuilder/saveErrorHtml') && method === 'POST') response = await saveErrorHtmlToS3(event);
    else if ((path === '/pagestudio/saveAboutHtml' || path === '/pagebuilder/saveAboutHtml' || path === '/api/pagestudio/saveAboutHtml' || path === '/api/pagebuilder/saveAboutHtml') && method === 'POST') response = await saveAboutHtmlToS3(event);
    else if ((path === '/pagestudio/saveSupportUsHtml' || path === '/pagebuilder/saveSupportUsHtml' || path === '/api/pagestudio/saveSupportUsHtml' || path === '/api/pagebuilder/saveSupportUsHtml') && method === 'POST') response = await saveSupportUsHtmlToS3(event);
    else if (path === '/youpi/webhook' && method === 'POST') response = await youpiWebhook(event);
    else if ((path === '/pagestudio/savePrivacyPolicyHtml' || path === '/pagebuilder/savePrivacyPolicyHtml' || path === '/api/pagestudio/savePrivacyPolicyHtml' || path === '/api/pagebuilder/savePrivacyPolicyHtml') && method === 'POST') response = await savePrivacyPolicyHtmlToS3(event);
    else if ((path === '/pagestudio/saveMediaCouncilHtml' || path === '/pagebuilder/saveMediaCouncilHtml' || path === '/api/pagestudio/saveMediaCouncilHtml' || path === '/api/pagebuilder/saveMediaCouncilHtml') && method === 'POST') response = await saveMediaCouncilHtmlToS3(event);
    else if ((path === '/pagestudio/saveContactUsHtml' || path === '/pagebuilder/saveContactUsHtml' || path === '/api/pagestudio/saveContactUsHtml' || path === '/api/pagebuilder/saveContactUsHtml') && method === 'POST') response = await saveContactUsHtmlToS3(event);
    else if ((path === '/pagestudio/saveLoginHtml' || path === '/pagebuilder/saveLoginHtml' || path === '/api/pagestudio/saveLoginHtml' || path === '/api/pagebuilder/saveLoginHtml') && method === 'POST') response = await saveLoginHtmlToS3(event);
    else if ((path === '/pagestudio/saveSectionHtml' || path === '/pagebuilder/saveSectionHtml' || path === '/api/pagestudio/saveSectionHtml' || path === '/api/pagebuilder/saveSectionHtml') && method === 'POST') response = await saveSectionHtmlToS3(event);
    else if ((path === '/pagestudio/saveAuthorsHtml' || path === '/pagebuilder/saveAuthorsHtml' || path === '/api/pagestudio/saveAuthorsHtml' || path === '/api/pagebuilder/saveAuthorsHtml') && method === 'POST') response = await saveAuthorsHtmlToS3(event);
    else if ((path === '/pagestudio/saveAuthorHtml' || path === '/pagebuilder/saveAuthorHtml' || path === '/api/pagestudio/saveAuthorHtml' || path === '/api/pagebuilder/saveAuthorHtml') && method === 'POST') response = await saveAuthorHtmlToS3(event);
    else if ((path === '/pagestudio/saveSurveyHtml' || path === '/pagebuilder/saveSurveyHtml' || path === '/api/pagestudio/saveSurveyHtml' || path === '/api/pagebuilder/saveSurveyHtml') && method === 'POST') response = await saveSurveyHtmlToS3(event);
    else if ((path === '/pagestudio/saveSiteMap' || path === '/pagebuilder/saveSiteMap' || path === '/api/pagestudio/saveSiteMap' || path === '/api/pagebuilder/saveSiteMap') && method === 'POST') response = await saveSiteMapToS3(event);
    else if ((path === '/pagestudio/saveNewsSiteMap' || path === '/pagebuilder/saveNewsSiteMap' || path === '/api/pagestudio/saveNewsSiteMap' || path === '/api/pagebuilder/saveNewsSiteMap') && method === 'POST') response = await saveNewsSiteMapToS3(event);
    else if ((path === '/pagestudio/savePwaFiles' || path === '/pagebuilder/savePwaFiles' || path === '/api/pagestudio/savePwaFiles' || path === '/api/pagebuilder/savePwaFiles') && method === 'POST') response = await savePwaFilesToS3(event);
    else if ((path === '/pagestudio/forceUpdatePwaIcons' || path === '/pagebuilder/forceUpdatePwaIcons' || path === '/api/pagestudio/forceUpdatePwaIcons' || path === '/api/pagebuilder/forceUpdatePwaIcons') && method === 'GET') response = await forceUpdatePwaIcons(event);
    else if ((path === '/pagestudio/republishAll' || path === '/pagebuilder/republishAll' || path === '/api/pagestudio/republishAll' || path === '/api/pagebuilder/republishAll') && method === 'POST') response = await republishAll(event, context);
    else if ((path === '/pagestudio/republishAll/status' || path === '/pagebuilder/republishAll/status' || path === '/api/pagestudio/republishAll/status' || path === '/api/pagebuilder/republishAll/status') && method === 'GET') response = await republishAllStatus(event);


    // auxi bot
    else if (path === '/analytics/collect' && method === 'POST') response = await analyticsCollect(event);
    else if (path.startsWith('/analytics/') && method === 'GET') response = await analyticsReport({ ...event, path });
    else if (path === '/ai/normal_stream' && method === 'POST') response = await normalStream(event);
    else if (path === '/ai/stream_response' && method === 'POST') response = await streamResponse(event);

    //Users
    else if (path === '/loginDynamo' && method === 'POST') response = await login(event);
    else if (path === '/api/getAllUsers' && method === 'GET') response = await getUsers(event);
    else if (path === '/addUser' && method === 'POST') response = await addUser(event);
    else if (path === '/getAllUsers' && method === 'GET') response = await getAllUsers(event);
    else if (path === '/getAuthors' && method === 'GET') response = await getAllAuthors(event);
    else if (path === '/deleteUser' && method === 'DELETE') response = await deleteUser(event);
    else if (path === '/deleteAuthor' && method === 'DELETE') response = await deleteAuthor(event);
    else if (path === '/editUser' && method === 'PUT') response = await editUser(event);
    else if (path === '/forgotPassword' && method === 'POST') response = await forgotPassword(event);
    else if (path === '/resetPassword' && method === 'POST') response = await resetPassword(event);
    else if (path === '/uploadUserImage' && method === 'POST') response = await uploadUserImage(event);
    else if (path === '/updateProfile' && method === 'PUT') response = await updateProfile(event);
    else if ((path === '/deleteAccount' || path === '/api/pagestudio/deleteAccount' || path === '/api/pagebuilder/deleteAccount') && method === 'DELETE') response = await deleteAccount(event);
    else if (path === '/api/audience/profile' && method === 'GET') response = await getAudienceProfile(event);
    else if (path === '/api/audience/users' && method === 'GET') response = await getAudienceUsers(event);


    // roles
    else if (path === '/addRole' && method === 'POST') response = await createRole(event);
    else if (path === '/getAllRoles' && method === 'GET') response = await getAllRoles(event);
    else if (path === '/deleteRole' && method === 'DELETE') response = await deleteRole(event);
    else if (path === '/updateRole' && method === 'PUT') response = await updateRole(event);
    else if (path === '/roles/list' && method === 'GET') response = await getRoleList(event);
    else if (path === '/getRole' && method === 'GET') response = await getRolePermission(event);

    // taxonomy
    else if (path === '/taxonomy' && method === 'POST') response = await addTaxonomy(event);
    else if ((path === "/taxonomies" || path === "/api/taxonomies") && method === "GET") response = await getAllTaxonomies(event);
    else if (path === "/taxonomy/addValue" && method === "POST") response = await addTaxValue(event);
    else if (path === "/taxonomy/value" && method === "DELETE") response = await deleteTaxonomyValue(event);
    else if (path === "/taxonomy" && method === "DELETE") response = await deleteTaxonomy(event);
    else if (path === "/taxonomy/name" && method === "PUT") response = await updateTaxonomyName(event);
    else if (path === "/taxonomy/updateValue" && method === "PUT") response = await updateTaxonomyValue(event);
    else if (path === "/taxonomy/permissions" && method === "PUT") response = await updateTaxonomyPermissions(event);
    else if (path === "/taxonomy/section/values" && method === "GET") response = await getSectionValues(event);
    else if (path === '/taxonomy/colors' && (method === 'GET' || method === 'PUT')) response = await taxonomyColors(event);

    // DAM routes
    else if (path === '/api/uploadAsset' && method === 'POST') response = await uploadAsset(event);
    else if (path === '/api/assets/create' && method === 'POST') response = await createAsset(event);
    else if (path === '/api/fetchAsset' && method === 'GET') response = await fetchAsset(event);
    else if (path === '/api/assets/delete' && method === 'DELETE') response = await deleteAsset(event);
    else if (path === '/api/assets/update' && method === 'PUT') response = await updateAsset(event);
    else if (path === '/api/generateThumbnail' && method === 'POST') response = await generateThumbnail(event);
    else if (path === '/api/uploadCustomThumbnail' && method === 'POST') response = await uploadCustomThumbnail(event);
    else if (path === '/api/confirmCustomThumbnail' && method === 'POST') response = await confirmCustomThumbnail(event);
    else if (path === '/api/selectThumbnail' && method === 'POST') response = await selectThumbnail(event);
    else if (path === '/api/debug/listS3Objects' && method === 'POST') response = await listS3Object(event);
    else if (path === '/api/generateSingleThumbnail' && method === 'POST') response = await generateSingleThumbnail(event);
    else if (path === '/api/transcodingTrigger' && method === 'POST') response = await transcodingTriggerHandler(event);
    else if (path === '/api/transcodingProcessor' && method === 'POST') response = await transcodingProcessorHandler(event);
    else if (path.startsWith('/api/getQualityVariants') && method === 'GET') response = await getQualityVariantsHandler(event);
    else if (path === '/api/getMediaconvert-endpoint' && method === 'POST') response = await getMediaconvertEndpoint(event);
    else if (path === '/api/extractMetadata' && method === 'POST') response = await extractMetadata(event);
    else if (path.match(/^\/api\/asset\/[^\/]+\/status$/) && method === 'GET') response = await getAssetStatus(event);
    else if (path === '/api/asset/status' && method === 'GET') response = await getAssetStatus(event);
    else if (path === "/api/assets/videos" && method === "GET") response = await getAllVideos(event);

    // campaigns
    else if (path === '/uploadCampaignAdImage' && method === 'POST') response = await uploadCampaignAdImage(event);
    else if (path === '/createCampaign' && method === 'POST') response = await createCampaign(event);
    else if (path === '/deleteCampaign' && method === 'DELETE') response = await deleteCampaign(event);

    else if (path === '/getCampaigns' && method === 'GET') response = await getCampaigns(event);
    else if (path === '/campaigns/checkAvailability' && method === 'POST') response = await checkCampaignAvailability(event);
    else if (path === '/publishCampaign' && method === 'POST') response = await publishCampaign(event);
    else if (path === '/updateCampaign' && method === 'PUT') response = await updateCampaign(event);
    else if (path === '/campaigns/trackEvent' && method === 'POST') response = await trackCampaignEvent(event);

    // surveys
    else if (path === '/surveys' && method === 'GET') response = await getSurveys(event);
    else if (path === '/surveys' && method === 'POST') response = await createSurvey(event);
    else if (path === '/surveys' && method === 'PUT') response = await updateSurvey(event);
    else if (path === '/surveys' && method === 'DELETE') response = await deleteSurvey(event);
    else if (path === '/surveys/invite' && method === 'POST') response = await sendSurveyInvites(event);
    // public survey routes (no JWT)
    else if (path.startsWith('/surveys/public/') && method === 'GET') response = await getPublicSurvey(event);
    else if (path.match(/^\/surveys\/[^\/]+\/responses$/) && method === 'GET') response = await getSurveyResponses(event);
    else if (path.match(/^\/surveys\/[^\/]+\/responses$/) && method === 'POST') response = await submitSurveyResponse(event);
    else if (path.match(/^\/surveys\/[^\/]+\/ai-summary$/) && method === 'POST') response = await generateSurveyResponseSummary(event);
    else if (path.match(/^\/surveys\/[^\/]+\/chat$/) && method === 'GET') response = await getSurveyChatMessages(event);
    else if (path.match(/^\/surveys\/[^\/]+\/chat$/) && method === 'POST') response = await saveSurveyChatMessage(event);
    else if (path.match(/^\/surveys\/[^\/]+\/chat\/assets$/) && method === 'POST') response = await createSurveyChatAssetUpload(event);
    else if (path.match(/^\/surveys\/[^\/]+\/chat\/assets$/) && method === 'DELETE') response = await deleteSurveyChatAsset(event);

    // placements
    else if (path === '/placements' && method === 'GET') response = await getPlacements(event);
    else if (path === '/placement' && method === 'POST') response = await addPlacement(event);
    else if (path === '/placement' && method === 'PUT') response = await updatePlacement(event);
    else if (path === '/placement' && method === 'DELETE') response = await deletePlacement(event);

    //AI routing
    else if (path === '/api/rekognition/getVideoAnalysis' && method === 'POST') response = await getVideoAnalysis(event);
    else if (path === '/api/rekognition/createFaceCollection' && method === 'POST') response = await createFaceCollections(event);
    else if (path === '/api/rekognition/addFaceToCollection' && method === 'POST') response = await addFaceToCollection(event);
    else if (path === '/api/rekognition/searchFaceByImage' && method === 'POST') response = await searchFaceByImage(event);
    else if (path === '/api/rekognition/listFaceCollections' && method === 'POST') response = await listFaceCollections(event);

    // FFprobe test route
    else if (path === '/api/check-ffprobe' && method === 'GET') response = await checkFfprobe(event);

    // Utils
    else if (path === '/api/utils/search' && method === 'GET') response = await webSearch(event);
    else if (path === '/api/utils/search/history' && method === 'GET') response = await getSearchHistory(event);
    else if (path === '/api/utils/search/history' && method === 'DELETE') response = await deleteSearchHistory(event);

    // ePaper Reader Auth
    else if ((path === '/epaper/auth/sync' || path === '/api/epaper/auth/sync') && method === 'POST') response = await epaperSyncReader(event);
    else if ((path === '/epaper/auth/me' || path === '/api/epaper/auth/me') && method === 'GET') response = await epaperGetReaderProfile(event);
    else if ((path === '/epaper/auth/logout' || path === '/api/epaper/auth/logout') && method === 'POST') response = await epaperLogoutReader(event);


    if (!response) {
      response = {
        statusCode: 404,
        body: JSON.stringify({ message: 'Route not found' }),
      };
    }

    return applyCors(response, corsHeaders);

  } catch (error) {
    console.error('Error occurred:', error);
    return applyCors({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    }, corsHeaders);
  }
};
