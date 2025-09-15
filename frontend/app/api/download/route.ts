export const runtime = "nodejs";

function inferExtensionFromContentType(contentType: string | null): string {
  if (!contentType) return "";
  const map: Record<string, string> = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/ogg": ".ogv",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "application/octet-stream": "",
  };
  return map[contentType] ?? "";
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");
  const requestedFilename = searchParams.get("filename");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing 'url' query parameter" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const upstreamResponse = await fetch(targetUrl);
    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch remote file: ${upstreamResponse.status}` }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }

    const contentType = upstreamResponse.headers.get("content-type") ?? "application/octet-stream";

    let filename: string;
    if (requestedFilename) {
      filename = requestedFilename;
    } else {
      try {
        const urlObj = new URL(targetUrl);
        filename = decodeURIComponent(urlObj.pathname.split("/").pop() || "download");
      } catch {
        filename = "download";
      }
    }

    // Ensure filename has an extension if possible
    const hasExtension = /\.[a-z0-9]{2,8}$/i.test(filename);
    if (!hasExtension) {
      const inferredExt = inferExtensionFromContentType(contentType);
      if (inferredExt) filename += inferredExt;
    }

    const headers = new Headers();
    headers.set("content-type", contentType);
    const contentLength = upstreamResponse.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);
    headers.set("content-disposition", `attachment; filename="${filename.replace(/\"/g, "'")}"`);
    headers.set("cache-control", "private, max-age=0, must-revalidate");

    return new Response(upstreamResponse.body, { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Unexpected error fetching file" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}


