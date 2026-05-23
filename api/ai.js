// api/ai.js - Vercel Serverless 後端安全通道
export default async function handler(req, res) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: "Method Not Allowed" } });
  }

  const { engine, prompt, systemInstruction, isJson } = req.body;

  try {
    // 🔵 處理 Gemini 引擎請求
    if (engine === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY; // 安全讀取後端環境變數（無 VITE_ 前綴）
      if (!apiKey) return res.status(500).json({ error: { message: "後端伺服器未設定 GEMINI_API_KEY" } });

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
      };
      if (systemInstruction) payload.systemInstruction = { parts: [{ text: systemInstruction }] };
      if (isJson) payload.generationConfig.responseMimeType = "application/json";

      const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "Gemini 官方伺服器出錯");
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return res.status(200).json({ text });

    // 🟢 處理 ChatGPT 引擎請求
    } else if (engine === 'chatgpt') {
      const apiKey = process.env.OPENAI_API_KEY; // 安全讀取後端環境變數
      if (!apiKey) return res.status(500).json({ error: { message: "後端伺服器未設定 OPENAI_API_KEY" } });

      const messages = [];
      if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
      messages.push({ role: "user", content: prompt });

      const payload = { model: "gpt-4o-mini", messages: messages, temperature: 0.7 };
      if (isJson) payload.response_format = { type: "json_object" };

      const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(payload)
      });
      
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "ChatGPT 官方伺服器出錯");

      const text = data.choices?.[0]?.message?.content;
      return res.status(200).json({ text });
    }

    return res.status(400).json({ error: { message: "未知的 AI 引擎參數" } });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
}