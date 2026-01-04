
import React, { useState, useRef, useEffect } from 'react';
import { ComparisonStep, ComparisonResult, LegalRisk, ClauseComparison, ChatMessage } from './types';
import { analyzeDocuments, createCounselChat } from './services/gemini';
import { getDiff } from './utils/textDiff';
import { 
  FileText, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ChevronRight,
  ShieldAlert,
  Search,
  FileSearch,
  RefreshCcw,
  Zap,
  Camera,
  MessageSquare,
  Send,
  X,
  LayoutDashboard,
  ClipboardCheck,
  Filter
} from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<ComparisonStep>(ComparisonStep.UPLOAD);
  const [doc1, setDoc1] = useState<string | { data: string, mimeType: string }>('');
  const [doc2, setDoc2] = useState<string | { data: string, mimeType: string }>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatInstance = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Camera state
  const [showCamera, setShowCamera] = useState<'doc1' | 'doc2' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setDoc: (val: any) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setDoc(text);
    };
    reader.readAsText(file);
  };

  const startAnalysis = async () => {
    if (!doc1 || !doc2) {
      setError("Documents are missing. Please upload or scan both versions.");
      return;
    }
    setError(null);
    setIsAnalyzing(true);
    setStep(ComparisonStep.COMPARING);

    try {
      const analysis = await analyzeDocuments(doc1, doc2);
      setResult(analysis);
      chatInstance.current = createCounselChat(analysis);
      setStep(ComparisonStep.RESULTS);
    } catch (err: any) {
      setError(err.message || "Failed to analyze documents.");
      setStep(ComparisonStep.UPLOAD);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || !chatInstance.current) return;

    const userMsg = userInput;
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const response = await chatInstance.current.sendMessage({ message: userMsg });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Error: Could not reach the AI counsel." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startCamera = async (target: 'doc1' | 'doc2') => {
    setShowCamera(target);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera.");
      setShowCamera(null);
    }
  };

  const capturePhoto = (target: 'doc1' | 'doc2') => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      const base64 = dataUrl.split(',')[1];
      
      const docObj = { data: base64, mimeType: 'image/jpeg' };
      if (target === 'doc1') setDoc1(docObj);
      else setDoc2(docObj);

      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      setShowCamera(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFE] flex flex-col font-sans">
      {/* Premium Navigation */}
      <nav className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase">JurisCompare <span className="text-indigo-600">Pro</span></h1>
            <div className="flex items-center gap-1">
              <span className="block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Operational</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {step === ComparisonStep.RESULTS && (
            <button onClick={() => { setStep(ComparisonStep.UPLOAD); setDoc1(''); setDoc2(''); }} className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2">
              <RefreshCcw className="w-3.5 h-3.5" />
              Reset Workspace
            </button>
          )}
          <div className="h-8 w-px bg-slate-100" />
          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100/50">
            <Zap className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
            <span className="text-[11px] font-bold text-indigo-700">Gemini 3 Pro</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col">
        {step === ComparisonStep.UPLOAD && (
          <div className="max-w-6xl mx-auto w-full px-6 py-12">
            <div className="mb-12">
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Legal Document Intelligence</h2>
              <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
                Compare complex legal instruments instantly. Our AI handles vision scanning, semantic analysis, 
                and interactive counsel in one unified workspace.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              <DocumentInput 
                title="Baseline Document" 
                subtitle="The reference or original text"
                value={doc1}
                onTextChange={setDoc1}
                onFileChange={(e) => handleFileUpload(e, setDoc1)}
                onScan={() => startCamera('doc1')}
                icon={<FileText className="w-5 h-5 text-slate-400" />}
              />
              <DocumentInput 
                title="Counterparty Version" 
                subtitle="The new or revised draft"
                value={doc2}
                onTextChange={setDoc2}
                onFileChange={(e) => handleFileUpload(e, setDoc2)}
                onScan={() => startCamera('doc2')}
                icon={<FileSearch className="w-5 h-5 text-indigo-500" />}
                isPrimary
              />
            </div>

            <div className="flex items-center justify-between p-8 bg-slate-900 rounded-[32px] text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2">Ready for analysis?</h3>
                <p className="text-slate-400 max-w-md">Our AI will perform a multi-modal check for liability shifts, indemnity traps, and IP ownership inconsistencies.</p>
              </div>
              <button 
                onClick={startAnalysis}
                disabled={!doc1 || !doc2 || isAnalyzing}
                className="relative z-10 h-16 px-12 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 text-white font-black text-lg rounded-2xl flex items-center gap-3 transition-all transform active:scale-95 shadow-xl shadow-indigo-900/40"
              >
                {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Start Analysis <ArrowRight className="w-5 h-5" /></>}
              </button>
            </div>
          </div>
        )}

        {step === ComparisonStep.COMPARING && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
            <div className="w-20 h-20 relative mb-8">
              <div className="absolute inset-0 border-[6px] border-indigo-50 rounded-full" />
              <div className="absolute inset-0 border-[6px] border-indigo-600 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Search className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Executing Legal Intelligence</h2>
            <p className="text-slate-500 text-center max-w-sm">Comparing semantic definitions, liability caps, and commercial exposure...</p>
          </div>
        )}

        {step === ComparisonStep.RESULTS && result && (
          <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#F8FAFC]">
              {/* Summary Dashboard */}
              <div className="grid md:grid-cols-4 gap-4">
                <StatCard label="Executive Summary" value={result.summary} isWide icon={<LayoutDashboard />} />
                <StatCard label="Recommendation" value={result.recommendation} type="highlight" icon={<ClipboardCheck />} />
                <StatCard label="Critical Issues" value={result.criticalChanges.length.toString()} type="danger" icon={<AlertCircle />} />
                <StatCard label="Clauses Analyzed" value={result.clauseAnalysis.length.toString()} icon={<Filter />} />
              </div>

              {/* Risks & Clause Analysis */}
              <div className="grid xl:grid-cols-3 gap-8">
                <div className="xl:col-span-1 space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Legal Risk Map
                  </h3>
                  <div className="space-y-4">
                    {result.risks.map((risk, i) => <RiskTile key={i} risk={risk} />)}
                  </div>
                </div>
                
                <div className="xl:col-span-2 space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" /> Semantic Diff & Clause Insight
                  </h3>
                  <div className="space-y-6">
                    {result.clauseAnalysis.map((clause, i) => <DetailedClause key={i} clause={clause} />)}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Counsel Sidebar */}
            <aside className="w-full lg:w-96 border-l border-slate-100 bg-white flex flex-col">
              <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-sm text-slate-900">Interactive Counsel</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">LIVE</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="p-3 bg-indigo-50/50 rounded-2xl text-xs text-indigo-700 leading-relaxed border border-indigo-100/50">
                  Ask me about specific risks, liability caps, or any hidden obligations in these drafts.
                </div>
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-slate-100">
                <form onSubmit={handleSendMessage} className="relative">
                  <input 
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ask Juris AI..."
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button type="submit" className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
          <button onClick={() => setShowCamera(null)} className="absolute top-6 right-6 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors">
            <X className="w-8 h-8" />
          </button>
          <video ref={videoRef} autoPlay playsInline className="max-w-full max-h-[70vh] rounded-lg shadow-2xl" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="mt-8">
            <button 
              onClick={() => capturePhoto(showCamera)}
              className="w-20 h-20 bg-white rounded-full border-8 border-white/30 flex items-center justify-center group active:scale-90 transition-transform"
            >
              <div className="w-12 h-12 bg-indigo-600 rounded-full" />
            </button>
          </div>
          <p className="mt-4 text-white font-bold tracking-widest uppercase text-xs opacity-50">Capture Document Page</p>
        </div>
      )}
    </div>
  );
}

