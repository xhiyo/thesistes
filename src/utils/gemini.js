import { GoogleGenAI } from '@google/genai';

export const getAIAnalysis = async (projectData, statsData, itemStatsData) => {
  // Use Vite environment variable instead of localStorage
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('API Key tidak ditemukan. Pastikan VITE_GEMINI_API_KEY sudah disetting pada file .env');
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Construct the prompt
    const prompt = `
      Anda adalah seorang ahli Data Scientist dan Psikometrika. 
      Tugas Anda adalah menganalisis hasil uji reliabilitas instrumen kuesioner berikut dan memberikan laporan profesional singkat.
      Gunakan bahasa Indonesia yang formal, mudah dipahami, dan langsung ke intinya.

      --- DATA PROYEK ---
      Nama Proyek: ${projectData.name}
      Jumlah Pertanyaan (Item): ${projectData.questions.length}
      Jumlah Responden: ${statsData.totalResponses}
      
      --- STATISTIK RELIABILITAS ---
      Cronbach's Alpha (α): ${typeof statsData.alpha === 'number' ? statsData.alpha.toFixed(3) : 'N/A'}
      Status Reliabilitas: ${statsData.statusLabel || 'Unknown'}
      Tingkat Kepuasan Rata-rata: ${statsData.overallSatisfaction}%

      --- ANALISIS ITEM (PERTANYAAN) ---
      Berikut adalah metrik setiap pertanyaan (Mean = Rata-rata Skor, Variance = Varians, Correlation = Korelasi Item-Total):
      ${projectData.questions.map((q, i) => {
      const s = itemStatsData.find(stat => stat.id === q.id) || {};
      return `Q${i + 1}. "${q.text}" -> Mean: ${s.mean?.toFixed(2)}, Variance: ${s.variance?.toFixed(2)}, Korelasi: ${s.correlation?.toFixed(2)}`;
    }).join('\n')}

      --- INSTRUKSI ANALISIS ---
      Berikan laporan dalam format Markdown (*bold*, *lists*) dengan struktur berikut:
      1. **Kesimpulan Utama**: Apa arti dari skor Alpha ini? Apakah kuesioner ini layak digunakan?
      2. **Temuan Kritis**: Apakah ada pertanyaan (Q) yang memiliki korelasi sangat rendah (mendekati 0 atau negatif) yang merusak reliabilitas keseluruhan? Sebutkan pertanyaannya jika ada.
      3. **Rekomendasi Tindakan**: Apa yang harus dilakukan oleh pembuat kuesioner selanjutnya? (Misalnya: membuang pertanyaan tertentu, merevisi kata-kata, atau kuesioner sudah sempurna).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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

export const sendAIChatMessage = async (projectData, statsData, itemStatsData, chatHistory, newMessage) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('API Key tidak ditemukan. Pastikan VITE_GEMINI_API_KEY sudah disetting pada file .env');
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Format chat history for Gemini
    const formattedHistory = chatHistory.map(msg => {
      // Ignore errors or loading messages
      if (msg.role === 'error' || msg.role === 'system') return null;
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      };
    }).filter(Boolean);

    // Create system context
    const systemContext = `
      Anda adalah asisten Data Scientist dan Psikometrika yang membantu menganalisis hasil kuesioner.
      Jawab dalam bahasa Indonesia yang ramah, mudah dipahami, dan informatif.
      
      --- KONTEKS DATA PROYEK SAAT INI ---
      Nama Proyek: ${projectData.name}
      Jumlah Responden: ${statsData.totalResponses}
      Cronbach's Alpha (α): ${typeof statsData.alpha === 'number' ? statsData.alpha.toFixed(3) : 'N/A'} (Status: ${statsData.statusLabel || 'Unknown'})
      Tingkat Kepuasan Rata-rata: ${statsData.overallSatisfaction}%
      
      Detail Pertanyaan:
      ${projectData.questions.map((q, i) => {
      const s = itemStatsData.find(stat => stat.id === q.id) || {};
      return `Q${i + 1}: "${q.text}" (Mean: ${s.mean?.toFixed(2)}, Korelasi Item-Total: ${s.correlation?.toFixed(2)})`;
    }).join('\n')}
      ------------------------------------
    `;

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
