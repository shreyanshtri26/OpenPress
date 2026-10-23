// GET /pagebuilder/republishAll/status
// How the editor polls progress and learns how a run ended.

import { publicJob, readJob } from "./republishAllJob.mjs";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  try {
    if (!event.user) return json(401, { message: "401 Unauthorized request" });

    const { job } = await readJob();
    return json(200, { job: publicJob(job, event.user) });
  } catch (err) {
    console.error("[republishAllStatus] failed to read job:", err);
    return json(500, { message: "Server error reading republish status", error: err?.message });
  }
};
