import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from './i18n'
// mdui 设计令牌须先于 index.css 引入，避免其 :root 背景/文字样式覆盖应用主题
import 'mdui/mdui.css'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './pwa/fontCache'

// 通过 UA 识别手机/移动设备，为根元素打上 mobile 类，供响应式样式区分设备宽度与比例
const isMobileUA = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile|BlackBerry/i.test(
  navigator.userAgent,
);
if (isMobileUA) {
  document.documentElement.classList.add('mobile');
}

// Service Worker 只缓存 PDF 导出所用的内置字体，其余资源不缓存
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)