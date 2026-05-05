import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProjectById, saveProject } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { Save, CheckCircle2 } from 'lucide-react';

const TesterForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [project, setProject] = useState(null);
  const [testerName, setTesterName] = useState('');
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      const currentProject = await getProjectById(id);
      if (currentProject) {
        setProject(currentProject);
      }
    };
    fetchProject();

    // Pre-fill name if logged in
    if (currentUser?.name) {
      setTesterName(currentUser.name);
    }
  }, [id, currentUser]);

  const handleScoreChange = (questionId, score) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: parseInt(score)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate
    if (!testerName.trim() || Object.keys(answers).length !== project.questions.length) {
      alert("Mohon isi dan jawab seluruh pertanyaan.");
      setIsSubmitting(false);
      return;
    }

    try {
      const newResponse = {
        id: `res-${Date.now()}`,
        testerName: testerName,
        testerEmail: currentUser?.email || '',
        ...answers
      };

      const updatedProject = {
        ...project,
        responses: [...project.responses, newResponse]
      };

      await saveProject(updatedProject);
      setIsSubmitted(true);
    } catch (err) {
      alert("Gagal menyimpan ke database: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!project) return <div className="p-8">Loading form...</div>;

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-sm border border-slate-100 text-center animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Terima Kasih!</h2>
        <p className="text-slate-600 mb-8">
          Data respons kuesioner Anda untuk proyek <strong>{project.name}</strong> telah berhasil disimpan.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
        <div className="mb-8 border-b border-slate-100 pb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Submit UAT Testing Results</h1>
            <p className="text-slate-500 mt-2">Project: <strong>{project.name}</strong></p>
            <p className="text-sm text-slate-400 mt-1">Please answer truthfully to ensure accurate reliability calculation.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nama Lengkap</label>
            <input
              type="text"
              value={testerName}
              onChange={(e) => setTesterName(e.target.value)}
              placeholder="Masukkan nama lengkap Anda"
              className="w-full md:w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Usia</label>
            <input
              type="number"
              placeholder="Masukkan Usia anda"
              className="w-full md:w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Domisili</label>
            <input
              type="text"
              placeholder="Masukkan domisili lengkap anda"
              className="w-full md:w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50"
              required
            />
          </div>

          <div className="space-y-6">
            <h3 className="font-semibold text-slate-800 text-lg">Questionnaire (1: Strongly Disagree - 5: Strongly Agree)</h3>

            {project.questions.map((q, idx) => (
              <div key={q.id} className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                <p className="font-medium text-slate-800 mb-4">
                  <span className="text-blue-600 mr-2">{idx + 1}.</span>
                  {q.text}
                </p>

                <div className="flex gap-4 flex-wrap">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <label
                      key={score}
                      className={`flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer transition-all border-2 ${answers[q.id] === score
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={score}
                        className="hidden"
                        onChange={() => handleScoreChange(q.id, score)}
                        required
                      />
                      <span>{score}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                'Saving Data...'
              ) : (
                <>
                  <Save size={20} />
                  Submit Results
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TesterForm;
