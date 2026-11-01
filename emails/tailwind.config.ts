import { pixelBasedPreset, type TailwindConfig } from "react-email";

export default {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1a1a1a",
          foreground: "#fafafa",
          muted: "#737373",
          border: "#e5e5e5",
          surface: "#f5f5f5",
        },
      },
    },
  },
} satisfies TailwindConfig;

export const brand = {
  name: "Course Platform",
  /** Set AUTH_URL / APP_URL in production; empty in `email dev` for local static paths */
  baseUrl:
    process.env.NODE_ENV === "production"
      ? (process.env.AUTH_URL ?? process.env.APP_URL ?? "https://example.com")
      : "",
};
