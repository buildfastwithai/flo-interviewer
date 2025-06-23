"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFileUploaded?: (url: string) => void;
  acceptedFileTypes?: string;
  label?: string;
}

export function FileUpload({
  onFileUploaded,
  acceptedFileTypes = ".pdf,.doc,.docx",
  label = "Upload File",
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      console.log(`Uploading file: ${file.name}`);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }

      const data = await response.json();
      console.log(`File uploaded successfully: ${data.file.url}`);

      if (onFileUploaded) {
        onFileUploaded(data.file.url);
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-4">
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 border-gray-300 dark:border-gray-600"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 16"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">{label}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {acceptedFileTypes.split(",").join(", ")} files
            </p>
          </div>
          <input
            id="file-upload"
            name="file"
            type="file"
            className="hidden"
            accept={acceptedFileTypes}
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>

        {isUploading && (
          <div className="text-sm text-blue-500">Uploading...</div>
        )}

        {error && <div className="text-sm text-red-500">{error}</div>}
      </div>
    </div>
  );
}
