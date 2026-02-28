"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Modal from "@/components/ui/Modal";
import { IoLinkOutline, IoCheckmarkOutline, IoSendOutline } from "react-icons/io5";

interface Friend {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  videoId: string | null;
}

export default function ShareModal({ open, onClose, videoId }: Props) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id || "";

  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !currentUserId) return;
    setSent(new Set());
    fetch(`/api/friends?userId=${currentUserId}`)
      .then((r) => r.json())
      .then((data) => setFriends(data))
      .catch(() => {});
  }, [open, currentUserId]);

  const copyLink = () => {
    const url = `${window.location.origin}/feed?videoId=${videoId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sendToFriend = async (friendId: string) => {
    setSent((prev) => new Set(prev).add(friendId));
    await fetch(`/api/messages/${friendId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, sharedVideoId: videoId }),
    }).catch(() => {});
  };

  return (
    <Modal open={open} onClose={onClose} title="Share" position="bottom">
      <div className="p-4 space-y-4">
        <button
          onClick={copyLink}
          className="w-full p-4 rounded-xl border border-dark-border bg-dark text-sm text-white hover:border-moonDust-blue/50 transition-colors flex items-center gap-3"
        >
          {copied ? <IoCheckmarkOutline size={20} className="text-green-400" /> : <IoLinkOutline size={20} className="text-moonDust-blue" />}
          {copied ? "Link copied!" : "Copy link"}
        </button>

        {friends.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Send to friend</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {friends.map((friend) => {
                const wasSent = sent.has(friend.id);
                return (
                  <button
                    key={friend.id}
                    onClick={() => !wasSent && sendToFriend(friend.id)}
                    disabled={wasSent}
                    className="w-full p-3 rounded-xl border border-dark-border bg-dark text-sm text-white hover:border-moonDust-blue/50 transition-colors flex items-center justify-between disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/profile/${friend.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      >
                        {friend.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={friend.avatarUrl} alt={friend.username} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-moonDust-sky/30 flex items-center justify-center text-xs font-bold text-moonDust-sky">
                            {friend.username[0].toUpperCase()}
                          </div>
                        )}
                      </Link>
                      <Link
                        href={`/profile/${friend.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-moonDust-blue transition-colors"
                      >
                        @{friend.username}
                      </Link>
                    </div>
                    {wasSent ? (
                      <IoCheckmarkOutline size={16} className="text-green-400" />
                    ) : (
                      <IoSendOutline size={16} className="text-moonDust-blue" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {friends.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">Add friends to share videos with them</p>
        )}
      </div>
    </Modal>
  );
}
