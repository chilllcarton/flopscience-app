import React, { useState } from 'react';
import { Copy, RefreshCw, CircleCheck, CircleAlert, Pencil, User, Sparkles, Download, LayoutTemplate, Video, Lightbulb, Cpu, FileText } from 'lucide-react';

const scheduleData = [
  { id: 1, time: "09:00", topic: "晨間心態 / 金句", prompt: "你是一個擁有10年經驗的德州撲克玩家，帳號是 @FlopScience。請寫一句約20-40字的極短Threads貼文。主題：德州撲克風險管理與人生哲學的結合。要求：金句形式，結尾帶1個emoji，文末加上『—— @FlopScience』。" },
  { id: 2, time: "12:00", topic: "手牌互動解析", prompt: "你是一個擁有10年經驗的德州撲克玩家，帳號是 @FlopScience。請寫一篇約150字的Threads貼文。主題：模擬一個手持AA在Flop面臨多個對手Overcall的危險局面。要求：給出具體的盲注、位置。結尾問『這時候你會怎麼做？留言告訴我。 —— @FlopScience』。" },
  { id: 3, time: "15:00", topic: "AI 數據冷知識", prompt: "你是一個擁有10年經驗的德州撲克玩家，帳號是 @FlopScience。請寫一篇約150字的Threads貼文。主題：分享一個德州撲克機率的冷知識。要求：輕鬆易懂，建立專業權威感。文末加上『想知道更多撲克冷知識？追蹤 @FlopScience』" },
  { id: 4, time: "18:00", topic: "反直覺觀點", prompt: "你是一個擁有10年經驗的德州撲克玩家，帳號是 @FlopScience。請寫一篇約200字的Threads貼文。主題：為什麼『輸錢反而說明你這把打對了』。要求：用EV和長期勝率角度解釋，犀利顛覆認知。文末帶上 #FlopScience" },
  { id: 5, time: "21:00", topic: "晚間牌局故事", prompt: "你是一個擁有10年經驗的德州撲克玩家，帳號是 @FlopScience。請寫一篇約250字的Threads貼文。主題：用第一人稱敘述線下局遇到瘋魚的心理戰。要求：像說故事一樣有張力。結尾加上『這是今天的牌局故事，晚安。 —— @FlopScience』" }
];

const toneOptions = [
  { value: "專業、冷靜、客觀，帶有邏輯分析", label: "🤵 專業冷靜 (預設)" },
  { value: "極度犀利、具攻擊性、直接點出新手錯誤、帶有挑釁意味", label: "🤬 犀利引戰" },
  { value: "充滿學術名詞、GTO、EV期望值、機率計算的口吻", label: "🎓 學術機率" },
  { value: "地道香港人語氣，大量使用廣東話口語、香港俗語，語氣直接貼地", label: "🇭🇰 港式貼地 (廣東話)" }
];

const TABS = [
  { id: 'schedule', label: '📅 每日排程貼文' },
  { id: 'custom', label: '💡 自由創作 (IG/Threads)' },
  { id: 'wordpress', label: '📝 WP 文章 & SEO' },
  { id: 'youtube', label: '▶️ YouTube 腳本' }
];

