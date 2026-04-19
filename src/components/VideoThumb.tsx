import { useEffect, useRef, useState } from "react";
import { FileVideo } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoThumbProps {
  src?: string | null;
  alt?: string;
  className?: string;
  /** Try to autoplay muted preview (for shorts/hero). Default false (just first frame). */
  autoPlay?: boolean;
  loop?: boolean;
  /** When true, blurs heavily (locked content). */
  blurred?: boolean;
}

/**
 * Renders a <video> element used as both cover (first frame via preload="metadata")
 * and optional silent autoplay preview. Falls back gracefully if no source.
 */
export const VideoThumb = ({
  src,
  alt,
  className,
  autoPlay = false,
  loop = false,
  blurred = false,
}: VideoThumbProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
        aria-label={alt}
      >
        <FileVideo className="h-8 w-8 opacity-50" />
      </div>
    );
  }

  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      loop={loop}
      autoPlay={autoPlay}
      preload="metadata"
      // Force first-frame display when not autoplaying (Safari/iOS need #t=0.1)
      poster=""
      onError={() => setFailed(true)}
      className={cn(
        "h-full w-full object-cover",
        blurred && "blur-2xl scale-110",
        className
      )}
      // Hint to grab first frame
      {...(!autoPlay ? { src: `${src}#t=0.1` } : {})}
    />
  );
};
