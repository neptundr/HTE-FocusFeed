"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Avatar from "@/components/profile/Avatar";
import { useSession } from "next-auth/react";

interface Conversation {
  friend: { id: string; username: string; avatarUrl: string | null };
  lastMessage: { text: string | null; sharedVideoId: string | null; createdAt: string } | null;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id || "user-1";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/messages?userId=${currentUserId}`)
      .then((res) => res.json())
      .then((data) => setConversations(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUserId]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}d`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h`;
    const mins = Math.floor(diff / (1000 * 60));
    if (mins <= 0) return "now";
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-moonDust-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] max-w-md mx-auto">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-moonDust-lavender">Messages</h1>
      </div>

      {conversations.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No conversations yet</p>
      ) : (
        <div className="divide-y divide-dark-border">
          {conversations.map(({ friend, lastMessage }) => (
            <Link
              key={friend.id}
              href={`/messages/${friend.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-dark-card/50 transition-colors"
            >
              <Avatar username={friend.username} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">@{friend.username}</p>
                  {lastMessage && (
                    <span className="text-[10px] text-gray-500">{formatTime(lastMessage.createdAt)}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {lastMessage
                    ? lastMessage.sharedVideoId
                      ? "Shared a video"
                      : lastMessage.text
                    : "No messages yet"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
