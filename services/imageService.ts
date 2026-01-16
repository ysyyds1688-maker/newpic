
import { GoogleGenAI } from "@google/genai";
import { BannerSpec } from "../constants";

export interface GenerationInput {
  theme: string;
  title: string;
  style: string;
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const results: GeneratedImage[] = [];

  for (const spec of specs) {
    const prompt = `Generate a high-end Casino and iGaming promotional banner.

Theme: ${input.theme}
Visual Elements: ${input.style}, luxury gambling elements (chips, gold, cards, or neon effects).
Target Context: ${spec.usage}

Composition Requirements:
- DARK MODE: Deep blacks, rich purples, or dark gold backgrounds.
- DESIGN FOR EDITING: Leave significant BLANK SPACE (safe zone) on the left or right side for text overlay.
- SUBJECT: One strong high-quality 3D rendered subject positioned to the side.
- STYLE: Professional, sleek, cinematic lighting, sharp focus.
- NO TEXT: Do not generate any text, letters, or numbers.

Aspect ratio: ${spec.width} x ${spec.height}
Resolution: Ultra high quality, professional commercial photography style.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: getClosestAspectRatio(spec.width, spec.height),
          },
        },
      });

      let base64Data = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Data = part.inlineData.data;
          break;
        }
      }

      if (!base64Data) throw new Error(`Failed to generate image`);

      // 轉換格式：如果 input.format 是 gif，我們輸出為靜態 gif
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
    } catch (error) {
      console.error(`Error generating ${spec.name}:`, error);
    }
  }

  return results;
}

function getClosestAspectRatio(w: number, h: number): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" {
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
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
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
        
        // 映射格式
        const mimeType = `image/${format === 'gif' ? 'gif' : format}`;
        const quality = format === 'jpeg' ? 0.85 : 1;
        
        let result = canvas.toDataURL(mimeType, quality);
        
        // 限制檔案體積：若 Base64 超過 2.7M 字元 (約 2MB)，針對 JPEG 調低質量
        if (result.length > 2700000 && format === 'jpeg') {
          result = canvas.toDataURL(mimeType, 0.7);
        }
        
        resolve(result);
      }
    };
    img.src = dataUrl;
  });
}
