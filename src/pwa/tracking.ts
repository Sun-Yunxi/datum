/** 导出期间从 Service Worker 收到的下载进度（字节数均为实际传输字节） */
export interface DownloadProgress {
  loaded: number;
  total: number;
  speed: number;
}

export interface DownloadTrackingHandlers {
  onProgress: (progress: DownloadProgress) => void;
  /** 长度或 ETag 与服务器不一致时触发 */
  onIntegrityError: (message: string) => void;
}

export interface DownloadTracking {
  /** Worker 已登记本次会话（或等待超时），此后发起的下载才会被统计 */
  ready: Promise<void>;
  /** 取消导出：让 Service Worker 中止进行中的下载 */
  cancel: () => void;
  /** 正常结束会话：停止跟踪，不中止任何请求 */
  finish: () => void;
}

/**
 * 通过 MessageChannel 让 Service Worker 跟踪生成模块与字体的下载进度。
 * 没有 Service Worker 控制时返回 null，由调用方退化为不确定进度。
 */
export function startDownloadTracking(handlers: DownloadTrackingHandlers): DownloadTracking | null {
  if (!('serviceWorker' in navigator)) return null;
  const controller = navigator.serviceWorker.controller;
  if (!controller) return null;

  const channel = new MessageChannel();
  const assets = new Map<string, { loaded: number; total: number }>();
  let lastLoaded = 0;
  let lastAt = performance.now();
  let speed = 0;
  let finished = false;

  // Worker 确认登记后才开始下载，避免首批请求早于会话建立而漏统计；
  // 500ms 内没有回应则直接放行，不让进度统计影响导出。
  let markReady: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    markReady = resolve;
  });
  const readyTimer = setTimeout(markReady, 500);

  const emit = () => {
    let loaded = 0;
    let total = 0;
    assets.forEach((asset) => {
      loaded += asset.loaded;
      total += asset.total;
    });

    const now = performance.now();
    const elapsed = now - lastAt;
    if (elapsed >= 400) {
      speed = Math.max(0, ((loaded - lastLoaded) * 1000) / elapsed);
      lastLoaded = loaded;
      lastAt = now;
    }

    handlers.onProgress({ loaded, total, speed });
  };

  channel.port1.onmessage = (event) => {
    const message = event.data;
    if (!message) return;

    if (message.type === 'reglet-asset-progress') {
      const previous = assets.get(message.url) || { loaded: 0, total: 0 };
      const loaded = Math.max(previous.loaded, Number(message.loaded) || 0);
      const total = Number(message.total) > 0 ? Number(message.total) : previous.total;
      assets.set(message.url, { loaded, total });
      emit();
      return;
    }

    if (message.type === 'reglet-track-ready') {
      clearTimeout(readyTimer);
      markReady();
      return;
    }

    if (message.type === 'reglet-integrity-error') {
      handlers.onIntegrityError(String(message.message || message.url || ''));
    }
  };

  controller.postMessage({ type: 'reglet-track-start', verify: true }, [channel.port2]);

  const end = (type: 'reglet-track-cancel' | 'reglet-track-end') => {
    if (finished) return;
    finished = true;
    controller.postMessage({ type });
    channel.port1.close();
  };

  return {
    ready,
    cancel: () => end('reglet-track-cancel'),
    finish: () => end('reglet-track-end'),
  };
}
