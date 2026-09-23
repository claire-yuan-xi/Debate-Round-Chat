import "server-only";
import { createClient } from "next-sanity";

// Writes go through server actions only, so the token never reaches the browser.
export const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2026-09-22",
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
});
