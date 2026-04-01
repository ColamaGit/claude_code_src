# Claude Code 源碼解析 - 06 Query Engine

> 本文件專為 NotebookLM 或其他 AI 閱讀工具設計，全篇分為 15 頁 (Slides) 結構。

## Slide 1: 主題與目標
**主題:** 查詢引擎與連續推理 (Query Engine & Interleaved Thinking)
**目標:** 解析 Claude Code 的大腦引擎：它如何接管使用者訊息、呼叫 `claude-3-5-sonnet`，並組織長文本工具對話迴圈。
**[Ref Code]:** `src/QueryEngine.ts`, `src/query.ts`
**[Suggested Diagram]:** 大腦推理迴圈引擎概念圖

## Slide 2: QueryEngine 核心職責
這是一個具備持久化記憶體與重試機制的事件發射器。使用者輸入的 Prompt 送入後，它會自動發起 Request，並把回傳的 `<thinking>` 與 `<tool_use>` 分拆發射出來給 UI 更新。
**[Ref Code]:** `src/QueryEngine.ts`
**[Suggested Diagram]:** RxJS/事件流 分發器模型 

## Slide 3: 連續思考模型 (Interleaved Thinking)
現代 Claude 模型支援輸出一小段 `<thinking>` 後緊接著給出字串或呼叫工具，這是所謂交錯思考。引擎必須用正則或特定 XML Parser 將未閉合的標籤穩健地切分並送到畫面的 Spinner 上。
**[Ref Code]:** `src/components/Spinner.tsx`, `src/query/`
**[Suggested Diagram]:** XML 流式遞迴解析 (Streaming Tokenizer)

## Slide 4: 構建 System Prompt (`src/constants/prompts.ts`)
每次調用前，系統會依照當下所在的資料夾、Git 狀態以及作業系統型號，即時編譯出一套龐大的 System Context 給 LLM（包含不准猜測套件名稱、必須使用繁體中文等）。
**[Ref Code]:** `src/constants/prompts.ts`, `getSystemPrompt()`
**[Suggested Diagram]:** Context 組裝流水線 (Pipeline)

## Slide 5: `stopHooks.ts` 阻斷點
有時候 LLM 講到一半，或者工具卡死，或是安全審查拒絕繼續（拒絕 `rm -rf`）。這個鉤子會在底層 API 通訊裡直接從 `axios/fetch` 流上切斷 WebSocket 或 HTTP 請求，節省成本。
**[Ref Code]:** `src/query/stopHooks.ts`
**[Suggested Diagram]:** API 放棄 (Abort Controller) 綁定圖

## Slide 6: `withRetry.ts` 與被動限流
呼叫 LLM 難免遇到 `429 Too Many Requests`。這裡封裝了優雅的指數退避 (Exponential Back-off)，保證長達五分鐘的修改代碼任務不會因為暫時斷網而全盤皆輸。
**[Ref Code]:** `src/services/api/withRetry.ts`
**[Suggested Diagram]:** 伺服器限流與重試重連階梯

## Slide 7: Token 與成本追蹤器 (`cost-tracker.ts`)
每次 LLM 結束一個對答段落（Turn），會把 HTTP Headers 中的 Usage JSON 送給 `costHook`，這也是為何用戶畫面上能準確看到 `$0.005`。
**[Ref Code]:** `src/cost-tracker.ts`, `src/costHook.ts`
**[Suggested Diagram]:** 雙向 Token 成本彙總流向表

## Slide 8: 無窮迴圈遞迴 (Tool loops)
LLM 呼叫了 grep -> grep 把字串拋回模型 -> 模型因為發現關鍵字，立刻再呼叫 read_file -> 回傳給模型。這就是 QueryEngine 最強的無人介入多輪交互 (Zero-shot iteration)。
**[Ref Code]:** `src/query.ts`
**[Suggested Diagram]:** 自循環多輪對談 (Multi-turn Auto API) 圓環圖

## Slide 9: 終端強制打斷支持 (`CTRL+C`)
引擎支援接收 `SIGINT` (來自 `ink.ts`)，一旦用戶認為 AI 走錯方向按下 `CTRL+C`，引擎會將這則中斷訊息化作系統 Prompt 送回給 API：「The user interrupted you, stop and listen」。
**[Ref Code]:** `src/ink.ts`, `src/QueryEngine.ts`
**[Suggested Diagram]:** 終端中斷信號 (Signal Interception) 轉換圖

## Slide 10: 壓實 (Compact / AutoCompact) 策略
當對話太長，快超越 Token 極限，`src/services/compact/autoCompact.ts` 會暫停互動，拿當前日誌請求另一個小模型去產生一句話摘要，替換掉舊的巨大記憶。
**[Ref Code]:** `src/services/compact/` 目錄
**[Suggested Diagram]:** 對話歷史收斂與記憶壓縮機制

## Slide 11: 幻覺控制：Micro-Compact
針對極度破碎無用的執行日誌（例如一次又一次下錯 bash 指令的錯誤輸出），使用 `microCompact` 加以拋棄，確保主線邏輯依然高信噪比。
**[Ref Code]:** `src/services/compact/microCompact.ts`
**[Suggested Diagram]:** 垃圾回收 (Garbage Collection) 原理套用於 Prompt

## Slide 12: 並行多工具調用 (Parallel Tool Calling)
引擎支援最新的 Claude 3.5 Sonnet 所具備的平行呼叫特性，能夠在一個回合中同時派發非同步搜尋指令給 Node 端。
**[Ref Code]:** `src/QueryEngine.ts`, `src/services/tools/toolExecution.ts`
**[Suggested Diagram]:** 非阻塞 I/O 並發調度圖

## Slide 13: 模型 API 與認證切換
透過 `src/services/api/claude.ts`，這套引擎可以接不同的上游（Upstream），甚至能對應企業內部的代理 (Enterprise Proxy Endpoint)。
**[Ref Code]:** `src/services/api/claude.ts`
**[Suggested Diagram]:** 企業 API Proxy 與憑證注入

## Slide 14: 從 Query 回歸到 Screen
引擎與 Ink UI 完全沒有直接耦合！它回傳的是封裝好的非同步資料結構或 Promise，這保證了系統可以抽掉 UI 直接以 Headless 背景運行。
**[Ref Code]:** `src/main.tsx` 與 `QueryEngine` 的綁定點
**[Suggested Diagram]:** Model-View-Controller (在 Agent 級別的實施)

## Slide 15: 總結
`QueryEngine.ts` 就是「大腦代理管理者」，它以容錯、壓縮、反思三大支柱建立起了目前 CLI 業界一流的高可靠度生成式 AI 循環。
**[Ref Code]:** `src/QueryEngine.ts` 全攬
**[Suggested Diagram]:** 軟體代理引擎核心架構圖
