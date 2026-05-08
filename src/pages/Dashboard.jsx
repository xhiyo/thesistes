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
            <p className="text-sm text-slate-500 font-medium">Active reli Projects</p>
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

      <div className="grid grid-cols-1 gap-6">
        {/* Project List - Expanded */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Project Reliability Monitoring</h3>
            <Link to="/projects" className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest border-b-2 border-blue-100 pb-1">View All Projects</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projectsData.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-400 text-sm">No projects found.</p>
              </div>
            ) : (
              projectsData.map(project => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-slate-800 truncate pr-4">
                      {project.name}
                    </h4>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        if (window.confirm(`Delete project?`)) {
                          const { deleteProject } = await import('../utils/storage');
                          await deleteProject(project.id);
                          setProjectsData(prev => prev.filter(p => p.id !== project.id));
                        }
                      }}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium uppercase tracking-wider">Cronbach's Alpha</span>
                      <span className={`font-bold ${project.alpha >= 0.7 ? 'text-green-600' : 'text-amber-600'}`}>
                        {project.alpha !== null ? project.alpha.toFixed(3) : '---'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-50">
                      <span className="text-slate-400 font-medium uppercase tracking-wider">Responses</span>
                      <span className="font-bold text-slate-700">{project.responses.length}</span>
                    </div>

                    <div className={`mt-2 py-1 text-center rounded text-[10px] font-bold uppercase tracking-widest ${project.statusObj.bg} ${project.statusObj.color} border ${project.statusObj.border}`}>
                      {project.statusObj.label}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
