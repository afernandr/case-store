import * as tus from "tus-js-client";
import { projectRef } from "./supabase";

interface UploadOptions {
  file: File;
  onProgress?: (percentage: number) => void;
  onSuccess?: (fileId: string) => void;
  onError?: (error: Error) => void;
}

const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;

export async function uploadWithProgress({
  file,
  onProgress,
  onSuccess,
  onError,
}: UploadOptions) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;

  const upload = new tus.Upload(file, {
    endpoint: endpoint,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "x-upsert": "true",
    },
    metadata: {
      bucketName: "case-store-bucket",
      objectName: file.name,
      contentType: file.type,
    },
    removeFingerprintOnSuccess: true,
    onProgress: (bytesUploaded, bytesTotal) => {
      console.log(`Progress: ${bytesUploaded}/${bytesTotal}`);
      const percentage = Number(
        ((bytesUploaded / bytesTotal) * 100).toFixed(2),
      );
      onProgress?.(percentage);
    },
    onSuccess: (payload) => {
      const fileId = payload.lastResponse?.getHeader("x-supabase-id");
      onSuccess?.(fileId!);
    },
    onError: (error) => {
      console.error(`Tus upload error: ${error}`);
      onError?.(error);
    },
  });

  upload.start();
}
