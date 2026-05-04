import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllProjects } from '../utils/storage';
import { calculateCronbachAlpha, getReliabilityStatus } from '../utils/statistics';
import { Activity, CheckCircle, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [projectsData, setProjectsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      const allProjects = await getAllProjects(currentUser?.email);
      const processed = allProjects.map(proj => {
        const itemKeys = proj.questions.map(q => q.id);
        const alpha = calculateCronbachAlpha(proj.responses || [], itemKeys);
        const status = getReliabilityStatus(alpha);

        return {
          ...proj,
          alpha,
          statusObj: status
        };
      });
      setProjectsData(processed);
      setLoading(false);
    };
    
    fetchProjects();
  }, [currentUser?.email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalProjects = projectsData.length;
  const reliableProjects = projectsData.filter(p => p.alpha >= 0.7).length;
  const warningProjects = totalProjects - reliableProjects;

  const chartData = projectsData.map(p => ({
    name: p.name.split(' ')[0], // short name
    alpha: p.alpha || 0,
    fill: p.alpha >= 0.7 ? '#10b981' : '#f59e0b' // green or amber
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-lg text-blue-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Active QA Projects</p>
            <p className="text-3xl font-bold text-slate-800">{totalProjects}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-lg text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Reliable Instruments</p>
            <p className="text-3xl font-bold text-slate-800">{reliableProjects}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-amber-100 p-4 rounded-lg text-amber-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Needs Revision</p>
            <p className="text-3xl font-bold text-slate-800">{warningProjects}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Overall Reliability (Cronbach's Alpha)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1]} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="alpha" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Recent Projects</h3>
            <Link to="/projects" className="text-sm text-blue-600 hover:underline">View All</Link>
          </div>

          <div className="space-y-4">
            {projectsData.map(project => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block p-4 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-slate-800 group-hover:text-blue-700 block flex-1">
                    {project.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async (e) => {
                        e.preventDefault(); // Prevent Link navigation
                        if (window.confirm(`Yakin ingin menghapus proyek "${project.name}"? Data tidak dapat dikembalikan.`)) {
                          const { deleteProject } = await import('../utils/storage');
                          await deleteProject(project.id);
                          setProjectsData(prev => prev.filter(p => p.id !== project.id));
                        }
                      }}
                      className="text-slate-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                      title="Hapus Proyek"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full text-white ${project.statusObj.color}`}>
                    α = {project.alpha !== null ? project.alpha.toFixed(3) : 'N/A'}
                  </span>
                  <span className="text-xs text-slate-500">{project.responses.length} Responden</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
