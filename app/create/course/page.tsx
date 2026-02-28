"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { IoArrowBack, IoDocumentTextOutline, IoCheckmarkCircle } from "react-icons/io5";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TopicEditor from "@/components/create/TopicEditor";

function CreateCourseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id || "user-1";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [syllabus, setSyllabus] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [created, setCreated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/courses/${editId}`)
      .then((r) => r.json())
      .then((course) => {
        if (course && !course.error) {
          setName(course.name);
          setDescription(course.description || "");
          const courseTopics = course.topics
            ? Array.isArray(course.topics[0]) || typeof course.topics[0] === "string"
              ? course.topics
              : course.topics.map((t: { name: string }) => t.name)
            : [];
          setTopics(courseTopics);
          setIsEditing(true);
        }
      })
      .catch(() => {});
  }, [editId]);

  const [extractError, setExtractError] = useState<string | null>(null);

  const handleSyllabusUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyllabus(file);
    setExtracting(true);
    setExtractError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const processRes = await fetch("/api/process/syllabus", {
        method: "POST",
        body: formData,
      });

      if (!processRes.ok) {
        const err = await processRes.json();
        throw new Error(err.error || "Processing failed");
      }

      const result = await processRes.json();

      if (result.course_name && !name) {
        setName(result.course_name);
      }

      const topicNames: string[] = (result.topics || []).map(
        (t: { topic: string }) => t.topic
      );
      setTopics((prev) => [...prev, ...topicNames]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to process syllabus";
      setExtractError(msg);
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);

    try {
      if (isEditing && editId) {
        await fetch(`/api/courses/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        });
      } else {
        await fetch("/api/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, topics, userId: currentUserId }),
        });
      }
      setCreated(true);
      setTimeout(() => router.push("/profile"), 1500);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] px-4 py-6 max-w-md mx-auto overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={isEditing ? "/profile" : "/create"} className="text-gray-400 hover:text-white">
          <IoArrowBack size={22} />
        </Link>
        <h1 className="text-xl font-bold text-moonDust-lavender">
          {isEditing ? "Edit Course" : "Create Course"}
        </h1>
      </div>

      {created ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <IoCheckmarkCircle size={64} className="text-green-400" />
          <p className="text-lg font-semibold text-white">
            {isEditing ? "Course Updated!" : "Course Created!"}
          </p>
          <p className="text-sm text-gray-400">Redirecting...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Input
            label="Course Name"
            placeholder="e.g., Introduction to Biology"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-moonDust-lavender/80 font-medium">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the course..."
              rows={3}
              className="w-full px-4 py-2.5 bg-dark border border-dark-border rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-moonDust-blue/50 focus:ring-1 focus:ring-moonDust-blue/30 transition-colors resize-none text-sm"
            />
          </div>

          {!isEditing && (
            <div>
              <label className="text-sm text-moonDust-lavender/80 font-medium block mb-2">
                Upload Syllabus (optional)
              </label>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleSyllabusUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={extracting}
                className="w-full p-4 rounded-xl border border-dashed border-dark-border bg-dark-card hover:border-moonDust-purple/50 transition-colors flex items-center gap-3"
              >
                {extracting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-moonDust-purple border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-400">Extracting topics from PDF...</span>
                  </>
                ) : syllabus ? (
                  <>
                    <IoDocumentTextOutline size={20} className="text-moonDust-purple" />
                    <span className="text-sm text-white">{syllabus.name}</span>
                  </>
                ) : (
                  <>
                    <IoDocumentTextOutline size={20} className="text-gray-500" />
                    <span className="text-sm text-gray-400">Upload PDF to auto-extract topics</span>
                  </>
                )}
              </button>
              {extractError && (
                <p className="text-red-400 text-xs mt-2">{extractError}</p>
              )}
            </div>
          )}

          <TopicEditor topics={topics} onChange={setTopics} />

          <Button onClick={handleSave} disabled={!name.trim() || saving} className="w-full" size="lg">
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Course"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function CreateCoursePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-moonDust-blue border-t-transparent rounded-full animate-spin" /></div>}>
      <CreateCourseForm />
    </Suspense>
  );
}
