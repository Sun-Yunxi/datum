# 变更记录

本文件记录 Reglet 的版本变更。

## [0.75.0] - 2026-10-27

### 性能与加载

- 移除 pdfmake 自带的 Roboto VFS，generator chunk 由 1815 KB（gzip 808 KB）降至 980 KB（gzip 350 KB）。
- 字体文件、生成模块与 qrcode（仅存在二维码模块时）并行加载。
- 体积预估独立为 `estimate.ts`，密度拦截仍在任何下载之前执行。

### 字体缓存

- Service Worker 只缓存同源 `.woff2` / `.ttf` / `.otf` 字体到 `reglet-fonts-v1`（CacheFirst，最多保留 6 条），不缓存 JS/CSS/HTML，不使用 localStorage。
- `fontCache.ts` 按 `BASE_URL` 确定作用域；`document.fonts.ready` 后预热首屏字体。

### 进度弹窗

- 仅在「生成模块或字体未在内存」时弹出；标题「PDF 生成中」，使用 `mdui-linear-progress`，小字显示「下载生成模块中 42% · 1.2 MB/s」；就绪后跳到 90%，文案改为「生成中 90%」。
- 达到 90% 即切换为不确定进度的「生成中」，不再显示百分比；资源已缓存时同样弹出弹窗并直接显示「生成中」。
- 遮罩不可关闭；ESC 与「取消」可关闭，关闭即中止请求、`resetSarasaCache()` 并丢弃未完成数据；成功结束调用 `complete()` 标记，不会误触发取消。
- 无受控 Service Worker 时退化为不确定进度并显示「下载生成模块中」；一致性校验失败改为进度归零，并在弹窗内以文字提示。

### 资源完整性

- 导出期间通过 `MessageChannel` 统计字节进度；Service Worker 先回 `reglet-track-ready`，页面再开始下载，避免首批请求漏统计。
- 交付前校验：未压缩响应比对 `Content-Length`，并以 `If-None-Match` 发起条件 HEAD（304 或相同 ETag 才视为一致）；不一致则中止并提示「下载内容与服务器不一致」。

### 字体

- 移除全部 MiSans 资源与 `@font-face`，界面改用 CSS Fonts Module Level 4 的 `system-ui` 字体栈；页脚新增系统字体与版权提示。
- PDF 字体改为 Sarasa UI SC，内置常规、加粗、斜体、加粗斜体四种字形；文字模块字体框下方新增「加粗」「斜体」开关，仅选斜体时使用由常规字形斜切 9.4° 生成的 Oblique。
- 只注册并下载本次导出实际用到的字形；自定义字体按上传文件原样嵌入。
- 字体下拉内置项改为「更纱黑体（内置）」/「Sarasa Gothic (built-in)」。
- 自定义字体失效时回退内置字体：只改写自定义字体族节点并清除其加粗/斜体；空标题、空单文字不再触发字体下载。

### 字体上传

- 支持拖拽与多选，白名单限定 `.woff2` / `.ttf` / `.otf`。
- 单批总量超过 25 MB 时弹出警告（图标、「警告」、正文、继续/取消），每个标签页只出现一次。
- 新增「字体解析中」对话框：可取消、点击遮罩不关闭、ESC 可关闭；关闭后停止处理未解析文件，已解析结果保留、未完成数据丢弃。

### 中断与多字体

- Service Worker 只在完整读取并通过长度与 ETag 校验后写入缓存，脚本类资源不落盘；字体解析全程在内存；旧字体缓存在 `activate` 阶段清理，异常中断不会残留临时文件。
- 导出时按各文字模块的 `fontId` 过滤，只把实际用到的字体注册进 pdfmake。

### 标题定位

- 新增 `absoluteAlignedText()`：以 `columns` 与 `absolutePosition` 让对齐参照等于作图区域宽度，修正标题整体偏右下。
- 标题垂直位置按文字块对齐，块高按 Sarasa 行高比 1.21 估算；标题与页码统一使用该定位；「下」位置额外留 1 pt 余量，避免浮点误差把文字挤到第二页。
- A4 纵向、留白 15/13.5 mm、字号 10 mm 实测：居中行中心由 318.90 pt（偏右 7.5 mm）修正为 297.64 pt；左对齐行左缘 42.52 pt、右对齐行右缘 552.76 pt，均与留白一致；垂直居中为文字块中心 420.95 pt。

### 文档

- `README.md` 与 `MAINTAINER-GUIDE.md` 同步进度/取消、字体缓存、部署要求（`sw.js` 使用 `Cache-Control: no-cache`）、离线说明、目录结构与版本号。
- 构建期输出 `LICENSE-Sarasa.txt` 与 `THIRD-PARTY-NOTICES.txt`。

### 验证

- `npm run lint`：0 error（4 条既有 warning）。
- `npx tsc -b` 与 `npm run build -- --base=/reglet/` 通过。
