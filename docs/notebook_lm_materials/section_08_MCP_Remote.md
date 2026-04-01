# Claude Code 源碼解析 - 08 MCP Remote

> 本文件專為 NotebookLM 或其他 AI 閱讀工具設計，全篇分為 15 頁 (Slides) 結構。

## Slide 1: 主題與目標
**主題:** MCP 協定整合與遠端遙控 (MCP & Remote Control)
**目標:** 理解 CLI 如何利用開源標準 Model Context Protocol (MCP) 打破工具庫的極限，走向無遠弗屆的微服務 Agent 架構。
**[Ref Code]:** `src/server/mcp.ts`, `src/services/mcp/`
**[Suggested Diagram]:** MCP 架構概念模型

## Slide 2: 什麼是 MCP？為什麼重要？
Anthropic 釋出了 MCP，讓資料持有者建立「伺服器端」，讓 LLM 作為「Client」。在這是它不只做命令，更能存取他人的資料庫 (如 Github, Slack API)。
**[Ref Code]:** `src/services/mcp/client.ts`
**[Suggested Diagram]:** Client-Host (Client 與資源宿主) 互動模型

## Slide 3: 工具與 Server 的熱插拔 (`mcp/config.ts`)
開發者不用在專案硬寫 code 來導入。本 CLI 可透過設定檔在開機時動態連線至跑在獨立 port 上的 MCP Server，獲取他們的方法列表 (Capabilities)。
**[Ref Code]:** `src/services/mcp/config.ts`
**[Suggested Diagram]:** Configuration-driven 架構圖

## Slide 4: `useManageMCPConnections.ts` (動態連線池)
這不是一對一的死板連線，它透過 React 環境裡的長駐 Hook 管理 TCP/SSE 連線池。確保多個不同來源的 Server 都活著，隨時被 Agent Call_Tool 呼叫。
**[Ref Code]:** `src/services/mcp/useManageMCPConnections.ts`
**[Suggested Diagram]:** Socket/SSE 連線池架構與生命週期

## Slide 5: Agent 反向變成 MCP Server
最顛覆的是，當下達 `--claude-in-chrome-mcp` 或 `--computer-use-mcp` 時，這套 CLI 本身倒轉變成了發布者 (Server)，向「更大尾的遠端大腦」揭露自己能操作終端。
**[Ref Code]:** `src/entrypoints/cli.tsx` (runClaudeInChromeMcpServer)
**[Suggested Diagram]:** 角色互換 (Role Inversion) - 當 Local CLI 變成受控者

## Slide 6: `runChromeNativeHost` 的巧思
CLI 向 Chrome Extension 開放了原生橋樑的支援 (Native Messaging Host API)，讓網頁裡的 Claude App 可以不裝中介層，直接跟這台機器打交道作檔案編輯。
**[Ref Code]:** `src/utils/claudeInChrome/chromeNativeHost.js` 
**[Suggested Diagram]:** 本機端二進位檔與 Browser Extension 通訊橋

## Slide 7: 支援 Remote Bridge 控制
利用 `import('../bridge/bridgeMain.js')`，本機能夠把控制台串流交給另一台「遠控」主機（可能跑在 VDI 也能支援在手機上遠控家裡電腦）。
**[Ref Code]:** `src/commands/bridge/bridge.tsx`, `src/bridge/index.ts`
**[Suggested Diagram]:** Remote Control Bridge (反向代理/中繼點) 網路圖

## Slide 8: `Computer Use` 的底層 API 集成
它將 AI 在螢幕上的 X,Y 坐標點擊轉換成對實際 OS 的 GUI 動作腳本，並利用 `mcp.ts` 中註冊的方法來宣告「我有滑鼠座標操作技能」給大模型。
**[Ref Code]:** `src/utils/computerUse/mcpServer.js` (雖然源碼未全部貼出，但結構具備此掛載)
**[Suggested Diagram]:** OS GUI 映射到 JSON-RPC 呼叫圖解

## Slide 9: Policy 檢查與權限控制
開啟 Remote 或 MCP 都有巨大資安風險，因此 `isPolicyAllowed('allow_remote_control')` 從不缺席，它在執行任一 `callTool` 前保證了安全合規。
**[Ref Code]:** `src/entrypoints/cli.tsx`
**[Suggested Diagram]:** 安全攔截與守護政策卡榫 (Interceptor Gate)

## Slide 10: 日誌與流量分析
使用 MCP 時，CLI 將每一句 JSON-RPC（遠端叫用封包）寫進了專門用於追蹤的模組 (`logging.ts`)，便於在排查「模型到底拿了啥資料」時分析流量。
**[Ref Code]:** `src/services/api/logging.ts`
**[Suggested Diagram]:** 封包擷取與除錯介面 (Debugger Overlay) 

## Slide 11: 處理 Payload 容量過載
若透過 MCP 交換一張截圖來分析錯誤，Payload 容量高達數十 MB 到百 MB，這底層使用 `bun` 或 Node 提供的 Stream Chunked 機制切割，避免記憶體爆滿 (OOM)。
**[Ref Code]:** 傳輸流相關實現 (`transport layer`)
**[Suggested Diagram]:** 大資料封包切割流與組裝器

## Slide 12: 應對傳輸中斷 (Timeout/Reconnection)
從遠端獲取資料庫 Context 時如果網路斷線，底層依靠指數型退避網路 (`withRetry.ts`)，搭配客戶端連線池進行自動重連。
**[Ref Code]:** `src/services/api/withRetry.ts` / MCP client
**[Suggested Diagram]:** Socket Resiliency 韌性恢復圖

## Slide 13: 提示樣板與上下游協議 (Prompts)
開源 MCP 中定義的 `ListPrompts` 與 `GetPrompt`，讓這隻終端代理不僅可以取得「操作工具」，連「思考邏輯跟文案」都依賴從伺服器端動態拉起。
**[Ref Code]:** `src/services/mcp/client.ts` 內對 Prompt 特性的對應
**[Suggested Diagram]:** 工具/提示/資源 (Tools/Prompts/Resources) MCP 三位一體圖

## Slide 14: 封裝的微服務 Agent 生態圈 (Ecosystem)
這宣告了未來專案不需手寫工具：只需要在 `config.json` 加入一行 GitHub 的 MCP Server，CLI 就能瞬間獲得閱讀 Issue、關閉 PR、Push 重構代碼的完全能力。
**[Ref Code]:** 泛用性 Client `mcp` 底層抽象類
**[Suggested Diagram]:** 微服務式 AI Agent 神經鏈拓展圖

## Slide 15: 總結
`mcp.ts` 是本專案皇冠上的明珠。它利用標準化架構，打破了本機終端工具的能力孤島，並提供了最高規格的安全護欄設計。
**[Ref Code]:** `src/services/mcp/` 總攬
**[Suggested Diagram]:** Anthropic Claude Code 發展藍圖與 MCP 的未來定位
