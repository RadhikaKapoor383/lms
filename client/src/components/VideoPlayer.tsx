"use client";

const isDirectVideoFile = (url: string) =>
  /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

export default function VideoPlayer({ videoUrl }: { videoUrl: string }) {
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
