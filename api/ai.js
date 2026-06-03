import { Redis } from '@upstash/redis';

// 初始化 Redis (加入安全機制，如果冇設定 Key 都不會導致死機)
let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { message: "Method Not Allowed" } });

  let { engine, prompt, systemInstruction, temperature, isImage } = req.body;
  const BASE_URL = "https://api.gptsapi.net"; // WildCard 中轉地址

  try {
    const tempValue = parseFloat(temperature || 0.7);

    // 🎨 DALL-E 3 生成圖片 (不需防重複)
    if (isImage) {
      const apiKey = process.env.OPENAI_API_KEY;
      const apiRes = await fetch(`${BASE_URL}/v1/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ prompt: prompt, n: 1, size: "1024x1024" })
      });
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "生圖失敗");
      return res.status(200).json({ imageUrl: data.data[0].url });
    }

    // 📝 文本防重複機制：讀取雲端歷史紀錄
    let finalPrompt = prompt;
    if (redis) {
      try {
        // 讀取最近 5 篇文章紀錄
        const recentPosts = await redis.lrange('flopscience:posts', 0, 4);
        if (recentPosts && recentPosts.length > 0) {
          const historyText = recentPosts.map((post, i) => `舊文 ${i + 1} 摘要：${post.substring(0, 100)}...`).join('\n');
          // 強制注入防撞橋指令
          finalPrompt += `\n\n【⚠️ 極度重要：防重複機制】請先檢查以下我們最近已生成的貼文摘要：\n${historyText}\n\n👉 這次產出的全新內容，其「主題切入點」及「核心用詞」絕對不可以與上述舊文重複！請給我一個完全不同的新角度！`;
        }
      } catch (error) {
        console.error("Redis 讀取失敗:", error);
      }
    }

    let generatedText = "";

    // 🧠 處理 Gemini 引擎
    if (engine.includes('gemini')) {
      const apiKey = process.env.GEMINI_API_KEY;
      const modelName = engine === 'gemini-flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
      const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: finalPrompt }] }], 
          systemInstruction: { parts: [{ text: systemInstruction }] }, 
          generationConfig: { temperature: tempValue } 
        })
      });
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "Gemini 連線錯誤");
      generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
    // 🟢 處理 ChatGPT (WildCard) 引擎
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      const apiRes = await fetch(`${BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemInstruction }, 
            { role: "user", content: finalPrompt }
          ],
          temperature: tempValue
        })
      });
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.error?.message || "API 連線錯誤");
      generatedText = data.choices?.[0]?.message?.content;
    }

    // 💾 將新生成的內容寫入雲端數據庫 (只保留最近 20 篇以節省空間)
    if (redis && generatedText) {
      try {
        await redis.lpush('flopscience:posts', generatedText);
        await redis.ltrim('flopscience:posts', 0, 19);
      } catch (error) {
        console.error("Redis 寫入失敗:", error);
      }
    }

    return res.status(200).json({ text: generatedText });

  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
}