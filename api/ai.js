// api/ai.js - Vercel Serverless 後端 (WildCard 中轉版)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: "Method Not Allowed" } });
  }

  const { engine, prompt, systemInstruction, isJson } = req.body;
  // WildCard 指定的中轉基礎地址
  const BASE_URL = "https://api.gptsapi.net";

  try {
    // 🔵 處理 Gemini 引擎請求 (Gemini 依然使用 Google 原生路徑)
    if (engine === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: { message: "未設定 GEMINI_API_KEY" } });

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
      };
      if (systemInstruction) payload.systemInstruction = { parts: [{ text: systemInstruction }] };
      if (isJson) payload.generationConfig.responseMimeType = "application/json";

      const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "Gemini 伺服器出錯");
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return res.status(200).json({ text });

    // 🟢 處理 ChatGPT 引擎請求 (改用 WildCard 中轉地址)
    } else if (engine === 'chatgpt') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: { message: "未設定 OPENAI_API_KEY" } });

      const messages = [];
      if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
      messages.push({ role: "user", content: prompt });

      // 使用 WildCard 的路徑：BASE_URL + /v1/chat/completions
      const apiRes = await fetch(`${BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${apiKey}` 
        },
        body: JSON.stringify({ 
          model: "gpt-4o-mini", 
          messages: messages, 
          temperature: 0.7 
        })
      });
      
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "ChatGPT 中轉伺服器出錯");

      const text = data.choices?.[0]?.message?.content;
      return res.status(200).json({ text });
    }

    return res.status(400).json({ error: { message: "未知的 AI 引擎參數" } });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
}