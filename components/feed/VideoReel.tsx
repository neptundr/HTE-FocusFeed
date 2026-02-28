"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { IoThumbsUp, IoThumbsUpOutline, IoThumbsDownOutline, IoChatbubbleOutline, IoShareSocialOutline } from "react-icons/io5";
import PlaybackSlider from "./PlaybackSlider";
import type { MockVideo, MockUser, MockCourse } from "@/lib/mock-data";

interface VideoReelProps {
  video: MockVideo & { user: MockUser; course: MockCourse; likesCount: number; commentsCount: number };
  isActive: boolean;
  onDislike: () => void;
  onComment: () => void;
  onShare: () => void;
}

export default function VideoReel({ video, isActive, onDislike, onComment, onShare }: VideoReelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [sliderVisible, setSliderVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      el.pause();
      el.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleInteraction = useCallback(() => {
    setSliderVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setSliderVisible(false), 3000);
  }, []);

  const handleMouseEnter = () => setSliderVisible(true);
  const handleMouseLeave = () => setSliderVisible(false);

  const iconShadow = "drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]";
  const textShadow = "[text-shadow:0_1px_4px_rgba(0,0,0,0.9)]";

  return (
    <div
      className="relative h-[100dvh] w-full snap-start snap-always bg-black"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={video.videoUrl}
        className="h-full w-full object-cover object-top"
        loop
        muted
        playsInline
        onClick={() => {
          togglePlay();
          handleInteraction();
        }}
        onTouchStart={handleInteraction}
      />

      {!isPlaying && isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-l-[20px] border-l-white ml-1" />
          </div>
        </div>
      )}

      {/* Icons — above bottom nav (56px) */}
      <div className={`absolute right-3 bottom-[9.5rem] flex flex-col items-center gap-5 ${iconShadow}`}>
        <button
          onClick={() => setLiked(!liked)}
          className="flex flex-col items-center gap-1"
        >
          {liked ? (
            <IoThumbsUp size={28} className="text-moonDust-blue" />
          ) : (
            <IoThumbsUpOutline size={28} className="text-white" />
          )}
          <span className={`text-xs text-white ${textShadow}`}>{video.likesCount + (liked ? 1 : 0)}</span>
        </button>

        <button onClick={onDislike} className="flex flex-col items-center gap-1">
          <IoThumbsDownOutline size={26} className="text-white" />
        </button>

        <button onClick={onComment} className="flex flex-col items-center gap-1">
          <IoChatbubbleOutline size={26} className="text-white" />
          <span className={`text-xs text-white ${textShadow}`}>{video.commentsCount}</span>
        </button>

        <button onClick={onShare} className="flex flex-col items-center gap-1">
          <IoShareSocialOutline size={26} className="text-white" />
        </button>
      </div>

      {/* Title & username — above slider, above bottom nav */}
      <div className={`absolute bottom-[5.5rem] left-4 right-16 ${textShadow}`}>
        <Link href={`/profile/${video.userId}`} className="text-white font-semibold text-sm hover:underline">
          @{video.user.username}
        </Link>
        <p className="text-white text-sm mt-1">{video.title}</p>
      </div>

      {/* Slider — just above bottom nav */}
      <PlaybackSlider videoRef={videoRef} visible={sliderVisible} />
    </div>
  );
}
