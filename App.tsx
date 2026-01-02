import React, { useState, useCallback, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  RotateCw, 
  Download, 
  Scissors, 
  LayoutGrid, 
  Sparkles, 
  FileText,
  GripVertical,
  ArrowRight,
  ChevronRight,
  Info
} from 'lucide-react';
import { PDFFile, PDFPageReference, WorkspaceState } from './types';
import { generateThumbnail, mergeAndDownload, splitAllToIndividual, extractText } from './services/pdfProcessor';
import { analyzePdfContent } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<WorkspaceState>({
    files: [],
    pages: [],
    isProcessing: false,
    aiInsights: null,
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setState(prev => ({ ...prev, isProcessing: true }));

    const newFiles: PDFFile[] = [];
    let newPages: PDFPageReference[] = [];

    // Cast Array.from(files) to File[] to ensure 'file' is properly typed as File
    for (const file of Array.from(files) as File[]) {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const fileId = Math.random().toString(36).substr(2, 9);
      
      const { PDFDocument } = (window as any).PDFLib;
      const pdfDoc = await PDFDocument.load(data);
      const pageCount = pdfDoc.getPageCount();

      newFiles.push({
        id: fileId,
        name: file.name,
        size: file.size,
        data,
        pageCount,
      });

      for (let i = 0; i < pageCount; i++) {
        const thumb = await generateThumbnail(data, i);
        newPages.push({
          id: `${fileId}-${i}-${Math.random()}`,
          fileId,
          pageIndex: i,
          rotation: 0,
          thumbnailUrl: thumb,
        });
      }
    }

    setState(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles],
      pages: [...prev.pages, ...newPages],
      isProcessing: false,
    }));
  };

  const removePage = (id: string) => {
    setState(prev => ({
      ...prev,
      pages: prev.pages.filter(p => p.id !== id)
    }));
  };

  const rotatePage = (id: string) => {
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p)
    }));
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    
    const updatedPages = [...state.pages];
    const [movedItem] = updatedPages.splice(draggedIdx, 1);
    updatedPages.splice(idx, 0, movedItem);
    
    setDraggedIdx(idx);
    setState(prev => ({ ...prev, pages: updatedPages }));
  };

  const handleMerge = async () => {
    if (state.pages.length === 0) return;
    setState(prev => ({ ...prev, isProcessing: true }));
    try {
      await mergeAndDownload(state.files, state.pages, "exported_document.pdf");
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleSplit = async () => {
    if (state.pages.length === 0) return;
    setState(prev => ({ ...prev, isProcessing: true }));
    try {
      await splitAllToIndividual(state.files, state.pages);
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleAiAnalyze = async () => {
    if (state.files.length === 0) return;
    setState(prev => ({ ...prev, isProcessing: true, aiInsights: "Thinking..." }));
    try {
      const text = await extractText(state.files[0].data);
      const insights = await analyzePdfContent(text);
      setState(prev => ({ ...prev, aiInsights: insights }));
    } catch (e) {
      setState(prev => ({ ...prev, aiInsights: "Error generating insights." }));
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const clearWorkspace = () => {
    setState({
      files: [],
      pages: [],
      isProcessing: false,
      aiInsights: null,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Gemini PDF Master</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Professional PDF Editor</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {state.pages.length > 0 && (
              <button 
                onClick={clearWorkspace}
                className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors"
              >
                Clear All
              </button>
            )}
            <label className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full cursor-pointer transition-all shadow-md shadow-indigo-200">
              <Plus size={18} />
              <span className="font-semibold text-sm">Add PDFs</span>
              <input 
                type="file" 
                multiple 
                accept=".pdf" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Tools and Insights */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Actions</h2>
            <div className="space-y-3">
              <button 
                disabled={state.pages.length === 0 || state.isProcessing}
                onClick={handleMerge}
                className="w-full flex items-center justify-between bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 p-3 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                    <Download size={18} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-700 text-sm">Merge & Save</div>
                    <div className="text-xs text-slate-500">Combine all pages</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1" />
              </button>

              <button 
                disabled={state.pages.length === 0 || state.isProcessing}
                onClick={handleSplit}
                className="w-full flex items-center justify-between bg-white border border-slate-200 hover:border-orange-400 hover:bg-orange-50 p-3 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                    <Scissors size={18} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-700 text-sm">Split All</div>
                    <div className="text-xs text-slate-500">Save each page separately</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-400 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 shadow-lg text-white">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-yellow-300 fill-yellow-300" />
              <h2 className="font-bold text-lg">AI Assistant</h2>
            </div>
            
            {state.aiInsights ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-sm leading-relaxed border border-white/20 whitespace-pre-wrap">
                {state.aiInsights}
              </div>
            ) : (
              <p className="text-sm text-indigo-100 mb-6">
                Let Gemini analyze your document content to suggest split points, summaries, and better names.
              </p>
            )}

            <button 
              onClick={handleAiAnalyze}
              disabled={state.files.length === 0 || state.isProcessing}
              className="w-full mt-4 bg-white text-indigo-600 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50 shadow-lg"
            >
              Analyze with Gemini
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700 leading-relaxed">
                <p className="font-bold mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  <li>Drag thumbnails to reorder</li>
                  <li>Rotate or delete specific pages</li>
                  <li>Merge multiple PDFs into one</li>
                  <li>AI handles intelligent analysis</li>
                </ul>
              </div>
            </div>
          </div>
        </aside>

        {/* Center: Workspace */}
        <div className="lg:col-span-3">
          {state.pages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl bg-white p-12 text-center group">
              <div className="bg-slate-50 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                <LayoutGrid size={48} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Workspace Empty</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8">
                Upload one or more PDF files to start organizing, merging, and editing your documents.
              </p>
              <label className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full cursor-pointer transition-all shadow-xl shadow-indigo-100">
                <Plus size={20} />
                <span className="font-bold">Choose Files</span>
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-500">{state.pages.length} Pages</span>
                  <div className="h-4 w-px bg-slate-200" />
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    {/* List view placeholder if needed */}
                  </div>
                </div>
                {state.isProcessing && (
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm animate-pulse">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                    Processing...
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {state.pages.map((page, idx) => (
                  <div 
                    key={page.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-move"
                  >
                    <div className="absolute top-2 left-2 z-10 bg-slate-900/50 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {idx + 1}
                    </div>
                    
                    <div className="aspect-[3/4] bg-slate-100 flex items-center justify-center overflow-hidden">
                      {page.thumbnailUrl ? (
                        <img 
                          src={page.thumbnailUrl} 
                          alt={`Page ${idx + 1}`} 
                          className="w-full h-full object-contain transition-transform"
                          style={{ transform: `rotate(${page.rotation}deg)` }}
                        />
                      ) : (
                        <div className="animate-pulse flex flex-col items-center gap-2">
                          <FileText size={32} className="text-slate-300" />
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex items-center justify-between bg-white border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <GripVertical size={14} className="text-slate-300" />
                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">
                          {state.files.find(f => f.id === page.fileId)?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => rotatePage(page.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                          title="Rotate"
                        >
                          <RotateCw size={14} />
                        </button>
                        <button 
                          onClick={() => removePage(page.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer / Status bar */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>&copy; 2024 Gemini PDF Master</span>
            <span>Local & Private Processing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>AI Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
