# Claude Code 源碼解析 - 05 AI 技能與意圖解析

> 本文件專為 NotebookLM 或其他 AI 閱讀工具設計，全篇分為 15 頁 (Slides) 結構。

## Slide 1: 主題與目標
**主題:** AI 技能與自然意圖識別 (AI Skills & Intents)
**目標:** 理解系統如何擴展 AI 的腦袋：從硬程式碼工具 (Tool) 升級為依賴知識與腳本的動態技能 (Skill)。
**[Ref Code]:** `src/skills/`, `src/plugins/`
**[Suggested Diagram]:** Tool 與 Skill 關係之知識漏斗

## Slide 2: 突破單一 Prompt 上限的設計
LLM 很聰明，但如果一開始就把「怎麼寫 Rust、怎麼修 Node、怎麼跑 Docker」全部擠進 System Prompt，除了太貴以外，還有上下文迷失危機。
**[Ref Code]:** `src/skills/Skill.ts`
**[Suggested Diagram]:** 通用模型與專案專用詞庫區塊圖

## Slide 3: 什麼是 Skill？
Skill 本質上是一些夾帶了「操作準則、特定工具列 (Tool bucket) 以及情境前提」的微型設定檔。
它只有在它宣稱能解決的場景被觸發。
**[Ref Code]:** 譬如 `src/skills/bundled/` 下預設的重構技能
**[Suggested Diagram]:** 技能檔案之 JSON 結構大綱圖 

## Slide 4: 觸發與發現機制 (Skill Discovery)
AI 的基礎指令只有一把鑰匙：`load_skill("name")`。Agent 會根據對話題意判斷需要，主動從本地的技能倉庫加載特定的知識庫後「再次思考」。
**[Ref Code]:** `src/commands.ts` 與 `src/skills/registry.ts`
**[Suggested Diagram]:** 請求-回應-載入 的兩階段技能掛載圖

## Slide 5: `src/skills/` 的動態目錄
專案把原生的技能都打包在 `src/skills/bundled/`，可能包含：修改檔案的進階策略、如何應對龐大 Log 等專業知識守則（Rules of thumb）。
**[Ref Code]:** `src/skills/bundled/index.ts`
**[Suggested Diagram]:** Bundled 技能包架構圖

## Slide 6: `src/plugins/` 與自定義擴充
如果企業內部開發了自己的 SDK API，想讓 Claude 知道怎麼調用，他們可以寫成 Plugin，並透過熱重載指令 `/reload` 在不用關閉 CLI 下套用新知識。
**[Ref Code]:** `src/commands/reload-plugins/reload-plugins.ts`
**[Suggested Diagram]:** 公司私有外掛掛載拓樸圖

## Slide 7: 使用者意圖分析 (Intent Identification)
這個 CLI 甚至不需斜線：你打中文「重整這段函式為單例模式」，引擎會在底下偷塞 `Intent` 判讀節點。
**[Ref Code]:** `src/services/`
**[Suggested Diagram]:** Natural Language to Command Vector 模型

## Slide 8: 本地與遠端技能庫
未來可支援向類似 npm 的倉庫獲取 `agent-skills`。當遇到特殊副檔名 (`.zig`) 它可能會自動載入 "Zig Lang Compiler Debugging Skill"。
**[Ref Code]:** 未來的 MCP 端點設計
**[Suggested Diagram]:** Agent Skill Store 網路示意

## Slide 9: Skill 內的工具限制 (Sandboxing)
為了怕某些 Skill 帶著未知的外部依賴工具亂搞系統，AI 如果正在執行特定的 Skill 時，可能只能讀寫特定副檔名的資料（例如只改 `.js`）。這層約束位於沙盒。
**[Ref Code]:** `src/entrypoints/sandboxTypes.ts`
**[Suggested Diagram]:** RBAC (Role-Based Access Control) 與技能關係圖

## Slide 10: 互動式技能問答
某些複雜的 Skill 在被呼叫時會被要求提供多個「必須的 Argument」，系統如果發現 AI 少寫了，會阻斷執行並拋回錯誤字串逼 AI 補齊。
**[Ref Code]:** `src/Tool.ts` 參數驗證機制
**[Suggested Diagram]:** 多輪會話逼近 (Multi-turn parameter extraction)

## Slide 11: 代碼注入與熱修復 (Hot Fix)
Skill 也可以像一段即插即用的程式，它除了附帶 Prompt，也可附帶某些專有的 Bash 腳本 (`check-syntax.sh`)。
**[Ref Code]:** `src/tools/` 支援跑腳本的 Tool
**[Suggested Diagram]:** 知識 Prompt 結合命令列腳本執行的沙漏

## Slide 12: 開發者反饋 (Feedback Loop)
當系統將技能套用且修復了問題，會有一組機制向 Telemetry Server (Sinks) 報告「技能有效」，用來協助官方模型強化學習 (`RLHF`)。
**[Ref Code]:** `src/utils/sinks.js`
**[Suggested Diagram]:** 技能成效回饋閉環圖

## Slide 13: 狀態機轉移 (Skill as a State)
切換過 Skill，其實是切換了 QueryEngine 的 System Prompt 前綴。
**[Ref Code]:** `src/QueryEngine.ts`, `src/constants/prompts.ts`
**[Suggested Diagram]:** 系統 Prompt 持續堆疊的方塊區間圖

## Slide 14: 對抗「工具幻覺」
有時候 LLM 會假造一個自己根本沒有被註冊過的 Tool 或 Skill，系統會非常明確地回傳 `<error>The tool "fix_bug" does not exist.</error>`。此設計降低幻覺。
**[Ref Code]:** `src/tools.ts`
**[Suggested Diagram]:** 執行引擎攔截器 (Interceptor)

## Slide 15: 總結
相對於寫死 `if-else`，Agent 利用 Skill 作為「提示詞的模組化單元 (Modular Prompts)」，這使得程式碼無比清爽，Agent 也變成了真正的學習型助手。
**[Ref Code]:** `src/skills/` 模組庫
**[Suggested Diagram]:** Agentic Software 腦神經網路架構圖
