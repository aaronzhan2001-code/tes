# CITY:LAB · 平行城市实验室

一座虚构的城市，一个可解释的模拟系统。调整交通、绿色建设、住房、教育和税率，观察 2040–2060 年的城市变化；从历史节点创建平行世界线，在相同外部事件下比较不同的选择。

**[在线体验 v1.0.0](https://rawcdn.githack.com/aaronzhan2001-code/tes/v1.0.0/release/city-lab.html)** · **[下载发行版](https://github.com/aaronzhan2001-code/tes/releases/latest)**

## 功能

- 五个政策控制项和三组发展预设，按年推演或快进五年。
- 联动的等距城市地图、人口 / 财政 / 环境 / 幸福感指标和真实历史趋势图。
- 每年历史快照、只读回溯、最多四条独立世界线及同年对比。
- 可复现的种子事件，不同方案在相同年份经历相同热浪或创新机遇。
- 本地自动保存，实验 JSON 导入 / 导出和数据校验。
- 手机、桌面适配，键盘操作，弹窗焦点管理与减少动画偏好支持。

这是创作性的简化模型，不用于真实城市规划，也不依赖远程 AI、账户、密钥或外部服务。模型规则在应用的「模型说明」页面与 `src/engine.ts` 中公开。

## 开发

Node.js 24（版本见 `.nvmrc`），npm 11。

```bash
npm ci
npm run dev
```

默认开发端口 5173。应用数据仅保存在浏览器的 `city-lab-experiment-v1` 本地存储项中。

## 验证

```bash
npm test                         # 模拟引擎与实验文件校验
npm run build                    # TypeScript 严格检查与生产构建
npx playwright install chromium  # 首次安装浏览器
npm run test:e2e                  # 真实浏览器工作流与布局验证
```

已有系统 Chromium 的机器可用 `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`，无需下载第二份浏览器。浏览器测试自动启动生产预览服务，检查推演、分叉、回溯、对比、保存、导入导出、上限、重置与移动端导航。失败时生成 trace。

```bash
npm run preview -- --port 4173   # 本地检查生产构建
```

## 发布

生产构建将 JavaScript 与 CSS 完整嵌入 `dist/index.html`，无需服务器即可离线打开。正式发行文件也会随 GitHub Release 提供。`release/city-lab.html` 保存经过验证的发行构建，可从公共静态内容服务访问。

每次推送到 `main`，`.github/workflows/deploy.yml` 执行模拟引擎测试、生产构建与浏览器测试，并上传单文件构建。可选的 GitHub Pages 部署需要在仓库 Settings → Pages → Build and deployment 选择 **GitHub Actions**，并将仓库 Actions 变量 `ENABLE_PAGES` 设置为 `true`；验证通过后才部署。

Vite 使用相对资源路径，也可将 `dist/` 部署到其他静态网站托管平台。没有服务器、数据库或运行时秘密信息。

## 技术

React 19 / TypeScript / Vite / Lucide / Node Test Runner / Playwright。所有城市图形由 SVG 绘制，没有第三方图片或远程字体请求。

Designed & built with Codex.
