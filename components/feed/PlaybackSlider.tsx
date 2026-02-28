"use client";

import { useRef, useCallback, useEffect, useState } from "react";

interface PlaybackSliderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  visible: boolean;
}

export default function PlaybackSlider({ videoRef, visible }: PlaybackSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const update = () => {
      if (!isDragging && video.duration) {
        setProgress(video.currentTime / video.duration);
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);

    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef, isDragging]);

  const seek = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      const video = videoRef.current;
      if (!track || !video || !video.duration) return;

      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      video.currentTime = ratio * video.duration;
      setProgress(ratio);
    },
    [videoRef]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      seek(e.clientX);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [seek]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      seek(e.clientX);
    },
    [isDragging, seek]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      className={`absolute bottom-[3.75rem] left-0 right-0 z-40 px-4 transition-opacity duration-300 ${
        visible || isDragging ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        ref={trackRef}
        className="relative h-8 flex items-center cursor-pointer group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="w-full h-1 rounded-full bg-moonDust-lavender/20 group-hover:h-1.5 transition-all">
          <div
            className="h-full rounded-full bg-moonDust-blue transition-[width] duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div
          className={`absolute w-2.5 h-2.5 rounded-full bg-moonDust-blue shadow-lg shadow-moonDust-blue/30 transition-transform duration-75 -translate-y-1/2 top-1/2 ${
            isDragging ? "scale-125" : "scale-100 group-hover:scale-110"
          }`}
          style={{ left: `calc(${progress * 100}% - 5px)` }}
        />
      </div>
    </div>
  );
}
