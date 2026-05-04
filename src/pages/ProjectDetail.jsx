import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProjectById, saveProject } from '../utils/storage';
import { calculateCronbachAlpha, getReliabilityStatus, calculateItemStats } from '../utils/statistics';
import { ArrowLeft, Plus, Download, AlertCircle, CheckCircle2, Sparkles, Bot, Loader2, Send, User } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { getAIAnalysis, sendAIChatMessage } from '../utils/gemini';
import ReactMarkdown from 'react-markdown';

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alpha, setAlpha] = useState(null);
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState({});
  const [itemStats, setItemStats] = useState([]);

  // AI States
  const [aiAnalysis, setAiAnalysis] = useState(null); // Keeps the initial summary
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [aiError, setAiError] = useState(null);

  const contentRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages]);

  const handleDownloadPDF = async () => {
    let isDark = false;
    try {
      const element = contentRef.current;
      if (!element) {
        alert("Gagal membaca area laporan. Muat ulang halaman.");
        return;
      }

      alert("Memproses dokumen PDF beresolusi tinggi. Mohon tunggu beberapa detik...");

      isDark = document.documentElement.classList.contains('dark');
      if (isDark) document.documentElement.classList.remove('dark');

      // Wait a moment for the DOM to apply light mode styles if they changed
      await new Promise(resolve => setTimeout(resolve, 200));

      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = element.offsetWidth;
      const imgHeight = element.offsetHeight;
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

      let heightLeft = pdfHeight;
      let position = 10; // Top margin for first page

      // Page 1
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= (pageHeight - 10);

      // Subsequent pages if the content is too long
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`QA_Report_${project?.name || 'Project'}.pdf`);

      if (isDark) document.documentElement.classList.add('dark');

    } catch (error) {
      alert("Error sistem PDF: " + error.message);
      if (isDark) document.documentElement.classList.add('dark');
    }
  };

  const handleGenerateAI = async () => {
    setIsAnalyzing(true);
    setAiError(null);
    try {
      const fullStats = { ...stats, alpha, statusLabel: status?.label };
      const result = await getAIAnalysis(project, fullStats, itemStats);
      setAiAnalysis(result);
      setChatMessages([{ role: 'model', content: result }]);
    } catch (err) {
      setAiError(err.message);
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
      const reply = await sendAIChatMessage(project, fullStats, itemStats, chatMessages, userMessage);
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
      const currentProject = await getProjectById(id);

      if (currentProject) {
        setProject(currentProject);
        const itemKeys = currentProject.questions.map(q => q.id);

        const calcAlpha = calculateCronbachAlpha(currentProject.responses, itemKeys);
        setAlpha(calcAlpha);
        setStatus(getReliabilityStatus(calcAlpha));

        const iStats = calculateItemStats(currentProject.responses, itemKeys);
        setItemStats(iStats);

        if (currentProject.responses.length > 0) {
          let totalScoreSum = 0;
          let maxPossibleScore = currentProject.responses.length * currentProject.questions.length * 5;
          let dist = { 'Highly Satisfied': 0, 'Satisfied': 0, 'Neutral': 0, 'Dissatisfied': 0 };

          currentProject.responses.forEach(res => {
            currentProject.questions.forEach(q => {
              const val = res[q.id] || 0;
              totalScoreSum += val;
              if (val === 5) dist['Highly Satisfied']++;
              else if (val === 4) dist['Satisfied']++;
              else if (val === 3) dist['Neutral']++;
              else if (val > 0) dist['Dissatisfied']++;
            });
          });

          setStats({
            totalResponses: currentProject.responses.length,
            overallSatisfaction: Math.round((totalScoreSum / maxPossibleScore) * 100) || 0,
            distribution: dist
          });
        } else {
          setStats({
            totalResponses: 0,
            overallSatisfaction: 0,
            distribution: {}
          });
        }
      }
      setLoading(false);
    };

    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) return <div className="p-8">Project not found...</div>;

  // Donut chart data
  const pieData = stats.distribution ? [
    { name: 'Highly Satisfied', value: stats.distribution['Highly Satisfied'], color: '#3b82f6' },
    { name: 'Satisfied', value: stats.distribution['Satisfied'], color: '#0ea5e9' },
    { name: 'Neutral', value: stats.distribution['Neutral'], color: '#f59e0b' },
    { name: 'Dissatisfied', value: stats.distribution['Dissatisfied'], color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  // Actual Item-Total correlations for the bar chart
  const barData = project.questions.map((q, idx) => {
    const itemStat = itemStats.find(s => s.id === q.id);
    const correlation = itemStat && itemStat.correlation ? itemStat.correlation : 0;

    return {
      name: `Q${idx + 1}`,
      correlation: correlation
    };
  });

  // Premium SVG Gauge Component
  const SemiCircleGauge = ({ value, label, colorClass }) => {
    let percentage = value <= 1 && value >= -1 ? value * 100 : value;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;

    const radius = 64;
    const strokeWidth = 14;
    const cx = 80;
    const cy = 74;
    const circumference = Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="w-40 h-20 flex justify-center mb-1">
          <svg viewBox="0 0 160 85" className="w-full h-full overflow-visible drop-shadow-sm">
            <defs>
              <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>

            {/* Background Arc */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Foreground Arc */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke="url(#gauge-grad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />

            {/* Needle Group */}
            <g
              className="transition-all duration-1000 ease-out"
              style={{ transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${(percentage / 100) * 180}deg)` }}
            >
              {/* Tapered Needle */}
              <path d={`M ${cx - radius + 8} ${cy} L ${cx} ${cy - 3} L ${cx} ${cy + 3} Z`} fill="#334155" />
              <circle cx={cx - radius + 8} cy={cy} r="2" fill="#334155" />
            </g>

            {/* Center Pivot */}
            <circle cx={cx} cy={cy} r="6" fill="#1e293b" stroke="white" strokeWidth="2.5" className="drop-shadow-sm" />
          </svg>
        </div>
        {label && <p className={`font-bold text-sm ${colorClass}`}>{label}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 bg-[#f4f7f9] p-4 rounded-xl">
      {/* Action Bar (Not Printed) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm print:hidden">
        <div>
          <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-2 transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">QA Report Console</h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              const url = `${window.location.origin}/test/${project.id}`;
              navigator.clipboard.writeText(url);
              alert("Link disalin! Bagikan ke Tester:\n" + url);
            }}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"
          >
            <Download size={16} className="rotate-180" />
            SHARE TEST LINK
          </button>
          <Link
            to={`/test/${project.id}`}
            target="_blank"
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus size={16} />
            ADD TESTER RESPONSE
          </Link>
          {!aiAnalysis && !isAnalyzing && (
            <button
              onClick={handleGenerateAI}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Bot size={16} />
              GENERATE AI ANALYSIS
            </button>
          )}
          {isAnalyzing && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
              <Loader2 size={16} className="animate-spin" />
              ANALYZING...
            </div>
          )}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Download size={16} />
            DOWNLOAD PDF
          </button>
        </div>
      </div>

      {/* Printable Area */}
      <div ref={contentRef} className="print:p-8 print:bg-white print:block space-y-6">

        {/* Printable Header (Only visible when printing or in normal view) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-0 print:mb-8">
          <div className="flex justify-between items-end border-b border-slate-100 pb-4 print:border-slate-800 print:pb-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Statistical Validity & Summary Report</h1>
              <p className="text-slate-500 text-sm mt-1 font-medium">Project Name: <span className="text-slate-800 font-bold">{project.name}</span></p>
            </div>
            <div className="text-right text-xs text-slate-400 print:text-black">
              Generated by QA CoreMetrics<br />
              {new Date().toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>

        {/* AI Analysis & Chat Section */}
        {(chatMessages.length > 0 || aiError) && (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-blue-100 mb-6 relative overflow-hidden flex flex-col max-h-[800px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>

            <div className="flex items-center justify-between mb-4 relative z-10 shrink-0">
              <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-2">
                <Sparkles size={18} className="text-blue-600" />
                AI Assistant
              </h3>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto mb-4 pr-2 space-y-4">
              {aiError && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                  {aiError}
                </div>
              )}

              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm border ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white border-indigo-700 rounded-tr-sm'
                    : msg.role === 'error'
                      ? 'bg-red-50 text-red-600 border-red-100 rounded-tl-sm'
                      : 'bg-white text-slate-800 border-indigo-100/50 rounded-tl-sm prose prose-sm prose-slate max-w-none prose-headings:text-indigo-900 prose-a:text-blue-600 prose-strong:text-indigo-800'
                    }`}>
                    {msg.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap m-0">{msg.content}</p>
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {isSendingChat && (
                <div className="flex justify-start">
                  <div className="bg-white border border-indigo-100/50 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2">
                    <Loader2 size={16} className="text-indigo-600 animate-spin" />
                    <span className="text-sm text-slate-500 font-medium">AI is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="relative z-10 shrink-0 mt-2 flex gap-2 print:hidden">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask AI anything about these results..."
                className="flex-1 bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                disabled={isSendingChat}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSendingChat}
                className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left Column: Reliability & Table */}
          <div className="xl:col-span-2 space-y-6">

            <div className="flex flex-col md:flex-row gap-6">
              {/* System Reliability Card */}
              <div className="bg-white p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 border border-slate-100 flex flex-col justify-between">
                <h3 className="text-lg font-bold text-slate-800 mb-6">System Reliability</h3>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Cronbach's Alpha (α)</p>
                    <p className="text-6xl font-bold text-slate-900 mb-2">
                      α = {alpha !== null ? alpha.toFixed(2) : '-.--'}
                    </p>
                    <p className={`font-bold text-lg ${status?.text || 'text-slate-500'}`}>
                      {status?.label ? status.label.toUpperCase() : 'NO DATA'}
                    </p>
                  </div>
                  <div className="pb-4">
                    <SemiCircleGauge
                      value={alpha || 0}
                      label=""
                    />
                  </div>
                </div>
              </div>

              {/* Small Gauges */}
              <div className="flex flex-col justify-between gap-4 w-full md:w-48 shrink-0">
                <div className="bg-white p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center flex flex-col items-center justify-center flex-1">
                  <p className="text-xs font-bold text-slate-800 mb-2">Overall Success Rate</p>
                  <SemiCircleGauge value={alpha !== null ? 1 : 0} label="" />
                  <p className="text-xs font-medium text-slate-600 mt-[-10px]">Tests Run: {stats.totalResponses || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center flex flex-col items-center justify-center flex-1">
                  <p className="text-xs font-bold text-slate-800 mb-2">Average Satisfaction</p>
                  <SemiCircleGauge value={(stats.overallSatisfaction || 0) / 100} label="" />
                  <p className="text-xs font-medium text-slate-600 mt-[-10px]">Score: {stats.overallSatisfaction || 0}%</p>
                </div>
              </div>
            </div>

            {/* Question Statistics */}
            <div className="bg-white p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Question Statistics</h3>
              <p className="text-xs text-slate-500 mb-4">Real-time Item Mean and Variance extraction.</p>

              <table className="w-full text-left text-sm">
                <thead className="border-b-2 border-slate-200">
                  <tr>
                    <th className="py-3 font-bold text-slate-700">Question</th>
                    <th className="py-3 font-bold text-slate-700 text-center">Item Mean</th>
                    <th className="py-3 font-bold text-slate-700 text-center">Item Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.questions.map((q, i) => {
                    const stat = itemStats.find(s => s.id === q.id) || { mean: 0, variance: 0 };
                    return (
                      <tr key={q.id}>
                        <td className="py-3 font-medium text-slate-800 max-w-[200px] truncate pr-4" title={q.text}>
                          {q.text}
                        </td>
                        <td className="py-3 text-center text-slate-600">{stat.mean.toFixed(2)}</td>
                        <td className="py-3 text-center text-slate-600">{stat.variance.toFixed(3)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {project.responses.length === 0 && (
                <div className="py-6 text-center text-slate-500 text-sm">
                  Insufficient data. Add tester responses to calculate statistics.
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Donut & Bar Charts */}
          <div className="space-y-6">

            {/* Score Distribution Donut */}
            <div className="bg-white p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-[340px] flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Score Distribution</h3>
              <p className="text-xs text-slate-500 mb-2">Overall satisfaction level percentage distribution</p>

              <div className="flex-1 relative flex items-center justify-center">
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-xs font-bold text-slate-500">TOTAL SCORE:</p>
                      <p className="text-3xl font-bold text-slate-800">{stats.overallSatisfaction || 0}%</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">No data available</p>
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-2">
                {pieData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                    {entry.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Item-Total Correlations Bar Chart */}
            <div className="bg-white p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-1">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Item-Total Correlations</h3>
              <p className="text-xs text-slate-500 mb-4">Dynamic, interactive charts identify underperforming survey questions.</p>

              <div className="h-48">
                {alpha !== null ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="correlation" fill="#2563eb" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Insufficient data for correlations.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Questionnaire Reference Data Table */}
        <div className="bg-white p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mt-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Raw Tester Responses ({project.responses.length})</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 border-y border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold">Tester ID</th>
                  {project.questions.map((q, idx) => (
                    <th key={q.id} className="px-4 py-3 font-bold text-center" title={q.text}>
                      Q{idx + 1}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-bold text-center border-l border-slate-200">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {project.responses.map((res) => {
                  const total = project.questions.reduce((sum, q) => sum + (res[q.id] || 0), 0);
                  return (
                    <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700">{res.testerName}</td>
                      {project.questions.map((q) => (
                        <td key={q.id} className="px-4 py-3 text-center text-slate-600">
                          {res[q.id]}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center font-bold text-slate-800 border-l border-slate-200">
                        {total}
                      </td>
                    </tr>
                  );
                })}
                {project.responses.length === 0 && (
                  <tr>
                    <td colSpan={project.questions.length + 2} className="px-4 py-8 text-center text-slate-500">
                      No responses recorded yet. Click "ADD TESTER RESPONSE" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
