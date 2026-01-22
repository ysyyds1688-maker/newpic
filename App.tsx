
import React, { useState, useEffect } from 'react';
import { Platform, PC_SPECS, MOBILE_SPECS, BannerSpec } from './constants';
import { generateBannerSet, GeneratedImage, GenerationInput } from './services/imageService';
import { ProgressBar } from './components/ProgressBar';
import { Download, Layout, Smartphone, Monitor, Image as ImageIcon, CheckCircle2, Loader2, Sparkles, FolderArchive, FileType, Menu, X, Settings, Filter, Eye, Shuffle, Edit2, Move } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

declare const JSZip: any;

// 安全版字體風格預設
const TEXT_STYLE_PRESETS = [
  {
    id: 'gold_neon',
    label: '金色霓虹遊戲風',
    fontFamily: 'system' as const,
    titleScale: 1.5 as 1.5,
    subtitleScale: 1.2 as 1.2,
    buttonScale: 1.2 as 1.2,
    titleColor: '#facc15',
    subtitleColor: '#e5e7eb',
    buttonColor: '#fbbf24',
    textAlign: 'right' as const,
    verticalPosition: 'middle' as const,
  },
  {
    id: 'luxury_gold',
    label: '黑金奢華',
    fontFamily: 'serif' as const,
    titleScale: 1.5 as 1.5,
    subtitleScale: 1.2 as 1.2,
    buttonScale: 1.2 as 1.2,
    titleColor: '#fef3c7',
    subtitleColor: '#e5e7eb',
    buttonColor: '#fbbf24',
    textAlign: 'left' as const,
    verticalPosition: 'middle' as const,
  },
  {
    id: 'clean_white',
    label: '簡潔白字',
    fontFamily: 'system' as const,
    titleScale: 1 as 1,
    subtitleScale: 0.8 as 0.8,
    buttonScale: 0.8 as 0.8,
    titleColor: '#ffffff',
    subtitleColor: '#e5e7eb',
    buttonColor: '#e5e7eb',
    textAlign: 'center' as const,
    verticalPosition: 'top' as const,
  },
  {
    id: 'cyber_blue',
    label: '電競藍光',
    fontFamily: 'system' as const,
    titleScale: 1.5 as 1.5,
    subtitleScale: 1.2 as 1.2,
    buttonScale: 1.2 as 1.2,
    titleColor: '#38bdf8',
    subtitleColor: '#e5e7eb',
    buttonColor: '#22d3ee',
    textAlign: 'right' as const,
    verticalPosition: 'top' as const,
  },
];

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
  const [view, setView] = useState<'config' | 'preview'>('config');
  const [mode, setMode] = useState<'ai' | 'upload'>('ai');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [titleText, setTitleText] = useState('');
  const [subtitleText, setSubtitleText] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [titleColor, setTitleColor] = useState('#ffffff');
  const [subtitleColor, setSubtitleColor] = useState('#e2e8f0');
  const [buttonColor, setButtonColor] = useState('#eab308');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('right');
  const [verticalPosition, setVerticalPosition] = useState<'top' | 'middle' | 'bottom'>('top');
  const [titleScale, setTitleScale] = useState<1 | 1.5 | 2>(1.5);
  const [subtitleScale, setSubtitleScale] = useState<0.8 | 1.2 | 1.6>(1.2);
  const [buttonScale, setButtonScale] = useState<0.8 | 1.2 | 1.6>(1.2);
  const [fontFamily, setFontFamily] = useState<'system' | 'serif'>('system');
  const [textAnchor, setTextAnchor] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [styleLoading, setStyleLoading] = useState(false);
  const [imageFitMode, setImageFitMode] = useState<'fit' | 'fill'>('fit'); // 'fit' = 完整显示有黑边, 'fill' = 填满裁切
  // 每張圖各自的文字區域 layout（相對比例 0-1）
  const [perSpecLayouts, setPerSpecLayouts] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({});
  // 正在編輯哪一張圖的 layout
  const [editingLayoutFor, setEditingLayoutFor] = useState<string | null>(null);
  // 拖曳選面的狀態
  const [dragState, setDragState] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  
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

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

  const getApiKey = (): string => {
    const runtimeKey = (window as any).process?.env?.API_KEY;
    if (runtimeKey) return runtimeKey;
    // @ts-ignore
    const buildTimeKey = typeof process !== 'undefined' && process.env?.API_KEY;
    if (buildTimeKey) return buildTimeKey as string;
    // @ts-ignore
    const viteKey = import.meta.env?.VITE_API_KEY || import.meta.env?.VITE_GEMINI_API_KEY;
    if (viteKey) return viteKey as string;
    return "";
  };

  // 通用壓縮工具：回傳壓縮後的 dataUrl 與實際使用的副檔名
  const processImageForDownload = async (
    sourceBase64: string,
    filename: string,
    targetExt: 'png' | 'jpeg' | 'gif'
  ): Promise<{ dataUrl: string; ext: string }> => {
    const img = new Image();
    img.src = `data:image/png;base64,${sourceBase64}`;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context failed');
    }

    ctx.drawImage(img, 0, 0);

    let finalExt: 'png' | 'jpeg' = targetExt === 'gif' ? 'jpeg' : targetExt;
    let mimeType = `image/${finalExt === 'jpeg' ? 'jpeg' : finalExt}`;
    let finalDataUrl: string;
    let quality = finalExt === 'jpeg' ? 0.85 : 1;
    let workCanvas = canvas;

    // 依不同格式進行壓縮
    if (finalExt === 'jpeg') {
      // JPEG：先降畫質，再必要時縮小尺寸
      let attempts = 0;
      while (attempts < 20) {
        finalDataUrl = workCanvas.toDataURL(mimeType, quality);
        const fileSize = getFileSize(finalDataUrl);
        if (fileSize <= MAX_FILE_SIZE) break;
        quality = Math.max(0.3, quality - 0.05);
        attempts++;
      }

      if (getFileSize(finalDataUrl) > MAX_FILE_SIZE) {
        const scaleFactor = Math.sqrt(MAX_FILE_SIZE / getFileSize(finalDataUrl)) * 0.9;
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
    } else {
      // PNG：先用原尺寸輸出，不夠小再縮小尺寸，最後必要時轉成 JPEG
      finalDataUrl = workCanvas.toDataURL(mimeType);
      let fileSize = getFileSize(finalDataUrl);

      if (fileSize > MAX_FILE_SIZE) {
        const scaleFactor = Math.sqrt(MAX_FILE_SIZE / fileSize) * 0.9;
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

          // 若仍然過大，轉為 JPEG 再壓縮
          fileSize = getFileSize(finalDataUrl);
          if (fileSize > MAX_FILE_SIZE) {
            finalExt = 'jpeg';
            mimeType = 'image/jpeg';
            let jpegQuality = 0.85;
            while (jpegQuality > 0.3 && getFileSize(resizedCanvas.toDataURL('image/jpeg', jpegQuality)) > MAX_FILE_SIZE) {
              jpegQuality -= 0.1;
            }
            finalDataUrl = resizedCanvas.toDataURL('image/jpeg', jpegQuality);
          }
        }
      }
    }

    // 最後保險再檢查一次大小，不行就強制轉成壓縮 JPEG
    const finalSize = getFileSize(finalDataUrl);
    if (finalSize > MAX_FILE_SIZE) {
      const jpegCanvas = document.createElement('canvas');
      jpegCanvas.width = canvas.width;
      jpegCanvas.height = canvas.height;
      const jpegCtx = jpegCanvas.getContext('2d');
      if (jpegCtx) {
        jpegCtx.drawImage(canvas, 0, 0);
        let jpegQuality = 0.7;
        while (jpegQuality > 0.3 && getFileSize(jpegCanvas.toDataURL('image/jpeg', jpegQuality)) > MAX_FILE_SIZE) {
          jpegQuality -= 0.1;
        }
        finalDataUrl = jpegCanvas.toDataURL('image/jpeg', jpegQuality);
        finalExt = 'jpeg';
      }
    }

    const baseExt = finalExt === 'jpeg' ? 'jpg' : finalExt;
    const safeName = filename.replace(/\.(png|jpg|jpeg|gif)$/i, `.${baseExt}`);

    return { dataUrl: finalDataUrl, ext: safeName };
  };

  const applyTextStylePreset = (id: string) => {
    const preset = TEXT_STYLE_PRESETS.find(p => p.id === id);
    if (!preset) return;
    setFontFamily(preset.fontFamily);
    setTitleScale(preset.titleScale);
    setSubtitleScale(preset.subtitleScale);
    setButtonScale(preset.buttonScale);
    setTitleColor(preset.titleColor);
    setSubtitleColor(preset.subtitleColor);
    setButtonColor(preset.buttonColor);
    setTextAlign(preset.textAlign);
    setVerticalPosition(preset.verticalPosition);
  };

  const handleAiSuggestTextStyle = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      alert("尚未設定 API Key，無法使用 AI 推薦字體風格。");
      return;
    }
    setStyleLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const styleList = TEXT_STYLE_PRESETS.map(p => `${p.id}: ${p.label}`).join('\n');
      const themeText = theme || '一般娛樂城活動';
      const subjectText = subject || '一般遊戲角色或娛樂城主視覺';
      const styleText = style || '黑金奢華';

      const prompt = `You are helping a designer choose a text style preset for a casino/iGaming banner.
Available presets:
${styleList}

Current banner:
- Theme: ${themeText}
- Visual Style: ${styleText}
- Main Subject: ${subjectText}

From the presets above, choose the single best preset id that matches the banner style.
Only answer with a short JSON object like: {"id":"gold_neon"}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const text = response.text?.() || (response.candidates?.[0]?.content?.parts?.[0] as any)?.text || '';
      let chosenId = '';
      try {
        const match = text.match(/\{[\s\S]*\}/);
        const json = match ? match[0] : text;
        const parsed = JSON.parse(json);
        chosenId = parsed.id || '';
      } catch {
        const found = TEXT_STYLE_PRESETS.find(p => text.includes(p.id));
        if (found) chosenId = found.id;
      }

      if (!chosenId) {
        // fallback: pick by current visual style
        if (style.includes('黑金') || style.includes('奢華')) {
          chosenId = 'luxury_gold';
        } else if (style.includes('電競') || style.includes('賽博')) {
          chosenId = 'cyber_blue';
        } else {
          chosenId = 'gold_neon';
        }
      }

      applyTextStylePreset(chosenId);
      alert(`已套用 AI 推薦字體風格：「${TEXT_STYLE_PRESETS.find(p => p.id === chosenId)?.label || chosenId}」`);
    } catch (error) {
      console.error('AI text style suggest error:', error);
      alert('AI 推薦字體風格失敗，請稍後再試。');
    } finally {
      setStyleLoading(false);
    }
  };

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

  const drawBannerWithText = async (
    base64: string,
    spec: BannerSpec,
    layoutOverride?: { x: number; y: number; width: number; height: number }
  ): Promise<GeneratedImage> => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = spec.width;
    canvas.height = spec.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context failed');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 統一使用填滿裁切模式：填滿整個畫布，多餘部分裁切，確保沒有黑邊
    const imgRatio = img.width / img.height;
    const targetRatio = spec.width / spec.height;
    let sw: number, sh: number, sx: number, sy: number;
    if (imgRatio > targetRatio) {
      // 比較寬，左右裁切
      sh = img.height;
      sw = img.height * targetRatio;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      // 比較高，上下裁切
      sw = img.width;
      sh = img.width / targetRatio;
      sx = 0;
      // 對於寬橫幅，優先保護垂直中心偏上的區域（人物臉部通常在這裡）
      if (targetRatio > 2.5) {
        sy = (img.height - sh) * 0.4;
      } else {
        sy = (img.height - sh) * 0.3;
      }
      if (sy < 0) sy = 0;
      if (sy + sh > img.height) sy = img.height - sh;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, spec.width, spec.height);

    // 繪製文字（支援顏色 / 尺寸 / 對齊 / 垂直位置 / 字型）
    const padding = Math.max(40, Math.floor(spec.width * 0.03));
    // 依規格與文字區域自動調整基礎字體大小：PC 版略大、Mobile 稍小
    const isPcSpec = spec.id.startsWith('pc_');
    const activeLayout = layoutOverride || perSpecLayouts[spec.id] || null;

    const effectiveHeight = activeLayout
      ? activeLayout.height * spec.height
      : spec.height;

    const baseFontSize = Math.max(
      isPcSpec ? 48 : 32,
      Math.floor(effectiveHeight * (isPcSpec ? 0.14 : 0.11))
    );

    const titleFontSize = baseFontSize * titleScale;
    const subtitleFontSize = Math.max(24, Math.floor(baseFontSize * 0.6 * subtitleScale));
    const buttonFontSize = Math.max(24, Math.floor(baseFontSize * 0.65 * buttonScale));

    const fontFamilyStr =
      fontFamily === 'system'
        ? "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        : "'Times New Roman', 'Noto Serif TC', serif";

    const hasTitle = !!titleText;
    const hasSubtitle = !!subtitleText;
    const hasButton = !!buttonText;

    const btnPaddingX = Math.max(24, Math.floor(spec.width * 0.03));
    const btnPaddingY = Math.max(12, Math.floor(spec.height * 0.02));

    // 預估整個文字區塊高度，用來決定垂直位置
    let blockHeight = 0;
    if (hasTitle) {
      blockHeight += titleFontSize + 12;
    }
    if (hasSubtitle) {
      blockHeight += subtitleFontSize + 24;
    }
    if (hasButton) {
      blockHeight += buttonFontSize + btnPaddingY * 2;
    }

    let currentY: number;
    let baseX: number;

    // 優先使用該規格的自訂 layout（面）
    const customLayout = activeLayout;
    if (customLayout) {
      // 使用自訂的矩形區域來放置文字
      const layoutX = customLayout.x * spec.width;
      const layoutY = customLayout.y * spec.height;
      const layoutWidth = customLayout.width * spec.width;
      const layoutHeight = customLayout.height * spec.height;
      
      // 在矩形區域內對齊文字
      if (textAlign === 'left') {
        baseX = layoutX + padding;
        ctx.textAlign = 'left';
      } else if (textAlign === 'center') {
        baseX = layoutX + layoutWidth / 2;
        ctx.textAlign = 'center';
      } else {
        baseX = layoutX + layoutWidth - padding;
        ctx.textAlign = 'right';
      }
      
      // 垂直對齊在矩形區域內
      if (verticalPosition === 'middle') {
        currentY = layoutY + (layoutHeight - blockHeight) / 2;
      } else if (verticalPosition === 'bottom') {
        currentY = layoutY + layoutHeight - padding - blockHeight;
      } else {
        currentY = layoutY + padding;
      }
      
      // 確保不超出矩形範圍
      if (currentY < layoutY + padding) currentY = layoutY + padding;
      if (currentY + blockHeight > layoutY + layoutHeight - padding) {
        currentY = layoutY + layoutHeight - padding - blockHeight;
      }
    } else if (textAnchor) {
      // 若有自訂點選位置，將整個文字區塊以該點為中心
      const anchorX = textAnchor.x * spec.width;
      const anchorY = textAnchor.y * spec.height;
      currentY = anchorY - blockHeight / 2;
      if (currentY < padding) currentY = padding;
      if (currentY + blockHeight > spec.height - padding) {
        currentY = spec.height - padding - blockHeight;
      }
      baseX = anchorX;
      ctx.textAlign = 'center';
    } else {
      // 使用預設對齊方式
      if (verticalPosition === 'middle') {
        currentY = (spec.height - blockHeight) / 2;
      } else if (verticalPosition === 'bottom') {
        currentY = spec.height - padding - blockHeight;
      } else {
        currentY = padding;
      }

      // 水平對齊
      if (textAlign === 'left') {
        baseX = padding;
        ctx.textAlign = 'left';
      } else if (textAlign === 'center') {
        baseX = spec.width / 2;
        ctx.textAlign = 'center';
      } else {
        baseX = spec.width - padding;
        ctx.textAlign = 'right';
      }
    }

    ctx.textBaseline = 'top';
    ctx.fillStyle = titleColor;

    if (hasTitle) {
      ctx.font = `900 ${titleFontSize}px ${fontFamilyStr}`;
      ctx.fillStyle = titleColor;
      ctx.fillText(titleText, baseX, currentY);
      currentY += titleFontSize + 12;
    }

    if (hasSubtitle) {
      ctx.font = `500 ${subtitleFontSize}px ${fontFamilyStr}`;
      ctx.fillStyle = subtitleColor;
      ctx.fillText(subtitleText, baseX, currentY);
      currentY += subtitleFontSize + 24;
    }

    if (hasButton) {
      // 計算按鈕寬高
      ctx.font = `800 ${buttonFontSize}px ${fontFamilyStr}`;
      const textWidth = ctx.measureText(buttonText).width;
      const btnWidth = textWidth + btnPaddingX * 2;
      const btnHeight = buttonFontSize + btnPaddingY * 2;

      let btnX: number;
      if (textAlign === 'left') {
        btnX = padding;
      } else if (textAlign === 'center') {
        btnX = (spec.width - btnWidth) / 2;
      } else {
        btnX = spec.width - padding - btnWidth;
      }
      const btnY = currentY;

      // 按鈕背景
      ctx.fillStyle = buttonColor;
      ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

      // 按鈕文字
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(buttonText, btnX + btnWidth / 2, btnY + btnHeight / 2);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const base64Out = dataUrl.split(',')[1] || '';

    return {
      spec,
      url: dataUrl,
      base64: base64Out,
      format: 'png'
    };
  };

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
      
      // 自動跳轉到預覽畫廊
      setView('preview');
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

  const handleGenerateFromUpload = async () => {
    if (!uploadedImage) {
      alert("請先匯入底圖。");
      return;
    }

    setLoading(true);
    setPcResults([]);
    setMobileResults([]);
    if (window.innerWidth < 1024) setIsMenuOpen(false);

    try {
      setStatusText("正在從匯入圖片生成各尺寸...");
      setProgress(0);

      const allSpecs: BannerSpec[] = [...PC_SPECS, ...MOBILE_SPECS];
      const pcResultsList: GeneratedImage[] = [];
      const mobileResultsList: GeneratedImage[] = [];

      for (let i = 0; i < allSpecs.length; i++) {
        const spec = allSpecs[i];
        setStatusText(`處理 ${spec.name} (${spec.width}x${spec.height})...`);

        const imgRes = await drawBannerWithText(uploadedImage, spec);

        if (spec.id.startsWith('pc_')) {
          pcResultsList.push(imgRes);
          setPcResults(prev => [...prev, imgRes]);
        } else if (spec.id.startsWith('mb_')) {
          mobileResultsList.push(imgRes);
          setMobileResults(prev => [...prev, imgRes]);
        }

        setProgress(i + 1);
        if (i < allSpecs.length - 1) {
          await delay(150);
        }
      }

      setProgress(allSpecs.length);
      setStatusText(`匯入圖片生成完成！PC: ${pcResultsList.length} 個，Mobile: ${mobileResultsList.length} 個`);
      
      // 自動跳轉到預覽畫廊
      setView('preview');
    } catch (error) {
      console.error("Upload Generate Error:", error);
      alert("匯入圖片生成失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  // 重新生成單張圖片（當 layout 改變時）
  const regenerateSingleImage = async (specId: string, layoutOverride?: { x: number; y: number; width: number; height: number }) => {
    if (!uploadedImage || mode !== 'upload') return;
    
    const spec = [...PC_SPECS, ...MOBILE_SPECS].find(s => s.id === specId);
    if (!spec) return;

    try {
      const imgRes = await drawBannerWithText(uploadedImage, spec, layoutOverride || perSpecLayouts[specId]);
      
      if (spec.id.startsWith('pc_')) {
        setPcResults(prev => prev.map(r => r.spec.id === specId ? imgRes : r));
      } else if (spec.id.startsWith('mb_')) {
        setMobileResults(prev => prev.map(r => r.spec.id === specId ? imgRes : r));
      }
    } catch (error) {
      console.error("Regenerate error:", error);
      alert("重新生成失敗，請稍後再試。");
    }
  };

  // 處理拖曳選面（滑鼠）
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, specId: string) => {
    if (editingLayoutFor !== specId) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDragState({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, specId: string) => {
    if (!dragState || editingLayoutFor !== specId) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setDragState(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>, specId: string) => {
    if (!dragState || editingLayoutFor !== specId) return;
    e.preventDefault();
    
    const minX = Math.min(dragState.startX, dragState.currentX);
    const minY = Math.min(dragState.startY, dragState.currentY);
    const maxX = Math.max(dragState.startX, dragState.currentX);
    const maxY = Math.max(dragState.startY, dragState.currentY);
    
    const width = Math.max(0.1, maxX - minX); // 至少 10% 寬度
    const height = Math.max(0.1, maxY - minY); // 至少 10% 高度
    
    const newLayout = {
      x: Math.max(0, Math.min(1 - width, minX)),
      y: Math.max(0, Math.min(1 - height, minY)),
      width,
      height
    };
    
    setPerSpecLayouts(prev => ({ ...prev, [specId]: newLayout }));
    setDragState(null);
    
    // 立即使用新 layout 重新生成這張圖
    regenerateSingleImage(specId, newLayout);
  };

  // 處理觸控選面（手機）
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, specId: string) => {
    if (editingLayoutFor !== specId) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;
    setDragState({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>, specId: string) => {
    if (!dragState || editingLayoutFor !== specId) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
    setDragState(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>, specId: string) => {
    if (!dragState || editingLayoutFor !== specId) return;
    e.preventDefault();
    
    const minX = Math.min(dragState.startX, dragState.currentX);
    const minY = Math.min(dragState.startY, dragState.currentY);
    const maxX = Math.max(dragState.startX, dragState.currentX);
    const maxY = Math.max(dragState.startY, dragState.currentY);
    
    const width = Math.max(0.1, maxX - minX);
    const height = Math.max(0.1, maxY - minY);
    
    const newLayout = {
      x: Math.max(0, Math.min(1 - width, minX)),
      y: Math.max(0, Math.min(1 - height, minY)),
      width,
      height
    };
    
    setPerSpecLayouts(prev => ({ ...prev, [specId]: newLayout }));
    setDragState(null);
    regenerateSingleImage(specId, newLayout);
  };

  const convertAndDownload = async (sourceBase64: string, filename: string, targetExt: 'png' | 'jpeg' | 'gif') => {
    try {
      const { dataUrl, ext } = await processImageForDownload(sourceBase64, filename, targetExt);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = ext;
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

      // 逐一壓縮每張圖片到 2MB 以內後再加入 ZIP
      for (const res of results) {
        try {
          const { dataUrl, ext } = await processImageForDownload(
            res.base64,
            res.spec.fileName,
            'png'
          );
          const base64 = dataUrl.split(',')[1];
          zip.file(ext, base64, { base64: true });
        } catch (err) {
          console.error('ZIP image process error:', err);
          // 若單張處理失敗，仍然加入原始檔，避免整個壓縮失敗
          zip.file(res.spec.fileName, res.base64, { base64: true });
        }
      }

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView('config')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-colors ${
                view === 'config'
                  ? 'bg-yellow-500 text-black border-yellow-500'
                  : 'text-slate-300 border-white/10 bg-slate-800/50 hover:text-yellow-500 hover:border-yellow-500/40'
              }`}
            >
              <Settings size={16} />
              <span className="hidden sm:inline">配置工作台</span>
            </button>
            <button
              type="button"
              onClick={() => setView('preview')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-colors ${
                view === 'preview'
                  ? 'bg-yellow-500 text-black border-yellow-500'
                  : 'text-slate-300 border-white/10 bg-slate-800/50 hover:text-yellow-500 hover:border-yellow-500/40'
              }`}
            >
              <Eye size={16} />
              <span className="hidden sm:inline">預覽畫廊</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar / 配置工作台 */}
          {view !== 'preview' && (
          <div className={`${view === 'config' ? 'lg:col-span-12' : 'lg:col-span-4'} space-y-6`}>
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
                <div className="space-y-3 pt-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">生成模式</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('ai')}
                      className={`py-2 rounded-xl text-xs font-bold ${
                        mode === 'ai'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                      disabled={loading}
                    >
                      AI 一鍵生成
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('upload')}
                      className={`py-2 rounded-xl text-xs font-bold ${
                        mode === 'upload'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                      disabled={loading}
                    >
                      匯入圖片加字
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">圖片處理模式</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImageFitMode('fit')}
                      className={`py-2 rounded-xl text-xs font-bold ${
                        imageFitMode === 'fit'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                      disabled={loading}
                      title="完整顯示圖片，可能會有黑邊"
                    >
                      完整顯示
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageFitMode('fill')}
                      className={`py-2 rounded-xl text-xs font-bold ${
                        imageFitMode === 'fill'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                      disabled={loading}
                      title="填滿整個畫面，可能裁切部分內容"
                    >
                      填滿裁切
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {imageFitMode === 'fit' ? '圖片完整顯示，可能會有上下或左右黑邊' : '圖片填滿畫面，多餘部分會被裁切'}
                  </p>
                </div>

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

                {mode === 'upload' && (
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">匯入底圖（拖曳或選擇檔案）</label>
                      <div
                        className={`relative border-2 border-dashed rounded-xl px-3 py-4 text-[11px] text-center cursor-pointer transition-colors ${
                          isDraggingUpload ? 'border-yellow-400 bg-yellow-500/10' : 'border-white/15 bg-black/20 hover:border-yellow-500/40'
                        }`}
                        onDragOver={e => {
                          e.preventDefault();
                          setIsDraggingUpload(true);
                        }}
                        onDragLeave={e => {
                          e.preventDefault();
                          setIsDraggingUpload(false);
                        }}
                        onDrop={e => {
                          e.preventDefault();
                          setIsDraggingUpload(false);
                          const file = e.dataTransfer.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              const base64 = reader.result.split(',')[1] || '';
                              setUploadedImage(base64);
                              setTextAnchor(null);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                const base64 = reader.result.split(',')[1] || '';
                                setUploadedImage(base64);
                                setTextAnchor(null);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <p className="text-slate-400">
                          拖曳圖片到此處，或點擊選擇檔案
                        </p>
                      </div>
                      {uploadedImage && (
                        <p className="text-[10px] text-emerald-400">
                          已載入匯入圖片，可開始加字生成。
                        </p>
                      )}
                    </div>

                    {uploadedImage && (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          點選預覽，設定文字大致位置
                        </label>
                        <div
                          className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 cursor-crosshair"
                          onClick={e => {
                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                            const x = (e.clientX - rect.left) / rect.width;
                            const y = (e.clientY - rect.top) / rect.height;
                            setTextAnchor({ x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) });
                          }}
                        >
                          <img
                            src={`data:image/png;base64,${uploadedImage}`}
                            alt="預覽"
                            className="w-full h-auto object-contain"
                          />
                          {textAnchor && (
                            <div
                              className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border border-black bg-yellow-400 shadow"
                              style={{ left: `${textAnchor.x * 100}%`, top: `${textAnchor.y * 100}%` }}
                            />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          這個點會被當作整個文字區塊的中心，套用到所有尺寸。
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">標題文字</label>
                      <input
                        type="text"
                        value={titleText}
                        onChange={e => setTitleText(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">副標 / 說明</label>
                      <input
                        type="text"
                        value={subtitleText}
                        onChange={e => setSubtitleText(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">按鈕文字</label>
                      <input
                        type="text"
                        value={buttonText}
                        onChange={e => setButtonText(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">標題大小</label>
                        <select
                          value={titleScale}
                          onChange={e => setTitleScale(Number(e.target.value) as 1 | 1.5 | 2)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px]"
                        >
                          <option value={1}>小</option>
                          <option value={1.5}>中</option>
                          <option value={2}>大</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">副標大小</label>
                        <select
                          value={subtitleScale}
                          onChange={e => setSubtitleScale(Number(e.target.value) as 0.8 | 1.2 | 1.6)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px]"
                        >
                          <option value={0.8}>小</option>
                          <option value={1.2}>中</option>
                          <option value={1.6}>大</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">按鈕大小</label>
                        <select
                          value={buttonScale}
                          onChange={e => setButtonScale(Number(e.target.value) as 0.8 | 1.2 | 1.6)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px]"
                        >
                          <option value={0.8}>小</option>
                          <option value={1.2}>中</option>
                          <option value={1.6}>大</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">標題顏色</label>
                        <input
                          type="color"
                          value={titleColor}
                          onChange={e => setTitleColor(e.target.value)}
                          className="w-full h-7 rounded border border-white/10 bg-transparent p-0"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">副標顏色</label>
                        <input
                          type="color"
                          value={subtitleColor}
                          onChange={e => setSubtitleColor(e.target.value)}
                          className="w-full h-7 rounded border border-white/10 bg-transparent p-0"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">按鈕顏色</label>
                          <input
                            type="color"
                            value={buttonColor}
                            onChange={e => setButtonColor(e.target.value)}
                            className="w-full h-7 rounded border border-white/10 bg-transparent p-0"
                          />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">對齊方式</label>
                        <select
                          value={textAlign}
                          onChange={e => setTextAlign(e.target.value as 'left' | 'center' | 'right')}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px]"
                        >
                          <option value="left">靠左</option>
                          <option value="center">置中</option>
                          <option value="right">靠右</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">垂直位置</label>
                        <select
                          value={verticalPosition}
                          onChange={e => setVerticalPosition(e.target.value as 'top' | 'middle' | 'bottom')}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px]"
                        >
                          <option value="top">上方</option>
                          <option value="middle">中間</option>
                          <option value="bottom">下方</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">字體風格</label>
                      <div className="flex gap-2">
                        <select
                          value={''}
                          onChange={e => {
                            const id = e.target.value;
                            if (!id) return;
                            applyTextStylePreset(id);
                            e.currentTarget.value = '';
                          }}
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px]"
                        >
                          <option value="">選擇預設風格...</option>
                          {TEXT_STYLE_PRESETS.map(p => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAiSuggestTextStyle}
                          disabled={styleLoading || loading}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500/60 disabled:opacity-50"
                          title="由 AI 根據活動風格推薦字體風格"
                        >
                          {styleLoading ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Sparkles size={12} />
                          )}
                          <span>AI 推薦</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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

              <button 
                onClick={mode === 'ai' ? handleGenerate : handleGenerateFromUpload} 
                disabled={loading} 
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-tighter shadow-xl transition-all active:scale-95 ${loading ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-r from-yellow-600 to-yellow-400 text-black hover:from-yellow-500 hover:to-yellow-300 shadow-yellow-500/10'}`}
              >
                {loading ? (
                  <Loader2 className="animate-spin mx-auto" />
                ) : (
                  mode === 'ai' ? '生成完整套組' : '匯入圖 + 文字生成套組'
                )}
              </button>

              {loading && <ProgressBar current={progress} total={PC_SPECS.length + MOBILE_SPECS.length} status={statusText} />}
            </div>
          </div>
          )}

          {/* Results Area / 預覽畫廊 */}
          {view !== 'config' && (
          <div className={`${view === 'preview' ? 'lg:col-span-12' : 'lg:col-span-8'}`}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                預覽畫廊
                {results.length > 0 && <span className="text-xs bg-white/10 text-slate-400 px-2 py-1 rounded-md font-mono">{results.length} 個檔案</span>}
              </h2>
              <div className="flex items-center gap-3">
                {/* PC/手機切換按鈕 */}
                {(pcResults.length > 0 || mobileResults.length > 0) && (
                  <div className="flex items-center gap-2 bg-slate-800/50 border border-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setPlatform(Platform.PC)}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                        platform === Platform.PC
                          ? 'bg-yellow-500 text-black'
                          : 'text-slate-400 hover:text-slate-200'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Monitor size={14} />
                      PC ({pcResults.length})
                    </button>
                    <button
                      onClick={() => setPlatform(Platform.MOBILE)}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                        platform === Platform.MOBILE
                          ? 'bg-yellow-500 text-black'
                          : 'text-slate-400 hover:text-slate-200'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Smartphone size={14} />
                      Mobile ({mobileResults.length})
                    </button>
                  </div>
                )}
                {results.length > 0 && (
                  <button onClick={downloadZip} className="flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-xl text-xs font-black hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/10">
                    <FolderArchive size={16} /> 打包下載 {platform === Platform.PC ? 'PC' : 'Mobile'} (PNG)
                  </button>
                )}
              </div>
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
                        點擊下方按鈕將同時生成 PC 和 Mobile 版本
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
                      
                      <div className="flex items-center gap-2">
                        {mode === 'upload' && (
                          <button
                            onClick={() => {
                              if (editingLayoutFor === res.spec.id) {
                                setEditingLayoutFor(null);
                                setDragState(null);
                              } else {
                                setEditingLayoutFor(res.spec.id);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${
                              editingLayoutFor === res.spec.id
                                ? 'bg-yellow-500 text-black'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            <Edit2 size={12} />
                            {editingLayoutFor === res.spec.id ? '完成' : '調整位置'}
                          </button>
                        )}
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
                    </div>

                    <div className="p-4 bg-black/40 overflow-x-auto custom-scrollbar">
                      <div className="min-w-fit mx-auto flex justify-center p-2 relative">
                        <div
                          className="relative inline-block"
                          onMouseDown={(e) => handleMouseDown(e, res.spec.id)}
                          onMouseMove={(e) => handleMouseMove(e, res.spec.id)}
                          onMouseUp={(e) => handleMouseUp(e, res.spec.id)}
                          onMouseLeave={() => {
                            if (dragState && editingLayoutFor === res.spec.id) {
                              // 取消拖曳，不保存
                              setDragState(null);
                            }
                          }}
                          onTouchStart={(e) => handleTouchStart(e, res.spec.id)}
                          onTouchMove={(e) => handleTouchMove(e, res.spec.id)}
                          onTouchEnd={(e) => handleTouchEnd(e, res.spec.id)}
                        >
                          <img 
                            src={res.url} 
                            className="max-h-[500px] w-auto shadow-2xl rounded-lg border border-white/10" 
                            alt={res.spec.name}
                            draggable={false}
                          />
                          {/* 顯示已設定的文字區域 */}
                          {mode === 'upload' && perSpecLayouts[res.spec.id] && (
                            <div
                              className="absolute border-2 border-yellow-500 bg-yellow-500/10 pointer-events-none"
                              style={{
                                left: `${perSpecLayouts[res.spec.id].x * 100}%`,
                                top: `${perSpecLayouts[res.spec.id].y * 100}%`,
                                width: `${perSpecLayouts[res.spec.id].width * 100}%`,
                                height: `${perSpecLayouts[res.spec.id].height * 100}%`,
                              }}
                            />
                          )}
                          {/* 顯示正在拖曳的區域 */}
                          {mode === 'upload' && editingLayoutFor === res.spec.id && dragState && (
                            <div
                              className="absolute border-2 border-dashed border-blue-400 bg-blue-400/20 pointer-events-none"
                              style={{
                                left: `${Math.min(dragState.startX, dragState.currentX) * 100}%`,
                                top: `${Math.min(dragState.startY, dragState.currentY) * 100}%`,
                                width: `${Math.abs(dragState.currentX - dragState.startX) * 100}%`,
                                height: `${Math.abs(dragState.currentY - dragState.startY) * 100}%`,
                              }}
                            />
                          )}
                          {/* 編輯模式提示 */}
                          {mode === 'upload' && editingLayoutFor === res.spec.id && !dragState && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                              <div className="bg-slate-900/90 border border-yellow-500 rounded-lg px-4 py-2 text-xs text-yellow-500 font-bold">
                                <Move size={16} className="inline mr-2" />
                                拖曳滑鼠或手指選擇文字區域
                              </div>
                            </div>
                          )}
                        </div>
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
          )}
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
