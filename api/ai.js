// api/ai.js - Vercel Serverless 後端安全通道 (混合架構版)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: "Method Not Allowed" } });
  }

  const { engine, prompt, systemInstruction, isJson, temperature, isImage } = req.body;

  try {
    // 🎨 生圖專區：使用極穩定的 OpenAI DALL-E 3
    if (isImage) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: { message: "後端未設定 OPENAI_API_KEY" } });

      const apiRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard"
        })
      });

      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "DALL-E 3 繪圖伺服器出錯");

      return res.status(200).json({ imageUrl: data.data[0].url });
    }

    // 📝 文字專區：支援 Gemini 2.5 Pro / Flash 及 ChatGPT
    const tempValue = temperature !== undefined ? parseFloat(temperature) : 0.7;

    if (engine === 'gemini-pro' || engine === 'gemini-flash' || engine === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: { message: "後端未設定 GEMINI_API_KEY" } });

      const modelName = engine === 'gemini-flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: tempValue, maxOutputTokens: 8192 }
      };
      if (systemInstruction) payload.systemInstruction = { parts: [{ text: systemInstruction }] };
      if (isJson) payload.generationConfig.responseMimeType = "application/json";

      const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "Gemini 伺服器出錯");
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return res.status(200).json({ text });

    } else if (engine === 'chatgpt') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: { message: "後端未設定 OPENAI_API_KEY" } });

      const messages = [];
      if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
      messages.push({ role: "user", content: prompt });

      const payload = { model: "gpt-4o-mini", messages: messages, temperature: tempValue };
      if (isJson) payload.response_format = { type: "json_object" };

      const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(payload)
      });
      
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "ChatGPT 伺服器出錯");

      const text = data.choices?.[0]?.message?.content;
      return res.status(200).json({ text });
    }

    return res.status(400).json({ error: { message: "未知的 AI 引擎參數" } });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
}