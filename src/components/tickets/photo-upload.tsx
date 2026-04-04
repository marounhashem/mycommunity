"use client";

import { useState, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadedFile {
  key: string;
  filename: string;
  previewUrl: string;
}

interface PhotoUploadProps {
  maxFiles?: number;
  onFilesChange: (files: { key: string; filename: string }[]) => void;
}

export function PhotoUpload({ maxFiles = 3, onFilesChange }: PhotoUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;

    const remaining = maxFiles - files.length;
    const toUpload = Array.from(selected).slice(0, remaining);

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of toUpload) {
      try {
        const res = await fetch("/api/r2/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });
        const { url, key } = await res.json();

        await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        newFiles.push({ key, filename: file.name, previewUrl: URL.createObjectURL(file) });
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    const updated = [...files, ...newFiles];
    setFiles(updated);
    onFilesChange(updated.map((f) => ({ key: f.key, filename: f.filename })));
    setUploading(false);

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesChange(updated.map((f) => ({ key: f.key, filename: f.filename })));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {files.map((file, i) => (
          <div key={file.key} className="relative w-20 h-20 rounded-md overflow-hidden border border-border">
            <img src={file.previewUrl} alt={file.filename} className="w-full h-full object-cover" />
            <button type="button" onClick={() => removeFile(i)} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ))}
        {files.length < maxFiles && (
          <Button type="button" variant="outline" className="w-20 h-20 flex flex-col items-center justify-center gap-1" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{uploading ? "..." : "Photo"}</span>
          </Button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
    </div>
  );
}
