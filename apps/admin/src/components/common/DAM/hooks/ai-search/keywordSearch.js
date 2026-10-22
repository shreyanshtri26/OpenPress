/**
 * Fallback keyword-based search when AI doesn't return results
 * Now supports: pluralization, AND logic, word boundaries, person+attribute matching,
 * and fuzzy/partial matching (prefix, substring, typo tolerance)
 */

import { fuzzyTextMatches } from './fuzzyMatch';

/**
 * Normalize text for better matching (singular/plural, stemming)
 * @param {string} word - Word to normalize
 * @returns {string} Normalized word
 */
const normalizeWord = (word) => {
  const lower = word.toLowerCase().trim();

  // Common plural → singular conversions
  const pluralMap = {
    'cats': 'cat',
    'dogs': 'dog',
    'phones': 'phone',
    'laptops': 'laptop',
    'people': 'person',
    'men': 'man',
    'women': 'woman',
    'children': 'child',
    'buildings': 'building',
    'cars': 'car',
    'trees': 'tree',
    'mountains': 'mountain',
    'beaches': 'beach',
    'cities': 'city',
    'countries': 'country',
  };

  if (pluralMap[lower]) return pluralMap[lower];

  // Generic plural handling (remove 's', 'es', 'ies')
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y'; // cities → city
  }
  if (lower.endsWith('es') && lower.length > 3) {
    return lower.slice(0, -2); // beaches → beach
  }
  if (lower.endsWith('s') && lower.length > 3) {
    return lower.slice(0, -1); // cats → cat
  }

  return lower;
};

/**
 * Check if keyword matches with word boundary (not substring)
 * @param {string} text - Text to search in
 * @param {string} keyword - Keyword to find
 * @returns {boolean} True if word boundary match found
 */
const wordBoundaryMatch = (text, keyword) => {
  if (!text || !keyword) return false;

  const normalized = normalizeWord(keyword);
  const textLower = text.toLowerCase();

  // Try exact word boundary match first
  const wordRegex = new RegExp(`\\b${normalized}\\b`, 'i');
  if (wordRegex.test(textLower)) return true;

  // Also check plural form
  const pluralForms = [normalized + 's', normalized + 'es'];
  if (pluralForms.some(form => new RegExp(`\\b${form}\\b`, 'i').test(textLower))) return true;

  // Fuzzy fallback: prefix/substring/typo-tolerant match, e.g. "sce" -> "scenery"
  return fuzzyTextMatches(textLower, normalized);
};

/**
 * Extract expression/emotion keywords from asset
 * @param {Object} asset - Asset to check
 * @returns {Array} Expression keywords
 */
const getExpressionKeywords = (asset) => {
  const expressions = [];

  // Check if expressions are stored in tags or metadata
  if (asset.tags?.expressions) {
    expressions.push(...asset.tags.expressions.map(e => e.toLowerCase()));
  }

  // Check summary for expression keywords (with synonyms)
  const summaryLower = (asset.summary || '').toLowerCase();

  // Expression synonyms mapping
  const expressionSynonyms = {
    'smiling': ['smiling', 'smile', 'grinning', 'cheerful', 'joyful', 'beaming'],
    'happy': ['happy', 'joyful', 'cheerful', 'delighted', 'pleased', 'content'],
    'sad': ['sad', 'unhappy', 'sorrowful', 'melancholy', 'gloomy'],
    'angry': ['angry', 'furious', 'mad', 'irritated', 'annoyed'],
    'surprised': ['surprised', 'shocked', 'astonished', 'amazed'],
    'neutral': ['neutral', 'calm', 'composed', 'serene'],
    'frowning': ['frowning', 'scowling', 'grimacing']
  };

  // Check for any synonym in summary
  Object.entries(expressionSynonyms).forEach(([mainExpression, synonyms]) => {
    if (synonyms.some(syn => summaryLower.includes(syn))) {
      expressions.push(mainExpression);
    }
  });

  return [...new Set(expressions)];
};

