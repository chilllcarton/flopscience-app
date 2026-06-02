export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { message: "Method Not Allowed" } });

  const { engine, prompt, systemInstruction, temperature, isImage } = req.body;
  const BASE_URL = "https://api.gptsapi.net"; // 你的中轉伺服器地址

  try {
    // 🎨 DALL-E 3 生圖 (透過中轉伺服器)
    if (isImage) {
      const apiKey = process.env.OPENAI_API_KEY;
      const apiRes = await fetch(`${BASE_URL}/v1/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "dall-e-3", prompt: prompt, n: 1, size: "1024x1024" })
      });
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "生圖失敗");
      return res.status(200).json({ imageUrl: data.data[0].url });
    }

    // 📝 對話生成
    const tempValue = parseFloat(temperature || 0.7);

    if (engine.includes('gemini')) {
      // Gemini 依然使用 Google 原生 API (不需要中轉)
      const apiKey = process.env.GEMINI_API_KEY;
      const modelName = engine === 'gemini-flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
      const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemInstruction }] }, generationConfig: { temperature: tempValue } })
      });
      const data = await apiRes.json();
      return res.status(200).json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text });

    } else {
      // ChatGPT 使用中轉伺服器
      const apiKey = process.env.OPENAI_API_KEY;
      const apiRes = await fetch(`${BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemInstruction }, { role: "user", content: prompt }],
          temperature: tempValue
        })
      });
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "ChatGPT 伺服器出錯");
      return res.status(200).json({ text: data.choices?.[0]?.message?.content });
    }
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
}