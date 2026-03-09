import { useEffect } from "react";

/** Sets document.title on mount and restores the default on unmount. */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => { document.title = prev; };
  }, [title]);
}
