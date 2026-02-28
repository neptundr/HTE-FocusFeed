"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { MockVideo } from "@/lib/mock-data";
import { IoPlayOutline, IoTrashOutline, IoCloseOutline } from "react-icons/io5";

interface UserVideo extends MockVideo {
  blobUrl?: string;
}

interface VideoGridProps {
  videos: (MockVideo | UserVideo)[];
  onDelete?: (id: string) => void;
}

function VideoThumbnail({ video }: { video: MockVideo | UserVideo }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const videoSrc = ("blobUrl" in video && video.blobUrl) || video.videoUrl;

  const captureThumbnail = useCallback(() => {
    const el = document.createElement("video");
    el.crossOrigin = "anonymous";
    el.muted = true;
    el.preload = "metadata";

    el.onloadeddata = () => {
      el.currentTime = Math.min(1, el.duration * 0.1);
    };

    el.onseeked = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = el.videoWidth;
      canvas.height = el.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      try {
        setThumbnail(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        // cross-origin or tainted canvas — keep gradient fallback
      }
      el.remove();
    };

    el.onerror = () => el.remove();
    el.src = videoSrc;
  }, [videoSrc]);

  useEffect(() => {
    if (videoSrc) captureThumbnail();
  }, [videoSrc, captureThumbnail]);

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={video.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-moonDust-purple/20 to-moonDust-blue/20" />
      )}
    </>
  );
}

function ConfirmDeleteModal({
  videoTitle,
  onConfirm,
  onCancel,
}: {
  videoTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Delete Video</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white">
            <IoCloseOutline size={22} />
          </button>
        </div>
        <p className="text-sm text-gray-300">
          Are you sure you want to delete <span className="text-white font-medium">&ldquo;{videoTitle}&rdquo;</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-dark-border text-sm text-gray-300 hover:bg-dark-border/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-500 text-sm text-white font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideoGrid({ videos, onDelete }: VideoGridProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  if (videos.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No videos yet</p>;
  }

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleConfirmDelete = () => {
    if (deleteTarget && onDelete) {
      onDelete(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-1 p-1">
        {videos.map((video) => (
          <div
            key={video.id}
            className="relative aspect-[9/16] bg-dark-card rounded-lg overflow-hidden group"
          >
            <Link
              href={`/feed?startVideo=${video.id}`}
              className="absolute inset-0 z-0"
            >
              <VideoThumbnail video={video} />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                <IoPlayOutline size={24} className="text-white/60 group-hover:text-white transition-colors" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60">
                <p className="text-[10px] text-white truncate">{video.title}</p>
                <p className="text-[9px] text-gray-300">{formatDuration(video.duration)}</p>
              </div>
            </Link>

            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteTarget({ id: video.id, title: video.title });
                }}
                className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-black/50 hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
              >
                <IoTrashOutline size={14} className="text-white" />
              </button>
            )}
          </div>
        ))}
      </div>

      {deleteTarget && (
        <ConfirmDeleteModal
          videoTitle={deleteTarget.title}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
