# Claude Code 源碼解析 - 01 Bootstrap & Entrypoints

> 本文件專為 NotebookLM 或其他 AI 閱讀工具設計，全篇分為 15 頁 (Slides) 結構。

## Slide 1: 主題與目標
**主題:** 啟動點機制與生命週期 (CLI Bootstrap & Entrypoints)
**目標:** 理解系統如何在幾十毫秒內啟動，並解析各種 `--flag` 路由。
**[Ref Code]:** `src/entrypoints/cli.tsx`
**[Suggested Diagram]:** CLI 啟動生命週期流程圖 (從 Node exec 到 args 配對)

## Slide 2: 效能優先的 Fast-Path
為了秒開終端，入口點大量使用 `await import(...)` 延遲載入 (Lazy loading)。例如輸入 `--version` 時，甚至連 React 都不會引進，只有編譯期注入的 `MACRO.VERSION` 巨集。
**[Ref Code]:** `src/entrypoints/cli.tsx:main()`
**[Suggested Diagram]:** 引入樹的擴展機制圖

## Slide 3: 攔截系統環境與 Node 記憶體
系統判斷是否跑在 Remote Container 中，如果是，自動強制修正 Node 的 `NODE_OPTIONS` 增加 Heap 大小至 8GB。這展示了工業級 CLI 如何保護自己不受劣質本地環境干擾。
**[Ref Code]:** `src/entrypoints/cli.tsx`
**[Suggested Diagram]:** 環境變數預檢表

## Slide 4: Feature Flags 與無頭代碼消除
因為 CLI 發布包含企業內測或待解鎖版本，`import { feature } from 'bun:bundle'` 會將未核准的區塊 (如 `ABLATION_BASELINE`) 直接在這一步給徹底消除，避免原始碼外洩。
**[Ref Code]:** `src/bun-bundle-mock.ts`, `src/entrypoints/cli.tsx`
**[Suggested Diagram]:** DCE (Dead Code Elimination) 運作原理圖

## Slide 5: 啟動分析器 (startupProfiler)
透過 `profileCheckpoint()` 安插在 `cli_entry` 到 `cli_after_main_import`，追蹤各節點載入毫秒數。後台能蒐集此資料改善不同平台的冷啟動延遲。
**[Ref Code]:** `src/utils/startupProfiler.js`
**[Suggested Diagram]:** 啟動時間軸甘特圖

## Slide 6: 互動模式切換
如果命令是 `claude` 無參數，將走到最後的回退路徑：載入 `src/main.tsx` 準備畫出 Ink UI 介面，並啟動全域觀察者監聽鍵盤。
**[Ref Code]:** `src/main.tsx`
**[Suggested Diagram]:** Command vs Interactive 分流決策樹

## Slide 7: 守護行程 (Daemon Worker)
如果偵測到 `--daemon-worker` 參數，不再進入主流程，而是啟動 `daemonMain` 提供背景服務，例如資源監控或者模型背景運算。
**[Ref Code]:** `src/daemon/main.js`
**[Suggested Diagram]:** 主進程與守護進程的通訊架構圖

## Slide 8: 早期按鍵捕捉 (earlyInput.ts)
用戶常在下指令後不到一秒內就開始敲打字串，為了防止 AI 介面還沒準備好而丟失輸入，入口程式會在此掛載 `startCapturingEarlyInput()` 將 stdin 暫存到記憶體中。
**[Ref Code]:** `src/utils/earlyInput.ts`
**[Suggested Diagram]:** Stdin 緩衝機制時序圖

## Slide 9: 例外與依賴校準
在真正執行系統前，針對 `COREPACK_ENABLE_AUTO_PIN` 這種可能誤染使用者目錄設定的 npm flag，會在腳本載入第一行透過寫入環境變數強制關閉。
**[Ref Code]:** `src/entrypoints/cli.tsx`
**[Suggested Diagram]:** 系統相容性排除列表

## Slide 10: 前期設定載入 (Config Booting)
`enableConfigs()` 在這裡被調用，將 `~/.claude/` 中所有的配置與 Auth token 灌入記憶體單例。沒有這一步，後續所有向 API 發送的請求都會回報 401。
**[Ref Code]:** `src/utils/config.ts`
**[Suggested Diagram]:** 全局配置樹狀結構

## Slide 11: 橋接與工作樹支援 (Worktree)
如果有帶 `--tmux` 和 `--worktree`，程式會用 `execIntoTmuxWorktree` 強制開啟一個新的視窗，隔離目前的主環境，這是開發大型 Monorepo 極為好用的除錯功能。
**[Ref Code]:** `src/utils/worktree.ts`
**[Suggested Diagram]:** Tmux 會話與本地進程隔離圖

## Slide 12: 背景任務會話管理 (Session Registry)
當傳入 `--bg` 或是 `claude ps`，會轉入 `cli/bg.js`，這不再是由 CLI 本身去算，而是將任務透過 IPC 派送到先前的 Daemon 或寫入 Registry 通知背景繼續運作。
**[Ref Code]:** `src/cli/bg.js`
**[Suggested Diagram]:** CLI 到 Background Worker 派送架構

## Slide 13: Self-hosted Runner 快取路徑
針對企業私有雲或代理防火牆配置，提供 `claude self-hosted-runner` 分支路徑。讓主邏輯由遠端下發而 CLI 僅作執行器。
**[Ref Code]:** `src/self-hosted-runner/main.js`
**[Suggested Diagram]:** 企業私有 Runner 連線拓樸

## Slide 14: 初始化異常拋出
如果 `cli.tsx` 中的動態引發模組不存在或網路斷裂，它將依賴 Node 自帶的未捕獲例外拋出，並提供一組錯誤清理（如清除 terminal cursor 隱藏狀態）。
**[Ref Code]:** `src/utils/process.ts`
**[Suggested Diagram]:** 故障轉移與退出清理流程圖

## Slide 15: 總結
`cli.tsx` 向我們展示了如何利用動態 `import` 達成極致的 TTI (Time to interact)。同時藉由層層 if/else 提早消化高頻繁操作 (Fast paths)，延後昂貴框架 (React) 的啟動。
**[Ref Code]:** 全專案入口
**[Suggested Diagram]:** 系統全景圖：模組啟動的優先層級
