"use client";

import { useState, useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileAttachmentProps {
  onFileChange: (file: { key: string; filename: string } | null) => void;
}

export function FileAttachment({ onFileChange }: FileAttachmentProps) {
  const [file, setFile] = useState<{ key: string; filename: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setUploading(true);
    try {
      const res = await fetch("/api/r2/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: selected.name, contentType: selected.type, prefix: "announcements" }),
      });
      const { url, key } = await res.json();
      await fetch(url, { method: "PUT", headers: { "Content-Type": selected.type }, body: selected });
      const uploaded = { key, filename: selected.name };
      setFile(uploaded);
      onFileChange(uploaded);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    setFile(null);
    onFileChange(null);
  }

  return (
    <div>
      {file ? (
        <div className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="truncate flex-1">{file.filename}</span>
          <button type="button" onClick={handleRemove}>
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Paperclip className="h-4 w-4 mr-1" />
          {uploading ? "Uploading..." : "Attach File"}
        </Button>
      )}
      <input ref={inputRef} type="file" className="hidden" onChange={handleFileSelect} />
    </div>
  );
}
