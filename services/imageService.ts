
import { GoogleGenAI } from "@google/genai";
import { BannerSpec } from "../constants";

export interface GenerationInput {
  theme: string;
  title: string;
  style: string;
  subject?: string;
  pattern?: string;
  format: 'png' | 'jpeg' | 'gif';
}

export interface GeneratedImage {
  spec: BannerSpec;
  url: string;
  base64: string;
  format: string;
}

/**
 * 獲取 API KEY，相容不同部署環境
 */
const getApiKey = (): string => {
  // 優先從 window.process 讀取（運行時注入，適用於 Zeabur 等平台）
  const runtimeKey = (window as any).process?.env?.API_KEY;
  if (runtimeKey) return runtimeKey;
  
  // 從 Vite 構建時注入的環境變數讀取（process.env.API_KEY 會被 Vite define 替換）
  // @ts-ignore - Vite 會在構建時替換 process.env.API_KEY
  const buildTimeKey = typeof process !== 'undefined' && process.env?.API_KEY;
  if (buildTimeKey) return buildTimeKey;
  
  // 嘗試從 import.meta.env 讀取（Vite 標準方式，需要 VITE_ 前綴）
  // @ts-ignore
  const viteKey = import.meta.env?.VITE_API_KEY || import.meta.env?.VITE_GEMINI_API_KEY;
  if (viteKey) return viteKey;
  
  return "";
};

/**
 * 生成一張基礎圖片，然後調整到所有規格
 */
export async function generateBannerSet(
  specs: BannerSpec[],
  input: GenerationInput
): Promise<GeneratedImage[]> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("API Key 未設定。請在 Zeabur 環境變數中設定 API_KEY 並重新部署。");
  }

  // 根據 SDK 指導，直接初始化
  const ai = new GoogleGenAI({ apiKey });
  
  // 找到最大尺寸的規格作為基礎圖片尺寸
  const maxSpec = specs.reduce((max, spec) => {
    const maxArea = max.width * max.height;
    const specArea = spec.width * spec.height;
    return specArea > maxArea ? spec : max;
  }, specs[0]);

  // 處理主體圖案物件
  let subjectPrompt = '';
  if (input.subject && input.subject !== '自動匹配') {
    const subjectMap: Record<string, string> = {
      '塞特遊戲': 'The primary visual focus should be a powerful Egyptian mythology character inspired by Set (Seth), the god of storms and chaos. Feature a majestic character (male or female) with: elaborate Egyptian-style golden headdress with cobra motifs, ornate golden jewelry and collars, luxurious Egyptian royal garments with gold and blue accents, glowing eyes or mystical aura, dynamic pose with arms extended or holding a staff/scepter, magical blue flames or energy effects. The character must have a HUMAN FACE (not animal head) with Egyptian features - handsome/beautiful human face, dark-skinned, muscular, heroic appearance. Background should have dramatic sky with orange-red to purple-blue gradient, mystical atmosphere with floating light particles. Overall style: high-detail digital game art, epic fantasy, cinematic lighting, vibrant colors, game banner quality similar to "Storm of Seth" or "War God Set" game promotional art.',
      '索爾遊戲': 'The primary visual focus should be a powerful Norse mythology character inspired by Thor, the god of thunder. Feature a majestic character with: elaborate Norse-style golden armor and helmet, lightning effects and thunderbolts, hammer (Mjolnir) or weapon motifs, glowing eyes with electric energy, dynamic heroic pose, flowing cape or dramatic clothing, storm clouds and lightning in background. The character should have a muscular, heroic appearance with Norse warrior aesthetics. Background should have dramatic stormy sky with purple-blue tones, lightning effects, mystical atmosphere. Overall style: high-detail digital game art, epic fantasy, cinematic lighting, vibrant colors, game banner quality.',
      '捕魚機鯊魚': 'The primary visual focus should be fishing game elements, prominently featuring sharks in dynamic poses, along with other marine creatures like fish, octopus, or sea monsters. Create an underwater gaming atmosphere.',
      '捕魚機海洋生物': 'The primary visual focus should be fishing game elements with various marine creatures such as colorful fish, sharks, jellyfish, sea turtles, and other ocean life in an underwater gaming scene.',
      '角子機': 'The primary visual focus should be slot machine elements, featuring vibrant slot machine symbols, reels, classic casino slot machine aesthetics, or slot machine interface in an exciting composition.',
      '輪盤': 'The primary visual focus should be roulette wheel elements, featuring roulette wheel designs, betting chips, casino table motifs, or roulette game interface in an elegant casino setting.',
      '遊戲角色': 'The primary visual focus should be casino game characters, featuring stylized game mascots, dealers, or character designs from popular casino games in an engaging composition.',
      '娛樂城標誌': 'The primary visual focus should be casino-themed logo elements, featuring casino chips, cards, elegant casino branding motifs, or casino logo designs in a luxurious composition.'
    };
    
    subjectPrompt = subjectMap[input.subject] || `The primary visual focus should be ${input.subject} in a high-end casino or gaming context.`;
  } else {
    subjectPrompt = "The primary visual focus should be an appropriate high-end casino or event-related object.";
  }
  
  // 處理圖案設計類型
  let patternPrompt = '';
  if (input.pattern && input.pattern !== '自動匹配') {
    patternPrompt = `Include ${input.pattern} as decorative patterns and design elements in the background.`;
  }
  
  const prompt = `Create a professional game promotional banner for an iGaming/Casino platform, similar to high-quality game art like "Storm of Seth" or "War God Set" game banners.

Theme: ${input.theme}
Visual Style: ${input.style}
Main Subject: ${subjectPrompt}
${patternPrompt ? `Pattern Design: ${patternPrompt}` : ''}

Design Requirements:
- GAME ART QUALITY: High-detail digital game art style, epic fantasy aesthetic, cinematic game promotional banner quality.
- CHARACTER DESIGN: If featuring a character, make it powerful, heroic, and visually striking with game-quality character design. Include dynamic poses, glowing effects, magical auras, or energy effects.
- COMPOSITION: Position the main subject (character or game element) prominently, either to the left or right side of the frame. IMPORTANT: For character subjects, position the character's FACE in the vertical center to upper-center area (between 30% and 60% from the top) to ensure it won't be cropped when resized to wide banner formats. Create a dramatic, engaging composition.
- BACKGROUND: Create a dramatic, atmospheric background. For mythological themes, use dramatic skies with gradients (orange-red to purple-blue), mystical atmospheres, floating particles, or magical effects. For casino themes, use elegant casino settings or abstract luxurious backgrounds.
- SAFE ZONE: Leave significant BLANK SPACE on the opposite side of the main subject for text overlay (game titles, buttons, promotional text).
- NO TEXT: Strictly NO letters, numbers, words, or text in the image itself.
- LIGHTING: Use dramatic cinematic lighting with strong contrast, rim lighting on characters, and atmospheric glow effects.
- COLOR PALETTE: Rich, vibrant colors with gold accents for luxury feel. High saturation for game art appeal.
- QUALITY: Ultra-sharp focus, 8k resolution, professional game banner quality.
- STYLE REFERENCE: Similar to professional game promotional banners, casino game art, or high-end mobile game marketing materials.
- UNIVERSAL DESIGN: This image will be resized for multiple banner sizes (PC and mobile), so ensure the composition works well at different aspect ratios while maintaining visual impact.
${patternPrompt ? '- PATTERN INTEGRATION: Integrate the specified patterns naturally into the background or as decorative elements, ensuring they complement the main subject without overwhelming it.' : ''}`;

  try {
    // 使用最大規格的比例生成基礎圖片
    const modelAspectRatio = getClosestSupportedAspectRatio(maxSpec.width, maxSpec.height);
    
    // 使用正確的 generateContent 調用方式
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: modelAspectRatio,
        },
      },
    });

    let base64Data = "";
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Data = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Data) {
      throw new Error(`無法從模型獲取圖片數據`);
    }

    // 基礎圖片使用 PNG 格式（最高質量）
    const baseImageUrl = `data:image/png;base64,${base64Data}`;
    const results: GeneratedImage[] = [];

    // 將基礎圖片調整到所有規格
    for (const spec of specs) {
      const outputFormat = input.format === 'gif' ? 'gif' : (input.format === 'jpeg' ? 'jpeg' : 'png');
      const finalImageUrl = await processImage(
        baseImageUrl, 
        spec.width, 
        spec.height, 
        outputFormat as any
      );

      results.push({
        spec,
        url: finalImageUrl,
        base64: finalImageUrl.split(',')[1],
        format: outputFormat
      });
    }

    return results;
  } catch (error: any) {
    console.error(`Generation error:`, error);
    throw error;
  }
}

