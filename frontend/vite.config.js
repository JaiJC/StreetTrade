import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Allow Cursor cloud preview hosts in remote dev environments.
    allowedHosts: [
      "18e99c61a033e90133dd-pod-nbzcetp4jbeqrhju7t6yekx2lm-5173.us5.cursorvm.com",
      ".cursorvm.com",
      "localhost",
      "127.0.0.1",
    ],
  },
});
