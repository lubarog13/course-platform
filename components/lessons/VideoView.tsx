"use client";

import { LessonFullDto } from "@/app/lib/lessons";
import MarkdownContent from "../base/MarkdownContent";
import { useEffect, useMemo } from "react";

export default function VideoView({lesson, startTimeSeconds}: {lesson: LessonFullDto, startTimeSeconds?: number}) {
    
    const youtubeUrl = useMemo(() => {
        const replacedUrl = lesson.video?.url?.replace('https://www.youtube.com/watch?v=', 'https://www.youtube.com/embed/');
        if (startTimeSeconds) {
            return `${replacedUrl}?start=${startTimeSeconds}`;
        }
        return replacedUrl;
    }, [lesson.video?.url, startTimeSeconds]);

    const rutubeUrl = useMemo(() => {
        const replacedUrl = lesson.video?.url?.replace('https://rutube.ru/video/', 'https://rutube.ru/play/embed/');
        if (startTimeSeconds) {
            return `${replacedUrl}?start=${startTimeSeconds}`;
        }
        return replacedUrl;
    }, [lesson.video?.url, startTimeSeconds]);
    
    useEffect(() => {
        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer) {
            (videoPlayer as HTMLVideoElement).currentTime = startTimeSeconds ?? 0;
        }
    }, [startTimeSeconds]);
    
    return <div className="mt-4">
        {lesson.video?.url && (lesson.video.platform === "youtube" || lesson.video.platform === 'rutube') && (
            <iframe src={lesson.video.platform === "youtube" ? youtubeUrl : rutubeUrl} title={lesson.video?.title ?? ""} 
            className="w-full h-full  aspect-video" />
        )}
        {lesson.video?.url && lesson.video.platform === "self_hosted" && (
            <video src={lesson.video?.url} title={lesson.video?.title ?? ""}  className="w-full h-full aspect-video" id="video-player" />
        )}
        {lesson.video?.url && (
            <div className="mt-4">
                {lesson.video?.title}
            </div>
        )}
        {lesson.textContent && (
            <div className="text-gray-700 dark:text-gray-300 mt-4">
                <MarkdownContent nodes={lesson.textContent} />
            </div>
        )}
    </div>
}