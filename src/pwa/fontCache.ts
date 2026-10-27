/**
 * 注册 Service Worker（作用域跟随部署路径，兼容 GitHub Pages 的 /reglet/ 子路径）。
 * 界面不再加载 Web 字体：Worker 只缓存 PDF 导出所用的内置字体资源，
 * 其余资源（JS/CSS/HTML）一律不缓存，避免版本错配。
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return;
  }
  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  navigator.serviceWorker
    .register(swUrl, { scope: import.meta.env.BASE_URL })
    .catch(() => {
      // 注册失败不影响主流程：导出会退化为无进度提示 / 不起用缓存
    });
}
