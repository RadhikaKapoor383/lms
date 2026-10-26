"use client";

import { useGetVideoLinkQuery } from "@/redux/features/videos/videosApi";

const isDirectVideoFile = (url: string) =>
  /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

// An uploaded (private) video: ask the server for a short-lived link and play
// that. If the link expires while the page is open, a fresh one is fetched.
function ProtectedVideo({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { data, isLoading, isError, refetch } = useGetVideoLinkQuery({ courseId, lessonId });
  if (isLoading) {
    return <div className="flex aspect-video items-center justify-center bg-ink text-parchment/60">Loading video…</div>;
  }
  if (isError || !data?.url) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-ink text-parchment/70">
        <p>This video can&apos;t be played right now.</p>
        <button onClick={() => refetch()} className="rounded-full border border-parchment/40 px-4 py-1.5 text-sm">
          Try again
        </button>
      </div>
    );
  }
  return (
    <video
      key={data.url}
      controls
      controlsList="nodownload"
      onContextMenu={(e) => e.preventDefault()}
      className="aspect-video w-full bg-black"
      src={data.url}
      onError={() => refetch()}
    />
  );
}

export default function VideoPlayer({
  videoUrl,
  courseId,
  lessonId,
  hasVideoUpload,
}: {
  videoUrl: string;
  courseId?: string;
  lessonId?: string;
  hasVideoUpload?: boolean;
}) {
  if (hasVideoUpload && courseId && lessonId) {
    return <ProtectedVideo courseId={courseId} lessonId={lessonId} />;
  }

  if (!videoUrl) {
    return (
      <div className="flex aspect-video items-center justify-center bg-ink text-parchment/60">
        No video attached to this lesson yet.
      </div>
    );
  }

  if (isDirectVideoFile(videoUrl)) {
    return (
      <video controls className="aspect-video w-full bg-black" src={videoUrl} />
    );
  }

  // Otherwise assume it's already an embeddable URL (YouTube/Vimeo embed link, etc.)
  return (
    <div className="aspect-video w-full">
      <iframe
        src={videoUrl}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