function DocumentInput({ title, subtitle, value, onTextChange, onFileChange, onScan, icon, isPrimary }: any) {
  const isImage = typeof value === 'object' && value !== null;

  return (
    <div className={`bg-white rounded-[32px] border ${isPrimary ? 'border-indigo-100' : 'border-slate-200'} p-8 shadow-sm flex flex-col h-full`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isPrimary ? 'bg-indigo-50' : 'bg-slate-50'}`}>
            {icon}
          </div>
          <div>
            <h4 className="font-black text-slate-900 text-lg leading-none mb-1">{title}</h4>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onScan} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Scan with camera">
            <Camera className="w-5 h-5" />
          </button>
          <label className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer" title="Upload file">
            <FileSearch className="w-5 h-5" />
            <input type="file" className="hidden" onChange={onFileChange} accept=".txt,.doc,.docx,.pdf" />
          </label>
        </div>
      </div>

      <div className="flex-1 relative">
        {isImage ? (
          <div className="w-full h-64 bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-200 overflow-hidden">
            <img src={`data:${value.mimeType};base64,${value.data}`} className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
              <div className="bg-green-500 p-2 rounded-full mb-2">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-900">Document Captured</span>
              <button onClick={() => onTextChange('')} className="mt-2 text-xs text-indigo-600 font-bold hover:underline">Retake or Edit</button>
            </div>
          </div>
        ) : (
          <textarea 
            value={value as string}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste contract text here..."
            className="w-full h-64 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 text-sm font-serif leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, type, isWide, icon }: any) {
  const styles = {
    default: 'bg-white border-slate-100 text-slate-900',
    highlight: 'bg-indigo-600 border-indigo-700 text-white shadow-xl shadow-indigo-200',
    danger: 'bg-red-50 border-red-100 text-red-700',
  }[type as 'default' | 'highlight' | 'danger' || 'default'];

  return (
    <div className={`p-6 rounded-[28px] border ${styles} ${isWide ? 'md:col-span-2' : ''} shadow-sm flex flex-col h-full`}>
      <div className="flex items-center gap-2 mb-3 opacity-60">
        <div className="p-1 rounded bg-current/10">
          {/* Use React.cloneElement with generic type to satisfy TypeScript about className prop */}
          {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-3 h-3' })}
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className={`font-bold leading-tight ${isWide ? 'text-sm' : 'text-2xl'}`}>
        {value}
      </p>
    </div>
  );
}

function RiskTile({ risk }: { risk: LegalRisk }) {
  const severityMap = {
    critical: { color: 'text-red-600 bg-red-50 border-red-100', icon: <ShieldAlert /> },
    high: { color: 'text-orange-600 bg-orange-50 border-orange-100', icon: <AlertCircle /> },
    medium: { color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <AlertCircle /> },
    low: { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: <CheckCircle2 /> },
  };

  const style = severityMap[risk.severity];

  return (
    <div className={`p-5 rounded-2xl border ${style.color} group hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-wider bg-white/50 px-2 py-0.5 rounded-full border border-current/10">
          {risk.category}
        </span>
        <div className="w-4 h-4 opacity-50">{style.icon}</div>
      </div>
      <h4 className="font-black text-sm mb-1 uppercase tracking-tight">{risk.title}</h4>
      <p className="text-xs mb-3 opacity-80 leading-relaxed font-serif italic">"{risk.description}"</p>
      <div className="pt-3 border-t border-current/10">
        <p className="text-[9px] font-black uppercase opacity-60 mb-1">Estimated Impact</p>
        <p className="text-[11px] leading-snug font-medium">{risk.impact}</p>
      </div>
    </div>
  );
}

function DetailedClause({ clause }: { clause: ClauseComparison }) {
  const diffParts = getDiff(clause.doc1Text, clause.doc2Text);
  
  return (
    <div className="bg-white rounded-[28px] border border-slate-100 overflow-hidden shadow-sm group">
      <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-white bg-indigo-600 px-2 py-0.5 rounded uppercase tracking-widest">{clause.category}</span>
          <h4 className="font-black text-slate-900 text-sm">{clause.clauseTitle}</h4>
        </div>
      </div>
      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Baseline Draft</span>
            <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 leading-relaxed font-serif border border-slate-100">
              {clause.doc1Text}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revised Version</span>
            <div className="p-4 bg-white rounded-2xl text-xs text-slate-800 leading-relaxed font-serif border border-indigo-100">
              {diffParts.map((part, i) => (
                <span key={i} className={part.added ? "bg-green-100 text-green-900 px-0.5 rounded font-bold" : ""}>
                  {part.value}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-indigo-900 p-5 rounded-2xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldAlert className="w-16 h-16" />
          </div>
          <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">AI Counsel Verdict</p>
          <p className="text-sm font-medium leading-relaxed relative z-10">{clause.significance}</p>
        </div>
      </div>
    </div>
  );
}
