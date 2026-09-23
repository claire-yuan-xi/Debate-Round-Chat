import { createClient } from "next-sanity";

// Read-only client for live updates in the browser. The dataset is public, so no token.
export const browserClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2026-09-22",
  useCdn: false,
});
