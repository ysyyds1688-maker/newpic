
import React, { useState, useEffect } from 'react';
import { Platform, PC_SPECS, MOBILE_SPECS, BannerSpec } from './constants';
import { generateBannerSet, GeneratedImage, GenerationInput } from './services/imageService';
import { ProgressBar } from './components/ProgressBar';
import { Download, Layout, Smartphone, Monitor, Image as ImageIcon, CheckCircle2, Loader2, Sparkles, FolderArchive, FileType, Menu, X, Settings, Filter, Eye, Shuffle } from 'lucide-react';

declare const JSZip: any;

const App: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>(Platform.PC);
  const [theme, setTheme] = useState('');
  const [style, setStyle] = useState('黑金奢華');
  const [subject, setSubject] = useState('自動匹配');
  const [pattern, setPattern] = useState('自動匹配');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  // 分別存儲 PC 和 Mobile 的結果
  const [pcResults, setPcResults] = useState<GeneratedImage[]>([]);
  const [mobileResults, setMobileResults] = useState<GeneratedImage[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  
  // 根據當前平台返回對應的結果
  const results = platform === Platform.PC ? pcResults : mobileResults;

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

  const randomThemes = [
    '週年慶豪禮送', '新會員專享', '每日簽到送', '限時優惠', 
    '首存加碼', '再存回饋', 'VIP 專屬', '節慶大放送',
    '幸運轉盤', '每日任務', '連勝獎勵', '推薦好友',
    '生日禮金', '週末特惠', '節日狂歡', '超級大獎',
    '限時搶購', '雙倍積分', '免費旋轉', '彩金翻倍'
  ];

  const handleRandomTheme = () => {
    const randomIndex = Math.floor(Math.random() * randomThemes.length);
    setTheme(randomThemes[randomIndex]);
  };

  const styles = [
    '黑金奢華', '霓虹電競', '節慶紅金', 
    '拉斯維加斯', '日系動漫', '極簡白金', 
    '深海幽藍', '賽博龐克', '復古 80s', 
    '高科技感', '水墨中國風', '大理石質感', 
    '歐式宮廷', '寫實攝影', '抽象幾何'
  ];

  const subjects = [
    '自動匹配', '美女荷官', '豪華跑車', '老虎機', 
    '撲克與籌碼', '金幣雨', '奢華手錶', 
    '科幻機器人', '中式錦鯉', '骰子', '獎盃',
    '塞特遊戲', '索爾遊戲', '捕魚機鯊魚', '捕魚機海洋生物',
    '角子機', '輪盤', '遊戲角色', '娛樂城標誌'
  ];

  const patterns = [
    '自動匹配', '幾何圖案', '抽象形狀', '花卉設計', 
    '幾何線條', '波浪圖案', '圓形圖騰', '網格佈局', 
    '有機形態', '對稱圖案', '極簡點狀', '複雜裝飾'
  ];

  const handleGenerate = async () => {
    if (!theme) {
      alert("請輸入活動主題。");
      return;
    }

    setLoading(true);
    setPcResults([]);
    setMobileResults([]);
    if (window.innerWidth < 1024) setIsMenuOpen(false);
    
    const input: GenerationInput = { 
      theme, 
      title: '', 
      style, 
      subject: subject === '自動匹配' ? '' : subject,
      pattern: pattern === '自動匹配' ? '' : pattern,
      format: 'png'
    };
    
    try {
      setStatusText("正在生成基礎圖片...");
      setProgress(0);
      
      // 同時生成 PC 和 Mobile 的所有規格（從同一張基礎圖片調整）
      const allSpecs = [...PC_SPECS, ...MOBILE_SPECS];
      const allResults = await generateBannerSet(allSpecs, input);
      
      // 分離 PC 和 Mobile 的結果
      const pcResultsList: GeneratedImage[] = [];
      const mobileResultsList: GeneratedImage[] = [];
      
      for (const result of allResults) {
        if (result.spec.id.startsWith('pc_')) {
          pcResultsList.push(result);
        } else if (result.spec.id.startsWith('mb_')) {
          mobileResultsList.push(result);
        }
      }
      
      // 更新進度
      setStatusText("正在調整圖片規格...");
      
      // 逐步顯示 PC 結果
      for (let i = 0; i < pcResultsList.length; i++) {
        setProgress(i + 1);
        setStatusText(`正在處理 PC ${pcResultsList[i].spec.name}...`);
        setPcResults(prev => [...prev, pcResultsList[i]]);
        if (i < pcResultsList.length - 1) {
          await delay(200);
        }
      }
      
      // 逐步顯示 Mobile 結果
      for (let i = 0; i < mobileResultsList.length; i++) {
        setProgress(pcResultsList.length + i + 1);
        setStatusText(`正在處理 Mobile ${mobileResultsList[i].spec.name}...`);
        setMobileResults(prev => [...prev, mobileResultsList[i]]);
        if (i < mobileResultsList.length - 1) {
          await delay(200);
        }
      }
      
      setProgress(allSpecs.length);
      setStatusText(`全套生成完成！PC: ${pcResultsList.length} 個，Mobile: ${mobileResultsList.length} 個`);
    } catch (error: any) {
      console.error("Generate Error:", error);
      let errorMsg = "未知錯誤";
      
      // Handle different error types
      if (error.message) {
        errorMsg = error.message;
        
        // Check for quota exceeded error (429)
        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('Quota exceeded')) {
          errorMsg = "API 配額已用盡\n\n可能的原因：\n1. 免費配額已用完\n2. 需要升級到付費方案\n3. 請檢查您的 Google AI Studio 帳戶配額\n\n解決方案：\n- 前往 https://ai.google.dev/ 檢查配額\n- 或使用其他 API Key";
        } else if (errorMsg.includes('API Key') || errorMsg.includes('401') || errorMsg.includes('403')) {
          errorMsg = "API Key 驗證失敗\n\n請檢查：\n1. API Key 是否正確\n2. API Key 是否有權限使用圖片生成功能\n3. 是否已啟用 Gemini API";
        }
      } else if (error.error?.message) {
        errorMsg = error.error.message;
      }
      
      alert(`生成失敗: ${errorMsg}`);
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
      const maxSize = 2 * 1024 * 1024; // 2MB in bytes
      
      let finalDataUrl: string;
      let quality = targetExt === 'jpeg' ? 0.85 : 1;
      let workCanvas = canvas;
      
      // Compress image to ensure file size is under 2MB
      if (targetExt === 'jpeg') {
        // For JPEG, reduce quality progressively
        let attempts = 0;
        while (attempts < 20) {
          finalDataUrl = workCanvas.toDataURL(mimeType, quality);
          const fileSize = getFileSize(finalDataUrl);
          
          if (fileSize <= maxSize) break;
          
          quality = Math.max(0.3, quality - 0.05);
          attempts++;
        }
        
        // If still too large, reduce dimensions
        if (getFileSize(finalDataUrl) > maxSize) {
          const scaleFactor = Math.sqrt(maxSize / getFileSize(finalDataUrl)) * 0.9;
          const newWidth = Math.floor(canvas.width * scaleFactor);
          const newHeight = Math.floor(canvas.height * scaleFactor);
          
          const resizedCanvas = document.createElement('canvas');
          resizedCanvas.width = newWidth;
          resizedCanvas.height = newHeight;
          const resizedCtx = resizedCanvas.getContext('2d');
          if (resizedCtx) {
            resizedCtx.imageSmoothingEnabled = true;
            resizedCtx.imageSmoothingQuality = 'high';
            resizedCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
            finalDataUrl = resizedCanvas.toDataURL(mimeType, 0.8);
          }
        }
      } else if (targetExt === 'png') {
        // PNG doesn't support quality, so we need to reduce dimensions if too large
        finalDataUrl = workCanvas.toDataURL(mimeType);
        let fileSize = getFileSize(finalDataUrl);
        
        if (fileSize > maxSize) {
          // Try reducing dimensions
          const scaleFactor = Math.sqrt(maxSize / fileSize) * 0.9;
          const newWidth = Math.floor(canvas.width * scaleFactor);
          const newHeight = Math.floor(canvas.height * scaleFactor);
          
          const resizedCanvas = document.createElement('canvas');
          resizedCanvas.width = newWidth;
          resizedCanvas.height = newHeight;
          const resizedCtx = resizedCanvas.getContext('2d');
          if (resizedCtx) {
            resizedCtx.imageSmoothingEnabled = true;
            resizedCtx.imageSmoothingQuality = 'high';
            resizedCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
            finalDataUrl = resizedCanvas.toDataURL(mimeType);
            
            // If still too large, convert to JPEG
            fileSize = getFileSize(finalDataUrl);
            if (fileSize > maxSize) {
              let jpegQuality = 0.85;
              while (jpegQuality > 0.3 && getFileSize(resizedCanvas.toDataURL('image/jpeg', jpegQuality)) > maxSize) {
                jpegQuality -= 0.1;
              }
              finalDataUrl = resizedCanvas.toDataURL('image/jpeg', jpegQuality);
              const ext = 'jpg';
              const link = document.createElement('a');
              link.href = finalDataUrl;
              link.download = filename.replace(/\.(png|jpg|gif)$/i, `.${ext}`);
              link.click();
              alert("PNG 檔案過大，已轉換為 JPG 格式下載。");
              return;
            }
          }
        }
      } else if (targetExt === 'gif') {
        // GIF compression is limited, convert to JPEG if too large
        finalDataUrl = workCanvas.toDataURL(mimeType);
        let fileSize = getFileSize(finalDataUrl);
        
        if (fileSize > maxSize) {
          // Convert to JPEG for better compression
          let jpegQuality = 0.85;
          while (jpegQuality > 0.3 && getFileSize(workCanvas.toDataURL('image/jpeg', jpegQuality)) > maxSize) {
            jpegQuality -= 0.1;
          }
          finalDataUrl = workCanvas.toDataURL('image/jpeg', jpegQuality);
          fileSize = getFileSize(finalDataUrl);
          
          // If still too large, reduce dimensions
          if (fileSize > maxSize) {
            const scaleFactor = Math.sqrt(maxSize / fileSize) * 0.9;
            const newWidth = Math.floor(canvas.width * scaleFactor);
            const newHeight = Math.floor(canvas.height * scaleFactor);
            
            const resizedCanvas = document.createElement('canvas');
            resizedCanvas.width = newWidth;
            resizedCanvas.height = newHeight;
            const resizedCtx = resizedCanvas.getContext('2d');
            if (resizedCtx) {
              resizedCtx.imageSmoothingEnabled = true;
              resizedCtx.imageSmoothingQuality = 'high';
              resizedCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
              finalDataUrl = resizedCanvas.toDataURL('image/jpeg', 0.8);
            }
          }
          
          const ext = 'jpg';
          const link = document.createElement('a');
          link.href = finalDataUrl;
          link.download = filename.replace(/\.(png|jpg|gif)$/i, `.${ext}`);
          link.click();
          alert("GIF 檔案過大，已轉換為 JPG 格式下載。");
          return;
        }
      }
      
      // Final size check before download
      const finalSize = getFileSize(finalDataUrl);
      if (finalSize > maxSize) {
        alert(`警告：檔案大小為 ${(finalSize / 1024 / 1024).toFixed(2)}MB，超過 2MB 限制。將自動壓縮...`);
        // Force convert to JPEG with lower quality
        const jpegCanvas = document.createElement('canvas');
        jpegCanvas.width = canvas.width;
        jpegCanvas.height = canvas.height;
        const jpegCtx = jpegCanvas.getContext('2d');
        if (jpegCtx) {
          jpegCtx.drawImage(canvas, 0, 0);
          let jpegQuality = 0.7;
          while (jpegQuality > 0.3 && getFileSize(jpegCanvas.toDataURL('image/jpeg', jpegQuality)) > maxSize) {
            jpegQuality -= 0.1;
          }
          finalDataUrl = jpegCanvas.toDataURL('image/jpeg', jpegQuality);
          const ext = 'jpg';
          const link = document.createElement('a');
          link.href = finalDataUrl;
          link.download = filename.replace(/\.(png|jpg|gif)$/i, `.${ext}`);
          link.click();
          return;
        }
      }
      
      const link = document.createElement('a');
      link.href = finalDataUrl;
      const ext = targetExt === 'jpeg' ? 'jpg' : targetExt;
      link.download = filename.replace(/\.(png|jpg|gif)$/i, `.${ext}`);
      link.click();
    } catch (err) {
      console.error("Download Error:", err);
      alert("下載轉換失敗。");
    }
  };

  const getFileSize = (dataUrl: string): number => {
    // Calculate approximate file size from base64 data URL
    const base64 = dataUrl.split(',')[1];
    if (!base64) return 0;
    // Base64 encoding increases size by ~33%, so we decode to get actual size
    const binaryLength = base64.length * 3 / 4;
    // Account for padding
    const padding = base64.endsWith('==') ? 2 : (base64.endsWith('=') ? 1 : 0);
    return binaryLength - padding;
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
      const platformName = platform === Platform.PC ? 'PC' : 'Mobile';
      link.download = `Casino_BannerSet_${platformName}_${theme || 'export'}.zip`;
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
              AI 橫幅 <span className="text-yellow-500">規格生成器</span>
            </h1>
          </div>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-yellow-500 transition-colors rounded-xl border border-white/10 hover:border-yellow-500/30 bg-slate-800/50 hover:bg-slate-800"
          >
            {isMenuOpen ? (
              <>
                <Eye size={18} />
                <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline">查看預覽畫廊</span>
              </>
            ) : (
              <>
                <Filter size={18} />
                <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline">返回設定圖片篩選</span>
              </>
            )}
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
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">選擇平台</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPlatform(Platform.PC)} 
                      disabled={loading}
                      className={`py-3 rounded-2xl border transition-all text-xs font-bold flex flex-col items-center gap-2 relative ${
                        platform === Platform.PC 
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' 
                          : 'border-white/5 bg-white/5 text-slate-500 opacity-60 hover:opacity-80'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Monitor size={16} /> 
                      <span>PC 網頁版</span>
                      {pcResults.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">
                          {pcResults.length}
                        </span>
                      )}
                    </button>
                    <button 
                      onClick={() => setPlatform(Platform.MOBILE)} 
                      disabled={loading}
                      className={`py-3 rounded-2xl border transition-all text-xs font-bold flex flex-col items-center gap-2 relative ${
                        platform === Platform.MOBILE 
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' 
                          : 'border-white/5 bg-white/5 text-slate-500 opacity-60 hover:opacity-80'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Smartphone size={16} /> 
                      <span>行動版</span>
                      {mobileResults.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">
                          {mobileResults.length}
                        </span>
                      )}
                    </button>
                  </div>
                  {(pcResults.length > 0 || mobileResults.length > 0) && !loading && (
                    <p className="text-[10px] text-slate-500 text-center">
                      點擊切換查看不同平台的圖片
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase">活動主題</label>
                    <button
                      type="button"
                      onClick={handleRandomTheme}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-yellow-500 hover:text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 rounded-lg transition-all"
                      title="隨機選擇活動主題"
                    >
                      <Shuffle size={14} />
                      <span>隨機</span>
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="點擊隨機按鈕或輸入自訂主題" 
                    value={theme} 
                    onChange={e => setTheme(e.target.value)} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none placeholder:text-slate-700" 
                  />
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

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">圖案設計類型</label>
                  <select value={pattern} onChange={e => setPattern(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer">
                    {patterns.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={handleGenerate} disabled={loading} className={`w-full py-4 rounded-2xl font-black uppercase tracking-tighter shadow-xl transition-all active:scale-95 ${loading ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-r from-yellow-600 to-yellow-400 text-black hover:from-yellow-500 hover:to-yellow-300 shadow-yellow-500/10'}`}>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "生成完整套組"}
              </button>

              {loading && <ProgressBar current={progress} total={PC_SPECS.length + MOBILE_SPECS.length} status={statusText} />}
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                預覽畫廊
                {results.length > 0 && <span className="text-xs bg-white/10 text-slate-400 px-2 py-1 rounded-md font-mono">{results.length} 個檔案</span>}
              </h2>
              {results.length > 0 && (
                <button onClick={downloadZip} className="flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-xl text-xs font-black hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/10">
                  <FolderArchive size={16} /> 打包下載 {platform === Platform.PC ? 'PC' : 'Mobile'} (PNG)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-8">
              {results.length === 0 && !loading ? (
                <div className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-slate-600">
                  <ImageIcon size={64} className="mb-4 opacity-5" />
                  {(pcResults.length > 0 || mobileResults.length > 0) ? (
                    <>
                      <p className="font-bold uppercase tracking-widest text-sm opacity-20 mb-2">
                        {platform === Platform.PC ? 'PC' : 'Mobile'} 版本尚未生成
                      </p>
                      <p className="text-xs text-slate-500 opacity-50">
                        點擊「生成完整套組」將同時生成 PC 和 Mobile 版本
                      </p>
                    </>
                  ) : (
                    <p className="font-bold uppercase tracking-widest text-sm opacity-20">等待生成中</p>
                  )}
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
              
              {loading && results.length < (platform === Platform.PC ? PC_SPECS.length : MOBILE_SPECS.length) && (pcResults.length > 0 || mobileResults.length > 0) && (
                <div className="bg-slate-900/50 border border-dashed border-white/5 rounded-3xl p-16 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <Loader2 size={40} className="text-yellow-500 animate-spin" />
                    <Sparkles className="absolute -top-2 -right-2 text-yellow-300 animate-pulse" size={16} />
                  </div>
                  <p className="text-yellow-500/50 text-xs font-bold uppercase tracking-widest animate-pulse">
                    正在製作高級素材...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-white/5 text-center">
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
          AI 驅動娛樂城橫幅系統 &copy; 2024 專業版
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
