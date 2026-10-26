"use client";

import { useRef, useState } from "react";
import {
  useAttachUploadedVideoMutation,
  useRemoveUploadedVideoMutation,
  useStartVideoUploadMutation,
} from "@/redux/features/videos/videosApi";
import { uploadVideoInPieces, xhrSend } from "@/utils/videoUpload";
import { formatMinutes } from "@/utils/courseMeta";

// In the course form, under a lesson that is already saved: upload a video
// file for it (kept private; students watch through short-lived links), or
// remove the uploaded one. A new lesson has to be saved first, because the
// upload belongs to that lesson.
export default function LessonVideoUpload({
  courseId,
  lessonId,
  current,
  onUploaded,
}: {
  courseId: string;
  lessonId?: string;
  current?: { duration: number; bytes: number } | null;
  onUploaded?: (videoLengthMinutes: number) => void;
}) {
  const [start] = useStartVideoUploadMutation();
  const [attach] = useAttachUploadedVideoMutation();
  const [remove, { isLoading: isRemoving }] = useRemoveUploadedVideoMutation();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [video, setVideo] = useState(current || null);

  if (!lessonId) {
    return (
      <p className="text-xs text-ink/60 dark:text-parchment/60">
        Save the course once to upload a video file for this lesson.
      </p>
    );
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("video/")) {
      setError("Choose a video file (for example .mp4 or .webm).");
      return;
    }
    setProgress(0);
    try {
      const ticket = (await start({ courseId, lessonId }).unwrap()).upload;
      const { publicId } = await uploadVideoInPieces(file, ticket, xhrSend, setProgress);
      const done = await attach({ courseId, lessonId, publicId }).unwrap();
      setVideo(done.video);
      onUploaded?.(done.videoLength);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "The upload failed. Try again.");
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove this lesson's uploaded video? Students will no longer be able to watch it.")) return;
    setError("");
    try {
      await remove({ courseId, lessonId }).unwrap();
      setVideo(null);
    } catch (err: any) {
      setError(err?.data?.message || "Could not remove the video");
    }
  };

  return (
    <div className="space-y-2 text-sm">
      {video ? (
        <p className="text-ink dark:text-parchment">
          Uploaded video · {formatMinutes(video.duration / 60) || "under a minute"} ·{" "}
          {(video.bytes / 1024 / 1024).toFixed(1)} MB{" "}
          <span className="text-ink/60 dark:text-parchment/60">(plays instead of the video link)</span>
        </p>
      ) : (
        <p className="text-ink/60 dark:text-parchment/60">Or upload a video file - students can watch it but not download it.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-full border border-parchment-dark px-4 py-1.5 text-ink hover:border-mustard dark:border-ink-light dark:text-parchment">
          {video ? "Replace video" : "Upload video"}
          <input
            ref={input}
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={progress !== null}
            onChange={(e) => handleFile(e.target.files?.[0])}
            aria-label={video ? "Replace the lesson video" : "Upload a lesson video"}
          />
        </label>
        {video && progress === null && (
          <button type="button" onClick={handleRemove} disabled={isRemoving} className="text-clay hover:underline">
            Remove video
          </button>
        )}
        {progress !== null && (
          <span role="status" className="text-ink/70 dark:text-parchment/70">
            Uploading… {Math.round(progress * 100)}%
          </span>
        )}
      </div>
      {progress !== null && (
        <div className="h-1.5 w-full max-w-xs rounded-full bg-parchment-dark dark:bg-ink" aria-hidden>
          <div className="h-1.5 rounded-full bg-mustard" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      {error && <p role="alert" className="text-clay">{error}</p>}
    </div>
  );
}
