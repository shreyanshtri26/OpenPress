export const normalizeDescription = (value) => {
  try {
    // Case 1: Already in Editor.js JSON format
    if (value && typeof value === "object" && value.blocks) {
      return value;
    }

    // Case 2: Old HTML string from ReactQuill
    if (typeof value === "string") {
      return {
        blocks: [
          {
            type: "paragraph",
            data: { text: value }
          }
        ]
      };
    }

    // Case 3: Empty or invalid
    return { blocks: [] };
  } catch (e) {
    console.error("Failed to normalize description:", e);
    return { blocks: [] };
  }
};
