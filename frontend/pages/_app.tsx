import type { AppProps } from "next/app";
import "@/styles/globals.css";

// Font stacks are defined directly in globals.css as system-font stacks
// (no external font CDN dependency, so the build works offline / behind
// restrictive corporate networks). See --font-display and --font-body.

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
