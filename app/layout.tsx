import type { Metadata } from "next";
import "../src/index.css";
import "../src/components/Layout.css";
import "../src/site-design.css";
import Providers from "./providers/providers";
export const metadata: Metadata = { title: "DYO Youth", description: "Diocese of Youth and Outreach" };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>}

