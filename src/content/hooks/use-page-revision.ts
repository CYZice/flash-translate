import { useEffect, useRef, useState } from "react";

interface PageLocation {
  origin: string;
  pathname: string;
  search: string;
}

interface WindowWithNavigation extends Window {
  navigation?: EventTarget;
}

export function getPageIdentity(location: PageLocation): string {
  return location.origin + location.pathname + location.search;
}

/**
 * Returns a revision that changes when the current page URL changes.
 *
 * Hash-only navigation keeps the same revision because it stays on the same
 * page. The Navigation API covers History API changes made by SPA routers;
 * popstate remains as a fallback for history traversal.
 */
export function usePageRevision(): number {
  const [revision, setRevision] = useState(0);
  const pageIdentityRef = useRef(getPageIdentity(window.location));

  useEffect(() => {
    const handleNavigation = () => {
      const nextPageIdentity = getPageIdentity(window.location);
      if (nextPageIdentity === pageIdentityRef.current) {
        return;
      }

      pageIdentityRef.current = nextPageIdentity;
      setRevision((currentRevision) => currentRevision + 1);
    };

    const navigation = (window as WindowWithNavigation).navigation;
    navigation?.addEventListener("navigatesuccess", handleNavigation);
    window.addEventListener("popstate", handleNavigation);

    return () => {
      navigation?.removeEventListener("navigatesuccess", handleNavigation);
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  return revision;
}
