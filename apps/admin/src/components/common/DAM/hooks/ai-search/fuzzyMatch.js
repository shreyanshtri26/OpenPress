/**
 * Shared fuzzy matching utilities for asset search.
 * Supports partial/prefix matching (e.g. "sce" -> "scenery") and
 * typo-tolerant matching (e.g. "scenry" -> "scenery") in addition to
 * the existing exact/plural word-boundary matching.
 */

/**
 * Levenshtein edit distance between two strings.
 * Used to tolerate small typos when fuzzy-matching a keyword against a word.
 * @param {string} a
 * @param {string} b
 * @returns {number} edit distance
 */
export const levenshteinDistance = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 0; i < a.length; i += 1) {
    const currentRow = [i + 1];

    for (let j = 0; j < b.length; j += 1) {
      const insertCost = currentRow[j] + 1;
      const deleteCost = previousRow[j + 1] + 1;
      const substitutionCost = previousRow[j] + (a[i] === b[j] ? 0 : 1);

      currentRow.push(Math.min(insertCost, deleteCost, substitutionCost));
    }

    previousRow = currentRow;
  }

  return previousRow[b.length];
};

/**
 * Maximum allowed edit distance for a fuzzy match, scaled by keyword length
 * so short keywords stay strict (avoids too many false positives) while
 * longer keywords tolerate a couple of typos.
 * @param {number} length
 * @returns {number}
 */
const maxAllowedDistance = (length) => {
  if (length <= 4) return 1;
  if (length <= 7) return 2;
  return 3;
};

/**
 * Check whether a keyword fuzzily/partially matches a single word.
 * Order of checks (cheapest first): exact, prefix, substring, edit distance.
 * @param {string} word - Candidate word (already lowercased)
 * @param {string} keyword - Normalized search keyword (already lowercased)
 * @returns {boolean}
 */
export const fuzzyWordMatches = (word, keyword) => {
  if (!word || !keyword) return false;

  if (word === keyword) return true;

  // Prefix match: typing "sce" should match "scenery"
  if (keyword.length >= 3 && word.startsWith(keyword)) return true;

  // Substring match: catches mid-word fragments
  if (keyword.length >= 3 && word.includes(keyword)) return true;

  // Typo tolerance for longer keywords only, to avoid noisy short-word matches
  if (keyword.length >= 4) {
    const distance = levenshteinDistance(word, keyword);
    if (distance <= maxAllowedDistance(keyword.length)) return true;
  }

  return false;
};

/**
 * Check if a keyword fuzzily matches anywhere within a block of text
 * (splits text into words and tests each one).
 * @param {string} text
 * @param {string} keyword - Already-normalized keyword
 * @returns {boolean}
 */
export const fuzzyTextMatches = (text, keyword) => {
  if (!text || !keyword) return false;

  const words = text.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
  return words.some((word) => fuzzyWordMatches(word, keyword));
};
