# Claude Code 源碼解析 - 07 Memory Persistence

> 本文件專為 NotebookLM 或其他 AI 閱讀工具設計，全篇分為 15 頁 (Slides) 結構。

## Slide 1: 主題與目標
**主題:** 會話記憶與狀態持久化 (Memory Persistence & Coordinators)
**目標:** 揭露關閉命令列後，Agent 是如何「記得」專案上下文，以及如何在背景協調並紀錄各種未完任務的日誌。
**[Ref Code]:** `src/memdir/`, `src/state/`
**[Suggested Diagram]:** SQLite 與 JSON 檔案在 OS 上的分佈結構圖

## Slide 2: 全局狀態與專案狀態
在 AI 開發中，有些偏好如 "Dark mode" 是看全域；而「專案語言是哪種？目前遇到的 Bug 是啥？」則是依照 `cwd` (Current Working Directory) 來做區別的 Local Memory。
**[Ref Code]:** `src/context.ts`
**[Suggested Diagram]:** Global Scope vs Project Scope 資料模型

## Slide 3: 記憶儲存目錄 (`memdir`)
CLI 在初始化時會在背景往 `~/.claude/` (家目錄) 生成 `.db` 檔或狀態描述文檔。即使你在兩個獨立視窗開啟它，因為都是讀寫資料庫，它們能無痛分享。
**[Ref Code]:** `src/memdir/` 以及 `src/commands/init.ts`
**[Suggested Diagram]:** 本機端儲存層 (Storage Layer) I/O 關聯

## Slide 4: 記憶提取 (`extractMemories.ts`)
並非只保留死板的全文對話！它使用了 LLM 在閒置時替對話進行重點提煉 (Distillation)。
**[Ref Code]:** `src/services/extractMemories/extractMemories.ts`
**[Suggested Diagram]:** 巨量對話 -> 摘要提煉的工作管線圖

## Slide 5: Memory 寫入 `prompts.ts` 中的生命週期
提煉後的專案結論（例如：這專案規定用 TypeScript 不要用 JS），會在下次啟動 `QueryEngine` 時附掛於 `System Prompt`，這叫做自我更新的知識體系。
**[Ref Code]:** `src/services/extractMemories/prompts.ts`
**[Suggested Diagram]:** 動態 System Prompt 拼圖 (Memory Injection)

## Slide 6: 工作任務表 (`src/tasks.ts`)
當使用者指派複雜項目（如做個登入頁面），AI 會建構一個 Checkbox 列表。這個列表就是存在資料庫的 Task Entity，以利斷電重啟後接續進行。
**[Ref Code]:** `src/tasks.ts`
**[Suggested Diagram]:** 階層式大任務切分 (WBS) 的持久化模型

## Slide 7: 背景任務協調 (`src/coordinator/`)
當 CLI 在背景派發命令 (如跑個兩小時的 E2E Test)，協調者模組會接管該 PID，確保即便主控 UI 死了，進程仍存活且 STDOUT 被存入 Log 檔。
**[Ref Code]:** `src/coordinator/` 以及 `src/cli/bg.js`
**[Suggested Diagram]:** 主程序與背後守護進程 (Supervisor) 管理圖

## Slide 8: `history.ts` 的日誌回放
這實作了向上/下按鍵可以捲出上一筆歷史輸入，或是使用 `/history` 從本機快取匯出報表的功用。這全部奠基於本地持久化資料流。
**[Ref Code]:** `src/history.ts`
**[Suggested Diagram]:** 終端機按鍵與資料庫調閱流程圖

## Slide 9: 團隊記憶共享與阻絕 (`teamMemorySync`)
未來或現在保留了企業/團隊版功能，可以監聽 `watcher.ts` 將記憶透過 API Push/Pull 同步給同事。為了防漏，實作了 `teamMemSecretGuard.ts`。
**[Ref Code]:** `src/services/teamMemorySync/`
**[Suggested Diagram]:** 機密防爆屏障 (Secret Guard) 與推送架構

## Slide 10: 初始化與歡迎流程 (`projectOnboardingState.ts`)
它用一個獨特的文件去記住「我是不是第一次來到這個專案資料夾」，決定它要不要說長篇大論的介紹詞，並主動做全專案的檔案索引。
**[Ref Code]:** `src/projectOnboardingState.ts`
**[Suggested Diagram]:** Onboarding 狀態機轉移圖 (FSM)

## Slide 11: 原則與安全性持久化
除了快取，`PolicyLimits` 也從服務器拉回並固化存在本地防竄改，這阻絕了本機用戶嘗試繞過「不能呼叫危險命令」的公司政策。
**[Ref Code]:** `src/services/settingsSync/index.ts`
**[Suggested Diagram]:** Security Policies 落地儲存架構

## Slide 12: 權威模式下的 Schema
這依賴於一套 `schemas/` 目錄，嚴密設計了每次版控升級 (migrations) 所需的結構表異動。保證了客戶從 1.0 升級 2.1 不會丟失紀錄。
**[Ref Code]:** `src/schemas/`, `src/migrations/`
**[Suggested Diagram]:** CLI 資料庫 Migration 大林圖

## Slide 13: 緩存的清除命令
`/clear` 呼叫 `caches.ts` 並不僅是丟掉陣列！底層會去對應的 FileSystem 或 SQLite 執行硬刪除，強制重啟認知循環。
**[Ref Code]:** `src/commands/clear/caches.ts`
**[Suggested Diagram]:** Cache Invalidation 破壞層面展示

## Slide 14: Session Tracking (`bg.js` 查詢)
當用 `claude ps` 時，是解析儲存在 `~/.claude/sessions` 的資料集，並能與 `killHandler` 綁定清理 OS Process ID 與對應的 Session。
**[Ref Code]:** `src/cli/bg.js`
**[Suggested Diagram]:** Session Registry 與 OS Process 映射

## Slide 15: 總結
優異的 CLI AI 與陽春 CLI 的分野，在於「長時記憶 (Long-term Memory)」。本系統完整演示了 Agent 如何不透過雲端，自己就能像人一樣有連貫性的經驗累積。
**[Ref Code]:** 包含 `src/memdir/`，`src/state/`
**[Suggested Diagram]:** 擁有外接大腦的 AI 拓樸圖
