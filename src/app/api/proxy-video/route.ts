import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return new NextResponse('Missing "url" parameter', { status: 400 });
    }

    // Unwrap nested proxy loops if present
    while (targetUrl.includes('/api/proxy-video?url=')) {
      const parts = targetUrl.split('/api/proxy-video?url=');
      targetUrl = decodeURIComponent(parts[parts.length - 1]);
    }

    targetUrl = targetUrl.trim();
    const range = request.headers.get('range');

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Encoding': 'identity',
    };

    if (range) {
      headers['Range'] = range;
    }

    // Attempt 1: Fetch through serverless proxy
    let res = await fetch(targetUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
      cache: 'no-store',
    });

    // Attempt 2: If custom headers caused a 403, retry with standard request
    if (!res.ok && res.status === 403) {
      res = await fetch(targetUrl, {
        method: 'GET',
        cache: 'no-store',
        redirect: 'follow',
      });
    }

    // Fallback: If target storage bucket blocks cloud IPs, issue a 302 redirect directly to source
    if (!res.ok) {
      return NextResponse.redirect(targetUrl, { status: 302 });
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Cache-Control', 'public, max-age=3600');

    const contentType = res.headers.get('content-type') || 'video/mp4';
    const contentLength = res.headers.get('content-length');
    const contentRange = res.headers.get('content-range');
    const acceptRanges = res.headers.get('accept-ranges') || 'bytes';

    responseHeaders.set('Content-Type', contentType);
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    if (contentRange) responseHeaders.set('Content-Range', contentRange);
    if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges);

    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Proxy handler error:', error);
    return new NextResponse(`Proxy server error: ${error.message}`, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}