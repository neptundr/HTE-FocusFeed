"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import VideoReel from "./VideoReel";
import QuizCard from "./QuizCard";
import DislikeModal from "./DislikeModal";
import CommentsPanel from "./CommentsPanel";
import ShareModal from "./ShareModal";
import { FeedItem } from "@/lib/mock-data";

interface FeedContainerProps {
  items: FeedItem[];
  startIndex?: number;
}

export default function FeedContainer({ items, startIndex = 0 }: FeedContainerProps) {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [dislikeVideoId, setDislikeVideoId] = useState<string | null>(null);
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null);
  const [shareVideoId, setShareVideoId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeRef = useRef(startIndex);
  const cooldownRef = useRef(false);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    if (clamped === activeRef.current) return;

    cooldownRef.current = true;
    activeRef.current = clamped;
    setActiveIndex(clamped);

    setTimeout(() => {
      cooldownRef.current = false;
    }, 1100);
  }, [items.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (cooldownRef.current) return;

      if (e.deltaY > 2) {
        goTo(activeRef.current + 1);
      } else if (e.deltaY < -2) {
        goTo(activeRef.current - 1);
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [goTo]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let touchHandled = false;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchHandled = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (cooldownRef.current || touchHandled) return;

      const deltaY = touchStartY - e.touches[0].clientY;
      if (Math.abs(deltaY) > 40) {
        touchHandled = true;
        goTo(activeRef.current + (deltaY > 0 ? 1 : -1));
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
    };
  }, [goTo]);

  return (
    <>
      <div
        ref={containerRef}
        className="h-[100dvh] overflow-hidden mx-auto relative"
        style={{ maxWidth: "480px" }}
      >
        <div
          className="transition-transform duration-500 ease-out"
          style={{ transform: `translateY(-${activeIndex * 100}dvh)` }}
        >
          {items.map((item, idx) => {
            if (item.type === "video") {
              return (
                <VideoReel
                  key={item.data.id}
                  video={item.data}
                  isActive={idx === activeIndex}
                  onDislike={() => setDislikeVideoId(item.data.id)}
                  onComment={() => setCommentVideoId(item.data.id)}
                  onShare={() => setShareVideoId(item.data.id)}
                />
              );
            }
            return <QuizCard key={item.data.id} quiz={item.data} />;
          })}
        </div>
      </div>

      <DislikeModal
        open={!!dislikeVideoId}
        onClose={() => setDislikeVideoId(null)}
        videoId={dislikeVideoId}
      />
      <CommentsPanel
        open={!!commentVideoId}
        onClose={() => setCommentVideoId(null)}
        videoId={commentVideoId}
      />
      <ShareModal
        open={!!shareVideoId}
        onClose={() => setShareVideoId(null)}
        videoId={shareVideoId}
      />
    </>
  );
}
