# Claude Code 源碼解析 - 10 Core Data & Operation Workflow

> 本文件專為 NotebookLM 或其他 AI 閱讀工具設計，全篇分為 15 頁 (Slides) 結構。

## Slide 1: 主題與目標
**主題:** 運作邏輯與資料流 (Logic Flow & Data Lifecycle)
**目標:** 深入剖析一個簡單命令如「說明這段代碼」如何轉化成一系列的 API 調用與工具執行。
**[Ref Code]:** `src/QueryEngine.ts`, `src/query.ts`
**[Suggested Diagram]:** 端到端資料封包演進圖 (End-to-end Data Flow)

## Slide 2: 對話引擎：QueryEngine
`QueryEngine` 是對話的起點。它封裝了單次對話 (Conversation) 的所有上下文，包括目前的 `Message` 歷史、API 配額追蹤與暫存中的分析數據。
**[Ref Code]:** `src/QueryEngine.ts:QueryEngine`
**[Suggested Diagram]:** 對話引擎物件模型結構

## Slide 3: 輸入處理與解析 (processUserInput)
用戶輸入不僅是字串，還可能包含斜線指令 (`/help`) 或檔案附件。系統會先將輸入解析為具備語境的物件，準備注入到 LLM 的提示詞中。
**[Ref Code]:** `src/utils/processUserInput/processUserInput.ts`
**[Suggested Diagram]:** 用戶輸入內容解析流程圖

## Slide 4: 運作核心：ReAct 循環
這是系統的「大腦運轉」模式：**Reasoning (推理) -> Acting (行動)**。
1. **Query**: 向 Claude 模型發送歷史與提示。
2. **Response**: 模型判斷需要使用工具。
3. **Execution**: 系統執行工具。
4. **Loop**: 重複直到生成最終回覆。
**[Ref Code]:** `src/QueryEngine.ts:submitMessage()`
**[Suggested Diagram]:** 圓形的反覆式運作核心圖

## Slide 5: 資料實體：Message 物件模型
所有的交流都封裝在 `Message` 中。包括 `type: user` (用戶)、`type: assistant` (AI)、`type: tool_result` (執行結果)。這些訊息是 API 通訊的通用貨幣。
**[Ref Code]:** `src/types/message.ts`
**[Suggested Diagram]:** 訊息陣列 (Message Store) 的累加示意圖

## Slide 6: 非同步與流式處理 (Streaming Logic)
為了讓用戶即時看到 AI 的思考過程，系統大量使用 **Async Generators**。這使得資料可以從「API 封包接收」到「UI 渲染」以 Token 為單位逐步流出。
**[Ref Code]:** `src/query.ts:query()`
**[Suggested Diagram]:** Token 流入與 UI 組件更新的同步圖

## Slide 7: 工具提案與參數校驗 (Tool Call Lifecycle)
當 LLM 回傳 `tool_use` 區塊時，系統會調用 `wrappedCanUseTool`。它不僅校驗參數型別，還會即時檢查該工具是否符合目前的「唯讀模式」或「沙盒限制」。
**[Ref Code]:** `src/QueryEngine.ts:wrappedCanUseTool`
**[Suggested Diagram]:** 工具調用請求的安全性檢查漏斗

## Slide 8: 人機決策門擋 (Permission Gates)
這是資料流中的「紅綠燈」。如果模型想執行 `rm -rf`，系統會切換狀態為 `AWAITING_PERMISSION`，停止流轉。只有用戶物理性地按下「許可」，執行流才會繼續。
**[Ref Code]:** `src/utils/permissions/permissionSetup.ts`
**[Suggested Diagram]:** 權限確認視窗 (Modal) 與流程阻斷機制

## Slide 9: 工具執行與結果封裝 (Execution & Packaging)
一旦獲准，具體的 Tool Class（如 `FileEditTool`）會執行 IO。執行完後的 STDOUT 或錯誤訊息，會被重新封裝成 `tool_result` 並推回訊息隊列。
**[Ref Code]:** `src/Tool.ts`, `src/tools/`
**[Suggested Diagram]:** 工具結果轉換為 Prompt 數據的過程

## Slide 10: 對話狀態機 (Conversion State Machine)
對話過程中，系統在 `IDLE` -> `THINKING` -> `BUSY` -> `PERMISSION` 指向性狀態中擺盪。框架保證用戶無法在 AI 忙碌時注入混亂的輸入。
**[Ref Code]:** `src/state/AppStateStore.ts`
**[Suggested Diagram]:** 代表不同運作階段的看板狀態圖

## Slide 11: 提示詞組件化 (Prompt Assembly)
在向 API 發起請求的前一刻，系統會執行 `fetchSystemPromptParts`。它動態注入當前目錄的檔案列表、Git Diff、以及用戶設定的個人化指令 (Custom Instructs)。
**[Ref Code]:** `src/utils/queryContext.ts`
**[Suggested Diagram]:** 提示詞「三明治」式拼裝圖 (Context + System + User)

## Slide 12: 上下文窗口與 Token 管理
為了節省 Token 並保持長對話能力，系統會執行 `TokenBudget` 計算。如果對話過長，系統會自動總結舊有歷史或建議用戶清理 (Compact) 緩存。
**[Ref Code]:** `src/QueryEngine.ts:currentMessageUsage`
**[Suggested Diagram]:** Token 堆疊與視窗滑動示意圖

## Slide 13: 任務管理與 Speculation
對於大型任務（如「修復專案中所有的 Lint 錯誤」），系統會切換到 `TASK_MODE`。這會啟動一套帶有子目標追蹤的複雜 Logic Flow，確保每一步都有跡可循。
**[Ref Code]:** `src/Task.ts`, `src/state/AppStateStore.ts:IDLE_SPECULATION_STATE`
**[Suggested Diagram]:** 主任務下的子任務分發流程圖

## Slide 14: 記憶體與外部持久化管道
資料流不僅流向 UI，還會同步推入 `recordTranscript` 管道，非同步地寫入本地 SQLite。這確保了在任務中途崩潰時，重啟 CLI 能「恢復對話」。
**[Ref Code]:** `src/utils/sessionStorage.ts:recordTranscript`
**[Suggested Diagram]:** 資料流的雙重寫入 (UI & Persistence)

## Slide 15: 總結
Claude Code 的資料流展示了高度的 **確定性 (Deterministic)**。每一回合都是一個嚴謹的 Request-Response 閉環，將 AI 的模糊推理與本地 Shell 的精確執行完美耦合在一起。
**[Ref Code]:** 核心驅動總結
**[Suggested Diagram]:** 核心運作資料周轉全視圖
