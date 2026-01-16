
import React, { useState, useEffect } from 'react';
import { Platform, PC_SPECS, MOBILE_SPECS, BannerSpec } from './constants';
import { generateBannerSet, GeneratedImage, GenerationInput } from './services/imageService';
import { ProgressBar } from './components/ProgressBar';
import { Download, Layout, Smartphone, Monitor, Image as ImageIcon, CheckCircle2, Loader2, Sparkles, FolderArchive, FileType, Menu, X } from 'lucide-react';

declare const JSZip: any;

const App: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>(Platform.PC);
  const [theme, setTheme] = useState('');
  const [style, setStyle] = useState('黑金奢華 (Luxury Gold)');
  const [subject, setSubject] = useState('自動匹配');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  // Pre-load JSZip on mount
  useEffect(() => {
    if (typeof (window as any).JSZip === 'undefined') {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const styles = [
    '黑金奢華 (Luxury Gold)', '霓虹電競 (Cyber Neon)', '節慶紅金 (CNY Style)', 
    '拉斯維加斯 (Classic Vegas)', '日系動漫 (Anime Style)', '極簡白金 (Minimalist White)', 
    '深海幽藍 (Deep Sea Blue)', '賽博龐克 (Cyberpunk)', '復古 80s (Retro 80s)', 
    '高科技感 (High-Tech)', '水墨中國風 (Ink Wash)', '大理石質感 (Marble Texture)', 
    '歐式宮廷 (European Royal)', '寫實攝影 (Realistic Photo)', '抽象幾何 (Abstract Geometric)'
  ];

  const subjects = [
    '自動匹配', '美女荷官 (Dealer)', '豪華跑車 (Supercar)', '老虎機 (Slot Machine)', 
    '撲克與籌碼 (Poker & Chips)', '金幣雨 (Coin Rain)', '奢華手錶 (Luxury Watch)', 
    '科幻機器人 (Sci-Fi Robot)', '中式錦鯉 (Koi Fish)', '骰子 (Dices)', '獎盃 (Trophy)'
  ];

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
      subject: subject === '自動匹配' ? '' : subject,
      format: 'png'
    };
    
    try {
      setStatusText("正在啟動視覺引擎...");
      
      for (let i = 0; i < specs.length; i++) {
        setProgress(i);
        setStatusText(`正在繪製 ${specs[i].name}...`);
        
        if (i > 0) await delay(800);

        const result = await generateBannerSet([specs[i]], input);
        
        if (result.length > 0) {
          setResults(prev => [...prev, result[0]]);
        }
      }
      
      setProgress(specs.length);
      setStatusText(`全套生成完成！`);
    } catch (error: any) {
      console.error("Generate Error:", error);
      const msg = error.message || "未知錯誤";
      alert(`生成失敗: ${msg}\n請檢查 API Key 設定是否正確。`);
    } finally {
      setLoading(false);
    }
  };

  const convertAndDownload = async (sourceBase64: string, filename: string, targetExt: 'png' | 'jpeg' | 'gif') => {
    try {
      const img = new Image();
      img.src = `data:image/png;base64,${sourceBase64}`;
      await img.decode();

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      
      const mimeType = `image/${targetExt === 'jpeg' ? 'jpeg' : targetExt}`;
      const quality = targetExt === 'jpeg' ? 0.85 : 1;
      const finalDataUrl = canvas.toDataURL(mimeType, quality);
      
      const link = document.createElement('a');
      link.href = finalDataUrl;
      const ext = targetExt === 'jpeg' ? 'jpg' : targetExt;
      link.download = filename.replace('.png', `.${ext}`);
      link.click();
    } catch (err) {
      console.error("Download Error:", err);
      alert("下載轉換失敗。");
    }
  };

  const downloadZip = async () => {
    if (!results.length) return;
    
    if (typeof (window as any).JSZip === 'undefined') {
      alert("正在加載壓縮組件，請稍候再試...");
      return;
    }

    try {
      const zip = new (window as any).JSZip();
      results.forEach((res) => {
        zip.file(res.spec.fileName, res.base64, { base64: true });
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Casino_BannerSet_${theme || 'export'}.zip`;
      link.click();
    } catch (err) {
      console.error("ZIP Error:", err);
      alert("建立壓縮檔失敗。");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-10 selection:bg-yellow-500 selection:text-black">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500 p-2 rounded-xl text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]">
              <Sparkles size={20} />
            </div>
            <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase">
              AI Banner <span className="text-yellow-500">Spec Pro</span>
            </h1>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 text-slate-400">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className={`lg:col-span-4 space-y-6 ${isMenuOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-2xl space-y-6 sticky top-24">
              <h2 className="text-sm font-bold uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                <Layout size={16} /> 配置工作台
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPlatform(Platform.PC)} className={`py-3 rounded-2xl border transition-all text-xs font-bold flex flex-col items-center gap-2 ${platform === Platform.PC ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-white/5 bg-white/5 text-slate-500 opacity-60'}`}>
                    <Monitor size={16} /> PC 網頁版
                  </button>
                  <button onClick={() => setPlatform(Platform.MOBILE)} className={`py-3 rounded-2xl border transition-all text-xs font-bold flex flex-col items-center gap-2 ${platform === Platform.MOBILE ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-white/5 bg-white/5 text-slate-500 opacity-60'}`}>
                    <Smartphone size={16} /> MB 行動版
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">活動主題</label>
                  <input type="text" placeholder="例如：週年慶豪禮送" value={theme} onChange={e => setTheme(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none placeholder:text-slate-700" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">主體圖案物件</label>
                  <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer">
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">視覺風格</label>
                  <select value={style} onChange={e => setStyle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer">
                    {styles.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={handleGenerate} disabled={loading} className={`w-full py-4 rounded-2xl font-black uppercase tracking-tighter shadow-xl transition-all active:scale-95 ${loading ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-r from-yellow-600 to-yellow-400 text-black hover:from-yellow-500 hover:to-yellow-300 shadow-yellow-500/10'}`}>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "Generate Full Set"}
              </button>

              {loading && <ProgressBar current={progress} total={platform === Platform.PC ? PC_SPECS.length : MOBILE_SPECS.length} status={statusText} />}
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                Preview Gallery
                {results.length > 0 && <span className="text-xs bg-white/10 text-slate-400 px-2 py-1 rounded-md font-mono">{results.length} FILES</span>}
              </h2>
              {results.length > 0 && (
                <button onClick={downloadZip} className="flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-xl text-xs font-black hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/10">
                  <FolderArchive size={16} /> ZIP ALL (PNG)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-8">
              {results.length === 0 && !loading ? (
                <div className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-slate-600">
                  <ImageIcon size={64} className="mb-4 opacity-5" />
                  <p className="font-bold uppercase tracking-widest text-sm opacity-20">Waiting for Generation</p>
                </div>
              ) : (
                results.map((res, i) => (
                  <div key={res.spec.id} className="group bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl transition-all hover:border-yellow-500/30">
                    <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black bg-yellow-500 text-black px-2 py-0.5 rounded uppercase">{res.spec.id.split('_')[1]}</span>
                        <div>
                          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">{res.spec.name}</h3>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{res.spec.width} x {res.spec.height} px</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                        <span className="text-[9px] font-bold text-slate-600 px-2 uppercase">輸出:</span>
                        {(['png', 'jpeg', 'gif'] as const).map(fmt => (
                          <button 
                            key={fmt} 
                            onClick={() => convertAndDownload(res.base64, res.spec.fileName, fmt)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all hover:bg-yellow-500 hover:text-black text-slate-400"
                          >
                            {fmt === 'jpeg' ? 'JPG' : fmt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-black/40 overflow-x-auto custom-scrollbar">
                      <div className="min-w-fit mx-auto flex justify-center p-2">
                        <img 
                          src={res.url} 
                          className="max-h-[500px] w-auto shadow-2xl rounded-lg border border-white/10" 
                          alt={res.spec.name} 
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {loading && results.length < (platform === Platform.PC ? PC_SPECS.length : MOBILE_SPECS.length) && (
                <div className="bg-slate-900/50 border border-dashed border-white/5 rounded-3xl p-16 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <Loader2 size={40} className="text-yellow-500 animate-spin" />
                    <Sparkles className="absolute -top-2 -right-2 text-yellow-300 animate-pulse" size={16} />
                  </div>
                  <p className="text-yellow-500/50 text-xs font-bold uppercase tracking-widest animate-pulse">
                    Crafting Premium Asset...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-white/5 text-center">
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
          AI Powered Casino Banner System &copy; 2024 Professional Edition
        </p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(234,179,8,0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(234,179,8,0.3); }
      `}</style>
    </div>
  );
};

export default App;
