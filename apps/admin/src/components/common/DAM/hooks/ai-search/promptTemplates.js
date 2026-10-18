// src/components/common/DAM/hooks/ai-search/promptTemplates.js

/**
 * AI prompt templates for AI search
 */

/**
 * Generate semantic search prompt for asset filtering
 * @param {string} query - User search query
 * @returns {string} Complete prompt for AI
 */
export const getSemanticSearchPrompt = (query) => {
  return `
You are a Digital Asset Management search assistant. Your job is to analyze retrieved assets and return ONLY those that genuinely match the user's search intent.

USER QUERY: "${query}"

CANDIDATE ASSETS (JSON):
$search_results$

STRICT FILTERING RULES:

1. QUERY ANALYSIS:
   - Animal queries (e.g., "cat", "dog", "bird") → ONLY return if Rekognition labels contain that exact animal with 85%+ confidence
   - Person queries (e.g., "modi", "politician") → ONLY return if labels show "Person/Politician" OR caption/metadata explicitly names the person
   - Object queries (e.g., "book", "car", "door") → ONLY return if object is in top 3 Rekognition labels with 85%+ confidence
   - Scene queries (e.g., "landscape", "portrait") → Match to Rekognition labels
   - Caption queries (e.g., specific event or description) → Match to caption field
   - Color queries (e.g., "blue", "pink") → Currently not supported (no color metadata)

2. VALIDATION CHECKLIST (Asset must pass ALL checks):

   For "cat" query:
   ✅ CHECK 1: Does rekognitionAnalysis.labels contain "Cat" with confidence > 85%?
   ✅ CHECK 2: Is "Cat" in the top 5 labels (not buried at position 20)?
   ✅ CHECK 3: Is it the PRIMARY subject, not background element?
   ✅ CHECK 4: Alternatively, does the "caption" explicitly describe the subject?
   ❌ REJECT: Images with "cat" only in filename
   ❌ REJECT: Images where "category" contains "cat" but no Cat label
   ❌ REJECT: Books about cats (unless query is "book about cat")

3. MATCHING PRIORITY:

   a) EXACT LABEL MATCH (confidence > 90%):
      - Query: "cat" → Label: "Cat" (95% confidence) ✅
      - Query: "dog" → Label: "Dog" (92% confidence) ✅
      
   b) CAPTION MATCH (explicit):
      - Query: "graduation" → Caption: "Student at graduation ceremony" ✅
      
   c) HIGH-CONFIDENCE SEMANTIC MATCH (confidence > 85%):
      - Query: "landscape" → Labels: "Mountain" (90%), "Nature" (88%) ✅
      - Query: "portrait" → Labels: "Face" (99%), "Portrait" (95%) ✅
   
   d) AI TAG MATCH (secondary):
      - Only use if no Rekognition label matches
      - Requires multiple tag matches for confidence

4. REJECTION CRITERIA (Do NOT return if):
   ❌ Query term only appears in filename/category (not in labels)
   ❌ Rekognition label confidence < 85%
   ❌ Query animal/object is not in top 5 labels
   ❌ Multiple unrelated high-confidence labels suggest different subject
   ❌ Query is about specific object but labels show generic terms only

5. EXAMPLES:

Query: "cat"
Asset A: Labels = ["Cat" (95%), "Animal" (92%), "Pet" (88%)]
✅ RETURN - Clear cat image

Asset B: Labels = ["Book" (98%), "Publication" (95%), "Text" (90%)]
❌ REJECT - It's a book, not a cat (even if filename has "cat")

Asset C: Labels = ["Person" (99%), "Indoor" (90%), "Cat" (45%)]
❌ REJECT - Cat confidence too low, person is primary subject

Query: "dog"
Asset D: Labels = ["Dog" (97%), "Mammal" (95%), "Pet" (92%)]
✅ RETURN - Clear dog image

Asset E: Labels = ["Landscape" (98%), "Outdoor" (95%), "Dog" (30%)]
❌ REJECT - Dog is background element

Query: "landscape"
Asset F: Labels = ["Nature" (98%), "Mountain" (95%), "Sky" (92%)]
✅ RETURN - Clear landscape

RESPONSE FORMAT:

For MATCHING assets ONLY, return:

Asset ID: [assetId]
File Name: [fileName]
File URL: [url]
Match Reason: [Label name and confidence, e.g., "Cat (95% confidence)"]
Confidence: HIGH
---

If NO assets pass the validation checks, return:
"No relevant assets found for query: [query]"

CRITICAL RULES:
- Be STRICT with animal/object queries - require exact label matches
- Do NOT return assets just because they were in the candidate list
- Confidence threshold is 85% minimum for primary subject
- Filename/category matches are NOT sufficient without label confirmation
- When in doubt, REJECT the asset - precision over recall
`;
};

/**
 * Alternative: Simpler prompt for faster processing
 * Use this if the detailed prompt is too slow
 */
export const getSimpleSearchPrompt = (query) => {
  return `
Analyze these assets and return ONLY those matching: "${query}"

Requirements:
- For animals/objects: Must have exact label match with 85%+ confidence in top 5 labels
- For people: Must match name in caption/metadata or Person label
- Return format: Asset ID, File Name, File URL (one per line)

If no matches, return: "No relevant assets found"
`;
};
