import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  containerHeight?: number; // Fixed height; if omitted, uses parent's height
}

/**
 * Simple windowed virtual list for long lists.
 * Renders only visible items + overscan buffer.
 */
export default function VirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  renderItem,
  className = "",
  containerHeight,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(containerHeight || 600);

  // Measure container
  useEffect(() => {
    if (containerHeight) {
      setHeight(containerHeight);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerHeight]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + height) / itemHeight) + overscan
  );
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto ${className}`}
      style={containerHeight ? { height: containerHeight } : { height: "100%" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {items.slice(startIndex, endIndex).map((item, i) =>
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + i)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
