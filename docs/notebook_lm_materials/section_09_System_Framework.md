# Claude Code 源碼解析 - 09 System Framework Architecture

> 本文件專為 NotebookLM 或其他 AI 閱讀工具設計，全篇分為 15 頁 (Slides) 結構。

## Slide 1: 主題與目標
**主題:** 系統架構與技術堆棧 (System Framework & Technology Stack)
**目標:** 從底層語言到上層渲染，理解 Claude Code 作為一個高性能 CLI 的技術骨幹。
**[Ref Code]:** `package.json`, `src/main.tsx`
**[Suggested Diagram]:** 技術架構四層模型 (Env -> Runtime -> Rendering -> Logic)

## Slide 2: 基礎：Node.js 與 TypeScript
本專案是一個典型的 Node.js 應用，使用 **TypeScript** 進行嚴格型別開發。為了追求最快的啟動速度，專案避免了過重的編譯前端，並巧妙地利用 TypeScript 的 `paths` 與 `baseUrl` 處理複雜模組依賴。
**[Ref Code]:** `tsconfig.json`
**[Suggested Diagram]:** TS 檔案到 Node 執行檔的對應路徑圖

## Slide 3: 模組化與代碼消除 (DCE)
為了確保企業內部或外部發行版的安全性，專案使用 **Bun** 或自定義 Loader。透過 `feature('FLAG')` 巨集與編譯期過濾，將不需要的區塊（如未發布的實驗功能）從最後的 Bundle 中徹底剔除。
**[Ref Code]:** `src/bun-bundle-mock.ts`, `src/entrypoints/cli.tsx`
**[Suggested Diagram]:** 指令編譯期過濾器的運作機制

## Slide 4: 終端介面核心：React + Ink
這是最讓前端開發者驚艷的地方：Claude Code 將 **React** 帶入了終端。透過 **Ink** 套件，我們可以像在網頁開發一樣使用組件 (Components)、Hooks (`useState`, `useEffect`) 來控制終端輸出。
**[Ref Code]:** `src/ink.ts`, `src/components/`
**[Suggested Diagram]:** React Virtual DOM 渲染到 Terminal ANSI 符號序列的轉換過程

## Slide 5: 自定義渲染管線 (Rendering Pipeline)
為了支援複雜的互動（如可捲動的對話歷史或動態表格），系統在 Ink 之上實作了多種自定義 `Termio` 平面。這允許系統在處理長文本流時，依然能維持固定的輸入邊框不閃爍。
**[Ref Code]:** `src/ink/termio/`
**[Suggested Diagram]:** 終端渲染層與佈局管理 (Layout) 圖

## Slide 6: 低層級 Shell 橋接：node-pty
單純的 `child_process` 無法處理互動式 shell（如要求用戶輸入密碼）。系統使用 **node-pty** 建立一個真正的虛擬終端，這讓 Claude Code 能完美模擬 Bash 或 Zsh 的所有行為，包括 ANSI 顏色捕捉。
**[Ref Code]:** `src/utils/Shell.ts`, `src/utils/shell/bashProvider.ts`
**[Suggested Diagram]:** 主進程、Node-pty 與本地 Shell 的通訊關係圖

## Slide 7: 進程間通訊 (IPC) 與 Daemon 模式
當 CLI 以背景模式或守護進程運行時，系統會開啟 UNIX Socket 或命名管道。這讓前端 CLI (Client) 可以異步向背景的邏輯核心 (Server/Daemon) 發送請求。
**[Ref Code]:** `src/daemon/main.js`, `src/cli/bg.js`
**[Suggested Diagram]:** IPC 通訊協議層次圖 (Socket/Pipe/Message)

## Slide 8: 全域狀態管理：AppState Store
系統不依賴 Redux 這種沈重的庫，而是實作了一個基於 `onChangeAppState` 的輕量 Store。所有組件共享同一個狀態樹，包括目前的 Token 消耗、權限模式與對話歷史。
**[Ref Code]:** `src/state/AppStateStore.ts`, `src/state/onChangeAppState.ts`
**[Suggested Diagram]:** 全域狀態機單向資料流圖

## Slide 9: 依賴注入與生命週期 (DI & Lifecycle)
在啟動初期，系統會透過 `QueryEngineConfig` 將各種「服務」（如 MCP Client、工具集、分析器）注入。這種低耦合設計讓系統能輕鬆切換「本機執行」與「遠端執行」模式。
**[Ref Code]:** `src/QueryEngine.ts:QueryEngineConfig`
**[Suggested Diagram]:** 依賴項注入與初始化時序圖

## Slide 10: 權限中心：Permission Manager
這是安全架構的框架。它定義了哪些操作是「危險的」（如寫入磁碟），並掛載全局 Hook 攔截。框架保證了不論是哪種工具，只要涉及 IO，都必須經過此檢查層。
**[Ref Code]:** `src/utils/permissions/`
**[Suggested Diagram]:** 多層級權限校核門哨 (Firewall Style)

## Slide 11: 異常處理框架 (Exception Handling)
系統建立了一套分層告警機制。從 `logError` 到 UI 的 `ErrorScreen`，確保發生 Node.js 錯誤時，終端的 Cursor 能正常復原、樣式不崩潰，並能產生 debug 專用的日誌檔案。
**[Ref Code]:** `src/utils/errors.ts`, `src/utils/process.ts`
**[Suggested Diagram]:** 故障轉移與清理清理流程

## Slide 12: 性能分析系統 (startupProfiler)
「秒開」是 CLI 的核心體驗。系統在載入的每一階段（如 `main_tsx_entry` 到 `cli_after_main_import`）都埋入了毫秒級計時。這些框架數據能幫助工程師找到導致冷啟動變慢的模組。
**[Ref Code]:** `src/utils/startupProfiler.js`
**[Suggested Diagram]:** 啟動延時分析與模組加載瀑布圖

## Slide 13: 擴展框架：Plugin & Skill System
系統不只是固定的。它提供了一套 Plugin API，允許框架動態載入 `.js` 檔案擴展工具。這是一套涉及熱重載與動態載入的複雜框架設計。
**[Ref Code]:** `src/plugins/`, `src/utils/plugins/pluginLoader.js`
**[Suggested Diagram]:** 外掛夾載與隔離執行架構

## Slide 14: 樣式系統：Terminal CSS & Chalk
雖然在終端，但系統依然實作了一套類似 CSS 的設計令牌 (Tokens)。透過 `chalk` 與自定義的 `outputStyles`，維持了跨平台的一致性色彩與視覺階層感。
**[Ref Code]:** `src/outputStyles/`, `src/constants/colors.ts`
**[Suggested Diagram]:** 視覺令牌與 ANSI 色彩對應表

## Slide 15: 總結
Claude Code 的架構框架核心在於：**Web-like UI (React) + Robust System Control (Node-pty)**。它將前端組件化的優勢帶入系統調度，為現代 AI 自主代理建立了一個高韌性的地基。
**[Ref Code]:** 專案總體目錄
**[Suggested Diagram]:** 系統全景架構海報圖
