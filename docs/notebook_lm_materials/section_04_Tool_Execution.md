# Claude Code 源碼解析 - 04 Tool Execution

> 本文件專為 NotebookLM 或其他 AI 閱讀工具設計，全篇分為 15 頁 (Slides) 結構。

## Slide 1: 主題與目標
**主題:** 工具引擎與沙盒保護 (Tools System & Sandboxing)
**目標:** 深入研究 Agent 如何呼叫底層 OS API 以及如何在過程中套牢安全沙盒 (Sandboxing) 確保電腦不被誤傷。
**[Ref Code]:** `src/tools.ts`, `src/Tool.ts`
**[Suggested Diagram]:** `Tool_calling` -> 本地函數執行的橋接機制圖

## Slide 2: 什麼是 Tools？
與 Commands 不同，Command 給「人」用；而 Tools 是設計給「 Claude AI」用的「功能端點」(Endpoint)，如：開檔、寫入、搜尋、執行 Bash 等。
**[Ref Code]:** `src/Tool.ts`
**[Suggested Diagram]:** 命令與工具的受眾象限圖 (Human vs AI)

## Slide 3: 核心管理員：`src/tools.ts`
這個註冊檔向模型暴露了它目前擁有多少能力（以 JSON Schema 的形式描述 `parameters` 及 `description`）。當 API 傳回 `<tool_use>` 時，此檔案負責對接、找尋並執行對應工具。
**[Ref Code]:** `src/tools.ts`
**[Suggested Diagram]:** 工具註冊與系統 Prompt 生成關聯圖

## Slide 4: `Tool.ts` 介面約定
每項工具都必須實作嚴密的介面。包含： `name`, `execute()`, 返還 `output` 或 `error_message`。這種設計能允許日後無限插拔 (Plug-and-play) 各式工具。
**[Ref Code]:** `src/Tool.ts`
**[Suggested Diagram]:** UML `ITool` 介面繼承結構

## Slide 5: 沙盒與防爆設計 (Sandboxing)
讓 AI 從終端自動執行 Bash 命令是極度危險的（比如誤刪 `rm -rf /`）。系統擁有 `sandboxTypes.ts` 層嚴格控制能呼叫的白名單與防護邊界。
**[Ref Code]:** `src/entrypoints/sandboxTypes.ts`
**[Suggested Diagram]:** 威脅攔截防洪門 (Sandbox Barrier) 模型圖

## Slide 6: 工作目錄與範圍逃脫檢測
無論是讀檔案還是下指令，都會強制過一輪路徑檢核 (Path traversal prevention)，防止 AI 不小心跑去讀取系統的 `/etc/passwd` 或是更改家目錄的其他專案。
**[Ref Code]:** `src/Tool.ts` 內基礎的路徑正規化
**[Suggested Diagram]:** 檔案目錄安全籠 (Chroot-like concept) 圖解

## Slide 7: 非同步與串流輸出轉接
bash 工具不僅返還文字，更需要即時把輸出吐在屏幕上讓用戶安心，因此實作出把外部管線 `stdout/stderr` 再接回 REPL 畫面的 Streaming proxy。
**[Ref Code]:** `src/services/tools/toolExecution.ts` 
**[Suggested Diagram]:** 子程序 STDOUT 連接 React 控制台示意圖

## Slide 8: 人工介入確認節點 (Human-in-the-loop)
若判斷執行的工具破壞性高，系統在 `execute()` 內部會做中斷，拋出要求 `dialogLaunchers` 出現「是/否同意此編輯」，取得使用者許可 (Consent) 才敢 `fs.writeFile`。
**[Ref Code]:** `src/Tool.ts`, 授權 Hook
**[Suggested Diagram]:** 安全阻斷與放行 (Approval flow) 狀態機

## Slide 9: 工具報錯的藝術轉化
當 Bash 發生語法報錯，CLI 會負責把錯誤攔截，並友善地包裝成一段給 LLM 看的 "Error 發生，以下是原碼:..."。這使得模型不會崩潰，而是啟動自動反思並除錯 (Self-repair loop)。
**[Ref Code]:** `src/services/tools/` 下的例外捕捉
**[Suggested Diagram]:** LLM 報錯 -> 修復 反思迴圈結構圖

## Slide 10: Token 上限防護 (Truncation)
假設 `grep` 找出了十萬行，如果全部傳回給 LLM 肯定會暴出 Token 上限或被封控。工具層內建字數擷取限制 (Length-truncation logic)，只擷取重要的前 800 行與最後一行返回。
**[Ref Code]:** `src/Tool.ts`
**[Suggested Diagram]:** 輸出窗格截斷 (Truncation logic) 漏斗圖

## Slide 11: 文件編寫與原子替換
更新大檔案不是整份寫入，而是透過專門設計的工具 `multi_replace_file_content` 做塊狀 (Chunked block) 的比對覆寫。避免模型幻覺導致少抄幾行而吃掉代碼。
**[Ref Code]:** `src/tools.ts`
**[Suggested Diagram]:** 原子化內容更新 (Atomic chunk replacement) 演示

## Slide 12: 並發呼叫與限流鎖定
如果 LLM 同時傳回 5 個 `tool_use` (並行搜索 5 個檔案)，系統有並行執行池，但若是同一份檔案的競態覆寫則會加以鎖定。
**[Ref Code]:** `src/services/tools/toolExecution.ts`
**[Suggested Diagram]:** 工具並發調度池與互斥鎖 (Mutex)

## Slide 13: 指標採集與工具觀測
不涉及敏感資訊下，這層會發送「某項 Tool 被使用幾次、執行了幾毫秒」的純數值（由 `metadata` 與 `sinks` 紀錄），藉以精進工具描述 (Description)。
**[Ref Code]:** `src/services/analytics/metadata.ts`
**[Suggested Diagram]:** 工具日誌遙測上傳流

## Slide 14: 從 Tool 邁向 Skill 的界限
當多個 Tool 需要頻繁搭配特定手冊被一起應用時，系統鼓勵將之提升/包裝進入更高層級的 Skill 之中。
**[Ref Code]:** `src/skills/` 目錄
**[Suggested Diagram]:** 工具與技能的層次組合關係

## Slide 15: 總結
`src/tools.ts` 作為守護者，兼具「為 AI 提供神兵利器」與「為用戶鎖緊最後防線」的大任。是將純對話助手晉升為程式設計工程師的靈魂鎖鑰。
**[Ref Code]:** 全部 `src/Tool.ts` 的介面設定與實作
**[Suggested Diagram]:** 執行器的大總管－工具層防線圖
