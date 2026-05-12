import { GoogleGenAI } from '@google/genai';

export const getAIAnalysis = async (projectData, statsData, itemStatsData, constructMetrics, descriptiveSummary) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('API Key tidak ditemukan. Pastikan VITE_GEMINI_API_KEY sudah disetting pada file .env');
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });

    let rawDataString = '';
    if (projectData.responses && projectData.responses.length > 0) {
      // Ambil maksimal 50 baris pertama agar token tidak jebol
      const sampleResponses = projectData.responses.slice(0, 50);
      const rows = sampleResponses.map(res => {
        let readableRes = { Responden: res.testerName || 'Anonymous' };
        if (projectData.questions) {
          projectData.questions.forEach(q => {
            if (res[q.id] !== undefined) {
              readableRes[q.text] = res[q.id];
            }
          });
        }
        return JSON.stringify(readableRes);
      });
      rawDataString = '\n\nBERIKUT ADALAH SAMPEL JAWABAN RESPONDEN:\n' + rows.join('\n');
    }

    // Short prompt to save tokens/quota
    const prompt = `Analisislah hasil kuesioner untuk produk/proyek "${projectData.name}" (Deskripsi: ${projectData.description}). Total responden n=${statsData.totalResponses}, jumlah pertanyaan=${projectData.questions.length}. Reliabilitas Alpha: ${statsData.alpha?.toFixed(3)} (${statsData.statusLabel}). ${rawDataString}\n\nBerikan kesimpulan akhir sangat singkat (2-3 kalimat) tentang kelayakan produk/instrumen ini dan saran utama. Bahasa Indonesia formal. Jangan sampai salah baca data ya!!!`;

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

    // Map question IDs to text for AI context
    const questionsText = projectData.questions.reduce((acc, q) => ({ ...acc, [q.id]: q.text }), {});

    let rawDataString = '';
    if (projectData.responses && projectData.responses.length > 0) {
      // Ambil maksimal 150 baris pertama
      const sampleResponses = projectData.responses.slice(0, 150);
      const rows = sampleResponses.map(res => {
        let readableRes = { Responden: res.testerName || 'Anonymous' };
        if (projectData.questions) {
          projectData.questions.forEach(q => {
            if (res[q.id] !== undefined) {
              readableRes[q.text] = res[q.id];
            }
          });
        }
        return JSON.stringify(readableRes);
      });
      rawDataString = '\n\nSAMPEL DATA MENTAH (Termasuk info responden/produk tambahan):\n' + rows.join('\n');
    }

    // Create system context
    const systemContext = `Anda asisten peneliti untuk ${userName}. Jawab sangat singkat & padat (B. Indo), gunakan bahasa mahasiswa yang santai jangan terlalu kaku.
    DATA PRODUK/PROYEK: 
    - Nama: ${projectData.name}
    - Deskripsi Produk: ${projectData.description}
    - Alpha: ${statsData.alpha?.toFixed(3)}, AVE: ${constructMetrics?.ave?.toFixed(3)}, CR: ${constructMetrics?.cr?.toFixed(3)}
    
    METRIK PERTANYAAN (KUESIONER):
    ${itemStatsData.map(s => `- "${questionsText[s.id] || s.id}" (Mean: ${s.mean?.toFixed(2)}, R-Corr: ${s.correlation?.toFixed(2)})`).join('\n')}
    ${rawDataString}
    
    PENTING: Selalu ingat bahwa data ini berkaitan dengan produk/proyek di atas. Bahas metrik teknis HANYA jika ditanya pengguna.`;

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
