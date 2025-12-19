"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MetricCarouselProps {
  children: React.ReactNode;
  className?: string;
  showDots?: boolean;
}

/**
 * A responsive carousel component for metric cards.
 * - On mobile: Shows as a horizontal scrolling carousel with snap points
 * - On desktop (lg+): Shows as a standard grid layout
 *
 * Uses CSS scroll-snap for smooth, native touch scrolling.
 */
export function MetricCarousel({
  children,
  className,
  showDots = true,
}: MetricCarouselProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const childrenArray = React.Children.toArray(children);
  const childCount = childrenArray.length;

  // Track scroll position to update active dot (throttled with rAF for performance)
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let animationFrameId: number | null = null;

    const handleScroll = () => {
      // Throttle updates to at most once per animation frame
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        const scrollLeft = container.scrollLeft;
        const cardWidth = container.scrollWidth / childCount || 1;
        const newIndex = Math.round(scrollLeft / cardWidth);
        setActiveIndex(Math.min(Math.max(newIndex, 0), childCount - 1));
        animationFrameId = null;
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      container.removeEventListener("scroll", handleScroll);
    };
  }, [childCount]);

  // Scroll to specific card when dot is clicked
  const scrollToIndex = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cards = container.children;
    if (cards[index]) {
      (cards[index] as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    }
  };

  if (childCount === 0) {
    return (
      <div className={className}>
        <div
          role="region"
          aria-label="Metrics carousel"
          ref={scrollContainerRef}
        >
          <div className="flex" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Carousel Container */}
      <div
        ref={scrollContainerRef}
        role="region"
        aria-label="Metrics carousel"
        className={cn(
          // Mobile: horizontal scroll with snap
          // scrollbar-hide class handles all vendor prefixes for hiding scrollbar
          "flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide",
          // Desktop: grid layout
          "lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0 lg:gap-4"
        )}
      >
        {childrenArray.map((child, index) => (
          <div
            key={index}
            className={cn(
              // Mobile: fixed width cards that snap.
              // NOTE: The 8px here is half of the container gap (`gap-4` = 16px),
              // so that two cards fit side-by-side including the gap. If the gap
              // value in the container changes, this width calculation must be
              // updated accordingly.
              "flex-shrink-0 w-[calc(50%-8px)] snap-start",
              // Desktop: auto-fill grid
              "lg:w-auto lg:flex-shrink"
            )}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Dot Indicators - visible only on mobile */}
      {showDots && childCount > 0 && (
        <div
          className="flex justify-center gap-1.5 lg:hidden"
          role="tablist"
          aria-label="Carousel navigation"
        >
          {childrenArray.map((_, index) => (
            <button
              key={index}
              role="tab"
              aria-label={`Go to slide ${index + 1}`}
              aria-selected={index === activeIndex}
              onClick={() => scrollToIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                index === activeIndex
                  ? "bg-primary scale-110"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
