"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Avatar from "@/components/profile/Avatar";
import FriendSearch from "@/components/profile/FriendSearch";
import CourseList from "@/components/profile/CourseList";
import VideoGrid from "@/components/profile/VideoGrid";
import Tabs from "@/components/ui/Tabs";
import {
  IoPeopleOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoLogOutOutline,
  IoNotificationsOutline,
  IoCheckmarkOutline,
  IoCloseOutline,
} from "react-icons/io5";
import { signOut, useSession } from "next-auth/react";
import { useNotifications } from "@/lib/stores/notifications";

interface FriendRequest {
  id: string;
  user: { id: string; username: string; avatarUrl: string | null };
  createdAt: string;
}

type ExpandedSection = null | "notifications" | "friends";

export default function ProfilePage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id || "user-1";

  const [user, setUser] = useState<{ id: string; username: string; avatarUrl: string | null } | null>(null);
  const [courses, setCourses] = useState<{ id: string; name: string; description: string; userId: string; topics: string[] }[]>([]);
  const [videos, setVideos] = useState<{ id: string; title: string; videoUrl: string; thumbnailUrl: string | null; userId: string; courseId: string | null; type: string; duration: number }[]>([]);
  const [friends, setFriends] = useState<{ id: string; username: string; avatarUrl: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("courses");
  const [expanded, setExpanded] = useState<ExpandedSection>(null);
  const [username, setUsername] = useState("");

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const { setPendingCount, markSeen, hasUnseen } = useNotifications();
  const showDot = hasUnseen();

  useEffect(() => {
    fetch(`/api/profile?userId=${currentUserId}`)
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setCourses(data.courses || []);
        setVideos(data.videos || []);
        setFriends(data.friends || []);
        setUsername(data.user?.username || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUserId]);

  const fetchRequests = useCallback(() => {
    setRequestsLoading(true);
    fetch(`/api/friends/requests?userId=${currentUserId}`)
      .then((r) => r.json())
      .then((data) => {
        setRequests(data);
        setPendingCount(data.length);
      })
      .catch(() => {})
      .finally(() => setRequestsLoading(false));
  }, [currentUserId, setPendingCount]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const toggleSection = (section: ExpandedSection) => {
    if (expanded === section) {
      setExpanded(null);
    } else {
      setExpanded(section);
      if (section === "notifications") {
        markSeen();
      }
    }
  };

  const handleAccept = async (requestId: string) => {
    await fetch(`/api/friends/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACCEPTED" }),
    });
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    setPendingCount(requests.length - 1);
    fetch(`/api/profile?userId=${currentUserId}`)
      .then((r) => r.json())
      .then((data) => setFriends(data.friends || []))
      .catch(() => {});
  };

  const handleReject = async (requestId: string) => {
    await fetch(`/api/friends/${requestId}`, { method: "DELETE" });
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    setPendingCount(requests.length - 1);
  };

  const handleDeleteVideo = async (id: string) => {
    await fetch(`/api/videos/${id}`, { method: "DELETE" });
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  if (loading || !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-moonDust-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] max-w-md mx-auto overflow-y-auto pb-4">
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-card border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors"
      >
        <IoLogOutOutline size={24} />
      </button>

      <div className="flex flex-col items-center pt-10 pb-4 px-4">
        <Avatar username={username} avatarUrl={user.avatarUrl} size="xl" />

        <h2 className="text-lg font-bold text-white mt-4">@{username}</h2>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => toggleSection("notifications")}
            className="relative flex items-center gap-2 px-3 py-2 rounded-full bg-dark-card border border-dark-border text-sm text-moonDust-lavender hover:border-moonDust-blue/50 transition-colors"
          >
            <IoNotificationsOutline size={16} />
            {expanded === "notifications" ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
            {showDot && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => toggleSection("friends")}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-card border border-dark-border text-sm text-moonDust-lavender hover:border-moonDust-blue/50 transition-colors"
          >
            <IoPeopleOutline size={16} />
            Search Friends ({friends.length})
            {expanded === "friends" ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
          </button>
        </div>

        {expanded === "notifications" && (
          <div className="w-full mt-4 space-y-2">
            {requestsLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-moonDust-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No notifications</p>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 bg-dark-card rounded-xl border border-dark-border"
                >
                  <div className="flex items-center gap-3">
                    <Link href={`/profile/${req.user.id}`}>
                      <Avatar username={req.user.username} size="sm" />
                    </Link>
                    <div>
                      <Link href={`/profile/${req.user.id}`} className="text-sm text-white hover:underline">
                        @{req.user.username}
                      </Link>
                      <p className="text-[10px] text-gray-500">wants to be friends</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="w-8 h-8 rounded-full bg-moonDust-blue/20 hover:bg-moonDust-blue/40 flex items-center justify-center text-moonDust-blue transition-colors"
                    >
                      <IoCheckmarkOutline size={16} />
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-400 transition-colors"
                    >
                      <IoCloseOutline size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {expanded === "friends" && (
          <div className="w-full mt-4">
            <FriendSearch
              currentUserId={currentUserId}
              friendIds={friends.map((f) => f.id)}
            />
          </div>
        )}
      </div>

      <Tabs
        tabs={[
          { id: "courses", label: "Courses" },
          { id: "videos", label: "Videos" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "courses" ? (
        <CourseList courses={courses} editable />
      ) : (
        <VideoGrid videos={videos} onDelete={handleDeleteVideo} />
      )}
    </div>
  );
}
