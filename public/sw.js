/*
 * Reglet Service Worker
 *
 * 职责只有两件事：
 * 1. 缓存字体资源（唯一允许的持久化内容）：网页界面不再加载任何 Web 字体，
 *    这里只缓存 PDF 导出所用的内置字体（.ttf/.otf/.woff2），
 *    且只在「完整读取 + 校验通过」后才写入，未完成的下载不会留下任何临时文件；
 * 2. 在导出期间为生成模块/字体的下载上报真实进度，并在交付前核对
 *    客户端收到的内容与服务器当前内容是否一致（长度 + ETag 条件请求）。
 * 不缓存任何 JS/CSS/HTML，也不保存任何用户数据。
 */
'use strict';

// 缓存名随项目更名升级：更名前后的旧字体缓存（datum-fonts-*、旧 reglet-fonts-*）在 activate 阶段清除
const FONT_CACHE = 'reglet-fonts-v1';
const FONT_URL_RE = /\.(woff2|ttf|otf)$/i;
const SCRIPT_URL_RE = /\/assets\/[^/]+\.js$/i;

/** clientId -> { port, controller, verify } */
const sessions = new Map();
/** url -> 上次上报时间，避免高频 postMessage */
const lastReportAt = new Map();

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(
          (key) =>
            (key.startsWith('reglet-fonts-') || key.startsWith('datum-fonts-')) &&
            key !== FONT_CACHE,
        )
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const message = event.data || {};
  const client = event.source;
  if (!client || client.type !== 'window') return;

  if (message.type === 'reglet-track-start') {
    const previous = sessions.get(client.id);
    if (previous) previous.controller.abort();
    lastReportAt.clear();
    sessions.set(client.id, {
      port: event.ports[0],
      controller: new AbortController(),
      verify: !!message.verify,
    });
    // 告知页面会话已就绪：页面收到后再发起下载，确保首批请求也能被统计
    event.ports[0]?.postMessage({ type: 'reglet-track-ready' });
    return;
  }

  if (message.type === 'reglet-track-cancel') {
    const session = sessions.get(client.id);
    if (session) {
      session.controller.abort();
      sessions.delete(client.id);
    }
    return;
  }

  if (message.type === 'reglet-track-end') {
    sessions.delete(client.id);
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const session = sessions.get(event.clientId);

  if (FONT_URL_RE.test(url.pathname)) {
    event.respondWith(handleFont(request, url, session));
    return;
  }

  if (session && SCRIPT_URL_RE.test(url.pathname)) {
    event.respondWith(handleScript(url, session));
  }
});

function report(session, url, loaded, total, cached) {
  if (!session) return;
  const now = Date.now();
  const last = lastReportAt.get(url) || 0;
  if (!cached && now - last < 120) return;
  lastReportAt.set(url, now);
  session.port.postMessage({
    type: 'reglet-asset-progress',
    url,
    loaded,
    total,
    cached: !!cached,
  });
}

function failIntegrity(session, url, message) {
  if (!session) return;
  session.port.postMessage({ type: 'reglet-integrity-error', url, message });
}

/** 读取响应体并在读取过程中上报字节进度（用于进度条） */
async function readWithProgress(response, onProgress) {
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    onProgress(bytes.byteLength);
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  let last = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    loaded += value.byteLength;
    const now = Date.now();
    if (now - last >= 120) {
      last = now;
      onProgress(loaded);
    }
  }

  onProgress(loaded);
  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

async function headSize(href, signal) {
  try {
    const response = await fetch(href, { method: 'HEAD', cache: 'no-store', signal });
    if (!response.ok) return 0;
    return Number(response.headers.get('Content-Length') || 0);
  } catch {
    return 0;
  }
}

/**
 * 核对客户端收到的内容与服务器当前内容是否一致。
 * 用下载响应的 ETag 发起条件 HEAD：304 表示服务器仍是同一份内容；
 * 200 且 ETag 不同表示服务器内容已变化；服务器不提供 ETag 时无法核对，返回 null。
 */
