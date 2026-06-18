"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { Upload, X, File, Image, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  folder: string;
  accept?: string;
  maxSizeMB?: number;
  onUpload: (result: { url: string; publicId: string }) => void;
  onError?: (error: string) => void;
  label?: string;
  hint?: string;
  currentUrl?: string;
}

export function FileUploader({
  folder,
  accept = "image/*,.pdf",
  maxSizeMB = 10,
  onUpload,
  onError,
  label = "Upload file",
  hint,
  currentUrl,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      onError?.(`File exceeds ${maxSizeMB}MB limit`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const res = await axios.post("/api/upload", formData);
      const result = res.data.data;
      onUpload(result);
      if (file.type.startsWith("image/")) {
        setPreview(result.url);
      } else {
        setPreview("file");
      }
    } catch {
      onError?.("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all",
          dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm">Uploading...</span>
          </div>
        ) : preview && preview !== "file" ? (
          <div className="relative inline-block">
            <img src={preview} alt="Preview" className="h-24 w-24 object-cover rounded-lg mx-auto" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPreview(null); }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : preview === "file" ? (
          <div className="flex flex-col items-center gap-2 text-emerald-600">
            <File className="w-8 h-8" />
            <span className="text-sm font-medium">File uploaded successfully</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); setPreview(null); }} className="text-xs text-slate-400 hover:text-red-500">Remove</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Upload className="w-8 h-8" />
            <span className="text-sm font-medium text-slate-600">{label}</span>
            {hint && <span className="text-xs text-slate-400">{hint}</span>}
            <span className="text-xs text-slate-400">Max {maxSizeMB}MB</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
      />
    </div>
  );
}
