"use client";

import { Video, VideoPlatform } from "@/app/lib/models";
import {
    ButtonGroup,
    ButtonGroupSeparator,
    ButtonGroupText,
} from "@/components/ui/button-group"
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useState } from "react";
import { Label } from "../ui/label";
import { Input } from "@/components/ui/input";
import FileUploader from "../base/FileUploader";
import { File as FileModel } from "@/app/lib/models";


export default function VideoEdit({ video, onSaved }: { video: Video, onSaved: (video: Video) => void }) {
    const [platform, setPlatform] = useState(video.platform);
    const [url, setUrl] = useState(video.url);
    const [title, setTitle] = useState(video.title ?? "");
    const [durationSeconds, setDurationSeconds] = useState(video.durationSeconds ?? 0);
    const [thumbnailUrl, setThumbnailUrl] = useState(video.thumbnailUrl ?? "");
    const handleSave = () => {
        const body: Video = {
            id: video.id,
            platform: platform,
            url: url,
            title: title,
            durationSeconds: durationSeconds,
            thumbnailUrl: thumbnailUrl,
        };
        fetch(`/api/video/${video.id}`, {
            method: "PUT",
            body: JSON.stringify(body),
        }).then(res => res.json()).then(data => {
            onSaved(data);
        }).catch(error => {
            console.error(error);
        });
    };
    const handleUploaded = (files: FileModel[]) => {
      setUrl(files[0].url ?? "");
      setTitle(files[0].originalName ?? "");
    }
  return (
    <div>
    <Label>Платформа</Label>
      <ButtonGroup className="my-4">
        <Button className={platform === "youtube" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"} onClick={() => setPlatform("youtube")}>YouTube</Button>
        <Button className={platform === "rutube" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"} onClick={() => setPlatform("rutube")}>Rutube</Button>
        <Button className={platform === "self_hosted" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"} onClick={() => setPlatform("self_hosted")}>Загрузить файл</Button>
        <Button className={platform === "other" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"} onClick={() => setPlatform("other")}>Другое</Button>
      </ButtonGroup>
      {platform!=='self_hosted' && (
        <div className="my-4 grid gap-2 w-full grid-cols-[100%] overflow-hidden">
          <Label>URL</Label>
          <Input type="text" value={video.url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      )}
    {platform === "self_hosted" && (
      <>
      <div className="my-4 grid gap-2 w-full grid-cols-[100%] overflow-hidden">
       <Label>Файл видео (форматы: mp4, mov, avi, mkv, webm)</Label>
       <FileUploader onUploaded={handleUploaded} />
     </div>
       <div className="my-4 grid gap-2 w-full grid-cols-[100%] overflow-hidden">
       <Label>URL</Label>
       <Input type="text" disabled value={url} onChange={(e) => setUrl(e.target.value)} />
     </div>
     </>
    )}
    <div className="grid gap-2 w-full grid-cols-[100%] overflow-hidden my-4">
      <Label>Название видео</Label>
      <Input type="text" value={video.title ?? ""} onChange={(e) => setTitle(e.target.value)} />
    </div>
    <div className="grid gap-2 w-full grid-cols-[100%] overflow-hidden my-4">
      <Label>Длительность (секунды)</Label>
      <Input type="number" value={video.durationSeconds ?? 0} onChange={(e) => setDurationSeconds(Number(e.target.value))} />
    </div>
    {platform === "self_hosted" && (
    <div className="grid gap-2 w-full grid-cols-[100%] overflow-hidden my-4">
      <div className="font-bold text-lg mb-2">Картинка превью</div>
      <Label>Ссылка на миниатюру</Label>
      <Input type="text" value={video.thumbnailUrl ?? ""} onChange={(e) => setThumbnailUrl(e.target.value)} />
      <div className="mt-3">
        <Label>Или загрузите миниатюру</Label>
        <FileUploader onUploaded={(files) => {
          setThumbnailUrl(files[0].url);
        }} />
      </div>
    </div>
    )}
    <div className="my-4">
      <Button onClick={handleSave}>Сохранить</Button>
    </div>
      </div>
  );
}