import * as tus from "tus-js-client";
import sharp from "sharp";
import { supabase, projectRef } from "@/lib/supabase";
import { db } from "@/db";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return new Response("No file provided", { status: 400 });
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
  if (!allowedTypes.includes(file.type)) {
    return new Response(`File type ${file.type} is not supported`, {
      status: 400,
    });
  }

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return new Response("File too large", { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const existingConfigId = formData.get("configId") as string | null;
  const objectName = `uploads/${file.name}`;

  const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const upload = new tus.Upload(buffer, {
          uploadSize: buffer.length,
          endpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            "x-upsert": "true",
          },
          metadata: {
            bucketName: "case-store-bucket",
            objectName,
            contentType: file.type,
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = Number(
              ((bytesUploaded / bytesTotal) * 100).toFixed(2),
            );
            const data = new TextEncoder().encode(`progress: ${percentage}\n`);
            controller.enqueue(data);
          },
          onSuccess: async () => {
            try {
              const { data: blob, error: downloadError } =
                await supabase.storage
                  .from("case-store-bucket")
                  .download(objectName);

              if (downloadError) throw downloadError;

              const buffer = Buffer.from(await blob.arrayBuffer());

              const metadata = await sharp(buffer).metadata();

              const { data: signedUrlData, error: signedUrlError } =
                await supabase.storage
                  .from("case-store-bucket")
                  .createSignedUrl(objectName, 315360000);

              if (signedUrlError) throw signedUrlError;

              let configId: string;

              if (existingConfigId) {
                await db.configuration.update({
                  where: { id: existingConfigId },
                  data: { croppedImageUrl: signedUrlData.signedUrl },
                });
                configId = existingConfigId;
              } else {
                const { id } = await db.configuration.create({
                  data: {
                    width: metadata.width || 500,
                    height: metadata.height || 500,
                    imageUrl: signedUrlData.signedUrl,
                  },
                });
                configId = id;
              }

              const data = new TextEncoder().encode(`configId: ${configId}\n`);
              controller.enqueue(data);
              controller.close();
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Failed to process image";
              const data = new TextEncoder().encode(`error: ${message}\n`);
              controller.enqueue(data);
              controller.close();
            }
          },
          onError: (error) => {
            const data = new TextEncoder().encode(`error: ${error.message}\n`);
            controller.enqueue(data);
            controller.close();
          },
        });

        upload.start();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        const data = new TextEncoder().encode(`error: ${message}\n`);
        controller.enqueue(data);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache",
    },
  });
}