function getClosestSupportedAspectRatio(w: number, h: number): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" {
  const ratio = w / h;
  const supported = [
    { name: "1:1" as const, value: 1 },
    { name: "3:4" as const, value: 3/4 },
    { name: "4:3" as const, value: 4/3 },
    { name: "9:16" as const, value: 9/16 },
    { name: "16:9" as const, value: 16/9 },
  ];
  return supported.reduce((prev, curr) => 
    Math.abs(curr.value - ratio) < Math.abs(prev.value - ratio) ? curr : prev
  ).name;
}

async function processImage(dataUrl: string, targetWidth: number, targetHeight: number, format: 'png' | 'jpeg' | 'gif'): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context failed"));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const imgRatio = img.width / img.height;
      const targetRatio = targetWidth / targetHeight;
      let sw, sh, sx, sy;
      if (imgRatio > targetRatio) {
        // 圖片比目標更寬，從左右裁剪
        sh = img.height;
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
      } else {
        // 圖片比目標更高，從上下裁剪
        sw = img.width;
        sh = img.width / targetRatio;
        sx = 0;
        // 對於寬橫幅（PC版），優先保護垂直中心偏上的區域（人物臉部通常在這裡）
        // 從底部裁剪更多，保護頂部和中心區域
        if (targetRatio > 2.5) {
          // 非常寬的橫幅（如 3200x1040, 3840x920），從底部裁剪更多
          // 保留頂部 60%，裁剪底部 40%
          sy = (img.height - sh) * 0.4;
        } else {
          // 一般橫幅，稍微偏上保護人物臉部
          sy = (img.height - sh) * 0.3;
        }
        // 確保不會超出邊界
        if (sy < 0) sy = 0;
        if (sy + sh > img.height) sy = img.height - sh;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
      const mimeType = `image/${format === 'jpeg' ? 'jpeg' : format}`;
      resolve(canvas.toDataURL(mimeType, format === 'jpeg' ? 0.92 : 1.0));
    };
    img.onerror = () => reject(new Error("Image processing failed"));
    img.src = dataUrl;
  });
}
