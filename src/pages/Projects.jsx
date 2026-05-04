import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllProjects, deleteProject } from '../utils/storage';
import { calculateCronbachAlpha, getReliabilityStatus } from '../utils/statistics';
import { FolderKanban, Plus, Trash2, ArrowRight } from 'lucide-react';

const Projects = () => {
  const { currentUser } = useAuth();
  const [projectsData, setProjectsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      const allProjects = await getAllProjects(currentUser?.email);
      const processed = allProjects.map(proj => {
        const itemKeys = proj.questions.map(q => q.id);
        const alpha = calculateCronbachAlpha(proj.responses, itemKeys);
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

  const handleDelete = async (e, id, name) => {
    e.preventDefault();
    if (window.confirm(`Yakin ingin menghapus proyek "${name}"? Data tidak dapat dikembalikan.`)) {
      await deleteProject(id);
      setProjectsData(prev => prev.filter(p => p.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderKanban className="text-blue-600" />
            All QA Projects
          </h1>
          <p className="text-slate-500 text-sm mt-1">Daftar seluruh instrumen pengujian yang ada di sistem.</p>
        </div>
        <Link 
          to="/projects/new" 
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={16} />
          CREATE NEW PROJECT
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projectsData.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-100 border-dashed">
            Belum ada proyek kuesioner. Silakan buat baru.
          </div>
        )}
        
        {projectsData.map(project => (
          <Link 
            key={project.id} 
            to={`/projects/${project.id}`}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all group flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors line-clamp-2">
                {project.name}
              </h3>
              <button 
                onClick={(e) => handleDelete(e, project.id, project.name)}
                className="text-slate-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                title="Hapus Proyek"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 mb-6 flex-1 line-clamp-3">
              {project.description || "Tidak ada deskripsi."}
            </p>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full text-white font-medium ${project.statusObj.color}`}>
                  α = {project.alpha !== null ? project.alpha.toFixed(3) : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>{project.responses.length} Responden</span>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Projects;
