# Claude Code 源碼解析 - 03 Command Routing System

> 本文件專為 NotebookLM 或其他 AI 閱讀工具設計，全篇分為 15 頁 (Slides) 結構。

## Slide 1: 主題與目標
**主題:** 指令解析與路由配置 (Command Routing System)
**目標:** 理解系統如何將開發者的輸入 (`claude login`, `/help`) 拆解、驗證並正確路由入核心。
**[Ref Code]:** `src/commands.ts`, `src/commands/`
**[Suggested Diagram]:** 綜合指令路由架構圖

## Slide 2: 指令的兩個維度 (Dimensions of Commands)
- **外部 CLI 參數**: 從作業系統 terminal 輸入的 (例如 `claude login`)，由 `entrypoints` 與 `commander` 套件捕獲。
- **內部斜線指令**: 在啟動 Repl (互動模式) 後，鍵入的 `/login` 或是 `/clear`。這兩套指令共享了同一個處理核心。
**[Ref Code]:** `src/commands.ts`
**[Suggested Diagram]:** 外來參數與內部斜線的收束節點圖

## Slide 3: 路由註冊器 (Command Registry)
`commands.ts` 提供了一套類似 Builder Pattern 的註冊表。每個指令必須定義名稱、描述、需要的別名 (Alias，例如 `-v, --version`) 以及背後的非同步 Handler 函數。
**[Ref Code]:** `src/commands.ts`
**[Suggested Diagram]:** Map 結構指令池註冊示意圖

## Slide 4: 指令的生命週期：驗證 (Validation)
如果打出 `/login --wrong-flag`，路由系統會優先以 `zod` 或自訂的 validation logic，將不合格的輸入阻擋在調度之前，發出紅色錯誤警告。
**[Ref Code]:** `src/commands/` 下各別腳本的 `validate` function
**[Suggested Diagram]:** 參數型別保護過濾漏斗圖

## Slide 5: 指令分析：`login.tsx`
`login` 負責打起網頁或透過遠端伺服器取得 OAuth Token。這是一套涉及終端與瀏覽器通訊的高權限操作，拿回 Token 後將寫入全域設定並即刻切換為已登入 UI。
**[Ref Code]:** `src/commands/login/login.tsx`
**[Suggested Diagram]:** OAuth 與設備登入認證跳轉流程圖

## Slide 6: 指令分析：上下文控制 (`context.tsx`)
提供如 `/project` 指令，強制將專案背景、程式碼基礎等資料硬載入目前對話循環的 Context Memory 裡。它實作了讓 Agent 能專注於特定資料夾的功能。
**[Ref Code]:** `src/commands/context/context.tsx`
**[Suggested Diagram]:** 記憶體中的 Context 堆疊推入模型

## Slide 7: 指令分析：歷史與清理 (`caches.ts`, `conversation.ts`)
提供 `/clear` 負責歸零目前的對談；`/history` 查詢已經保存過的 SQL 歷史資料庫。這能避免長時效工作使得 LLM 上下文超載 (Context overflow)。
**[Ref Code]:** `src/commands/clear/caches.ts`, `src/commands/clear/conversation.ts`
**[Suggested Diagram]:** Cache / Context 的銷毀與回收路線圖

## Slide 8: 指令分析：分支 (`branch/index.ts`)
整合 Git Branch 系統，提供 `/branch` 令其直接對接軟體的版本控制。AI 能立刻切出一個新的分支出來執行修正。
**[Ref Code]:** `src/commands/branch/index.ts`
**[Suggested Diagram]:** AI 原生 Git 命令封裝圖

## Slide 9: 工具熱重載 (`reload-plugins.ts`)
當工程師在本機開發針對 Claude Agent 的外掛技能時，可使用熱重載指令不需重啟 CLI，直接將新的 Node 模組覆寫進記憶體，是非常優秀的 DX (Developer Experience) 實作。
**[Ref Code]:** `src/commands/reload-plugins/reload-plugins.ts`
**[Suggested Diagram]:** 模組清除快取與熱加載 (HMR) 結構圖

## Slide 10: 初始化與啟動設定 (`init.ts`)
處理首次被安插在某個 repo 的開場白操作（例如幫這個目錄建立 `.claude` 歷史緩存、產生忽略清單等），提供一鍵自動化建置專案規範的手段。
**[Ref Code]:** `src/commands/init.ts`
**[Suggested Diagram]:** 專案腳手架 (Scaffolding) 與目錄建立順序圖

## Slide 11: 橋接器切換 (`bridge/bridge.tsx`)
專門為「企業雲端 Remote agent」設計。切換成本地 CLI 為從屬端，負責接管鍵盤傳送指令到遠端。
**[Ref Code]:** `src/commands/bridge/bridge.tsx`
**[Suggested Diagram]:** 本機與雲端遠程控制的 WebSocket 通路

## Slide 12: 簡要或緊湊模式 (`brief.ts`, `compact.ts`)
用於要求 Agent 給出極短的輸出（關閉長篇解釋），或是將冗長的 Token 流收縮，藉此大幅省錢與提速。
**[Ref Code]:** `src/commands/brief.ts`, `src/commands/compact/compact.ts`
**[Suggested Diagram]:** 提示詞長短轉換 (Verbose vs Compact) 路由

## Slide 13: UI 與 Handler 的分離設計
`src/commands.ts` 中的 Handler 會回傳 `Element` (Ink Component) 給主框架繪製，而非直接呼叫 `console.log()`，此設計使得在背景任務模式也能截收並寫入 Log 而不破壞版面。
**[Ref Code]:** `src/main.tsx` 對 command resolving 的接收
**[Suggested Diagram]:** 命令處理者回傳介面組件 (Component Return) 流程

## Slide 14: 從命令列參數到意圖解析 (Intent Routing)
如果輸入既不像 `claude ...` 也不帶斜線 `/` 怎麼辦？其實 `QueryEngine` 會在 LLM 分析後，發覺用戶意圖為系統指令（例如「幫我登出」），動態路由交給此層 API。
**[Ref Code]:** `src/commands.ts`
**[Suggested Diagram]:** 自然語言轉譯 API Router 管線

## Slide 15: 總結
本專案不硬寫在一個巨大 `switch-case`，而是將每項指令切分成具有自我檢查能力 (Self-containing)、視圖能力、甚至是外掛生命週期的獨立模組，為社群共建立下典範。
**[Ref Code]:** 所有涵蓋在 `src/commands/` 裡的實作
**[Suggested Diagram]:** CLI 路由集市模組全家福
