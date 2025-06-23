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
  console.log("formData", formData);

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  console.log("file", file);

  const { url } = await uploadFile(file, "misc");

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

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: buffer,
    ContentType: file.type,
    ACL: "public-read",
  });

  try {
    await s3Client.send(command);
    const url = `https://${BUCKET_NAME}.${ENDPOINT}/${fileName}`;
    return { url };
  } catch (error) {
    console.error("Error uploading file to DigitalOcean Spaces:", error);
    throw new Error("Failed to upload file");
  }
}
