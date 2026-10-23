// Values the editor fills in as stand-ins (default card text, the dead via.placeholder.com image, "No description available")
// get saved into page data along with real content. A published page must treat them as "nothing here", whether they came from
// an old save or a story that simply has no summary or image.
const PLACEHOLDER_TEXT = /^(headline goes here|a short summary of the story appears here\.*|no description available|new card|add your content here|untitled|story title|top story \d+|featured story|recommended story|lorem ipsum.*)$/i

export const realText = (value?: string | null): string => {
  const text = (value ?? '').toString().trim()
  if (!text) return ''
  return PLACEHOLDER_TEXT.test(text.replace(/<[^>]+>/g, '').trim()) ? '' : text
}

export const realImage = (url?: string | null): string => {
  const value = (url ?? '').toString().trim()
  return value && !/via\.placeholder\.com/i.test(value) ? value : ''
}
