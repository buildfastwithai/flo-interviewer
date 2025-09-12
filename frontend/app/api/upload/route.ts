import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const BUCKET_NAME = process.env.DIGITAL_OCEAN_SPACES_BUCKET_NAME!;
const ENDPOINT = process.env.DIGITAL_OCEAN_SPACES_ENDPOINT!;

const endpointUrl = ENDPOINT.startsWith("https://")
  ? ENDPOINT
  : `https://${ENDPOINT}`;

const s3Client = new S3Client({
  endpoint: endpointUrl,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.DIGITAL_OCEAN_SPACES_KEY!,
    secretAccessKey: process.env.DIGITAL_OCEAN_SPACES_SECRET!,
  },
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folderField = (formData.get("folder") as string) || "recordings";
  try {
    console.log("[Upload API] Incoming form-data keys:", Array.from(formData.keys()));
  } catch {}

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  console.log("[Upload API] File received", {
    name: file.name,
    type: file.type,
    size: (file as any).size,
    folder: folderField,
    bucket: BUCKET_NAME,
    endpoint: ENDPOINT,
  });

  const { url } = await uploadFile(file, folderField);

  return NextResponse.json({ file: { url } });
}

async function uploadFile(
  file: File,
  folder: string
): Promise<{ url: string }> {
  const fileExtension = file.name.split(".").pop();
  const fileName = `${folder}/${crypto
    .randomBytes(16)
    .toString("hex")}.${fileExtension}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log("[Upload API] Uploading to Spaces", {
    key: fileName,
    bytes: buffer.length,
    contentType: file.type,
  });

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: buffer,
    ContentType: file.type,
    ACL: "public-read",
  });

  try {
    const res = await s3Client.send(command);
    console.log("[Upload API] PutObject result", { $metadata: (res as any)?.$metadata });
    const url = `https://${BUCKET_NAME}.${ENDPOINT}/${fileName}`;
    console.log("[Upload API] Public URL", url);
    return { url };
  } catch (error) {
    console.error("Error uploading file to DigitalOcean Spaces:", error);
    throw new Error("Failed to upload file");
  }
}
