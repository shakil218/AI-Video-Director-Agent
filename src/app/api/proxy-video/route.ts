import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range, Authorization",
    },
  });
}

export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing URL parameter", { status: 400 });
  }

  const rangeHeader = req.headers.get("range");

  try {
    const response = await fetch(targetUrl, {
      headers: rangeHeader ? { Range: rangeHeader } : {},
    });

    if (!response.ok) {
      return new NextResponse(`Media stream error: ${response.statusText}`, {
        status: response.status,
      });
    }

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Range, Authorization");
    headers.set("Accept-Ranges", "bytes");

    const contentType = response.headers.get("content-type");
    const contentRange = response.headers.get("content-range");
    const contentLength = response.headers.get("content-length");

    if (contentType) headers.set("Content-Type", contentType);
    if (contentRange) headers.set("Content-Range", contentRange);
    if (contentLength) headers.set("Content-Length", contentLength);

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    return new NextResponse("Error proxying video stream", { status: 500 });
  }
}