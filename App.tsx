
import React, { useState } from 'react';
import { Platform, PC_SPECS, MOBILE_SPECS, BannerSpec } from './constants';
import { generateBannerSet, GeneratedImage, GenerationInput } from './services/imageService';
import { ProgressBar } from './components/ProgressBar';
import { Download, Layout, Smartphone, Monitor, Image as ImageIcon, CheckCircle2, Loader2, Sparkles, FolderArchive, FileType, Menu, X } from 'lucide-react';

declare const JSZip: any;

const App: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>(Platform.PC);
  const [theme, setTheme] = useState('');
  const [style, setStyle] = useState('黑金奢華');
  const [format, setFormat] = useState<'png' | 'jpeg' | 'gif'>('png');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  // 輔助函數：延遲
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleGenerate = async () => {
    if (!theme) {
      alert("請輸入活動主題。");
      return;
    }

    setLoading(true);
    setResults([]);
    if (window.innerWidth < 1024) setIsMenuOpen(false);
    
    const specs = platform === Platform.PC ? PC_SPECS : MOBILE_SPECS;
    const input: GenerationInput = { 
      theme, 
      title: '', 
      style, 
      format: format === 'gif' ? 'png' : format as 'png' | 'jpeg' 
    };
    
    try {
      setStatusText("正在啟動娛樂城風格引擎...");
      
      for (let i = 0; i < specs.length; i++) {
        setProgress(i);
        setStatusText(`正在生成 ${specs[i].name}...`);
        
        // 加入 800ms 延遲，防止 Gemini API 頻率限制 (RPM limit)
        if (i > 0) await delay(800);

        const result = await generateBannerSet([specs[i]], input);
        
        if (result.length > 0) {
          const finalResult = format === 'gif' ? { ...result[0], format: 'gif' } : result[0];
          setResults(prev => [...prev, finalResult]);
        }
      }
      
      setProgress(specs.length);
      setStatusText(`生成完成！已優化為 ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message?.includes('429') 
        ? "請求過於頻繁，請稍候再試或檢查 API Key 額度。" 
        : "生成失敗，請檢查網路連線或 API Key 設定。";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (base64: string, filename: string, ext: string) => {
    let extension = ext === 'jpeg' ? 'jpg' : ext;
    const finalFilename = filename.replace('.png', `.${extension}`);
    const link = document.createElement('a');
    link.href = `data:image/${ext};base64,${base64}`;
    link.download = finalFilename;
    link.click();
  };

  const downloadZip = async () => {
    if (!results.length) return;
    
    if (typeof (window as any).JSZip === 'undefined') {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      document.head.appendChild(script);
      await new Promise(r => script.onload = r);
    }

    const zip = new (window as any).JSZip();
    results.forEach((res) => {
      const ext = res.format === 'jpeg' ? 'jpg' : res.format;
      const fileName = res.spec.fileName.replace('.png', `.${ext}`);
      zip.file(fileName, res.base64, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `娛樂城圖集_${format.toUpperCase()}_${theme}.zip`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-10">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-yellow-500 p-1.5 md:p-2 rounded-lg md:rounded-xl text-slate-900">
              <Sparkles size={18} className="md:w-6 md:h-6" />
            </div>
            <h1 className="text-sm md:text-xl font-bold tracking-tight text-white leading-tight">
              娛樂城 <span className="text-yellow-500 block md:inline">Banner 生成器</span>
            </h1>
          </div>
          
          <div className="flex gap-2">
            <div className="hidden sm:block text-[10px] md:text-xs font-medium text-yellow-500 bg-yellow-500/10 px-2 md:px-3 py-1 rounded-full border border-yellow-500/20">
              預留上字空間
            </div>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10">
        <div className="grid lg:grid-cols-12 gap-6 md:gap-10">
          <div className={`lg:col-span-4 space-y-6 ${isMenuOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-slate-800 p-5 md:p-6 rounded-2xl shadow-xl border border-slate-700 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-slate-700 pb-4 text-yellow-500">
                <Layout size={20} />
                生成設定
              </h2>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">步驟 1：平台與格式</label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button onClick={() => setPlatform(Platform.PC)} className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${platform === Platform.PC ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-slate-700 opacity-50 text-slate-400'}`}>
                    <Monitor size={18} /> 電腦版
                  </button>
                  <button onClick={() => setPlatform(Platform.MOBILE)} className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${platform === Platform.MOBILE ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-slate-700 opacity-50 text-slate-400'}`}>
                    <Smartphone size={18} /> 行動版
                  </button>
                </div>
                
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-2 mb-2">
                    <FileType size={14} /> 輸出格式
                  </span>
                  <div className="flex bg-slate-800 p-1 rounded-lg">
                    {(['png', 'jpeg', 'gif'] as const).map((fmt) => (
                      <button 
                        key={fmt}
                        onClick={() => setFormat(fmt)} 
                        className={`flex-1 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all uppercase ${format === fmt ? 'bg-yellow-500 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {fmt === 'jpeg' ? 'JPG' : fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">步驟 2：活動資訊</label>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">活動主題</label>
                  <input 
                    type="text" 
                    placeholder="例如：真人百家樂大賽"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">視覺風格</label>
                  <div className="relative">
                    <select 
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm text-white appearance-none cursor-pointer"
                    >
                      <option>黑金奢華 (Luxury Gold)</option>
                      <option>霓虹電競 (Cyber Neon)</option>
                      <option>節慶紅金 (CNY Style)</option>
                      <option>拉斯維加斯 (Classic Vegas)</option>
                      <option>日系動漫 (Anime Style)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${loading ? 'bg-slate-700 text-slate-500 cursor-wait' : 'bg-yellow-500 hover:bg-yellow-600 text-slate-900 shadow-yellow-500/20'}`}
              >
                {loading ? <Loader2 className="animate-spin" /> : <ImageIcon size={20} />}
                {loading ? "正在處理中..." : "開始生成全套橫幅"}
              </button>

              {loading && <ProgressBar current={progress} total={platform === Platform.PC ? PC_SPECS.length : MOBILE_SPECS.length} status={statusText} />}
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                {results.length > 0 ? "生成素材展覽" : "預覽區域"}
                {results.length > 0 && <span className="text-xs md:text-sm font-normal text-slate-500">({results.length} 個檔案)</span>}
              </h2>
              {results.length > 0 && (
                <button onClick={downloadZip} className="flex items-center justify-center gap-2 text-yellow-500 border border-yellow-500/20 px-4 py-2.5 rounded-xl hover:bg-yellow-500/10 transition-colors bg-slate-800">
                  <FolderArchive size={18} /> 打包下載
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 pb-20 lg:pb-0">
              {results.map((res, index) => (
                <div key={res.spec.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
                  <div className="px-4 md:px-6 py-3 bg-slate-700/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="bg-yellow-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{res.spec.id.split('_')[1]}</span>
                      <h3 className="text-xs md:text-sm font-bold text-slate-200">{res.spec.name}</h3>
                    </div>
                    <button onClick={() => downloadImage(res.base64, res.spec.fileName, res.format)} className="bg-slate-600 hover:bg-yellow-500 hover:text-slate-900 p-2 rounded-lg transition-all">
                      <Download size={16} />
                    </button>
                  </div>
                  <div className="p-2 md:p-4 bg-black/40 overflow-x-auto custom-scrollbar">
                    <div className="min-w-fit mx-auto">
                      <img src={res.url} alt={res.spec.name} className="max-h-[300px] md:max-h-[450px] w-auto h-auto shadow-2xl rounded-sm object-contain" />
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && results.length < (platform === Platform.PC ? PC_SPECS.length : MOBILE_SPECS.length) && (
                <div className="bg-slate-800/30 border-2 border-dashed border-yellow-500/10 rounded-2xl p-12 flex flex-col items-center justify-center space-y-4">
                  <Loader2 size={32} className="text-yellow-500 animate-spin" />
                  <p className="text-yellow-500/70 text-sm">正在打造豪華素材...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {loading && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-yellow-500/30 p-4 z-50">
          <ProgressBar current={progress} total={platform === Platform.PC ? PC_SPECS.length : MOBILE_SPECS.length} status={statusText} />
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(234, 179, 8, 0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
