import "server-only";
import { createClient } from "next-sanity";

// The team dataset is private, so every read and write happens on the server with a token.
export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  apiVersion: "2026-09-22",
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
  perspective: "published",
});
