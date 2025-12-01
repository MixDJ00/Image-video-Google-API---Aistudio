export enum AppTab {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export enum AspectRatio {
  SQUARE = '1:1',
  STANDARD = '4:3',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  CUSTOM = 'CUSTOM', // Mapped to closest allowed or 1:1 if not supported
}

export enum ImageResolution {
  RES_1K = '1K',
  RES_2K = '2K',
  RES_4K = '4K',
}

export enum VideoResolution {
  RES_720P = '720p',
  RES_1080P = '1080p',
}

export interface HistoryItem {
  id: string;
  base64: string;
  mimeType: string;
  prompt: string;
  timestamp: number;
  aspectRatio: string;
  width?: number;
  height?: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
}