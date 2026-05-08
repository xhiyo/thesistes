import { GoogleGenAI } from '@google/genai';

export const getAIAnalysis = async (projectData, statsData, itemStatsData, constructMetrics, descriptiveSummary) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('API Key tidak ditemukan. Pastikan VITE_GEMINI_API_KEY sudah disetting pada file .env');
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Short prompt to save tokens/quota
    const prompt = `Analisislah kuesioner "${projectData.name}" (n=${statsData.totalResponses}, items=${projectData.questions.length}). Alpha: ${statsData.alpha?.toFixed(3)} (${statsData.statusLabel}). Berikan kesimpulan akhir sangat singkat (2-3 kalimat) tentang kelayakan dan saran utama. Bahasa Indonesia formal.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    if (error.message.includes('API key not valid')) {
      throw new Error('API Key Gemini Anda tidak valid. Pastikan key pada file .env sudah benar.');
    }
    throw new Error('Gagal menghubungi server AI: ' + error.message);
  }
};

export const sendAIChatMessage = async (projectData, statsData, itemStatsData, chatHistory, newMessage, constructMetrics, descriptiveSummary, userName) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('API Key tidak ditemukan. Pastikan VITE_GEMINI_API_KEY sudah disetting pada file .env');
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Format chat history for Gemini
    const formattedHistory = chatHistory.map(msg => {
      if (msg.role === 'error' || msg.role === 'system') return null;
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      };
    }).filter(Boolean);

    // Create system context (Complete data reference, but only discussed on request)
    const systemContext = `Anda asisten untuk ${userName}. Jawab sangat singkat & padat (B. Indo) gunakan bahasa mahasiswa ya jangan terlalu teknis.
    DATA REFERENSI: Proyek: ${projectData.name}, Alpha: ${statsData.alpha?.toFixed(3)}, AVE: ${constructMetrics?.ave?.toFixed(3)}, CR: ${constructMetrics?.cr?.toFixed(3)}.
    Metrik Item: ${itemStatsData.map(s => `ID:${s.id} (M:${s.mean?.toFixed(2)}, r:${s.correlation?.toFixed(2)})`).join(', ')}.
    Bahas data teknis ini HANYA jika ditanya pengguna.`;

    // Append the new message
    formattedHistory.push({
      role: 'user',
      parts: [{ text: newMessage }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedHistory,
      config: {
        systemInstruction: systemContext
      }
    });

    return response.text;
  } catch (error) {
    console.error("AI Chat Error:", error);
    throw new Error('Gagal mengirim pesan: ' + error.message);
  }
};
