"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Modal from "@/components/ui/Modal";
import { IoSendOutline, IoHeart, IoHeartOutline } from "react-icons/io5";

interface Comment {
  id: string;
  text: string;
  likesCount: number;
  user: { id: string; username: string; avatarUrl: string | null };
}

interface Props {
  open: boolean;
  onClose: () => void;
  videoId: string | null;
}

export default function CommentsPanel({ open, onClose, videoId }: Props) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id || "";
  const currentUsername = session?.user?.name || "you";

  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !videoId) return;
    setLikedComments(new Set());
    fetch(`/api/comments?videoId=${videoId}`)
      .then((r) => r.json())
      .then((data) => setComments(data))
      .catch(() => {});
  }, [open, videoId]);

  const handleSend = async () => {
    if (!newComment.trim() || !videoId || !currentUserId) return;
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, videoId, text: newComment.trim() }),
      });
      const saved = await res.json();
      setComments((prev) => [
        ...prev,
        {
          ...saved,
          likesCount: saved.likesCount || 0,
          user: saved.user || { id: currentUserId, username: currentUsername, avatarUrl: null },
        },
      ]);
    } catch {}
    setNewComment("");
  };

  const toggleLike = useCallback((commentId: string) => {
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  return (
    <Modal open={open} onClose={onClose} title={`Comments (${comments.length})`} position="bottom">
      <div className="flex flex-col" style={{ height: "50vh" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No comments yet. Be the first!</p>
          ) : (
            comments.map((c) => {
              const isLiked = likedComments.has(c.id);
              const displayName = c.user?.username || "unknown";
              const initial = displayName[0]?.toUpperCase() || "?";

              return (
                <div key={c.id} className="flex gap-3">
                  <Link href={`/profile/${c.user?.id || ""}`} className="shrink-0">
                    {c.user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.user.avatarUrl}
                        alt={displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-moonDust-purple/30 flex items-center justify-center text-xs font-bold text-moonDust-purple">
                        {initial}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${c.user?.id || ""}`} className="text-xs font-semibold text-moonDust-lavender hover:underline">
                      @{displayName}
                    </Link>
                    <p className="text-sm text-white/90 mt-0.5">{c.text}</p>
                    <button
                      onClick={() => toggleLike(c.id)}
                      className={`flex items-center gap-1 mt-1 text-xs transition-colors ${
                        isLiked ? "text-red-500" : "text-gray-400 hover:text-red-400"
                      }`}
                    >
                      {isLiked ? <IoHeart size={12} /> : <IoHeartOutline size={12} />}
                      <span>{c.likesCount + (isLiked ? 1 : 0)}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-dark-border p-3 flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Add a comment..."
            className="flex-1 bg-dark border border-dark-border rounded-full px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-moonDust-blue/50"
          />
          <button
            onClick={handleSend}
            disabled={!newComment.trim()}
            className="w-9 h-9 rounded-full bg-moonDust-blue flex items-center justify-center text-dark disabled:opacity-40"
          >
            <IoSendOutline size={16} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
