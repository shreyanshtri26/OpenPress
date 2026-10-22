import { handler as updateStoryHandler } from "./updateStory.mjs";

export const handler = async (event) => {
  return updateStoryHandler(event);
};
