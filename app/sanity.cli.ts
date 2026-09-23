import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  app: {
    organizationId: "oskjghm5i",
    entry: "./src/App.tsx",
    title: "Round Control",
  },
  deployment: {
    appId: "r0spc3yn5q8kfdkexpe79tn7",
  },
  // Let Vite load the workflow engine shared with the Studio.
  vite: (config) => ({
    ...config,
    server: { ...config.server, fs: { ...config.server?.fs, allow: [".."] } },
  }),
});
