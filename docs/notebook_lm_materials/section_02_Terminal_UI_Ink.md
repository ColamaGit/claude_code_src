# Claude Code 源碼解析 - 02 Terminal UI Rendering

> 本文件專為 NotebookLM 或其他 AI 閱讀工具設計，全篇分為 15 頁 (Slides) 結構。

## Slide 1: 主題與目標
**主題:** React + Ink 終端渲染 (Terminal UI Rendering)
**目標:** 瞭解 Agent 是如何以瀏覽器的「單頁應用 (SPA)」哲學，將難纏的字串輸出轉換成互動豐富的終端介面。
**[Ref Code]:** `src/components/`, `src/ink.ts`, `src/screens/`
**[Suggested Diagram]:** React Virtual DOM -> Ink -> Terminal 渲染層級圖

## Slide 2: 為什麼選擇 React + Ink？
大語言模型產出的 Token 需要流式變化，且常夾帶對話、按鈕、打字機過場。若依靠純 Bash 字串控制游標 (ANSI Sequences)，幾乎不可能處理深層清單與焦點跳轉。Ink 將 React 的 Component 化精神帶入 CLI。
**[Ref Code]:** `src/main.tsx`
**[Suggested Diagram]:** 狀態驅動渲染 (State-Driven Rendering) 模式比較圖

## Slide 3: 基礎核心元件 (Base Components)
`src/components` 封裝了諸如 `Box`, `Text`, `Color`, `Spinner`。例如 `Spinner.tsx` 在 LLM 思考時，會在畫面下方產生旋轉動畫，有效降低用戶等待焦慮。
**[Ref Code]:** `src/components/Spinner.tsx`
**[Suggested Diagram]:** Component 階層樹範例

## Slide 4: 主題與色彩管理 (Theme Picker)
實作了自訂的色彩配置器，根據終端機的支援度（TrueColor 或普通的 16 色）自動降級。負責區分 Primary（主色）, Error（錯誤）, Dims（輔助灰字）。
**[Ref Code]:** `src/components/ThemePicker.tsx`, `src/components/design-system/ThemeProvider.tsx`
**[Suggested Diagram]:** CLI Color Palette 模型圖

## Slide 5: 文字與游標歷史區間
在交談框 `PromptInput.tsx` 中，它監聽使用者的 `Up` / `Down` 以切換歷史發言紀錄，並自行繪製假的閃爍游標，模擬 bash read 體驗。
**[Ref Code]:** `src/components/PromptInput/PromptInput.tsx`
**[Suggested Diagram]:** 輸入緩衝區 (Buffer) 與游標管理狀態圖

## Slide 6: 視窗刷新邏輯與生命週期
`ink.ts` 包裝了第三方庫的渲染方法。包含強制重新繪圖的 `clear()` 以及掛載/卸載的 hook。當使用者強制 `CTRL+C` 時，負責停止全部繪圖鉤子，讓 TTY 回歸正常字串模式。
**[Ref Code]:** `src/ink.ts`
**[Suggested Diagram]:** 應用程式掛載與卸載生命週期圖

## Slide 7: 畫面與路由管控 (Screens)
將整個使用體驗切分成不同的「畫面」。比如：WelcomeScreen -> LoginScreen -> DialogScreen -> MainReplScreen。透過全域 Hook `useScreen` 自由在邏輯流中切換顯示元件。
**[Ref Code]:** `src/screens/`
**[Suggested Diagram]:** 應用程式的路由 (Routing) 狀態機轉移圖

## Slide 8: 阻斷式對話方塊 (Dialogs)
當 Agent 發起需要核准的高危動作 (如修改重要套件)，程式會呼叫 `dialogLaunchers.tsx` 蓋掉目前的主畫面，秀出 Y/N 核准對話框。這是一種在終端做 Z-Index 遮罩的高階技巧。
**[Ref Code]:** `src/dialogLaunchers.tsx`
**[Suggested Diagram]:** CLI 遮罩與阻斷 (Blocking) 等待流

## Slide 9: 非同步載入與狀態 (Away Summary)
若遇到非常花時間的編譯命令，`useAwaySummary` 會計算並接管視窗，顯示一個精簡版進度表。讓 Agent 可以在背後花 5 分鐘讀 Repo，而不佔滿 800 行終端畫面。
**[Ref Code]:** `src/hooks/useAwaySummary.ts`
**[Suggested Diagram]:** AI 分析中：收合與展開視圖

## Slide 10: 互動輔助元件庫 (Interactive Helpers)
內建有提供多項選擇 (Multi-select) 或確認框等「類表單元件」。利用 `useFocusManager` 在不同行號之間實現 TAB 鍵導航。
**[Ref Code]:** `src/interactiveHelpers.tsx`
**[Suggested Diagram]:** 終端焦點 (Focus) 在元素間移動的關聯圖

## Slide 11: 代碼差異預覽 (Diff Rendering)
當模型改寫完程式碼，系統會在畫面顯示紅綠的 Diff。這不是 `git diff` 原生輸出，而是從 AST 重組後交給 Ink 以精美 React `<Box padding={1}>` 繪製的美化版對比區塊。
**[Ref Code]:** `src/components/` (Diff UI)
**[Suggested Diagram]:** AST 到 UI 彩色 Diff 流程

## Slide 12: 語音/特殊狀態提示 (Voice Indicator)
專案預留了 `VoiceModeNotice.tsx` 處理可能的後端語音多模態狀態提示，在終端右下方打上正在收音或文字辨識中的視覺符號。
**[Ref Code]:** `src/components/LogoV2/VoiceModeNotice.tsx`
**[Suggested Diagram]:** CLI 多模態狀態欄位置分佈圖

## Slide 13: 整合外部程序防污染機制
如果在 REPL 迴圈內透過底層跑 `npm run start`，該外部程序會往 stdout 噴字，這會撞毀 React 正在畫的 TTY Grid。因此工具會在執行期間「暫停 (Suspend)」自己的渲染引擎，等對方結束後再度接管。
**[Ref Code]:** `src/components/PromptInput/`
**[Suggested Diagram]:** CLI <-> 子程序 TTY 控制權交接流程圖

## Slide 14: 從 Vim 的鍵盤邏輯取經
加入了 Vim 操作模擬 (`src/vim/`)，讓工程師能在交談輸入框直接用 `Esc`, `j`, `k`, `i` 操控多行輸入游標。提供如同正規文字編輯器的高階體驗。
**[Ref Code]:** `src/vim/`
**[Suggested Diagram]:** 鍵盤訊號攔截與 Vim 狀態機解析圖

## Slide 15: 總結
終端不再只是吐出字串的黑箱。透過 React 元件拆解與 Ink 引擎的流暢更新，Agent 能將「思考、呼叫、等候」化作優美的視覺回饋，提升人機協作信任感。
**[Ref Code]:** `src/ink.ts`, 所有的 `src/components/`
**[Suggested Diagram]:** 優秀 AI 終端互動的三維體驗展示
