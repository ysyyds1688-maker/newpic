
import { GoogleGenAI } from "@google/genai";
import { BannerSpec } from "../constants";

export interface GenerationInput {
  theme: string;
  title: string;
  style: string;
  subject?: string;
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

  const subjectPrompt = input.subject ? `The primary visual focus should be ${input.subject}.` : "The primary visual focus should be an appropriate high-end casino or event-related object.";
  
  const prompt = `Professional commercial promotional banner for an iGaming/Casino event.
Theme: ${input.theme}
Visual Style: ${input.style}.
Main Subject: ${subjectPrompt}
Design Requirements:
- HIGH-END AESTHETIC: Sleek, modern, and cinematic.
- COMPOSITION: Position the main subject to either the left or right side.
- SAFE ZONE: Leave significant BLANK SPACE on the opposite side of the subject for text overlay.
- NO TEXT: Strictly NO letters, numbers, or words in the image.
- QUALITY: Sharp focus, 8k resolution.
- UNIVERSAL DESIGN: This image will be resized for multiple banner sizes (PC and mobile), so ensure the composition works well at different aspect ratios.`;

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
        sh = img.height;
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
      } else {
        sw = img.width;
        sh = img.width / targetRatio;
        sx = 0;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
      const mimeType = `image/${format === 'jpeg' ? 'jpeg' : format}`;
      resolve(canvas.toDataURL(mimeType, format === 'jpeg' ? 0.92 : 1.0));
    };
    img.onerror = () => reject(new Error("Image processing failed"));
    img.src = dataUrl;
  });
}
