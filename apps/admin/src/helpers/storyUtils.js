const safeString = (value) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const extractTextFromDescription = (description) => {
  if (!description) return undefined;

  if (typeof description === 'string') {
    const trimmed = safeString(description);
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return extractTextFromDescription(parsed);
      }
    } catch (e) {
      // fall through
    }
    return trimmed;
  }

  const maybeBlocks = description?.blocks;
  if (Array.isArray(maybeBlocks)) {
    const segments = maybeBlocks
      .map((block) => {
        if (!block || typeof block !== 'object') return '';
        const data = block.data || {};
        if (typeof data.text === 'string') return data.text;
        if (typeof data.caption === 'string') return data.caption;
        if (typeof data.content === 'string') return data.content;
        if (typeof block.text === 'string') return block.text;
        return '';
      })
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (segments.length > 0) return segments.join(' ');
  }
  return undefined;
};

export const calculateReadTimeFromText = (text) => {
  if (!text) return '1 min read';
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 220);
  return `${Math.max(1, minutes)} min read`;
};
