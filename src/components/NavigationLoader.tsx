"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Loading from "../../app/loading";

export default function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const previousRouteKey = useRef(routeKey);
  const pendingNavigation = useRef(false);
  const adminActionTimer = useRef<number | null>(null);
  useEffect(() => {
    const show = () => {
      pendingNavigation.current = true;
      setVisible(true);
    };
    const start = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
    const startAdminAction = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".admin-shell")) return;
      const action = target.closest("button, a[href], [role='button'], input[type='button'], input[type='submit']");
      if (!action) return;

      // Route links remain visible until the route commits. Same-page admin
      // actions get a brief overlay so the click has immediate feedback.
      setVisible(true);
      if (adminActionTimer.current !== null) window.clearTimeout(adminActionTimer.current);
      adminActionTimer.current = window.setTimeout(() => {
        adminActionTimer.current = null;
        if (!pendingNavigation.current) setVisible(false);
      }, 700);
    };

    window.addEventListener("dyo:navigation-start", show);
    // Bubble after the link/button's own handler has begun navigation/action.
    document.addEventListener("click", start);
    document.addEventListener("click", startAdminAction);
    return () => {
      window.removeEventListener("dyo:navigation-start", show);
      document.removeEventListener("click", start);
      document.removeEventListener("click", startAdminAction);
      if (adminActionTimer.current !== null) window.clearTimeout(adminActionTimer.current);
    };
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

  if (!visible) return null;

  return <Loading />;
}
