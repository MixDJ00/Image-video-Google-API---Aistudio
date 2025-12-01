import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageResolution, VideoResolution } from "../types";

// Models
const MODEL_NANO_BANANA = 'gemini-2.5-flash-image';
const MODEL_PRO_IMAGE = 'gemini-3-pro-image-preview';
const MODEL_VEO_FAST = 'veo-3.1-fast-generate-preview';
// const MODEL_VEO_FULL = 'veo-3.1-generate-preview';

// Helper to ensure key is selected for paid models
const ensureApiKey = async () => {
  const win = window as any;
  if (win.aistudio) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await win.aistudio.openSelectKey();
    }
  }
};

const getClient = async () => {
  // Always create a new client to pick up potentially newly selected keys
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

interface GenerateImageOptions {
  prompt: string;
  aspectRatio: AspectRatio;
  width?: number;
  height?: number;
  resolution: ImageResolution;
  refImages: { base64: string; mimeType: string }[];
  contextImage?: { base64: string; mimeType: string };
  isEditing?: boolean;
}

export const generateImages = async (
  count: number,
  options: GenerateImageOptions
): Promise<string[]> => {
  // If requesting High Res (2K/4K) or specific Pro features, use Pro model
  const usePro = options.resolution !== ImageResolution.RES_1K;
  
  if (usePro) {
    await ensureApiKey();
  }

  const client = await getClient();
  const modelName = usePro ? MODEL_PRO_IMAGE : MODEL_NANO_BANANA;

  const promises = Array.from({ length: count }).map(async () => {
    const parts: any[] = [];

    // Add Reference Images (if any)
    options.refImages.forEach((img) => {
      parts.push({
        inlineData: {
          data: img.base64,
          mimeType: img.mimeType,
        },
      });
    });

    // Add Context Image (for editing or structure)
    if (options.contextImage) {
        parts.push({
            inlineData: {
                data: options.contextImage.base64,
                mimeType: options.contextImage.mimeType
            }
        });
    }

    // Add Text Prompt
    parts.push({ text: options.prompt });

    // Config Logic for Aspect Ratio
    let ratioStr = options.aspectRatio as string;
    if (options.aspectRatio === AspectRatio.CUSTOM) {
        if (options.width && options.height) {
            // Pass custom dimensions as ratio string "W:H"
            ratioStr = `${options.width}:${options.height}`;
        } else {
            ratioStr = '1:1'; // Fallback
        }
    }

    const config: any = {
      imageConfig: {
        aspectRatio: ratioStr,
      },
    };

    if (usePro) {
      config.imageConfig.imageSize = options.resolution;
    }

    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: { parts },
        config: config,
      });

      // Extract image
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
             return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
      throw new Error("No image data found in response");
    } catch (e) {
      console.error("Image generation failed", e);
      throw e;
    }
  });

  return Promise.all(promises);
};


interface GenerateVideoOptions {
  prompt: string;
  inputImage?: { base64: string; mimeType: string };
  aspectRatio: '16:9' | '9:16';
}

export const generateVideo = async (options: GenerateVideoOptions): Promise<string> => {
  await ensureApiKey(); // Veo requires paid key selection
  const client = await getClient();

  const config: any = {
    numberOfVideos: 1,
    resolution: VideoResolution.RES_720P, // Fast preview usually supports 720p well
    aspectRatio: options.aspectRatio,
  };

  const payload: any = {
    model: MODEL_VEO_FAST,
    prompt: options.prompt,
    config,
  };

  if (options.inputImage) {
    payload.image = {
      imageBytes: options.inputImage.base64,
      mimeType: options.inputImage.mimeType,
    };
  }

  try {
    let operation = await client.models.generateVideos(payload);

    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await client.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("No video URI in response");
    }

    // Append API key for download if using the selected key
    // The key is injected via process.env.API_KEY automatically by the selection flow or env
    return `${videoUri}&key=${process.env.API_KEY}`;

  } catch (e) {
    console.error("Video generation failed", e);
    throw e;
  }
};