/**
 * Perform keyword-based search on asset metadata
 * @param {Array} assets - Assets to search
 * @param {string} searchValue - Search query
 * @returns {Array} Scored and sorted assets
 */
export const performKeywordSearch = (assets, searchValue) => {
  const rawKeywords = searchValue
    .toLowerCase()
    .replace(/image|images|photo|photos|picture|pictures|give|me|show|of|wearing|with/gi, '')
    .trim()
    .split(' ')
    .filter(w => w.length > 2);

  // Normalize keywords (handle plurals)
  const keywords = rawKeywords.map(normalizeWord);

  console.log('🔑 Original keywords:', rawKeywords);
  console.log('🔑 Normalized keywords:', keywords);

  // Detect if this is a person + attribute query - removed: celebrity detection feature deprecated
  // const attributeKeywords = ['smiling', 'smile', 'happy', 'sad', 'angry', 'turban', 'hat', 'glasses', 'suit'];
  // const hasAttributeQuery = keywords.some(k => attributeKeywords.includes(k));

  const scoredAssets = assets
    .map(asset => {
      let score = 0;
      const matchedKeywords = new Set();

      keywords.forEach(keyword => {
        let keywordMatched = false;

        // Check celebrities (highest weight) - removed: celebrity detection feature deprecated
        // if (asset.celebrities?.some(c => wordBoundaryMatch(c, keyword))) {
        //   score += 50;
        //   keywordMatched = true;
        // }

        // Check expressions (for smile, happy, etc.)
        const expressions = getExpressionKeywords(asset);
        if (expressions.some(expr => normalizeWord(expr) === keyword || expr.includes(keyword))) {
          score += 40;
          keywordMatched = true;
        }

        // Check custom tags
        if (asset.tags?.customTags?.some(t => wordBoundaryMatch(t, keyword))) {
          score += 30;
          keywordMatched = true;
        }

        // Check AI tags
        if (asset.tags?.aiTags?.some(t => wordBoundaryMatch(t, keyword))) {
          score += 20;
          keywordMatched = true;
        }

        // Check ImageAnalysis labels
        if (asset.imageAnalysis?.labels?.labels?.some(l =>
          wordBoundaryMatch(l.name, keyword)
        )) {
          score += 15;
          keywordMatched = true;
        }

        // Check title
        if (wordBoundaryMatch(asset.name, keyword)) {
          score += 35;
          keywordMatched = true;
        }

        // Check summary
        if (wordBoundaryMatch(asset.summary, keyword)) {
          score += 10;
          keywordMatched = true;
        }

        // Check caption
        if (wordBoundaryMatch(asset.caption, keyword)) {
          score += 12;
          keywordMatched = true;
        }

        // Check filename (lower priority)
        if (wordBoundaryMatch(asset.fileName, keyword)) {
          score += 5;
          keywordMatched = true;
        }

        if (keywordMatched) {
          matchedKeywords.add(keyword);
        }
      });

      // ✅ AND LOGIC: All keywords must match
      const allKeywordsMatched = matchedKeywords.size === keywords.length;

      // If not all keywords matched, set score to 0 (exclude from results)
      if (!allKeywordsMatched) {
        score = 0;
      }

      // Bonus for person + attribute matches - removed: celebrity detection feature deprecated
      // if (hasAttributeQuery && allKeywordsMatched && asset.celebrities?.length > 0) {
      //   score += 25; // Boost person+attribute matches
      // }

      return { ...asset, relevanceScore: score, matchedKeywords: matchedKeywords.size };
    })
    .filter(asset => asset.relevanceScore > 0);

  scoredAssets.sort((a, b) => b.relevanceScore - a.relevanceScore);

  console.log(`✅ Found ${scoredAssets.length} assets matching ALL keywords`);

  return scoredAssets;
};
