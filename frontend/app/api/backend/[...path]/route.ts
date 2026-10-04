/**
 * app/api/backend/[...path]/route.ts
 * Proxy route for Next.js app router.
 * Forwards GET and POST requests to process.env.FASTAPI_URL (default: http://localhost:8000).
 * Preserves status code, response headers, and returns response unchanged.
 */

import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    const resolvedParams = await context.params;
    const path = resolvedParams?.path ? resolvedParams.path.join('/') : '';
    const searchParams = request.nextUrl.search;
    const targetUrl = `${FASTAPI_URL}/${path}${searchParams}`;

    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    });

    let body: ArrayBuffer | null = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.arrayBuffer();
    }

    const upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    upstreamRes.headers.forEach((value, key) => {
      // Omit transfer-encoding as NextResponse handles encoding
      if (key.toLowerCase() !== 'transfer-encoding') {
        responseHeaders.set(key, value);
      }
    });

    const responseData = await upstreamRes.arrayBuffer();

    return new NextResponse(responseData, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Proxy Error';
    return NextResponse.json(
      { error: 'Backend proxy error', detail: errMessage },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
