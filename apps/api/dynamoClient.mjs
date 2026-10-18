import { createDocStore } from "./db/doc-store.mjs";

// Stores document items in PostgreSQL (table `documents`, see db/doc-store.mjs)
// behind the send(command) API.
const ddbDocClient = createDocStore();

export default ddbDocClient;
