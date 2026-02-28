"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Avatar from "./Avatar";
import { IoAddOutline, IoCheckmarkOutline } from "react-icons/io5";

interface User {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface FriendSearchProps {
  currentUserId: string;
  friendIds: string[];
}

export default function FriendSearch({ currentUserId, friendIds }: FriendSearchProps) {
  const [query, setQuery] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [added, setAdded] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setAllUsers(data))
      .catch(() => {});
  }, []);

  const results = query.trim()
    ? allUsers.filter(
        (u) => u.id !== currentUserId && u.username.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const noResults = query.trim().length > 0 && results.length === 0;

  const handleAdd = async (userId: string) => {
    setAdded((prev) => [...prev, userId]);
    await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId: currentUserId, addresseeId: userId }),
    }).catch(() => {});
  };

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by username..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {noResults && (
        <p className="text-sm text-gray-400 text-center py-4">The user does not exist.</p>
      )}

      {results.map((user) => {
        const isFriend = friendIds.includes(user.id);
        const justAdded = added.includes(user.id);
        return (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 bg-dark-card rounded-xl border border-dark-border"
          >
            <div className="flex items-center gap-3">
              <Link href={`/profile/${user.id}`}>
                <Avatar username={user.username} size="sm" />
              </Link>
              <Link href={`/profile/${user.id}`} className="text-sm text-white hover:underline">
                @{user.username}
              </Link>
            </div>
            {isFriend || justAdded ? (
              <span className="text-moonDust-blue text-xs flex items-center gap-1">
                <IoCheckmarkOutline size={14} />
                {isFriend ? "Friends" : "Sent"}
              </span>
            ) : (
              <button
                onClick={() => handleAdd(user.id)}
                className="text-moonDust-blue hover:text-moonDust-lavender p-1"
              >
                <IoAddOutline size={20} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
