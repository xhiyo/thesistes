import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Upload, FileSpreadsheet } from 'lucide-react';
import { saveProject } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

const CreateProject = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [questions, setQuestions] = useState([
    { id: `q-${Date.now()}-1`, text: '' }
  ]);

  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;


    const MAX_SIZE = 1 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("Ukuran file terlalu besar! Maksimal ukuran file adalah 100 KB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length <= 1) {
          throw new Error('File excel kosong atau tidak ada data respons (hanya ada header).');
        }

        const headerRow = data[0];
        if (headerRow.length < 2) {
          throw new Error('Format Excel tidak valid. Excel harus memiliki minimal beberapa kolom.');
        }

        // --- SMART AUTO-DETECT LIKERT COLUMNS ---
        const likertColIndices = [];
        for (let c = 0; c < headerRow.length; c++) {
          let isLikert = true;
          let hasData = false;

          for (let r = 1; r < data.length; r++) {
            const val = data[r][c];
            if (val !== undefined && val !== null && val !== '') {
              hasData = true;
              const numVal = Number(val);
              // Likert check: must be a number from 1 to 5
              if (isNaN(numVal) || !Number.isInteger(numVal) || numVal < 1 || numVal > 5) {
                isLikert = false;
                break;
              }
            }
          }
          if (isLikert && hasData) {
            likertColIndices.push(c);
          }
        }

        if (likertColIndices.length < 2) {
          throw new Error('Gagal memindai kolom Likert. Sistem tidak dapat menemukan minimal 2 kolom yang secara konsisten berisi angka 1 sampai 5. Pastikan data tidak tercampur teks.');
        }

        // --- DETECT NAME COLUMN ---
        let nameColIndex = -1;
        for (let c = 0; c < headerRow.length; c++) {
          if (!likertColIndices.includes(c)) {
            const hName = String(headerRow[c]).toLowerCase();
            if (hName.includes('nama') || hName.includes('name') || hName.includes('email') || hName.includes('responden')) {
              nameColIndex = c;
              break;
            }
          }
        }
        // If no specific name column found, just use the first non-Likert column if available
        if (nameColIndex === -1) {
          for (let c = 0; c < headerRow.length; c++) {
            if (!likertColIndices.includes(c)) {
              nameColIndex = c;
              break;
            }
          }
        }

        // --- PARSE QUESTIONS ---
        const parsedQuestions = [];
        likertColIndices.forEach((c) => {
          parsedQuestions.push({
            id: `q-${Date.now()}-${c}`,
            text: String(headerRow[c] || `Pertanyaan ${c}`)
          });
        });

        // --- PARSE RESPONSES ---
        const parsedResponses = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          // Check if this row has any valid Likert answer
          let hasAnyAnswer = false;
          for (let c of likertColIndices) {
            if (row[c] !== undefined && row[c] !== null && row[c] !== '') {
              hasAnyAnswer = true;
              break;
            }
          }
          if (!hasAnyAnswer) continue; // Skip completely blank row

          let testerName = `Tester ${parsedResponses.length + 1}`;
          if (nameColIndex !== -1 && row[nameColIndex]) {
            testerName = String(row[nameColIndex]);
          }

          const responseObj = {
            id: `res-${Date.now()}-${i}`,
            testerName
          };

          for (let j = 0; j < likertColIndices.length; j++) {
            const c = likertColIndices[j];
            let val = row[c];
            let numVal = Number(val);

            // Auto fallback for empty/invalid cell within a detected Likert column
            // We use 3 (Neutral) to ensure we don't break the Cronbach Alpha calc
            if (isNaN(numVal) || numVal < 1 || numVal > 5) {
              numVal = 3;
            }

            responseObj[parsedQuestions[j].id] = numVal;
          }
          parsedResponses.push(responseObj);
        }

        // Create Project
        const projectName = name.trim() || file.name.replace(/\.[^/.]+$/, "");
        const newProject = {
          id: `proj-${Date.now()}`,
          ownerEmail: currentUser?.email || 'anonymous',
          name: projectName,
          description: description.trim() || 'Imported from Excel',
          createdAt: new Date().toISOString().split('T')[0],
          status: 'Active',
          questions: parsedQuestions,
          responses: parsedResponses
        };

        setIsSaving(true);
        saveProject(newProject).then(() => {
          setIsSaving(false);
          alert(`Sukses membuat proyek dari Excel dengan ${parsedQuestions.length} pertanyaan dan ${parsedResponses.length} respons!`);
          navigate(`/projects/${newProject.id}`);
        }).catch(err => {
          setIsSaving(false);
          alert("Gagal menyimpan ke database: " + err.message);
        });

      } catch (err) {
        alert("Gagal Import: " + err.message);
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const addQuestion = () => {
    setQuestions([...questions, { id: `q-${Date.now()}-${questions.length + 1}`, text: '' }]);
  };

  const updateQuestion = (id, newText) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text: newText } : q));
  };

  const removeQuestion = (id) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const validQuestions = questions.filter(q => q.text.trim() !== '');
    if (validQuestions.length < 2) {
      alert("Harap masukkan setidaknya 2 pertanyaan!");
      return;
    }

    const newProject = {
      id: `proj-${Date.now()}`,
      ownerEmail: currentUser?.email || 'anonymous',
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString().split('T')[0],
      status: 'Active',
      questions: validQuestions,
      responses: []
    };

    setIsSaving(true);
    try {
      await saveProject(newProject);
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      alert("Gagal menyimpan ke database: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-2 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
        <div className="mb-8 border-b border-slate-100 pb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Create New reli Project</h1>
            <p className="text-slate-500 mt-2">Design your testing instrument manually, or auto-generate from Excel.</p>
          </div>
          <div className="shrink-0 bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
            <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center justify-center gap-1"><FileSpreadsheet size={16} /> Quick Create</h3>
            <p className="text-xs text-emerald-600 mb-3 max-w-[200px]">Upload Excel to auto-create questions and responses.<br />Max 100 KB</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelImport}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Upload size={16} />
              IMPORT EXCEL
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Project Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mobile Banking App UAT"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what is being tested..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all h-24"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-semibold text-slate-800 text-lg">Testing Instrument (Questions)</h3>
              <button
                type="button"
                onClick={addQuestion}
                className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-md font-medium"
              >
                <Plus size={16} /> Add Question
              </button>
            </div>

            {questions.map((q, idx) => (
              <div key={q.id} className="flex gap-4 items-start">
                <span className="mt-2 font-bold text-slate-400 w-6 text-right">{idx + 1}.</span>
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, e.target.value)}
                  placeholder="e.g. The application loads quickly."
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  disabled={questions.length <= 1}
                  className="mt-2 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md font-medium"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save size={20} />
              )}
              {isSaving ? 'Menyimpan...' : 'Save Project & Instrument'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;
