import React, { useState } from 'react';
import { Copy, RefreshCw, CircleCheck, CircleAlert, Pencil, Image as ImageIcon, User, Sparkles, Download, LayoutTemplate, Video, Lightbulb } from 'lucide-react';

const scheduleData = [
  { id: 1, time: "09:00", topic: "晨間心態 / 金句", prompt: "你是一個擁有10年經驗的德州撲克玩家，帳號是 @FlopScience。請寫一句約20-40字的『極短』Threads貼文。主題：德州撲克風險管理與人生哲學的結合。要求：金句形式，結尾帶1個emoji，文末加上『—— @FlopScience』。" },
  { id: 2, time: "12:00", topic: "手牌互動解析", prompt: "你是一個擁有10年經驗的德州撲克玩家，帳號是 @FlopScience。請寫一篇約150字的Threads貼文。主題：模擬一個手持AA在Flop面臨多個對手Overcall的危險局面。要求：給出具體的盲注、位置。結尾問『這時候你會怎麼做？留言告訴我。 —— @FlopScience』。" },
  { id: 3, time: "15:00", topic: "AI 數據冷知識", prompt: "你是一個擁有10年經驗的德州撲克玩家，帳號是 @FlopScience。請寫一篇約150字的Threads貼文。主題：分享一個德州撲克機率的冷知識。要求：輕鬆易懂，建立專業權威感。文末加上『想知道更多撲克冷知識？追蹤 @FlopScience』" },
  { id: 4, time: "18:00", topic: "反直覺觀點", prompt: "你是一個擁有10年經驗的德州撲克玩家，帳號是 @FlopScience。請寫一篇約200字的Threads貼文。主題：為什麼『輸錢反而說明你這把打對了』。要求：用EV和長期勝率角度解釋，犀利顛覆認知。文末帶上 #FlopScience" },
  { id: 5, time: "21:00", topic: "晚間牌局故事", prompt: "你是一個擁有10年經驗的德州撲克玩家，帳號是 @FlopScience。請寫一篇約250字的Threads貼文。主題：用第一人稱敘述線下局遇到『瘋魚』的心理戰。要求：像說故事一樣有張力。結尾加上『這是今天的牌局故事，晚安。 —— @FlopScience』" }
];

const toneOptions = [
  { value: "專業、冷靜、客觀，帶有邏輯分析", label: "🤵 專業冷靜 (預設)" },
  { value: "極度犀利、具攻擊性、直接點出新手錯誤、帶有挑釁意味", label: "🤬 犀利引戰" },
  { value: "充滿學術名詞、GTO、EV期望值、機率計算的口吻", label: "🎓 學術機率" },
  { value: "佛系、看透波動、安慰受傷的心靈、強調長期主義", label: "🧘 佛系心態" },
  { value: "地道香港人語氣，大量使用廣東話口語、香港俗語（如：巴打、中伏、抽水、痴線），語氣直接貼地", label: "🇭🇰 港式貼地 (廣東話)" }
];

const TABS = [
  { id: 'schedule', label: '📅 每日排程' },
  { id: 'custom', label: '💡 自由創作' },
  { id: 'hh', label: '♠️ 牌譜轉譯' },
  { id: 'quiz', label: '❓ 互動測驗' },
  { id: 'youtube', label: '▶️ YouTube 腳本' },
  { id: 'reply', label: '💬 留言回覆' }
];

