"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import Loading from "../../app/loading";

export default function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const previousRouteKey = useRef(routeKey);
  const pendingNavigation = useRef(false);
  useEffect(() => {
    const show = () => {
      pendingNavigation.current = true;
      flushSync(() => setVisible(true));
    };
    const start = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      show();
    };

    window.addEventListener("dyo:navigation-start", show);
    document.addEventListener("click", start, true);
    return () => {
      window.removeEventListener("dyo:navigation-start", show);
      document.removeEventListener("click", start, true);
    };
  }, []);

  useEffect(() => {
    const syncDataLoading = () => {
      const text = document.body.innerText;
      const next = /Loading|Checking your account/i.test(text);
      setDataLoading((current) => current === next ? current : next);
    };
    syncDataLoading();
    const observer = new MutationObserver(syncDataLoading);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (previousRouteKey.current === routeKey) return;
    previousRouteKey.current = routeKey;
    if (!pendingNavigation.current) return;

    // A route key change means the destination has committed. Hide after that
    // render has painted, so the previous route can't flash underneath.
    const frame = window.requestAnimationFrame(() => setVisible(false));
    pendingNavigation.current = false;
    return () => window.cancelAnimationFrame(frame);
  }, [routeKey]);

  useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(() => {
      pendingNavigation.current = false;
      setVisible(false);
    }, 12000);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  if (!visible && !dataLoading) return null;

  return <Loading />;
}
