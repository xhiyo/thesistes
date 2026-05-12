import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjectById, saveProject } from '../utils/storage';
import {
  calculateCronbachAlpha,
  getReliabilityStatus,
  calculateItemStats,
  calculateConstructMetrics,
  calculateDescriptiveSummary
} from '../utils/statistics';
import { ArrowLeft, Plus, Sparkles, Bot, Loader2, Send, Shield, BarChart3, TrendingUp, AlertCircle, Share2, Check, Trash2 } from 'lucide-react';
import { getAIAnalysis, sendAIChatMessage } from '../utils/gemini';
import ReactMarkdown from 'react-markdown';

const ProjectDetail = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alpha, setAlpha] = useState(null);
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState({});
  const [itemStats, setItemStats] = useState([]);
  const [constructMetrics, setConstructMetrics] = useState({ cr: null, ave: null });
  const [descriptiveSummary, setDescriptiveSummary] = useState({});

  // AI States
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShareLink = () => {
    const link = `${window.location.origin}/test/${project.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages]);

  // Function to calculate all statistics based on project data
  const updateCalculations = (currentProject) => {
    if (!currentProject || !currentProject.questions) return;

    // Hanya ambil ID pertanyaan berskala likert untuk analisis statistik
    const itemKeys = currentProject.questions
      .filter(q => !q.type || q.type === 'likert')
      .map(q => q.id);
    const responses = currentProject.responses || [];

    const calcAlpha = calculateCronbachAlpha(responses, itemKeys);
    setAlpha(calcAlpha);
    setStatus(getReliabilityStatus(calcAlpha));

    const iStats = calculateItemStats(responses, itemKeys);
    setItemStats(iStats);
    setConstructMetrics(calculateConstructMetrics(iStats));
    setDescriptiveSummary(calculateDescriptiveSummary(responses, itemKeys));

    if (responses.length > 0 && itemKeys.length > 0) {
      let totalScoreSum = 0;
      let maxPossible = responses.length * itemKeys.length * 5;

      responses.forEach(res => {
        itemKeys.forEach(key => {
          totalScoreSum += (res[key] || 0);
        });
      });

      setStats({
        totalResponses: responses.length,
        overallSatisfaction: Math.round((totalScoreSum / maxPossible) * 100) || 0
      });
    } else {
      setStats({ totalResponses: 0, overallSatisfaction: 0 });
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus pertanyaan ini? Seluruh data jawaban untuk pertanyaan ini juga akan ikut terhapus dari sistem.")) return;

    const updatedQuestions = project.questions.filter(q => q.id !== questionId);
    const updatedResponses = (project.responses || []).map(res => {
      const newRes = { ...res };
      delete newRes[questionId];
      return newRes;
    });

    const updatedProject = {
      ...project,
      questions: updatedQuestions,
      responses: updatedResponses
    };

    try {
      await saveProject(updatedProject);
      setProject(updatedProject);
      updateCalculations(updatedProject);
      alert("Pertanyaan berhasil dihapus.");
    } catch (err) {
      alert("Gagal menghapus pertanyaan: " + err.message);
    }
  };

  const handleGenerateAI = async () => {
    setIsAnalyzing(true);
    try {
      const fullStats = { ...stats, alpha, statusLabel: status?.label };
      const result = await getAIAnalysis(project, fullStats, itemStats, constructMetrics, descriptiveSummary);
      setAiAnalysis(result);
      setChatMessages([{ role: 'model', content: result }]);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsSendingChat(true);
    try {
      const fullStats = { ...stats, alpha, statusLabel: status?.label };
      const reply = await sendAIChatMessage(project, fullStats, itemStats, chatMessages, userMessage, constructMetrics, descriptiveSummary, currentUser?.displayName || currentUser?.email);
      setChatMessages(prev => [...prev, { role: 'model', content: reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'error', content: err.message }]);
    } finally {
      setIsSendingChat(false);
    }
  };

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const currentProject = await getProjectById(id);
        if (currentProject) {
          setProject(currentProject);
          updateCalculations(currentProject);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-400 font-medium animate-pulse">Loading project data...</div>;
  if (!project) return <div className="p-8 text-center font-medium text-slate-500">Project not found.</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto bg-slate-50 min-h-screen font-sans">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
        <div>
          <Link to="/" className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1 mb-1 uppercase tracking-wider transition-colors">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">{project.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleShareLink}
            className={`${copied ? 'bg-green-600' : 'bg-slate-900'} text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95`}
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? 'LINK COPIED!' : 'SHARE LINK'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* LEFT COLUMN */}
        <div className="xl:col-span-2 space-y-6">

          {/* Reliability Card */}
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="text-center md:text-left relative z-10">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-3">Cronbach's Alpha Reliability</p>
              <h2 className="text-8xl font-bold text-slate-900 leading-none mb-4 tracking-tighter">
                {alpha !== null ? alpha.toFixed(3) : '.---'}
              </h2>
              <div className={`inline-flex px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest ${status?.bg} ${status?.color} border ${status?.border}`}>
                {status?.label}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 w-full max-w-sm relative z-10">
              <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">CR (Composite)</p>
                <p className="text-3xl font-bold text-slate-800">{constructMetrics.cr || '--'}</p>
              </div>
              <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">AVE (Validity)</p>
                <p className="text-3xl font-bold text-slate-800">{constructMetrics.ave || '--'}</p>
              </div>
            </div>
          </div>

          {/* Descriptive Grid */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={20} className="text-blue-500" />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-[0.2em]">Descriptive Statistics Summary</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Mean Score', val: descriptiveSummary.mean },
                { label: 'N (Resp)', val: descriptiveSummary.n },
                { label: 'K (Items)', val: descriptiveSummary.k }
              ].map((item, i) => (
                <div key={i} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 text-center flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-tighter">{item.label}</p>
                  {item.desc && <p className="text-[8px] text-slate-400 mb-2 leading-tight">{item.desc}</p>}
                  <p className="text-2xl font-bold text-slate-800">{item.val ?? '--'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Item Table */}
          <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={16} className="text-indigo-500" />
              <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-widest">Full Psychometric Item Metrics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-slate-300">
                    <th className="pb-4 font-bold uppercase pl-2">Item</th>
                    <th className="pb-4 font-bold text-center px-2">MEAN</th>
                    <th className="pb-4 font-bold text-center px-2">STD DEV</th>
                    <th className="pb-4 font-bold text-center px-2">SKEW</th>
                    <th className="pb-4 font-bold text-center px-2">KURT</th>
                    <th className="pb-4 font-bold text-center px-2">r</th>
                    <th className="pb-4 font-bold text-center px-2">R²</th>
                    <th className="pb-4 font-bold text-center px-2">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {project.questions.filter(q => !q.type || q.type === 'likert').map((q, i) => {
                    const s = itemStats.find(stat => stat.id === q.id) || {};
                    return (
                      <tr key={q.id} className="group transition-all">
                        <td className="py-4 px-4 bg-slate-50/50 group-hover:bg-indigo-50/30 rounded-l-2xl font-bold text-slate-700">
                          <span className="text-slate-300 mr-2">Q{i + 1}.</span> {q.text}
                        </td>
                        <td className="py-4 text-center bg-slate-50/50 group-hover:bg-indigo-50/30 text-slate-500 font-medium">{s.mean || '--'}</td>
                        <td className="py-4 text-center bg-slate-50/50 group-hover:bg-indigo-50/30 text-slate-500 font-medium">{s.stdDev || '--'}</td>
                        <td className="py-4 text-center bg-slate-50/50 group-hover:bg-indigo-50/30 text-slate-500 font-medium">{s.skewness !== null && s.skewness !== undefined ? s.skewness : '--'}</td>
                        <td className="py-4 text-center bg-slate-50/50 group-hover:bg-indigo-50/30 text-slate-500 font-medium">{s.kurtosis !== null && s.kurtosis !== undefined ? s.kurtosis : '--'}</td>
                        <td className="py-4 text-center bg-slate-50/50 group-hover:bg-indigo-50/30 font-black text-slate-700">{s.correlation || '--'}</td>
                        <td className="py-4 text-center bg-slate-50/50 group-hover:bg-indigo-50/30 text-slate-400 font-medium">{s.rSquared || '--'}</td>
                        <td className="py-4 px-4 text-center bg-slate-50/50 group-hover:bg-indigo-50/30 rounded-r-2xl">
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                            title="Hapus Pertanyaan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (AI Assistant) */}
        <div className="xl:col-span-1">
          <div className="sticky top-0 h-fit">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 flex flex-col h-[700px] overflow-hidden">
              <div className="p-5 bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <Bot size={20} className="text-indigo-100" />
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-widest">Suki AI</h3>
                    <p className="text-[9px] text-indigo-200 font-medium uppercase tracking-[0.2em]">Active AI Insights</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/30">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                    <Bot size={48} className="mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">Awaiting Analysis</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] shadow-sm ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none'
                      : 'bg-white text-slate-800 p-5 rounded-2xl rounded-tl-none border border-slate-100 prose prose-sm prose-slate'
                      }`}>
                      {msg.role === 'user' ? (
                        <p className="text-[11px] font-medium leading-relaxed">{msg.content}</p>
                      ) : (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                {isSendingChat && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-3 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendChat} className="p-4 bg-white border-t border-slate-50 flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask about your research..."
                  className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-medium focus:ring-1 focus:ring-indigo-500/20"
                />
                <button className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"><Send size={16} /></button>
              </form>
            </div>
          </div>
        </div>

      </div>

      {/* RAW DATA */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 mt-6">
        <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-widest mb-6">Raw Dataset Verification</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-4 font-bold uppercase tracking-wider whitespace-nowrap">Respondent</th>
                
                {/* Text Questions Headers */}
                {project.questions.filter(q => q.type === 'text').map((q) => (
                  <th key={q.id} className="px-4 py-4 text-center font-bold text-slate-400 whitespace-nowrap max-w-[150px] truncate" title={q.text}>
                    {q.text}
                  </th>
                ))}

                {/* Likert Questions Headers (Q1, Q2, etc) */}
                {project.questions.filter(q => !q.type || q.type === 'likert').map((_, i) => (
                  <th key={i} className="px-2 py-4 text-center font-bold text-indigo-600 whitespace-nowrap">
                    Q{i + 1}
                  </th>
                ))}
                
                <th className="px-4 py-4 text-center font-bold text-indigo-800 border-l border-slate-200 whitespace-nowrap">TOTAL (Likert)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {project.responses.map(res => {
                const likertQuestions = project.questions.filter(q => !q.type || q.type === 'likert');
                const textQuestions = project.questions.filter(q => q.type === 'text');
                
                const totalLikert = likertQuestions.reduce((s, q) => s + (Number(res[q.id]) || 0), 0);

                return (
                  <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-500 whitespace-nowrap">{res.testerName || 'Anonymous'}</td>
                    
                    {/* Text Question Answers */}
                    {textQuestions.map(q => (
                      <td key={q.id} className="px-4 py-3 text-center text-slate-500 max-w-[150px] truncate" title={res[q.id] !== undefined ? String(res[q.id]) : ''}>
                        {res[q.id] !== undefined ? res[q.id] : '--'}
                      </td>
                    ))}

                    {/* Likert Question Answers */}
                    {likertQuestions.map(q => (
                      <td key={q.id} className="px-2 py-3 text-center text-slate-400 font-medium">
                        {res[q.id] !== undefined ? res[q.id] : '--'}
                      </td>
                    ))}
                    
                    <td className="px-4 py-3 text-center font-bold text-indigo-600 border-l border-slate-100 tabular-nums">{totalLikert}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ProjectDetail;
