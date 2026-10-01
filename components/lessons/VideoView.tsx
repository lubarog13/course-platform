"use client";

import { LessonFullDto } from "@/app/lib/lessons";
import MarkdownContent from "../base/MarkdownContent";
import { useEffect, useMemo, useRef } from "react";

type VideoViewProps = {
  lesson: LessonFullDto;
  startTimeSeconds?: number;
  /** Текущая позиция воспроизведения (секунды), троттлинг ~2с */
  onTimeUpdate?: (seconds: number) => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { PLAYING: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.searchParams.get("v")) {
      return parsed.searchParams.get("v");
    }
    const embed = parsed.pathname.match(/\/embed\/([^/?]+)/);
    return embed?.[1] ?? null;
  } catch {
    return null;
  }
}

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }
  });
}

export default function VideoView({
  lesson,
  startTimeSeconds = 0,
  onTimeUpdate,
}: VideoViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const lastReportedRef = useRef(-1);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const ytPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  const reportTime = (seconds: number) => {
    const rounded = Math.floor(seconds);
    if (rounded < 0) return;
    if (Math.abs(rounded - lastReportedRef.current) < 2 && rounded !== 0) return;
    lastReportedRef.current = rounded;
    onTimeUpdateRef.current?.(rounded);
  };

  const youtubeId = useMemo(() => {
    if (lesson.video?.platform !== "youtube" || !lesson.video.url) return null;
    return extractYouTubeId(lesson.video.url);
  }, [lesson.video?.platform, lesson.video?.url]);

  const rutubeUrl = useMemo(() => {
    if (lesson.video?.platform !== "rutube" || !lesson.video.url) return null;
    const replacedUrl = lesson.video.url.replace(
      "https://rutube.ru/video/",
      "https://rutube.ru/play/embed/",
    );
    if (startTimeSeconds > 0) {
      return `${replacedUrl}?t=${startTimeSeconds}`;
    }
    return replacedUrl;
  }, [lesson.video?.platform, lesson.video?.url, startTimeSeconds]);

  // self_hosted: native <video>
  useEffect(() => {
    const el = videoRef.current;
    if (!el || lesson.video?.platform !== "self_hosted") return;

    const onLoaded = () => {
      if (startTimeSeconds > 0 && Math.abs(el.currentTime - startTimeSeconds) > 1) {
        el.currentTime = startTimeSeconds;
      }
    };
    const onTime = () => reportTime(el.currentTime);
    const onPauseOrEnd = () => reportTime(el.currentTime);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("pause", onPauseOrEnd);
    el.addEventListener("ended", onPauseOrEnd);

    if (el.readyState >= 1) onLoaded();

    return () => {
      reportTime(el.currentTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("pause", onPauseOrEnd);
      el.removeEventListener("ended", onPauseOrEnd);
    };
  }, [lesson.video?.platform, lesson.video?.url, startTimeSeconds]);

  // youtube: IFrame API
  useEffect(() => {
    if (!youtubeId || lesson.video?.platform !== "youtube") return;
    let cancelled = false;

    void loadYouTubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = new window.YT.Player("youtube-player", {
        videoId: youtubeId,
        playerVars: {
          start: Math.floor(startTimeSeconds),
          rel: 0,
          enablejsapi: 1,
        },
        events: {
          onReady: (event) => {
            if (startTimeSeconds > 0) {
              event.target.seekTo(startTimeSeconds, true);
            }
            reportTime(event.target.getCurrentTime());
          },
          onStateChange: (event) => {
            if (event.data === window.YT?.PlayerState.PLAYING) {
              if (ytPollRef.current) clearInterval(ytPollRef.current);
              ytPollRef.current = setInterval(() => {
                reportTime(event.target.getCurrentTime());
              }, 2000);
            } else {
              if (ytPollRef.current) {
                clearInterval(ytPollRef.current);
                ytPollRef.current = null;
              }
              reportTime(event.target.getCurrentTime());
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (ytPollRef.current) {
        clearInterval(ytPollRef.current);
        ytPollRef.current = null;
      }
      if (ytPlayerRef.current) {
        try {
          reportTime(ytPlayerRef.current.getCurrentTime());
        } catch {
          /* player already gone */
        }
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
    };
  }, [youtubeId, lesson.video?.platform, startTimeSeconds]);

  return (
    <div className="mt-4">
      {youtubeId && (
        <div id="youtube-player" className="w-full aspect-video" />
      )}
      {rutubeUrl && (
        <iframe
          src={rutubeUrl}
          title={lesson.video?.title ?? ""}
          className="w-full h-full aspect-video"
          allow="clipboard-write; autoplay"
          allowFullScreen
        />
      )}
      {lesson.video?.url && lesson.video.platform === "self_hosted" && (
        <video
          ref={videoRef}
          src={lesson.video.url}
          title={lesson.video.title ?? ""}
          className="w-full h-full aspect-video"
          controls
          id="video-player"
        />
      )}
      {lesson.video?.url && (
        <div className="mt-4">{lesson.video?.title}</div>
      )}
      {lesson.textContent && (
        <div className="text-gray-700 dark:text-gray-300 mt-4">
          <MarkdownContent nodes={lesson.textContent} />
        </div>
      )}
    </div>
  );
}
