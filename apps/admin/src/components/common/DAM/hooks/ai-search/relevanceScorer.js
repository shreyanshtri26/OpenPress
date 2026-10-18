// src/components/common/DAM/hooks/ai-search/relevanceScorer.js

/**
 * Asset relevance scoring system with context-aware penalties
 */

import { fuzzyTextMatches } from './fuzzyMatch';

/**
 * Normalize text for better matching (singular/plural)
 */
const normalizeWord = (word) => {
  const lower = word.toLowerCase().trim();

  const pluralMap = {
    'cats': 'cat', 'dogs': 'dog', 'phones': 'phone', 'laptops': 'laptop',
    'people': 'person', 'men': 'man', 'women': 'woman', 'children': 'child',
    'buildings': 'building', 'cars': 'car', 'trees': 'tree'
  };

  if (pluralMap[lower]) return pluralMap[lower];
  if (lower.endsWith('ies') && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('es') && lower.length > 3) return lower.slice(0, -2);
  if (lower.endsWith('s') && lower.length > 3) return lower.slice(0, -1);

  return lower;
};

/**
 * Check if keyword matches with word boundary
 */
const wordBoundaryMatch = (text, keyword) => {
  if (!text || !keyword) return false;
  const normalized = normalizeWord(keyword);
  const textLower = text.toLowerCase();
  const wordRegex = new RegExp(`\\b${normalized}\\b`, 'i');
  if (wordRegex.test(textLower)) return true;
  const pluralForms = [normalized + 's', normalized + 'es'];
  if (pluralForms.some(form => new RegExp(`\\b${form}\\b`, 'i').test(textLower))) return true;

  // Fuzzy fallback: prefix/substring/typo-tolerant match, e.g. "sce" -> "scenery"
  return fuzzyTextMatches(textLower, normalized);
};

/**
 * Extract expression keywords from asset
 */