async function verifyWithServer(href, etag, signal) {
  if (!etag) return null;
  try {
    const response = await fetch(href, {
      method: 'HEAD',
      cache: 'no-store',
      headers: { 'If-None-Match': etag },
      signal,
    });
    if (response.status === 304) return true;
    if (!response.ok) return null;
    const serverEtag = response.headers.get('ETag');
    if (!serverEtag) return null;
    return serverEtag === etag;
  } catch (error) {
    if (error && error.name === 'AbortError') throw error;
    return null;
  }
}

async function handleFont(request, url, session) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(url.href);

  if (cached) {
    if (session && session.verify) {
      const consistent = await verifyWithServer(
        url.href,
        cached.headers.get('ETag'),
        session.controller.signal,
      );
      if (consistent === false) {
        failIntegrity(session, url.href, 'Font on server changed');
        await cache.delete(url.href);
        return fetchFont(url, session, cache);
      }
    }
    const size = Number(cached.headers.get('X-Reglet-Bytes') || 0);
    report(session, url.href, size, size, true);
    return cached;
  }

  return fetchFont(url, session, cache);
}

async function fetchFont(url, session, cache) {
  const response = await fetch(url.href, {
    credentials: 'same-origin',
    signal: session ? session.controller.signal : undefined,
  });
  if (!response.ok) return response;

  const declared = Number(response.headers.get('Content-Length') || 0);
  const encoded = !!response.headers.get('Content-Encoding');
  const total = declared > 0 && !encoded ? declared : 0;
  const etag = response.headers.get('ETag');

  const bytes = await readWithProgress(response, (loaded) => {
    report(session, url.href, loaded, total, false);
  });

  if (declared > 0 && !encoded && bytes.byteLength !== declared) {
    failIntegrity(session, url.href, 'Font length mismatch');
    throw new Error('Font length mismatch');
  }

  if (session && session.verify) {
    const consistent = await verifyWithServer(url.href, etag, session.controller.signal);
    if (consistent === false) {
      failIntegrity(session, url.href, 'Font on server changed');
      throw new Error('Font verification failed');
    }
  }

  const headers = new Headers();
  headers.set('Content-Type', response.headers.get('Content-Type') || 'font/ttf');
  if (etag) headers.set('ETag', etag);
  headers.set('X-Reglet-Bytes', String(bytes.byteLength));
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  const stored = new Response(bytes, { status: 200, headers });
  await cache.put(url.href, stored.clone());
  await trimFontCache(cache, 6);
  report(session, url.href, bytes.byteLength, bytes.byteLength, true);
  return stored;
}

async function trimFontCache(cache, keep) {
  const keys = await cache.keys();
  if (keys.length <= keep) return;
  await Promise.all(keys.slice(0, keys.length - keep).map((key) => cache.delete(key)));
}

async function handleScript(url, session) {
  const response = await fetch(url.href, {
    credentials: 'same-origin',
    signal: session.controller.signal,
  });
  if (!response.ok) return response;

  const declared = Number(response.headers.get('Content-Length') || 0);
  const encoded = !!response.headers.get('Content-Encoding');
  const total = declared > 0 && !encoded ? declared : 0;
  const etag = response.headers.get('ETag');

  // GitHub Pages 对未压缩响应使用分块传输，没有 Content-Length；额外 HEAD 一次拿到总大小
  if (!total) {
    headSize(url.href, session.controller.signal).then((size) => {
      if (size > 0) report(session, url.href, 0, size, false);
    });
  }

  const bytes = await readWithProgress(response, (loaded) => {
    report(session, url.href, loaded, total, false);
  });

  if (declared > 0 && !encoded && bytes.byteLength !== declared) {
    failIntegrity(session, url.href, 'Module length mismatch');
    throw new Error('Module length mismatch');
  }

  const consistent = await verifyWithServer(url.href, etag, session.controller.signal);
  if (consistent === false) {
    failIntegrity(session, url.href, 'Module on server changed');
    throw new Error('Module verification failed');
  }

  const headers = new Headers();
  headers.set('Content-Type', response.headers.get('Content-Type') || 'text/javascript');
  return new Response(bytes, { status: 200, headers });
}
