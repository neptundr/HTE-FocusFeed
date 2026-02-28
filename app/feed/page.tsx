"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import FeedContainer from "@/components/feed/FeedContainer";
import TopBar from "@/components/layout/TopBar";
import { FeedItem } from "@/lib/mock-data";
import { usePreferences } from "@/lib/stores/preferences";

function FeedContent() {
  const searchParams = useSearchParams();
  const startVideoId = searchParams.get("videoId") || searchParams.get("startVideo");

  const { videoLength, contentTypes, courses } = usePreferences();

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(() => {
    const params = new URLSearchParams();
    params.set("limit", "50");

    if (!startVideoId) {
      if (videoLength.length > 0 && videoLength.length < 3) {
        params.set("videoLength", videoLength.join(","));
      }
      if (contentTypes.length > 0 && contentTypes.length < 4) {
        params.set("contentTypes", contentTypes.join(","));
      }
      const visibleCourseIds = courses.filter((c) => c.visible).map((c) => c.id);
      if (visibleCourseIds.length > 0) {
        params.set("courseIds", visibleCourseIds.join(","));
      }
    }

    setLoading(true);
    fetch(`/api/feed?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setFeed(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [startVideoId, videoLength, contentTypes, courses]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-moonDust-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="h-[100dvh] bg-dark flex items-center justify-center px-6">
        <p className="text-gray-400 text-sm text-center">No content matches your filters. Try adjusting them in Customize.</p>
      </div>
    );
  }

  const startIndex = startVideoId
    ? Math.max(0, feed.findIndex((item) => item.type === "video" && item.data.id === startVideoId))
    : 0;

  return <FeedContainer items={feed} startIndex={startIndex} />;
}

export default function FeedPage() {
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("wheel", block, { passive: false });
    document.addEventListener("touchmove", block, { passive: false });
    return () => {
      document.removeEventListener("wheel", block);
      document.removeEventListener("touchmove", block);
    };
  }, []);

  return (
    <div className="relative h-[100dvh] overflow-hidden">
      <TopBar />
      <Suspense fallback={<div className="h-[100dvh] bg-dark flex items-center justify-center"><div className="w-8 h-8 border-2 border-moonDust-blue border-t-transparent rounded-full animate-spin" /></div>}>
        <FeedContent />
      </Suspense>
    </div>
  );
}
