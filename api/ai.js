// 🎨 修改：直接改用 Google Imagen 3 生圖
    if (isImage) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: { message: "未設定 GEMINI_API_KEY" } });

      const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: { sampleCount: 1, aspectRatio: "1:1" }
        })
      });

      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error("Gemini 生圖失敗，請確保 API Key 有權限");
      
      const base64Data = data.predictions?.[0]?.bytesBase64Encoded;
      return res.status(200).json({ imageUrl: `data:image/png;base64,${base64Data}` });
    }