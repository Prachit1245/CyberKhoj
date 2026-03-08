const BOOKMARKS_KEY = "hackmind_bookmarks";

export type BookmarkType = "attack_path" | "payload" | "cheatsheet";

export interface Bookmark {
  id: string;
  type: BookmarkType;
  title: string;
  description: string;
  sourceContext: string; // e.g. "Analyzer — example.com" or "XSS Payloads"
  severity?: string;
  code?: string;
  createdAt: string;
}

export const getBookmarks = (): Bookmark[] => {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const save = (bookmarks: Bookmark[]) => {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  window.dispatchEvent(new Event("hackmind:bookmarks-changed"));
};

export const addBookmark = (bookmark: Omit<Bookmark, "id" | "createdAt">): Bookmark => {
  const bookmarks = getBookmarks();
  const entry: Bookmark = {
    ...bookmark,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  bookmarks.unshift(entry);
  save(bookmarks);
  // Achievement check
  import("@/lib/achievements").then(m => m.checkBookmarkAchievement());
  return entry;
};

export const removeBookmark = (id: string): void => {
  const bookmarks = getBookmarks().filter((b) => b.id !== id);
  save(bookmarks);
};

export const isBookmarked = (type: BookmarkType, title: string): boolean => {
  return getBookmarks().some((b) => b.type === type && b.title === title);
};

export const findBookmark = (type: BookmarkType, title: string): Bookmark | undefined => {
  return getBookmarks().find((b) => b.type === type && b.title === title);
};

export const toggleBookmark = (
  bookmark: Omit<Bookmark, "id" | "createdAt">
): { added: boolean } => {
  const existing = findBookmark(bookmark.type, bookmark.title);
  if (existing) {
    removeBookmark(existing.id);
    return { added: false };
  } else {
    addBookmark(bookmark);
    return { added: true };
  }
};

export const clearAllBookmarks = (): void => {
  save([]);
};

export const getBookmarkCount = (): number => getBookmarks().length;

export const getBookmarksByType = (type: BookmarkType): Bookmark[] => {
  return getBookmarks().filter((b) => b.type === type);
};