const App = () => {
  const [activeTab, setActiveTab] = useState('schedule');
  const [activeScheduleId, setActiveScheduleId] = useState(1);

  const [inputs, setInputs] = useState({
    custom: '',
    hh: '',
    quiz: '',
    reply: '',
    yt_topic: '',
    yt_length: '3-5分鐘 (中等長度，知識科普)',
    image_style: 'Cyberpunk aesthetic, glowing neon emerald green, scientific elements like atoms or circuits, dark slate background',
    yt_image_count: 'auto'
  });
  
  const [tones, setTones] = useState({});
  const [results, setResults] = useState({});
  
  const [selectedImageModel, setSelectedImageModel] = useState('dalle3');
  
  const [imagePrompts, setImagePrompts] = useState({});
  const [ytImages, setYtImages] = useState([]);
  
  const [loading, setLoading] = useState({});
  const [ideaLoading, setIdeaLoading] = useState({});
  const [imageLoading, setImageLoading] = useState({});
  const [ytImageLoading, setYtImageLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState({});
  const [copied, setCopied] = useState({});
  const [exportMessage, setExportMessage] = useState(null);

  const getCurrentKey = () => activeTab === 'schedule' ? `schedule_${activeScheduleId}` : activeTab;
  const currentKey = getCurrentKey();

  const handleInputChange = (field, value) => setInputs(prev => ({ ...prev, [field]: value }));
  const handleToneChange = (value) => setTones(prev => ({ ...prev, [currentKey]: value }));

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const getSystemInstruction = () => {
    const tone = tones[currentKey] || toneOptions[0].value;
    return `你是一個擁有10年經驗的德州撲克職業玩家，你的帳號名稱是 @FlopScience。精通社群經營。你的發文語氣必須是：「${tone}」。請確保用繁體中文輸出。`;
  };

  const generateIdea = async (field) => {
    if (!apiKey) return alert("請先在 .env 檔案中設定 VITE_GEMINI_API_KEY");
    
    setIdeaLoading(prev => ({ ...prev, [field]: true }));
    let promptText = "";
    if (field === 'yt_topic') {
      promptText = "請你扮演擁有百萬訂閱的德撲 YouTuber。幫我發想一個極具點擊率 (Clickbait)、充滿數據或心理學乾貨的德州撲克 YouTube 影片主題。只輸出『一句話』，不要引號，不需要額外解釋。例如：『Solver 告訴你為什麼拿 AA 時最容易犯這三個致命錯誤』。";
    } else if (field === 'custom') {
      promptText = "請給我一個適合在 Threads 上引起德州撲克玩家激烈討論的爭議性話題，或進階心法。只輸出『一句話』，不要引號，不需要額外解釋。";
    } else if (field === 'quiz') {
      promptText = "幫我設計一個德州撲克實戰中會遇到的困難情境（例如面臨超池下注、或是特定牌面結構）。只要丟出情境，不用給答案，只輸出『一句話』，不要引號。";
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        handleInputChange(field, text.trim().replace(/["']/g, ''));
      }
    } catch (err) {
      console.error("Idea generation failed", err);
    }
    setIdeaLoading(prev => ({ ...prev, [field]: false }));
  };

  const callGemini = async (prompt, systemInstruction, type) => {
    if (!apiKey) return setErrors(prev => ({ ...prev, [currentKey]: "未設定 VITE_GEMINI_API_KEY" }));

    const key = currentKey;
    setLoading(prev => ({ ...prev, [key]: type }));
    setErrors(prev => ({ ...prev, [key]: null }));
    setEditing(prev => ({ ...prev, [key]: false }));

    // 【致命核心修正點】將 maxOutputTokens 大幅提升至官方上限 8192，確保中文長文不被截斷
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
    };

    const delays = [1000, 2000, 4000, 8000, 16000];
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(API_URL, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        if (!response.ok) throw new Error('API Failed');
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        setResults(prev => ({ ...prev, [key]: text.trim() }));
        break;
      } catch (err) {
        if (i === 4) setErrors(prev => ({ ...prev, [key]: "生成失敗，請稍後再試。" }));
        else await new Promise(res => setTimeout(res, delays[i]));
      }
    }
    setLoading(prev => ({ ...prev, [key]: false }));
  };

  const generateText = (platform) => {
    const tone = tones[currentKey] || toneOptions[0].value;
    let prompt = "";

    if (activeTab === 'schedule') {
      const schedule = scheduleData.find(s => s.id === activeScheduleId);
      prompt = platform === 'ig'
        ? `${schedule.prompt}\n\n【擴寫為 Instagram 長文文案。包含豐富細節、良好排版、Emoji，以及 10-15 個 IG 撲克熱門 Hashtags。】`
        : schedule.prompt;
    } else if (activeTab === 'custom') {
      if (!inputs.custom.trim()) return setErrors(prev => ({ ...prev, [currentKey]: "請輸入主題" }));
      prompt = platform === 'ig'
        ? `針對主題「${inputs.custom}」寫一篇IG長文。包含豐富細節、排版、Emoji及10-15個撲克Hashtags。`
        : `針對主題「${inputs.custom}」寫一篇 Threads 短文，文末加上 —— @FlopScience`;
    } else if (activeTab === 'hh') {
      if (!inputs.hh.trim()) return setErrors(prev => ({ ...prev, [currentKey]: "請貼上牌譜" }));
      prompt = `將這段牌局紀錄轉譯成沉浸式故事：「${inputs.hh}」。\n保留關鍵數據，用第一人稱，加撲克Emoji，文末總結 EV 邏輯並加上 —— @FlopScience。`;
    } else if (activeTab === 'quiz') {
      if (!inputs.quiz.trim()) return setErrors(prev => ({ ...prev, [currentKey]: "請輸入測驗主題" }));
      prompt = `根據主題：「${inputs.quiz}」，設計一個 Threads 德撲情境互動選擇題。提供 A,B,C 選項（含正解及陷阱）。不要公佈答案，引導留言。`;
    } else if (activeTab === 'youtube') {
      if (!inputs.yt_topic.trim()) return setErrors(prev => ({ ...prev, [currentKey]: "請輸入 YouTube 影片主題！" }));

      let lengthInstructions = "";
      if (inputs.yt_length.includes("60秒")) {
        lengthInstructions = "這是 YouTube Shorts。節奏極快，前 3 秒必須抓住眼球，不要廢話，直接給出最強的結論或反轉。預計會有 2-3 個視覺分鏡轉換。";
      } else if (inputs.yt_length.includes("3-5分鐘")) {
        lengthInstructions = "這是中等長度科普影片。請確保有清晰的『提出問題 -> 理論分析 -> 實戰例子 -> 結論』的結構。預計會有 4-6 個視覺分鏡轉換。";
      } else {
        lengthInstructions = "這是深度解析長片。請包含豐富的數據、Solver 截圖建議、以及至少 2-3 個真實牌局情境的深度拆解。預計會有 6-10 個視覺分鏡轉換。";
      }

      prompt = `請以「${inputs.yt_topic}」為主題，寫一份專業的德州撲克 AI 數據冷知識 YouTube 影片腳本。
影片長度設定為：「${inputs.yt_length}」。
${lengthInstructions}

這是一份給創作者看的拍攝腳本，請務必包含以下結構：
1. 【影片標題建議】：3 個吸引點擊的吸睛標題 (Clickbait/Hook)。
2. 【時間軸與畫面分鏡】：將影片切分為數個段落，並明確指出每一個段落的畫面應該配什麼樣的 B-roll (輔助畫面)。
3. 【逐字稿/旁白】：主播要講的台詞。
語氣必須符合：「${tone}」，充滿知識含量且節奏明快。結尾呼籲訂閱 @FlopScience。`;
    } else if (activeTab === 'reply') {
      if (!inputs.reply.trim()) return setErrors(prev => ({ ...prev, [currentKey]: "請貼上留言" }));
      prompt = `網友留言：「${inputs.reply}」。請用「${tone}」語氣寫一段 50 字內的精準回覆，直接輸出。`;
    }

    callGemini(prompt, getSystemInstruction(), platform || 'default');
  };

  const generateImage = async () => {
    if (activeTab === 'youtube') {
      return generateYTImages();
    }

    const key = currentKey;
    const currentText = results[key];
    if (!currentText || !apiKey) return;

    setImageLoading(prev => ({ ...prev, [key]: true }));
    setImageErrors(prev => ({ ...prev, [key]: null }));
    setImagePrompts(prev => ({ ...prev, [key]: null }));

    try {
      let modelStyleExtra = "";
      switch(selectedImageModel) {
        case 'dalle3':
          modelStyleExtra = "This prompt is for DALL-E 3. Focus on highly descriptive, continuous sentences detailing the exact composition, lighting, and narrative.";
          break;
        case 'gemini':
          modelStyleExtra = "This prompt is for Google Gemini Image. Focus on camera settings, photorealism, distinct subjects, and clear natural lighting.";
          break;
        case 'grok':
          modelStyleExtra = "This prompt is for Grok (Flux). Focus on edgy concepts, avant-garde artistic direction, and concise powerful keywords separated by commas.";
          break;
      }

      const styleInstruction = inputs.image_style;
      const extractPrompt = `Create a 1-sentence English image prompt describing the visual scene from this text: "${currentText}".
CRUCIAL REQUIREMENT 1: You MUST enforce this exact visual aesthetic: "${styleInstruction}".
CRUCIAL REQUIREMENT 2: ${modelStyleExtra}
Focus on objects like playing cards, chips, tables, and dramatic lighting. Do not mention gambling or casinos to avoid safety filters. 4k resolution, highly detailed, photorealistic, cinematic lighting, NO TEXT, NO LETTERS.`;

      const response = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: extractPrompt }] }] })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error?.message || "生成 Prompt 失敗");

      const extracted = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (extracted) {
        setImagePrompts(prev => ({ ...prev, [key]: extracted.trim() }));
      } else {
        throw new Error("無法提取圖片 Prompt");
      }
    } catch (err) {
      setImageErrors(prev => ({ ...prev, [key]: err.message }));
    }
    setImageLoading(prev => ({ ...prev, [key]: false }));
  };

  const generateYTImages = async () => {
    const key = 'youtube';
    const currentText = results[key];
    if (!currentText || !apiKey) return;

    setYtImageLoading(true);
    setImageErrors(prev => ({ ...prev, [key]: null }));
    setYtImages([]);

    try {
      let modelStyleExtra = "";
      switch(selectedImageModel) {
        case 'dalle3':
          modelStyleExtra = "This is for DALL-E 3. Use descriptive, narrative sentences for the prompt.";
          break;
        case 'gemini':
          modelStyleExtra = "This is for Gemini Image. Use clear camera and realism keywords.";
          break;
        case 'grok':
          modelStyleExtra = "This is for Grok (Flux). Use edgy, conceptual, comma-separated keywords.";
          break;
      }

      const styleInstruction = inputs.image_style;
      let requiredImages = 3;
      let lengthDesc = "";

      if (inputs.yt_image_count === 'auto') {
        if (inputs.yt_length.includes("60秒")) {
          requiredImages = 2;
          lengthDesc = "這是 YouTube Shorts，節奏快，需要萃取 2 個關鍵場景。";
        } else if (inputs.yt_length.includes("3-5分鐘")) {
          requiredImages = 4;
          lengthDesc = "這是 3-5 分鐘的科普影片，需要萃取 4 個關鍵場景。";
        } else {
          requiredImages = 6;
          lengthDesc = "這是 10 分鐘以上的深度長片，需要萃取 6 個關鍵場景。";
        }
      } else {
        requiredImages = parseInt(inputs.yt_image_count, 10);
        lengthDesc = `使用者明確指定需要剛好 ${requiredImages} 個畫面分鏡。`;
      }

      const extractPrompt = `請閱讀以下 YouTube 影片腳本：
"${currentText}"

${lengthDesc}
請根據腳本中【時間軸與畫面分鏡】實際提到的場景，找出最需要輔助畫面 (B-roll) 的關鍵段落。
請嚴格輸出一個 JSON 陣列，每個物件代表一個分鏡場景，包含兩個屬性：
1. "description": 繁體中文，簡短說明這是對應腳本哪個段落的畫面。
2. "prompt": 英文，高度細節的 AI 繪圖指令。必須強制包含此風格：「${styleInstruction}」。${modelStyleExtra} 強調 4k resolution, highly detailed, NO TEXT。

請嚴格保證輸出剛好 ${requiredImages} 個物件。`;

      const response = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: extractPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const gData = await response.json();
      if (!response.ok) throw new Error("生成分鏡失敗");
      
      let promptText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!promptText) throw new Error("無法從腳本提取畫面");

      let sceneData = [];
      try {
        sceneData = JSON.parse(promptText.trim());
      } catch (parseError) {
        throw new Error("腳本解析格式錯誤，請重試");
      }

      setYtImages(sceneData.map(scene => ({
        description: scene.description,
        prompt: scene.prompt
      })));

    } catch (err) {
      setImageErrors(prev => ({ ...prev, [key]: err.message || "系列配圖 Prompt 生成失敗，請稍後再試。" }));
    }

    setYtImageLoading(false);
  };

  const handleCopy = () => {
    const text = results[currentKey];
    if (!text) return;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setCopied(prev => ({ ...prev, [currentKey]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [currentKey]: false })), 2000);
  };

  const copyImagePrompt = (textToCopy) => {
    navigator.clipboard.writeText(textToCopy);
  };

  const exportToCSV = () => {
    let csvContent = '\uFEFF序號,輸入日期,文章分類,主題,文案內容\n';
    const escapeCSV = (str) => str ? `"${str.replace(/"/g, '""')}"` : '""';
    let hasData = false;
    let serialNum = 1;
    const todayDate = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });

    scheduleData.forEach(item => {
      const k = `schedule_${item.id}`;
      if (results[k]) { csvContent += `${serialNum++},${escapeCSV(todayDate)},排程主題,${escapeCSV(item.time)},${escapeCSV(results[k])}\n`; hasData = true; }
    });
    if (results['custom']) { csvContent += `${serialNum++},${escapeCSV(todayDate)},自由創作,${escapeCSV(inputs.custom)},${escapeCSV(results['custom'])}\n`; hasData = true; }
    if (results['hh']) { csvContent += `${serialNum++},${escapeCSV(todayDate)},牌譜轉譯,牌譜紀錄,${escapeCSV(results['hh'])}\n`; hasData = true; }
    if (results['quiz']) { csvContent += `${serialNum++},${escapeCSV(todayDate)},互動測驗,${escapeCSV(inputs.quiz)},${escapeCSV(results['quiz'])}\n`; hasData = true; }
    if (results['youtube']) { csvContent += `${serialNum++},${escapeCSV(todayDate)},YouTube腳本,${escapeCSV(inputs.yt_topic)},${escapeCSV(results['youtube'])}\n`; hasData = true; }
    if (results['reply']) { csvContent += `${serialNum++},${escapeCSV(todayDate)},留言回覆,${escapeCSV(inputs.reply)},${escapeCSV(results['reply'])}\n`; hasData = true; }

    if (!hasData) {
      setExportMessage("⚠️ 冇資料！請先生成內容再匯出。");
      setTimeout(() => setExportMessage(null), 3000);
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `FlopScience_Content_${new Date().toLocaleDateString().replace(/\//g, '')}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

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
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight"><span className="text-emerald-400">德州撲克 </span>內容引擎</h1>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <button onClick={exportToCSV} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg active:scale-95 transition-all">
              <Download size={16} /> 匯出所有文案 (CSV)
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
                className={`flex-shrink-0 min-w-[120px] flex-1 py-4 px-2 text-sm font-bold transition-all border-b-2 flex justify-center items-center gap-2 ${activeTab === tab.id ? 'border-emerald-500 text-emerald-400 bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'}`}
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
                      {ideaLoading['custom'] ? <RefreshCw size={12} className="animate-spin" /> : <Lightbulb size={12} />} AI 幫我想主題
                    </button>
                  </div>
                  <textarea className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl min-h-[120px] max-h-[400px] overflow-y-auto resize-y text-sm focus:border-emerald-500 outline-none" placeholder="輸入你想討論的撲克主題..." value={inputs.custom} onChange={(e) => handleInputChange('custom', e.target.value)} />
                </div>
              )}

              {activeTab === 'hh' && <textarea className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl min-h-[120px] max-h-[400px] overflow-y-auto resize-y text-sm font-mono focus:border-emerald-500 outline-none" placeholder="貼上生硬牌譜數據 (如: BTN open 3bb...)" value={inputs.hh} onChange={(e) => handleInputChange('hh', e.target.value)} />}

              {activeTab === 'quiz' && (
                 <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs text-slate-400 font-bold">測驗情境</span>
                    <button onClick={() => generateIdea('quiz')} disabled={ideaLoading['quiz']} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                      {ideaLoading['quiz'] ? <RefreshCw size={12} className="animate-spin" /> : <Lightbulb size={12} />} 隨機生成測驗情境
                    </button>
                  </div>
                  <textarea className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl min-h-[120px] max-h-[400px] overflow-y-auto resize-y text-sm focus:border-emerald-500 outline-none" placeholder="輸入想測驗的情境..." value={inputs.quiz} onChange={(e) => handleInputChange('quiz', e.target.value)} />
                </div>
              )}

              {activeTab === 'youtube' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-400 font-bold">YouTube 影片主題</span>
                      <button onClick={() => generateIdea('yt_topic')} disabled={ideaLoading['yt_topic']} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors bg-red-950/30 px-2 py-1 rounded border border-red-900/50">
                        {ideaLoading['yt_topic'] ? <RefreshCw size={12} className="animate-spin" /> : <Lightbulb size={12} />} 🎲 隨機爆款話題
                      </button>
                    </div>
                    <textarea
                      className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl min-h-[100px] max-h-[250px] overflow-y-auto resize-y text-sm focus:border-red-500 outline-none"
                      placeholder="輸入 YouTube 影片主題，或者點擊右上角的「隨機爆款話題」..."
                      value={inputs.yt_topic}
                      onChange={(e) => handleInputChange('yt_topic', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <label className="block text-xs text-slate-400 font-bold mb-2">⏱️ 影片長度預估</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-sm py-2 px-2 outline-none focus:border-red-500"
                        value={inputs.yt_length}
                        onChange={(e) => handleInputChange('yt_length', e.target.value)}
                      >
                        <option value="60秒以內 (YouTube Shorts 節奏極快)">60秒以內 (Shorts 短影音)</option>
                        <option value="3-5分鐘 (中等長度，知識科普)">3-5分鐘 (日常科普)</option>
                        <option value="10分鐘以上 (深度解析，包含大量舉例與數據)">10分鐘以上 (深度解析長片)</option>
                      </select>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <label className="block text-xs text-slate-400 font-bold mb-2">🖼️ 自訂分鏡 Prompt 數量</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-sm py-2 px-2 outline-none focus:border-red-500"
                        value={inputs.yt_image_count}
                        onChange={(e) => handleInputChange('yt_image_count', e.target.value)}
                      >
                        <option value="auto">自動 (依片長決定)</option>
                        <option value="1">1 組</option>
                        <option value="2">2 組</option>
                        <option value="3">3 組</option>
                        <option value="4">4 組</option>
                        <option value="5">5 組</option>
                        <option value="6">6 組 (上限)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reply' && <textarea className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl min-h-[120px] max-h-[400px] overflow-y-auto resize-y text-sm focus:border-emerald-500 outline-none" placeholder="貼上網友留言..." value={inputs.reply} onChange={(e) => handleInputChange('reply', e.target.value)} />}

              <div className="flex flex-col gap-3 mt-2">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs text-slate-500 font-bold mb-2 uppercase">選擇語氣風格 (Tone)</label>
                  <select className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-sm py-2 px-2 outline-none focus:border-emerald-500" value={tones[currentKey] || toneOptions[0].value} onChange={(e) => handleToneChange(e.target.value)}>
                    {toneOptions.map(o => <option key={o.label} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs text-slate-500 font-bold mb-2 uppercase">設定 Prompt 視覺風格</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-sm py-2 px-2 outline-none focus:border-emerald-500"
                    value={inputs.image_style}
                    onChange={(e) => handleInputChange('image_style', e.target.value)}
                  >
                    <option value="Cyberpunk aesthetic, glowing neon emerald green, scientific elements like atoms or circuits, dark slate background">🟢 品牌專屬 (科幻綠)</option>
                    <option value="Cinematic photography, dark moody classic casino atmosphere, professional lighting, photorealistic">♠️ 經典實體賭場 (暗沉電影)</option>
                    <option value="Minimalist 3D render, clean, bright, focused on data, statistics, and poker elements">📊 極簡 3D 渲染 (明亮數據)</option>
                    <option value="Anime/Manga style, high tension, dramatic expressions, dynamic poker scene">🔥 日系動漫 (熱血張力)</option>
                  </select>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs text-slate-500 font-bold mb-2 uppercase text-emerald-400">目標 AI 繪圖工具</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-sm py-2 px-2 outline-none focus:border-emerald-500"
                    value={selectedImageModel}
                    onChange={(e) => setSelectedImageModel(e.target.value)}
                  >
                    <option value="dalle3">ChatGPT (DALL-E 3)</option>
                    <option value="gemini">Google Gemini Image</option>
                    <option value="grok">Grok (Flux)</option>
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
                      {loading[currentKey] === 'ig' ? <RefreshCw className="animate-spin" size={18}/> : <span>IG</span>} 擴充 IG 長文
                    </button>
                  </>
                ) : (
                  <button onClick={() => generateText('default')} disabled={loading[currentKey]} className={`w-full py-3 ${activeTab === 'youtube' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all`}>
                    {loading[currentKey] ? <RefreshCw className="animate-spin" size={18}/> : (activeTab === 'youtube' ? <span>▶</span> : <Sparkles size={18}/>)}
                    {activeTab === 'youtube' ? '生成 YouTube 腳本' : '立即生成 AI 內容'}
                  </button>
                )}
              </div>
            </div>

            <div className="hidden md:block w-px bg-slate-800"></div>

            <div className="md:w-7/12 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-300 font-bold text-lg">
                  {activeTab === 'youtube' ? <span className="text-red-500">▶</span> : <Sparkles className="w-5 h-5 text-emerald-500" />}
                  生成結果預覽
                </div>
                {results[currentKey] && (
                  <button onClick={() => generateImage()} disabled={(activeTab === 'youtube' ? ytImageLoading : imageLoading[currentKey])} className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-700 transition-colors">
                    {(activeTab === 'youtube' ? ytImageLoading : imageLoading[currentKey]) ? <RefreshCw size={12} className="animate-spin"/> : (activeTab === 'youtube' ? <Video size={12}/> : <ImageIcon size={12}/>)}
                    {activeTab === 'youtube' ? `萃取配圖 Prompt (${inputs.yt_image_count === 'auto' ? '自動' : inputs.yt_image_count + '組'})` : '寫入 AI 繪圖 Prompt'}
                  </button>
                )}
              </div>

              <div className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-5 relative flex flex-col min-h-[300px]">
                {loading[currentKey] ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 rounded-xl backdrop-blur-sm">
                    <RefreshCw className={`animate-spin w-8 h-8 mb-3 ${activeTab === 'youtube' ? 'text-red-500' : 'text-emerald-400'}`} />
                    <span className="text-sm text-slate-400 animate-pulse">{activeTab === 'youtube' ? '正在設計分鏡與腳本...' : '正在構思完美文案...'}</span>
                  </div>
                ) : errors[currentKey] ? (
                  <div className="m-auto flex items-center text-red-400 gap-2 bg-red-950/20 px-4 py-3 rounded-lg border border-red-900/50"><CircleAlert size={20}/>{errors[currentKey]}</div>
                ) : results[currentKey] ? (
                  <>
                    {editing[currentKey] ? (
                      <textarea className="flex-1 w-full bg-slate-900 text-slate-200 p-4 rounded-lg border border-emerald-500 outline-none resize-y text-sm md:text-base leading-relaxed min-h-[300px] max-h-[500px] overflow-y-auto" value={results[currentKey]} onChange={(e) => setResults(prev => ({...prev, [currentKey]: e.target.value}))} />
                    ) : (
                      /* 【優化 UI 顯示】維持滾動，但在下方追加一個貼心小提示，提醒使用者文案可以向下滑動 */
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex-1 text-slate-200 whitespace-pre-wrap text-sm md:text-base leading-relaxed font-medium overflow-y-auto max-h-[500px] pr-3 custom-scrollbar">
                          {results[currentKey]}
                        </div>
                        <p className="text-[11px] text-emerald-500/50 text-right mt-1 animate-pulse">💡 提示：若長文未顯全，可在上方框內向下捲動查看全部內容</p>
                      </div>
                    )}
                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                      <button onClick={() => setEditing(prev => ({...prev, [currentKey]: !prev[currentKey]}))} className="text-sm bg-slate-800 px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700">
                        <Pencil size={14}/> {editing[currentKey] ? "完成編輯" : "修改文字"}
                      </button>
                      <button onClick={handleCopy} className={`text-sm ${activeTab === 'youtube' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} px-5 py-2 rounded-lg flex items-center gap-1.5 text-white font-bold transition-colors shadow-lg`}>
                        {copied[currentKey] ? <><CircleCheck size={16}/> 已複製</> : <><Copy size={16}/> 複製內容</>}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="m-auto text-slate-600 text-sm flex flex-col items-center">
                    <LayoutTemplate className="w-12 h-12 mb-3 opacity-20" />
                    在左側設定條件並點擊生成，結果將顯示於此。
                  </div>
                )}
              </div>

              {activeTab === 'youtube' ? (
                 (ytImageLoading || ytImages.length > 0 || imageErrors['youtube']) && (
                  <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center relative min-h-[140px]">
                    {ytImageLoading ? (
                       <div className="flex flex-col items-center text-slate-500 animate-pulse"><Video className="w-8 h-8 mb-3 opacity-50" /><span>正在分析腳本並生成一系列 Prompt...</span></div>
                    ) : imageErrors['youtube'] ? (
                      <div className="text-red-400 flex items-center gap-2 text-sm bg-red-950/20 px-3 py-2 rounded-lg border border-red-900/50"><CircleAlert size={16}/>{imageErrors['youtube']}</div>
                    ) : ytImages.length > 0 ? (
                      <div className="w-full">
                        <p className="text-xs text-slate-400 mb-3 text-center border-b border-slate-800 pb-2">已為腳本萃取 {ytImages.length} 組配圖 Prompt，請複製到 {selectedImageModel === 'dalle3' ? 'DALL-E 3' : selectedImageModel === 'gemini' ? 'Gemini Image' : 'Grok'} 使用</p>
                        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {ytImages.map((img, idx) => (
                            <div key={idx} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                              <div className="text-sm text-slate-200 font-bold mb-2"><span className="text-red-400">📍 分鏡 {idx+1}:</span> {img.description}</div>
                              <div className="relative">
                                <textarea readOnly className="w-full bg-slate-950 text-emerald-400 text-xs font-mono p-3 rounded border border-slate-800 min-h-[70px] outline-none" value={img.prompt} />
                                <button onClick={() => copyImagePrompt(img.prompt)} className="absolute top-2 right-2 p-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors border border-slate-600" title="複製 Prompt">
                                  <Copy size={14}/>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                 )
              ) : (
                (imageLoading[currentKey] || imagePrompts[currentKey] || imageErrors[currentKey]) && (
                  <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center relative min-h-[100px]">
                    {imageLoading[currentKey] ? (
                       <div className="flex flex-col items-center text-slate-500 animate-pulse"><Sparkles className="w-6 h-6 mb-2 opacity-50" /><span>正在編寫高質量 Prompt...</span></div>
                    ) : imageErrors[currentKey] ? (
                      <div className="text-red-400 flex items-center gap-2 text-sm bg-red-950/20 px-3 py-2 rounded-lg border border-red-900/50"><CircleAlert size={16}/>{imageErrors[currentKey]}</div>
                    ) : imagePrompts[currentKey] ? (
                      <div className="w-full">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-emerald-400 flex items-center gap-1"><ImageIcon size={16}/> 生成專屬圖片 Prompt ({selectedImageModel === 'dalle3' ? 'DALL-E 3' : selectedImageModel === 'gemini' ? 'Gemini Image' : 'Grok'})</span>
                          <button onClick={() => copyImagePrompt(imagePrompts[currentKey])} className="text-xs flex items-center gap-1 bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600">
                            <Copy size={12}/> 複製指令
                          </button>
                        </div>
                        <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg text-sm text-emerald-300 font-mono leading-relaxed select-all">
                          {imagePrompts[currentKey]}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              )}
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