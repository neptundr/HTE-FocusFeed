"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/profile/Avatar";
import { useSession } from "next-auth/react";
import { IoArrowBack, IoSendOutline, IoPlayCircleOutline } from "react-icons/io5";

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string | null;
  sharedVideoId: string | null;
  createdAt: string;
  sharedVideo?: { id: string; title: string } | null;
}

export default function ChatPage() {
  const params = useParams();
  const friendId = params.friendId as string;
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id || "user-1";

  const [friend, setFriend] = useState<{ id: string; username: string; avatarUrl: string | null } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/messages/${friendId}?userId=${currentUserId}`).then((r) => r.json()),
      fetch(`/api/profile?userId=${friendId}`).then((r) => r.json()),
    ])
      .then(([msgs, profile]) => {
        setMessages(msgs);
        setFriend(profile.user || { id: friendId, username: friendId, avatarUrl: null });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [friendId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const body = { userId: currentUserId, text: text.trim(), sharedVideoId: null };
    const optimistic: ChatMessage = {
      id: `msg-temp-${Date.now()}`,
      senderId: currentUserId,
      receiverId: friendId,
      text: text.trim(),
      sharedVideoId: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");

    try {
      const res = await fetch(`/api/messages/${friendId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const saved = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-moonDust-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!friend) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p className="text-gray-400">User not found</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-dark max-w-md mx-auto">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-dark-border bg-dark-card shrink-0">
        <Link href="/messages" className="text-gray-400 hover:text-white shrink-0">
          <IoArrowBack size={22} />
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Link href={`/profile/${friend.id}`} className="shrink-0">
            <Avatar username={friend.username} size="sm" />
          </Link>
          <Link href={`/profile/${friend.id}`} className="text-sm font-semibold text-white truncate hover:underline">
            @{friend.username}
          </Link>
        </div>
        <Link
          href={`/profile/${friend.id}`}
          className="shrink-0 px-2.5 py-1 rounded-full bg-dark border border-dark-border text-[11px] text-moonDust-lavender hover:border-moonDust-blue/50 transition-colors"
        >
          View Profile
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;

          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMine
                    ? "bg-moonDust-blue text-dark rounded-br-sm"
                    : "bg-dark-card border border-dark-border text-white rounded-bl-sm"
                }`}
              >
                {msg.text && <p>{msg.text}</p>}
                {msg.sharedVideo && (
                  <Link
                    href={`/feed?videoId=${msg.sharedVideo.id}`}
                    className={`mt-1 flex items-center gap-2 p-2 rounded-lg ${
                      isMine ? "bg-black/10" : "bg-dark border border-dark-border"
                    }`}
                  >
                    <IoPlayCircleOutline size={20} className={isMine ? "text-dark" : "text-moonDust-blue"} />
                    <span className="text-xs truncate">{msg.sharedVideo.title}</span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-dark-border p-3 flex gap-2 bg-dark-card shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message..."
          className="flex-1 bg-dark border border-dark-border rounded-full px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-moonDust-blue/50"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-10 h-10 rounded-full bg-moonDust-blue flex items-center justify-center text-dark disabled:opacity-40 shrink-0"
        >
          <IoSendOutline size={18} />
        </button>
      </div>
    </div>
  );
}
