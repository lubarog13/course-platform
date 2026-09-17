"use client";

import { useState } from "react";
import { PlusSquare, FileImage, CheckCircle, Loader2, XCircle } from "lucide-react";
import Dropzone from "react-dropzone";
import { Input } from "@/components/ui/input";
import { File as FileModel } from "@/app/lib/models";
import { Button } from "@/components/ui/button";
export default function FileUploader({ onUploaded, multiple = false }: { onUploaded: (files: FileModel[]) => void, multiple?: boolean }) {
    const [files, setFiles] = useState<File[]>([]);
    const [fileModels, setFileModels] = useState<FileModel[]>([]);
    const [allUploaded, setAllUploaded] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const uploadText = allUploaded ? "Файлы загружены успешно" : uploading ? "Загрузка файлов..." :
    success && multiple? 'Добавить еще файлов' :
    allUploaded && success ? 'Для замены файлов перетащите новые файлы сюда, или нажмите для выбора файлов' :
    !allUploaded ? 'Нажмте кнопку для загрузки файла' :
    "Перетащите файлы сюда, или нажмите для выбора файлов";


    const handleDrop = async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        setAllUploaded(false);
        if (multiple) {
            setFiles(acceptedFiles);
        } else {
            setFiles([acceptedFiles[0]]);
        }
    }

    const handleUpload = async () => {
        setUploading(true);
        const newFileModels: FileModel[] = [];
        for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch("/api/uploads", {
                method: "POST",
                body: formData,
            });
            const fileRecord = await response.json();
            newFileModels.push(fileRecord);
        }
        setFileModels(newFileModels);
        setAllUploaded(true);
        setUploading(false);
        setSuccess("Файлы загружены успешно");
        onUploaded(newFileModels);
    }

    return (
        <div className="flex flex-col justify-center gap-4 w-full my-4">
        <Dropzone accept={{
            "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
            "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"],
            "audio/*": [".mp3", ".wav", ".ogg", ".m4a", ".aac"],
            "application/pdf": [".pdf"],
            "application/msword": [".doc", ".docx"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
        }} onDrop={handleDrop}>
{({getRootProps, getInputProps}) => (
    <section className="w-full">
      <div {...getRootProps({className: 'border-2 border-dashed border-gray-300 rounded-md p-4 w-full min-h-[100px] cursor-pointer flex items-center justify-center'})}>
        <input {...getInputProps()} />
        <p className="text-center">{uploadText} {uploading && <Loader2 className="w-5 h-5 ml-2 inline-block animate-spin" />}
        
         {(allUploaded || success) && <CheckCircle className="w-5 h-5 ml-2 inline-block" />} 
         {!allUploaded && !success && <PlusSquare className="w-5 h-5 ml-2 inline-block" />}
         {error && <XCircle className="w-5 h-5 ml-2 inline-block" />}</p>
      </div>
    </section>
  )}
        </Dropzone>
    {files.length > 0 && (
        <>
        <div className="flex flex-col text-sm text-gray-500 justify-center gap-4">
            {files.map((file) => (
                <div key={file.name} className="flex items-center gap-2">
                    <FileImage className="w-5 h-5 inline-block" />
                    <p>{file.name}</p>
                    <p>{file.size} Б.</p>
                    <p>{file.type}</p>
                </div>
            ))}
        </div>
        {!allUploaded && (
            <Button className="mt-4 w-[200px] py-2" onClick={handleUpload}>Загрузить файлы</Button>
        )}
        </>
    )}
        </div>
    )
}