
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

export async function generateBannerSet(
  specs: BannerSpec[],
  input: GenerationInput
): Promise<GeneratedImage[]> {
  // 安全地獲取 API Key，防止 process.env 在瀏覽器中未定義導致的崩潰
  const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
  
  if (!apiKey) {
    throw new Error("系統配置錯誤：未找到 API Key。請確保環境變數已正確設定。");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const results: GeneratedImage[] = [];

  for (const spec of specs) {
    const subjectPrompt = input.subject ? `The primary visual focus should be ${input.subject}.` : "The primary visual focus should be an appropriate high-end casino or event-related object.";
    
    const prompt = `Professional commercial promotional banner for an iGaming/Casino event.

Theme: ${input.theme}
Visual Style: ${input.style}.
Main Subject: ${subjectPrompt}
Context: This image will be used for ${spec.usage}.

Design Requirements:
- HIGH-END AESTHETIC: Sleek, modern, and cinematic.
- COMPOSITION: Clean and balanced. Position the main subject to either the left or right side.
- SAFE ZONE: Leave significant BLANK SPACE on the opposite side of the subject for text overlay later.
- NO TEXT: Strictly NO letters, numbers, or words in the image.
- QUALITY: Sharp focus, 8k resolution, professional 3D rendering or high-end photography style.

Usage context: This is for a ${spec.width}x${spec.height} banner.
Make the subject pop with vibrant colors matching the ${input.style} style.`;

    try {
      const modelAspectRatio = getClosestSupportedAspectRatio(spec.width, spec.height);
      
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
        throw new Error(`無法從 AI 獲取圖片數據 (${spec.name})`);
      }

      const outputFormat = input.format === 'gif' ? 'gif' : (input.format === 'jpeg' ? 'jpeg' : 'png');

      const finalImageUrl = await processImage(
        `data:image/png;base64,${base64Data}`, 
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
    } catch (error: any) {
      console.error(`Error generating ${spec.name}:`, error);
      throw error;
    }
  }

  return results;
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
        reject(new Error("無法建立畫布上下文"));
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
      const quality = format === 'jpeg' ? 0.92 : 1.0;
      
      resolve(canvas.toDataURL(mimeType, quality));
    };
    img.onerror = () => reject(new Error("圖片處理加載失敗"));
    img.src = dataUrl;
  });
}