const App = () => {
  const [activeTab, setActiveTab] = useState('schedule');
  const [activeScheduleId, setActiveScheduleId] = useState(1);

  const [inputs, setInputs] = useState({
    custom: '', yt_topic: '', wp_topic: '',
    yt_length: '3-5分鐘 (中等長度，知識科普)',
  });
  
  const [tones, setTones] = useState({});
  const [results, setResults] = useState({});
  const [selectedTextEngine, setSelectedTextEngine] = useState('gemini'); 
  
  const [loading, setLoading] = useState({});
  const [ideaLoading, setIdeaLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState({});
  const [copied, setCopied] = useState({});
  
  // 記錄生成歷史 (用來防重複 + 匯出 CSV)
  const [history, setHistory] = useState([]);
  const [exportMessage, setExportMessage] = useState(null);

  const getCurrentKey = () => activeTab === 'schedule' ? `schedule_${activeScheduleId}` : activeTab;
  const currentKey = getCurrentKey();

  const handleInputChange = (field, value) => setInputs(prev => ({ ...prev, [field]: value }));
  const handleToneChange = (value) => setTones(prev => ({ ...prev, [currentKey]: value }));

  const getSystemInstruction = () => {
    const tone = tones[currentKey] || toneOptions[0].value;
    return `你是一個擁有10年經驗的德州撲克職業玩家與媒體營運專家，帳號名稱是 @FlopScience。你的發文語氣必須是：「${tone}」。請確保用繁體中文輸出。`;
  };

  // 生成「防重複」上下文指令
  const getDeduplicationContext = () => {
    if (history.length === 0) return "";
    // 抽取最近 5 篇生成的結果作為對比
    const recentOutputs = history.slice(-5).map((h, i) => `舊文${i+1}摘要：${h.result.substring(0, 100)}...`).join('\n');
    return `\n\n【⚠️ 極度重要：防重複機制 ⚠️】\n請先檢查以下我們最近已生成的貼文/文章摘要：\n${recentOutputs}\n\n👉 這次產出的全新內容，其「主題切入點」、「故事背景」及「核心用詞」絕對不可以與上述舊文重複！請給我一個完全不同的新角度！`;
  };

  const fetchAIContent = async (prompt, systemInstruction = "") => {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engine: selectedTextEngine,
        prompt,
        systemInstruction,
        isJson: false
      })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "後端應答失敗");
    return data.text;
  };

  const generateIdea = async (field) => {
    setIdeaLoading(prev => ({ ...prev, [field]: true }));
    let promptText = "";
    if (field === 'wp_topic') promptText = "幫我想一個適合寫成長篇 SEO 文章的德州撲克主題（例如：資金管理、GTO新手指南、澳門打牌攻略）。只輸出『一句話標題』。";
    else if (field === 'custom') promptText = "請給我一個適合在 Threads 或 IG 引起德州撲克玩家激烈討論的爭議性話題或進階心法。只輸出『一句話』，不要引號。";

    try {
      const text = await fetchAIContent(promptText, "你是一個德撲社群專家。");
      if (text) handleInputChange(field, text.trim().replace(/["']/g, ''));
    } catch (err) {
      alert(err.message);
    }
    setIdeaLoading(prev => ({ ...prev, [field]: false }));
  };

  const generateText = async (platform) => {
    const key = currentKey;
    const tone = tones[key] || toneOptions[0].value;
    let prompt = "";
    let currentInputData = "";

    setLoading(prev => ({ ...prev, [key]: platform || 'default' }));
    setErrors(prev => ({ ...prev, [key]: null }));
    setEditing(prev => ({ ...prev, [key]: false }));

    // 防重複機制 Context
    const deduplicationInstruction = getDeduplicationContext();

    if (activeTab === 'schedule') {
      const schedule = scheduleData.find(s => s.id === activeScheduleId);
      currentInputData = schedule.topic;
      // IG 限定 5 個 Hashtag
      prompt = platform === 'ig' ? `${schedule.prompt}\n\n【擴寫為 Instagram 長文文案。包含豐富細節、良好排版、Emoji，以及嚴格限制剛好 5 個 IG 撲克熱門 Hashtags。】` : schedule.prompt;
    } else if (activeTab === 'custom') {
      if (!inputs.custom.trim()) return setErrors(prev => ({ ...prev, [key]: "請輸入主題" })), setLoading(prev => ({ ...prev, [key]: false }));
      currentInputData = inputs.custom;
      // IG 限定 5 個 Hashtag
      prompt = platform === 'ig' ? `針對主題「${inputs.custom}」寫一篇IG長文。包含良好排版，以及嚴格限制剛好 5 個 IG 撲克熱門 Hashtags。` : `針對主題「${inputs.custom}」寫一篇 Threads 短文，文末加上 —— @FlopScience`;
    } else if (activeTab === 'wordpress') {
      if (!inputs.wp_topic.trim()) return setErrors(prev => ({ ...prev, [key]: "請輸入 WordPress 文章主題" })), setLoading(prev => ({ ...prev, [key]: false }));
      currentInputData = inputs.wp_topic;
      prompt = `請撰寫一篇高質量的 WordPress 德州撲克長篇文章。
主題：「${inputs.wp_topic}」

請嚴格按照以下格式與順序輸出：

【Rank Math SEO 設定】
焦點關鍵字 (Focus Keyword)：(請提供1個高搜尋量關鍵字)
SEO 標題 (SEO Title)：(吸引人點擊，60字元內)
Meta 描述 (Meta Description)：(包含焦點關鍵字，160字元內)

【WordPress 文章內容】
(以下請提供完整文章標題與內容正文。請使用適合 WordPress 的 Markdown 標題排版，如 H2/H3 標籤、列點等。內容必須具備深度及乾貨，語氣為：「${tone}」)`;
    } else if (activeTab === 'youtube') {
      if (!inputs.yt_topic.trim()) return setErrors(prev => ({ ...prev, [key]: "請輸入影片主題" })), setLoading(prev => ({ ...prev, [key]: false }));
      currentInputData = inputs.yt_topic;
      prompt = `以「${inputs.yt_topic}」為主題寫一份 YouTube 影片腳本。長度：「${inputs.yt_length}」。包含 3 個吸睛標題、時間軸與畫面分鏡、逐字稿旁白。\n語氣：「${tone}」。`;
    }

    // 將防撞橋指令加入最終 Prompt
    const finalPrompt = prompt + deduplicationInstruction;

    try {
      const text = await fetchAIContent(finalPrompt, getSystemInstruction());
      if (text) {
        const finalText = text.trim();
        setResults(prev => ({ ...prev, [key]: finalText }));
        
        // 寫入歷史紀錄
        setHistory(prev => [...prev, {
          date: new Date().toLocaleString('zh-TW', { hour12: false }),
          engine: selectedTextEngine === 'gemini' ? 'Gemini 2.5' : 'ChatGPT',
          category: TABS.find(t => t.id === activeTab).label,
          platform: platform || activeTab,
          inputData: currentInputData,
          result: finalText
        }]);
      }
    } catch (err) {
      setErrors(prev => ({ ...prev, [key]: err.message }));
    }
    setLoading(prev => ({ ...prev, [key]: false }));
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    if (key) {
      setCopied(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
    }
  };

  const exportToCSV = () => {
    if (history.length === 0) {
      setExportMessage("⚠️ 請先生成內容再匯出！");
      setTimeout(() => setExportMessage(null), 3000);
      return;
    }
    let csvContent = '\uFEFF日期,使用引擎,文章分類,目標平台,輸入主題/資料,防重複檢查,生成內容\n';
    const escapeCSV = (str) => str ? `"${str.toString().replace(/"/g, '""')}"` : '""';

    history.forEach(item => {
      // 在 CSV 中標記是否有經過防重複檢查 (第二篇開始都有)
      const dedupeStatus = history.length > 1 ? "已執行防重複檢查" : "首篇無歷史";
      csvContent += `${escapeCSV(item.date)},${escapeCSV(item.engine)},${escapeCSV(item.category)},${escapeCSV(item.platform)},${escapeCSV(item.inputData)},${escapeCSV(dedupeStatus)},${escapeCSV(item.result)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `FlopScience_Posts_${new Date().toLocaleDateString().replace(/\//g, '')}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex flex-col md:flex-row items-center justify-between bg-gradient-to-r from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-950 border-2 border-emerald-500 flex items-center justify-center overflow-hidden shrink-0">
               <User className="w-8 h-8 text-slate-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-300 text-xs font-bold rounded border border-emerald-700/50">
                  @FlopScience 專屬
                </span>
                <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-300 text-xs font-bold rounded border border-indigo-700/50 flex items-center gap-1">
                  <CircleCheck size={12}/> 防重覆系統啟動中
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight"><span className="text-emerald-400">德州撲克 </span>貼文生成引擎</h1>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <button onClick={exportToCSV} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg active:scale-95 transition-all">
              <Download size={16} /> 匯出所有紀錄 (CSV)
            </button>
            {exportMessage && <span className="text-xs text-red-400 mt-2">{exportMessage}</span>}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">

          <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-950 custom-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 min-w-[150px] flex-1 py-4 px-2 text-sm font-bold transition-all border-b-2 flex justify-center items-center gap-2 ${activeTab === tab.id ? 'border-emerald-500 text-emerald-400 bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 flex flex-col md:flex-row gap-6">

            <div className="md:w-5/12 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-slate-300 font-bold text-lg mb-2">
                <LayoutTemplate className="w-5 h-5 text-emerald-500" />
                設定輸入參數
              </div>

              {activeTab === 'schedule' && (
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {scheduleData.map(s => (
                    <button key={s.id} onClick={() => setActiveScheduleId(s.id)} className={`py-2 rounded-lg text-xs font-bold border transition-colors ${activeScheduleId === s.id ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>
                      {s.time}
                    </button>
                  ))}
                  <div className="col-span-5 text-sm text-emerald-200/70 mt-2 bg-emerald-950/30 p-3 rounded-lg border border-emerald-900/50">
                    目前選擇：{scheduleData.find(s=>s.id === activeScheduleId)?.topic}
                  </div>
                </div>
              )}

              {activeTab === 'custom' && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs text-slate-400 font-bold">撰寫主題</span>
                    <button onClick={() => generateIdea('custom')} disabled={ideaLoading['custom']} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                      {ideaLoading['custom'] ? <RefreshCw size={12} className="animate-spin" /> : <Lightbulb size={12} />} AI 幫我想話題
                    </button>
                  </div>
                  <textarea className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl min-h-[120px] resize-y text-sm focus:border-emerald-500 outline-none placeholder-slate-600" placeholder="輸入你想討論的撲克話題..." value={inputs.custom} onChange={(e) => handleInputChange('custom', e.target.value)} />
                </div>
              )}

              {activeTab === 'wordpress' && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs text-slate-400 font-bold flex items-center gap-1"><FileText size={14}/> WordPress 文章主題</span>
                    <button onClick={() => generateIdea('wp_topic')} disabled={ideaLoading['wp_topic']} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                      {ideaLoading['wp_topic'] ? <RefreshCw size={12} className="animate-spin" /> : <Lightbulb size={12} />} 產出 SEO 主題
                    </button>
                  </div>
                  <textarea className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl min-h-[120px] resize-y text-sm focus:border-emerald-500 outline-none placeholder-slate-600" placeholder="輸入文章核心主題，AI 將自動生成 Rank Math SEO 設定 (標題、描述、焦點關鍵字) 及長篇文章..." value={inputs.wp_topic} onChange={(e) => handleInputChange('wp_topic', e.target.value)} />
                </div>
              )}

              {activeTab === 'youtube' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-400 font-bold">YouTube 影片主題</span>
                    </div>
                    <textarea className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl min-h-[100px] text-sm focus:border-emerald-500 outline-none" value={inputs.yt_topic} onChange={(e) => handleInputChange('yt_topic', e.target.value)} />
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <label className="block text-xs text-slate-400 font-bold mb-2">⏱️ 影片長度預估</label>
                    <select className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-sm py-2 px-2 outline-none focus:border-emerald-500" value={inputs.yt_length} onChange={(e) => handleInputChange('yt_length', e.target.value)}>
                      <option value="60秒以內 (YouTube Shorts 節奏極快)">60秒以內 (Shorts 短影音)</option>
                      <option value="3-5分鐘 (中等長度，知識科普)">3-5分鐘 (日常科普)</option>
                      <option value="10分鐘以上 (深度解析長片)">10分鐘以上 (深度解析長片)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 mt-2">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <label className="block text-xs font-bold mb-2 uppercase text-emerald-400 flex items-center gap-1"><Cpu size={14}/> 選擇主要文案生成引擎</label>
                  <select className="w-full bg-slate-900 border border-slate-700 text-slate-200 font-bold rounded-lg text-sm py-2 px-2 outline-none focus:border-emerald-500" value={selectedTextEngine} onChange={(e) => setSelectedTextEngine(e.target.value)}>
                    <option value="gemini">🔵 Google Gemini (預設 2.5-flash)</option>
                    <option value="chatgpt">🟢 OpenAI ChatGPT (gpt-4o-mini)</option>
                  </select>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs text-slate-500 font-bold mb-2 uppercase">選擇語氣風格 (Tone)</label>
                  <select className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-sm py-2 px-2 outline-none focus:border-emerald-500" value={tones[currentKey] || toneOptions[0].value} onChange={(e) => handleToneChange(e.target.value)}>
                    {toneOptions.map(o => <option key={o.label} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-auto pt-4">
                {['schedule', 'custom'].includes(activeTab) ? (
                  <>
                    <button onClick={() => generateText('threads')} disabled={loading[currentKey]} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all">
                      {loading[currentKey] === 'threads' ? <RefreshCw className="animate-spin" size={18}/> : <Sparkles size={18}/>} 生成 Threads 短文
                    </button>
                    <button onClick={() => generateText('ig')} disabled={loading[currentKey]} className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all">
                      {loading[currentKey] === 'ig' ? <RefreshCw className="animate-spin" size={18}/> : <span>IG</span>} 擴充 IG 長文 (嚴格 5 個 Hashtag)
                    </button>
                  </>
                ) : (
                  <button onClick={() => generateText('default')} disabled={loading[currentKey]} className={`w-full py-3 ${activeTab === 'youtube' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all`}>
                    {loading[currentKey] ? <RefreshCw className="animate-spin" size={18}/> : (activeTab === 'youtube' ? <span>▶</span> : <FileText size={18}/>)}
                    {activeTab === 'wordpress' ? '生成 WP 文章與 SEO 設定' : '生成 YouTube 腳本'}
                  </button>
                )}
              </div>
            </div>

            <div className="hidden md:block w-px bg-slate-800"></div>

            <div className="md:w-7/12 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-300 font-bold text-lg">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  生成結果預覽
                </div>
              </div>

              <div className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-5 relative flex flex-col min-h-[300px]">
                {loading[currentKey] ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 rounded-xl backdrop-blur-sm">
                    <RefreshCw className="animate-spin w-8 h-8 mb-3 text-emerald-400" />
                    <span className="text-sm text-emerald-400 font-bold mb-1">正在查閱歷史記錄防撞橋...</span>
                    <span className="text-xs text-slate-400 animate-pulse">AI 正在為你構思全新內容</span>
                  </div>
                ) : errors[currentKey] ? (
                  <div className="m-auto flex items-center text-red-400 gap-2 bg-red-950/20 px-4 py-3 rounded-lg border border-red-900/50"><CircleAlert size={20}/>{errors[currentKey]}</div>
                ) : results[currentKey] ? (
                  <>
                    {editing[currentKey] ? (
                      <textarea className="flex-1 w-full bg-slate-900 text-slate-200 p-4 rounded-lg border border-emerald-500 outline-none resize-y text-sm md:text-base leading-relaxed min-h-[400px] max-h-[600px] overflow-y-auto" value={results[currentKey]} onChange={(e) => setResults(prev => ({...prev, [currentKey]: e.target.value}))} />
                    ) : (
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex-1 text-slate-200 whitespace-pre-wrap text-sm md:text-base leading-relaxed font-medium overflow-y-auto max-h-[600px] pr-3 custom-scrollbar">{results[currentKey]}</div>
                      </div>
                    )}
                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                      <button onClick={() => setEditing(prev => ({...prev, [currentKey]: !prev[currentKey]}))} className="text-sm bg-slate-800 px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-slate-700 text-slate-300">
                        <Pencil size={14}/> {editing[currentKey] ? "完成編輯" : "修改文字"}
                      </button>
                      <button onClick={() => copyText(results[currentKey], currentKey)} className="text-sm bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded-lg flex items-center gap-1.5 text-white font-bold">
                        {copied[currentKey] ? <><CircleCheck size={16}/> 已複製</> : <><Copy size={16}/> 複製內容</>}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="m-auto text-slate-600 text-sm flex flex-col items-center">
                    <LayoutTemplate className="w-12 h-12 mb-3 opacity-20" />在左側設定條件並點擊生成，結果將顯示於此。
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 20px; }
      `}} />
    </div>
  );
};

export default App;