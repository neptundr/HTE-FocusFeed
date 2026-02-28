"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MockVideo, MockCourse } from "@/lib/mock-data";

interface UserVideo extends MockVideo {
  blobUrl?: string;
}

interface FeedStoreState {
  userVideos: UserVideo[];
  userCourses: MockCourse[];

  addVideo: (video: UserVideo) => void;
  removeVideo: (id: string) => void;
  addCourse: (course: MockCourse) => void;
  updateCourse: (id: string, data: Partial<MockCourse>) => void;
  removeCourse: (id: string) => void;
  getCourseById: (id: string) => MockCourse | undefined;
}

export const useFeedStore = create<FeedStoreState>()(
  persist(
    (set, get) => ({
      userVideos: [],
      userCourses: [],

      addVideo: (video) =>
        set((s) => ({ userVideos: [...s.userVideos, video] })),

      removeVideo: (id) =>
        set((s) => ({ userVideos: s.userVideos.filter((v) => v.id !== id) })),

      addCourse: (course) =>
        set((s) => ({ userCourses: [...s.userCourses, course] })),

      updateCourse: (id, data) =>
        set((s) => ({
          userCourses: s.userCourses.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        })),

      removeCourse: (id) =>
        set((s) => ({ userCourses: s.userCourses.filter((c) => c.id !== id) })),

      getCourseById: (id) => {
        return get().userCourses.find((c) => c.id === id);
      },
    }),
    {
      name: "focusfeed-user-content",
      partialize: (state) => ({
        userVideos: state.userVideos.map((v) => ({ ...v, blobUrl: undefined })),
        userCourses: state.userCourses,
      }),
    }
  )
);
