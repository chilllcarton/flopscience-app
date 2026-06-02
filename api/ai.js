// api/ai.js - Vercel Serverless 後端安全通道
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: "Method Not Allowed" } });
  }

  const { engine, prompt, systemInstruction, isJson, temperature, isImage } = req.body;

  try {
    // 🎨 改為 Gemini Imagen 3 生成圖片邏輯
    if (isImage) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: { message: "後端未設定 GEMINI_API_KEY" } });

      // 呼叫 Google Imagen 3 模型
      const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1" // 生成 1:1 正方形圖片，適合 IG
          }
        })
      });

      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "Gemini 生圖伺服器出錯");

      // Gemini 回傳的是 Base64 編碼，我們需要將它包裝成 Data URL 讓前端直接顯示
      const base64Data = data.predictions?.[0]?.bytesBase64Encoded;
      if (!base64Data) throw new Error("API 未返回圖片數據，可能是 Prompt 觸發了安全審查");

      return res.status(200).json({ imageUrl: `data:image/png;base64,${base64Data}` });
    }

    // 📝 以下為原有的文字生成邏輯
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