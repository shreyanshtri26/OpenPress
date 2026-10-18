// src/components/common/DAM/Drawer/useAssetMetadata.js
import { useContext, useEffect, useRef, useState } from "react";
import env from '@/utils/env';
import apiFetch from '../../../../utils/api';
import { buildImagePayload } from "../utils/imagePayload";
import { UserContext } from "@/context/UserContext";

// Safety net: caps AI title output at 4 words and strips stray formatting
// (in case the model returns extra text despite the prompt instructions).
function limitToFourWords(text) {
  const words = (text || "")
    .replace(/SESSION:[0-9a-zA-Z\-]+/gi, "")
    .replace(/^(Title|Here is|Here's)[:\s]*/i, "")
    .replace(/["'\u2018\u2019\u201c\u201d.,!?]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "";
  return words.slice(0, 4).join(" ");
}

// Asks the AI service to write a 4 word title summarizing the given
// description/summary text (not just a truncation of it).
export async function generateAITitleFromSummary(summaryText) {
  const trimmedSummary = (summaryText || "").trim();
  if (!trimmedSummary) return "";

  try {
    const prompt = `Description: "${trimmedSummary}"

Based on this description, write a title for this image that is EXACTLY 4 words long. Output ONLY the 4 words, nothing else, no punctuation, no quotes, no prefix.`;

    const response = await apiFetch(`${env.aiApi}/normal_stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: prompt }),
    });

    if (!response.ok) return "";

    if (!response.body || !response.body.getReader) {
      const text = await response.text().catch(() => "");
      return limitToFourWords(text);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let raw = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });
    }

    return limitToFourWords(raw);
  } catch (err) {
    return "";
  }
}

export function useAssetMetadata(asset, apiMetadata) {
  // -----------------------------
  // STATE
  // -----------------------------
  const [formData, setFormData] = useState({
    title: asset?.fileName || asset?.name || "",
    caption: asset?.caption || "",
    summary: asset?.summary || "",
    category: "",
    licensing: "",
    creator: "",
    tags: [],
    location: "",
    // celebrities: [], // removed: celebrity detection feature deprecated
    expressions: [],
  });

  const [availableTags, setAvailableTags] = useState([]);
  // const [availableCelebrities, setAvailableCelebrities] = useState([]); // removed: celebrity detection feature deprecated
  const [availableExpressions, setAvailableExpressions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // const [needsApiCelebrities, setNeedsApiCelebrities] = useState(true); // removed: celebrity detection feature deprecated
  const [sessionId, setSessionId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // CONTROL FLAGS
  const [needsApiTags, setNeedsApiTags] = useState(true);
  const [shouldGenerateSummary, setShouldGenerateSummary] = useState(true);
  const [backendMetadataLoaded, setBackendMetadataLoaded] = useState(false);
  const [autoSavePending, setAutoSavePending] = useState(false);

  const userContext = useContext(UserContext);
  const user = userContext?.user;

  const summaryGeneratedRef = useRef(false);
  // Tracks the auto-populated (filename-based) title so we know whether the
  // user has since typed their own title before overwriting it with an
  // AI-derived short title.
  const defaultTitleRef = useRef(asset?.fileName || asset?.name || "");
  const titleAutoFilledRef = useRef(false);

  // -----------------------------
  // INPUT HANDLER
  // -----------------------------
  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      if (prev[field] === value) return prev;
      setIsDirty(true);
      return { ...prev, [field]: value };
    });
  };

  // -----------------------------
  // RESET WHEN ASSET CHANGES
  // -----------------------------
  useEffect(() => {
    setFormData({
      title: asset?.fileName || asset?.name || "",
      caption: asset?.caption || "",
      summary: asset?.summary || "",
      category: "",
      licensing: "",
      creator: "",
      tags: [],
      location: "",
      // celebrities: [], // removed: celebrity detection feature deprecated
      expressions: [],
    });

    summaryGeneratedRef.current = false;
    defaultTitleRef.current = asset?.fileName || asset?.name || "";
    titleAutoFilledRef.current = false;
    setAvailableTags([]);
    // setAvailableCelebrities([]); // removed: celebrity detection feature deprecated
    setAvailableExpressions([]);
    setBackendMetadataLoaded(false);
    setNeedsApiTags(true);
    // setNeedsApiCelebrities(true); // ✅ ADD THIS
    setShouldGenerateSummary(true);
    setAutoSavePending(false);
    setIsDirty(false);
  }, [asset?.assetId, asset?.id]);


  const fetchAssetData = async (assetId) => {
    try {
      setIsLoading(true);

      const res = await apiFetch(`${env.backendApi}/api/fetchAsset?assetId=${assetId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` })
          },
        }
      );
      const data = await res.json();

      if (data.data) {
        const d = data.data;

        // ✅ Parse ALL AI-detected tags (for dropdown)
        let allAiTags = [];
        if (d.tags?.aiTags && Array.isArray(d.tags.aiTags)) {
          allAiTags = Array.from(new Set(d.tags.aiTags));
        }

        // ✅ Parse user's selected tags (customTags)
        let userSelectedTags = [];

        if (d.tags) {
          if (Array.isArray(d.tags)) {
            // Old simple array format
            userSelectedTags = Array.from(new Set(d.tags));
          } else if (typeof d.tags === 'object') {
            // New object format with customTags
            if (Array.isArray(d.tags.customTags) && d.tags.customTags.length > 0) {
              // User has customized tags
              userSelectedTags = Array.from(new Set(d.tags.customTags));
            } else if (Array.isArray(d.tags.aiTags) && d.tags.aiTags.length > 0) {
              // No customization yet, use aiTags as default
              userSelectedTags = Array.from(new Set(d.tags.aiTags));
            }
          }
        }

        // Parse celebrities (removed: celebrity detection feature deprecated)
        // let aiDetectedCelebrities = [];
        // let userSelectedCelebrities = [];
        
        // Extract AI-detected celebrities from rekognition
        // if (d.rekognitionAnalysis?.celebrities?.celebrities) {
        //   aiDetectedCelebrities = d.rekognitionAnalysis.celebrities.celebrities.map(c => c.name);
        // }
        // Get user's selected celebrities from top-level field
        // if (d.celebrities && Array.isArray(d.celebrities)) {
        //   userSelectedCelebrities = Array.from(new Set(d.celebrities));
        // } else if (aiDetectedCelebrities.length > 0) {
        // First load - use AI detected as default
        //   userSelectedCelebrities = [...aiDetectedCelebrities];
        // }

        const hasBackendSummary = !!(d.summary && d.summary.trim());
        const hasUserSelectedTags = userSelectedTags.length > 0;
        const hasAiTags = allAiTags.length > 0;

        // ✅ Set form data (title is AI-derived separately below; caption
        // stays untouched/blank — it remains a required, manually-entered field)
        setFormData((prev) => ({
          ...prev,
          caption: d.caption || prev.caption,
          summary: hasBackendSummary ? d.summary : prev.summary,
          category: d.assetType || d.category || prev.category,
          licensing: d.licensing || prev.licensing,
          creator: d.creator || prev.creator,
          // celebrities: userSelectedCelebrities, // removed: celebrity detection feature deprecated
          tags: userSelectedTags, // ✅ User's selected tags
          expressions: d.expressions || [],
        }));

        // Ask AI to write a 4 word title from the full backend summary, as
        // long as the user hasn't already typed their own title.
        if (hasBackendSummary && !titleAutoFilledRef.current) {
          generateAITitleFromSummary(d.summary).then((aiTitle) => {
            if (!aiTitle) return;
            setFormData((prev) => {
              const titleUntouched = prev.title === defaultTitleRef.current;
              if (titleAutoFilledRef.current || !titleUntouched) return prev;
              titleAutoFilledRef.current = true;
              return { ...prev, title: aiTitle };
            });
          });
        }

        // ✅ Set available options (for dropdowns)
        if (hasAiTags) {
          setAvailableTags(allAiTags); // ✅ All AI tags for dropdown
        } else if (hasUserSelectedTags) {
          setAvailableTags(userSelectedTags);
        }

        // ✅ ALWAYS set available celebrities from AI detection (for dropdown)
        // if (aiDetectedCelebrities.length > 0) { // removed: celebrity detection feature deprecated
        //   setAvailableCelebrities(aiDetectedCelebrities);
        // }

        if (d.expressions?.length) {
          setAvailableExpressions(d.expressions);
        }

        setNeedsApiTags(!hasAiTags);
        setShouldGenerateSummary(!hasBackendSummary);

        if (hasBackendSummary) {
          summaryGeneratedRef.current = true;
        }

        setAutoSavePending(false); // ✅ Don't auto-save when loading existing data
      } else {
        setNeedsApiTags(true);
        setShouldGenerateSummary(true);
        setAutoSavePending(true);
      }
    } catch (err) {
      setNeedsApiTags(true);
      setShouldGenerateSummary(true);
      setAutoSavePending(true);
    } finally {
      setIsLoading(false);
      setBackendMetadataLoaded(true);
    }
  };



  // -----------------------------
  // SAFE FINALIZE SUMMARY
  // -----------------------------
  const finalizeSummary = (rawText, labels = []) => { // celebs param removed: celebrity detection feature deprecated
    let cleaned = (rawText || "").trim();

    cleaned = cleaned.replace(/SESSION:[0-9a-zA-Z\-]+/gi, "");
    const prefixes = [
      "Here is",
      "Here's",
      "Caption:",
      "Image caption:",
      "Factual caption:",
      "Description:",
      "The caption",
    ];
    prefixes.forEach((p) => {
      cleaned = cleaned.replace(new RegExp(`^${p}[:\\s]*`, "i"), "");
    });

    cleaned = cleaned.replace(/^[\*\-\#\s]+/, "").replace(/\s{2,}/g, " ").trim();

    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    const sentenceMatches = cleaned.match(/[^.!?]+[.!?]+/g) || (cleaned ? [cleaned] : []);
    let final = sentenceMatches.length ? sentenceMatches.slice(0, 2).join(" ").trim() : "";

    const speculativeWords = ["allegedly", "apparently", "reportedly", "claims", "allegation", "said"];
    const containsSpec = speculativeWords.some((w) => final.toLowerCase().includes(w));

    if (!final || containsSpec) {
      // if (Array.isArray(celebs) && celebs.length) { // removed: celebrity detection feature deprecated
      //   final = `${celebs.join(", ")}.`;
      //   if (Array.isArray(labels) && labels.length) {
      //     final = `${celebs.join(", ")} — image contains ${labels.slice(0, 4).join(", ")}.`;
      //   }
      // } else
      if (Array.isArray(labels) && labels.length) {
        final = `Image contains: ${labels.slice(0, 6).join(", ")}.`;
      } else {
        final = "No caption available";
      }
    }

    final = final.replace(/\s{2,}/g, " ").trim();

    // Summary stays exactly as generated. Title is derived separately via a
    // real AI call (a 3-4 word title based on the full summary), only if the
    // user hasn't already typed their own title. Caption is left untouched —
    // it stays blank until the user manually fills it in (it remains a
    // required field before saving/closing).
    setFormData((prev) => ({ ...prev, summary: final }));
    summaryGeneratedRef.current = true;
    setAutoSavePending(true);
    setIsDirty(true);

    if (!titleAutoFilledRef.current) {
      generateAITitleFromSummary(final).then((aiTitle) => {
        if (!aiTitle) return;
        setFormData((prev) => {
          const titleUntouched = prev.title === defaultTitleRef.current;
          if (titleAutoFilledRef.current || !titleUntouched) return prev;
          titleAutoFilledRef.current = true;
          return { ...prev, title: aiTitle };
        });
      });
    }
  };

  // -----------------------------
  // VIDEO THUMBNAIL (for AI captioning)
  // -----------------------------
  // Videos have no directly-usable image bytes for the vision-based caption
  // call below, so we reuse the existing thumbnail-generation endpoint to get
  // a still frame we can send instead.
  const fetchVideoThumbnailUrl = async (assetId) => {
    if (!assetId) return null;

    try {
      const res = await apiFetch(`${env.backendApi}/api/generateThumbnail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
        body: JSON.stringify({ assetId, regenerate: false }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      const thumbnails = data?.data?.thumbnails;
      return Array.isArray(thumbnails) && thumbnails.length ? thumbnails[0]?.url || null : null;
    } catch (err) {
      return null;
    }
  };

  // -----------------------------
  // AI SUMMARY GENERATION
  // -----------------------------
  const generateAISummary = async () => {
    if (summaryGeneratedRef.current) return;

    if (!availableTags.length) { // && !(formData.celebrities && formData.celebrities.length) - check removed: celebrity detection feature deprecated
      return;
    }

    setIsGeneratingSummary(true);

    const labels = availableTags;
    // const celebs = formData.celebrities || []; // removed: celebrity detection feature deprecated
    const expressions = formData.expressions || [];

    try {
      const prompt = `
give me only a factual, detailed summary caption. 2-3 sentences max. 
this is for journalism and therefore no extra fluff beyond what is shown in the image
only provide the summary in your response, nothing else

Write the caption now:
`;

      let imagePayload = await buildImagePayload(asset, apiMetadata);

      const isVideoAsset =
        asset?.isVideo || asset?.type?.startsWith("video/") || apiMetadata?.assetType === "video";

      if (!imagePayload && isVideoAsset) {
        const thumbnailUrl = await fetchVideoThumbnailUrl(asset?.assetId || asset?.id);
        if (thumbnailUrl) {
          imagePayload = await buildImagePayload(asset, { ...apiMetadata, thumbnailUrl });
        }
      }

      if (!imagePayload) {
        finalizeSummary("Failed to generate AI summary due to issues with the image.");
        setIsGeneratingSummary(false);
        return;
      }

      const image = imagePayload
        ? {
          format: imagePayload.format,
          source: { bytes: imagePayload.bytes },
        }
        : null;

      const response = await apiFetch(`${env.aiApi}/normal_stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          image
            ? {
              query: prompt,
              sessionId,
              image,
            }
            : { query: prompt, sessionId }
        ),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        finalizeSummary(text, labels); // finalizeSummary(text, labels, celebs) before celebrity removal
        return;
      }

      if (!response.body || !response.body.getReader) {
        const text = await response.text().catch(() => "");
        finalizeSummary(text, labels); // finalizeSummary(text, labels, celebs) before celebrity removal
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let raw = "";
      let sessionReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        if (!sessionReceived) {
          const sessionMatch = chunk.match(/SESSION:([0-9a-zA-Z\-]+)/i);
          if (sessionMatch) {
            setSessionId(sessionMatch[1]);
            sessionReceived = true;
            raw += chunk.replace(sessionMatch[0], "");
            continue;
          }
        }
        raw += chunk;
      }

      finalizeSummary(raw, labels); // finalizeSummary(raw, labels, celebs) before celebrity removal
    } catch (err) {
      finalizeSummary("", labels); // finalizeSummary("", labels, celebs) before celebrity removal
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // -----------------------------
  // EXTRACT TAGS + CELEBS + EXPRESSIONS
  // -----------------------------
  // EXTRACT TAGS + CELEBS + EXPRESSIONS
  useEffect(() => {
    if (!apiMetadata || !backendMetadataLoaded) return;

    let allTags = [];
    let highConf = [];
    // let allCelebs = []; // removed: celebrity detection feature deprecated
    let allExpressions = [];

    // VIDEO analysis
    if (apiMetadata.analysis?.labels?.data) {
      const labels = apiMetadata.analysis.labels.data;

      const unique = {};
      labels.forEach((i) => {
        if (i.label) unique[i.label] = i.confidence;
      });

      allTags = Object.keys(unique);
      highConf = Object.entries(unique)
        .filter(([_, c]) => c > 90)
        .map(([l]) => l);

      // if (apiMetadata.analysis?.celebrities?.data) { // removed: celebrity detection feature deprecated
      //   allCelebs = apiMetadata.analysis.celebrities.data.map((c) => c.name);
      // }

      if (apiMetadata.analysis?.faces?.data) {
        const faces = apiMetadata.analysis.faces.data;
        faces.forEach(face => {
          if (face.emotions) {
            face.emotions.forEach(emotion => {
              if (emotion.confidence > 70) {
                allExpressions.push(emotion.type.toLowerCase());
              }
            });
          }
        });
      }
    } else if (apiMetadata.rekognitionAnalysis) {
      const rek = apiMetadata.rekognitionAnalysis;

      if (rek.labels?.labels) {
        allTags = rek.labels.labels.map((l) => l.name);
        highConf = rek.labels.labels
          .filter((l) => l.confidence > 90)
          .map((l) => l.name);
      }

      if (rek.text?.fullText) {
        allTags.push(rek.text.fullText);
      }

      // if (rek.celebrities?.celebrities) { // removed: celebrity detection feature deprecated
      //   allCelebs = rek.celebrities.celebrities.map((c) => c.name);
      // }

      if (rek.faces?.faceDetails) {
        rek.faces.faceDetails.forEach(face => {
          if (face.smile?.value && face.smile?.confidence > 70) {
            allExpressions.push('smiling');
          }

          if (face.emotions) {
            face.emotions.forEach(emotion => {
              if (emotion.Confidence > 70) {
                const emotionType = emotion.Type.toLowerCase();
                const emotionMap = {
                  'happy': 'happy',
                  'sad': 'sad',
                  'angry': 'angry',
                  'surprised': 'surprised',
                  'disgusted': 'disgusted',
                  'calm': 'neutral',
                  'confused': 'confused',
                  'fear': 'fearful'
                };
                if (emotionMap[emotionType]) {
                  allExpressions.push(emotionMap[emotionType]);
                }
              }
            });
          }
        });
      }
    }

    const uniqueTags = Array.from(new Set(allTags));
    // const uniqueCelebs = Array.from(new Set(allCelebs)); // removed: celebrity detection feature deprecated
    const uniqueExpressions = Array.from(new Set(allExpressions));

    // ✅ Tags handling
    if (needsApiTags && uniqueTags.length) {
      setAvailableTags(uniqueTags);
      setFormData((p) => ({
        ...p,
        tags: highConf.length ? highConf : uniqueTags,
      }));
      setNeedsApiTags(false);
      setAutoSavePending(true);
    } else if (uniqueTags.length && availableTags.length === 0) {
      setAvailableTags(uniqueTags);
    }

    // if (needsApiCelebrities && uniqueCelebs.length) { // removed: celebrity detection feature deprecated
    //   setAvailableCelebrities(uniqueCelebs);
    //   setFormData((p) => ({ ...p, celebrities: uniqueCelebs }));
    //   setNeedsApiCelebrities(false);
    //   setAutoSavePending(true);
    // }

    // ✅ Expressions handling
    if (uniqueExpressions.length && formData.expressions.length === 0) {
      setAvailableExpressions(uniqueExpressions);
      setFormData((p) => ({ ...p, expressions: uniqueExpressions }));
      setAutoSavePending(true);
    }
  }, [apiMetadata, backendMetadataLoaded, needsApiTags]); // needsApiCelebrities removed from deps: celebrity detection feature deprecated


  // -----------------------------
  // VIDEO LABELS (async Rekognition Video jobs)
  // -----------------------------
  // Video analysis runs as async Rekognition Video jobs (see videoAnalysisJobs
  // on the asset) instead of the synchronous rekognitionAnalysis used for
  // images, so it needs its own polling path to populate availableTags.
  useEffect(() => {
    if (!apiMetadata || !backendMetadataLoaded) return;
    if (!needsApiTags) return;
    if (apiMetadata.rekognitionAnalysis || apiMetadata.analysis?.labels?.data) return;

    const isVideoAsset =
      apiMetadata?.isVideo || apiMetadata?.type?.startsWith("video/") || apiMetadata?.assetType === "video";
    const jobs = apiMetadata?.videoAnalysisJobs;
    if (!isVideoAsset || !jobs) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 6;

    const pollVideoLabels = async () => {
      if (cancelled || attempts >= maxAttempts) return;
      attempts += 1;

      try {
        const res = await apiFetch(`${env.backendApi}/api/rekognition/getVideoAnalysis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
          body: JSON.stringify({ jobs }),
        });

        if (!res.ok) return;
        const data = await res.json();
        const labelItems = data?.results?.labels?.labels || [];

        if (!cancelled && labelItems.length) {
          const unique = {};
          labelItems.forEach((item) => {
            if (item?.label?.name) unique[item.label.name] = item.label.confidence;
          });

          const uniqueTags = Object.keys(unique);
          if (uniqueTags.length) {
            const highConf = Object.entries(unique)
              .filter(([, confidence]) => confidence > 90)
              .map(([name]) => name);

            setAvailableTags(uniqueTags);
            setFormData((p) => ({ ...p, tags: highConf.length ? highConf : uniqueTags }));
            setNeedsApiTags(false);
            setAutoSavePending(true);
            return;
          }
        }

        if (!cancelled && data?.status !== "FAILED") {
          setTimeout(pollVideoLabels, 5000);
        }
      } catch (err) {
        // Video analysis may still be in progress; ignore and let the retry loop try again.
      }
    };

    pollVideoLabels();

    return () => {
      cancelled = true;
    };
  }, [apiMetadata, backendMetadataLoaded, needsApiTags]);

  // -----------------------------
  // RUN SUMMARY WHEN TAGS ARRIVE
  // -----------------------------
  useEffect(() => {
    if (summaryGeneratedRef.current) return;

    if (availableTags.length > 0 && !isGeneratingSummary) { // || (formData.celebrities?.length > 0) - check removed: celebrity detection feature deprecated
      const hasExistingSummary = !!(formData.summary && formData.summary.trim().length > 0);
      if (shouldGenerateSummary || !hasExistingSummary) {
        generateAISummary();
        setShouldGenerateSummary(false);
      }
    }
  }, [availableTags, shouldGenerateSummary, isGeneratingSummary, formData.summary]); // formData.celebrities removed from deps

  // -----------------------------
  // SAVE METADATA
  // -----------------------------
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const assetId = asset?.assetId || asset?.id;
      if (!assetId) throw new Error("Asset ID missing");

      const dataToSave = {
        assetId,
        title: formData.title,
        caption: formData.caption,
        summary: formData.summary,
        category: formData.category,
        licensing: formData.licensing,
        creator: formData.creator,
        customTags: formData.tags,
        // tags: formData.tags,
        // celebrities: formData.celebrities, // removed: celebrity detection feature deprecated
        expressions: formData.expressions,
        location: formData.location,
      };

      const response = await apiFetch(`${env.backendApi}/api/assets/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json", ...(user?.token && { Authorization: `Bearer ${user.token}` })
        },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) throw new Error(`Save failed: ${response.status}`);
      await response.json();

      // ✅ After successful save, mark as no longer pending
      setAutoSavePending(false);
      setIsDirty(false);
      return true;
    } catch (err) {
      console.error("Save error:", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // -----------------------------
  // AUTO-SAVE WHEN READY
  // -----------------------------
  useEffect(() => {
    const summaryReady = formData.summary && formData.summary.trim().length > 0;
    const tagsReady = Array.isArray(formData.tags) && formData.tags.length > 0;

    if (!summaryReady || !tagsReady) return;
    if (isGeneratingSummary || isSaving) return;
    if (!autoSavePending) return;

    const saveNow = async () => {
      try {
        await handleSave();
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    };

    saveNow();
  }, [
    formData.summary,
    formData.tags,
    isGeneratingSummary,
    isSaving,
    autoSavePending,
  ]);

  // -----------------------------
  // INIT ON ASSET CHANGE
  // -----------------------------
  useEffect(() => {
    const id = asset?.assetId || asset?.id;

    if (!id) {
      setNeedsApiTags(true);
      // setNeedsApiCelebrities(true); // removed: celebrity detection feature deprecated
      setShouldGenerateSummary(true);
      setAutoSavePending(false);
      setBackendMetadataLoaded(true);
      return;
    }

    setBackendMetadataLoaded(false);
    setNeedsApiTags(false);
    // setNeedsApiCelebrities(false); // removed: celebrity detection feature deprecated
    setShouldGenerateSummary(false);
    setAutoSavePending(false);
    setAvailableTags([]);
    // setAvailableCelebrities([]); // removed: celebrity detection feature deprecated
    setAvailableExpressions([]);

    fetchAssetData(id);
  }, [asset?.assetId, asset?.id]);

  // -----------------------------
  // RETURN API
  // -----------------------------
  return {
    formData,
    availableTags,
    // availableCelebrities, // removed: celebrity detection feature deprecated
    availableExpressions,
    isLoading,
    isGeneratingSummary,
    handleInputChange,
    handleSave,
    isSaving,
    isDirty,
  };
}