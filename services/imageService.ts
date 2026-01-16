
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
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

Specific Size Context: ${spec.width}x${spec.height}.
Make the subject pop with vibrant colors matching the ${input.style} style.`;

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
        const mimeType = `image/${format === 'gif' ? 'gif' : format}`;
        const quality = format === 'jpeg' ? 0.85 : 1;
        let result = canvas.toDataURL(mimeType, quality);
        if (result.length > 2700000 && format === 'jpeg') {
          result = canvas.toDataURL(mimeType, 0.7);
        }
        resolve(result);
      }
    };
    img.src = dataUrl;
  });
}