const getExpressionKeywords = (asset) => {
  const expressions = [];
  if (asset.tags?.expressions) {
    expressions.push(...asset.tags.expressions.map(e => e.toLowerCase()));
  }
  if (asset.expressions) {
    expressions.push(...asset.expressions.map(e => e.toLowerCase()));
  }

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
 * Score assets based on relevance to search query
 * @param {Array} assets - Array of assets to score
 * @param {string} searchValue - User search query
 * @param {Array} relevantAssetIds - IDs returned by AI
 * @returns {Array} Scored and sorted assets
 */
export const scoreAssets = (assets, searchValue, relevantAssetIds) => {
  const rawKeywords = searchValue
    .toLowerCase()
    .replace(/image|images|photo|photos|picture|pictures|give|me|show|of|wearing|with/gi, '')
    .trim()
    .split(' ')
    .filter(w => w.length > 2);

  const keywords = rawKeywords.map(normalizeWord);
  // const attributeKeywords = ['smiling', 'smile', 'happy', 'sad', 'angry', 'turban', 'hat', 'glasses']; // removed: celebrity detection feature deprecated
  // const hasAttributeQuery = keywords.some(k => attributeKeywords.includes(k));

  const scoredAssets = assets
    .map((asset) => {
      let score = 0;
      let matchType = '';
      const matchedKeywords = new Set();

      // Exact Asset ID match
      if (relevantAssetIds.includes(asset.assetId)) {
        score += 100;
        matchType = 'EXACT ID';
        keywords.forEach(k => matchedKeywords.add(k)); // AI matched, assume all keywords
      }

      // Exact filename match
      if (relevantAssetIds.includes(asset.fileName)) {
        score += 80;
        matchType = matchType || 'EXACT FILENAME';
        keywords.forEach(k => matchedKeywords.add(k));
      }

      // If AI didn't match, check individual keywords
      if (score === 0) {
        keywords.forEach(keyword => {
          let keywordMatched = false;

          // Celebrity match - removed: celebrity detection feature deprecated
          // if (asset.celebrities && asset.celebrities.length > 0) {
          //   asset.celebrities.forEach(celeb => {
          //     if (wordBoundaryMatch(celeb, keyword)) {
          //       score += 50;
          //       matchType = matchType || 'CELEBRITY';
          //       keywordMatched = true;
          //     }
          //   });
          // }

          // Expression match
          const expressions = getExpressionKeywords(asset);
          if (expressions.some(expr => normalizeWord(expr) === keyword || expr.includes(keyword))) {
            score += 40;
            matchType = matchType || 'EXPRESSION';
            keywordMatched = true;
          }

          // Custom tags
          if (asset.tags?.customTags) {
            asset.tags.customTags.forEach(tag => {
              if (wordBoundaryMatch(tag, keyword)) {
                score += 30;
                matchType = matchType || 'CUSTOM TAG';
                keywordMatched = true;
              }
            });
          }

          // AI tags
          if (asset.tags?.aiTags) {
            asset.tags.aiTags.forEach(tag => {
              if (wordBoundaryMatch(tag, keyword)) {
                score += 20;
                matchType = matchType || 'AI TAG';
                keywordMatched = true;
              }
            });
          }

          // Title match
          if (wordBoundaryMatch(asset.name, keyword)) {
            score += 35;
            matchType = matchType || 'TITLE';
            keywordMatched = true;
          }

          // Summary match
          if (wordBoundaryMatch(asset.summary, keyword)) {
            score += 15;
            matchType = matchType || 'SUMMARY';
            keywordMatched = true;
          }

          // Caption match
          if (wordBoundaryMatch(asset.caption, keyword)) {
            score += 25;
            matchType = matchType || 'CAPTION';
            keywordMatched = true;
          }

          if (keywordMatched) {
            matchedKeywords.add(keyword);
          }
        });

        // ✅ AND LOGIC: All keywords must match
        const allKeywordsMatched = matchedKeywords.size === keywords.length;
        if (!allKeywordsMatched) {
          score = 0; // Exclude if not all keywords matched
        }

        // Bonus for person + attribute matches - removed: celebrity detection feature deprecated
        // if (hasAttributeQuery && allKeywordsMatched && asset.celebrities?.length > 0) {
        //   score += 25;
        // }
      }

      // URL match
      if (relevantAssetIds.some(id => asset.url?.includes(id))) {
        score += 10;
        matchType = matchType || 'URL';
      }

      // Apply context-aware penalties
      score = applyContextPenalties(asset, searchValue, score);

      return { ...asset, relevanceScore: score, matchType };
    })
    .filter(asset => asset.relevanceScore > 0);

  // Sort by score (highest first)
  scoredAssets.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return scoredAssets;
};

/**
 * Apply context-aware penalties to reduce false matches
 * @param {Object} asset - Asset to evaluate
 * @param {string} searchValue - Search query
 * @param {number} currentScore - Current relevance score
 * @returns {number} Adjusted score
 */
const applyContextPenalties = (asset, searchValue, currentScore) => {
  let score = currentScore;

  if (!asset.fileName) return score;

  const searchKeywords = searchValue.toLowerCase().split(' ').filter(w => w.length > 2);
  // const isProbablyPersonSearch = asset.celebrities && asset.celebrities.length > 0; // removed: celebrity detection feature deprecated
  const filenameLower = asset.fileName.toLowerCase();

  // PENALTY 1: Location indicators (when searching for a person) - removed: celebrity detection feature deprecated
  // if (isProbablyPersonSearch) {
  //   const locationIndicators = ['stadium', 'airport', 'station', 'building', 'bridge', 'road', 'street', 'park'];
  //   locationIndicators.forEach(indicator => {
  //     if (filenameLower.includes(indicator)) {
  //       const hasSearchTermWithIndicator = searchKeywords.some(keyword =>
  //         filenameLower.includes(keyword + '_' + indicator) ||
  //         filenameLower.includes(indicator + '_' + keyword)
  //       );
  //       if (hasSearchTermWithIndicator) {
  //         score -= 50;
  //         console.log(`  ⚠️ Location penalty for: ${indicator}`);
  //       }
  //     }
  //   });
  // }

  // PENALTY 2: Event context indicators
  const eventIndicators = [
    'during', 'at_', 'vs', 'match', 'game', 'ceremony',
    'inauguration', 'opening', 'conference', 'meeting'
  ];

  let eventPenaltyCount = 0;
  eventIndicators.forEach(indicator => {
    if (filenameLower.includes(indicator)) {
      eventPenaltyCount++;
    }
  });

  if (eventPenaltyCount >= 2) {
    score -= 30;
    console.log(`  ⚠️ Event context penalty (${eventPenaltyCount} indicators)`);
  }

  // PENALTY 3: Other subjects detected - removed: celebrity detection feature deprecated
  // if (isProbablyPersonSearch && searchKeywords.length > 0) {
  //   const otherCelebritiesInFilename = asset.celebrities?.filter(celeb => {
  //     const celebLower = celeb.toLowerCase();
  //     return filenameLower.includes(celebLower) &&
  //       !searchKeywords.some(k => celebLower.includes(k));
  //   });
  //   if (otherCelebritiesInFilename && otherCelebritiesInFilename.length > 0) {
  //     const filenameStart = filenameLower.substring(0, 50);
  //     const searchTermEarly = searchKeywords.some(k => filenameStart.includes(k));
  //     if (!searchTermEarly) {
  //       score -= 25;
  //       console.log(`  ⚠️ Other subject penalty: ${otherCelebritiesInFilename[0]}`);
  //     }
  //   }
  // }

  // PENALTY 4: Transportation/Infrastructure
  const infrastructureTerms = ['train', 'railway', 'metro', 'bus', 'transport', 'highway'];
  infrastructureTerms.forEach(term => {
    if (filenameLower.includes(term)) {
      if (!searchKeywords.some(k => k.includes(term))) {
        score -= 35;
        console.log(`  ⚠️ Infrastructure penalty: ${term}`);
      }
    }
  });

  // PENALTY 5: Date/Time filenames
  const datePattern = /\d{4}[-_]\d{2}[-_]\d{2}|\d{2}[-_]\d{2}[-_]\d{4}/;
  if (datePattern.test(filenameLower)) { // && !isProbablyPersonSearch - removed: celebrity detection feature deprecated
    score -= 15;
    console.log(`  ⚠️ Generic date filename penalty`);
  }

  // BONUS: Exact name in filename (without context words) - removed: celebrity detection feature deprecated
  // if (isProbablyPersonSearch && searchKeywords.length > 0) {
  //   const cleanFileName = filenameLower
  //     .replace(/[-_]/g, ' ')
  //     .split(' ')
  //     .filter(w => w.length > 2);
  //   const exactNameMatch = searchKeywords.some(keyword =>
  //     cleanFileName.includes(keyword) &&
  //     cleanFileName.indexOf(keyword) < 3
  //   );
  //   if (exactNameMatch) {
  //     score += 15;
  //     console.log(`  ✅ Prominent name bonus`);
  //   }
  // }

  return score;
};
