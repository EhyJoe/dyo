'use client';
import { useEffect } from "react";
import Navbar from "../src/components/Navbar";
import SiteFooter from "../src/components/Sitefooter";
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  useEffect(() => { console.error("Unhandled application error", error); }, [error]);
  return <div className="public-widget-page"><Navbar/><main className="system-state-content"><h1>Something went wrong</h1><p>We couldn't load this page. Please try again.</p><button onClick={reset}>Try again</button></main><SiteFooter/></div>
}
