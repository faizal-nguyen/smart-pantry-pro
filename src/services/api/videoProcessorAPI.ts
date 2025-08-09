/**
 * Video Processor API Client
 * Interface with the Python backend for video processing
 */

export interface VideoProcessingRequest {
  url?: string;
  file?: File;
}

export interface VideoProcessingResponse {
  task_id: string;
  video_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface VideoProcessingStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_step?: string;
  error?: string;
  result?: VideoProcessingResult;
}

export interface VideoProcessingResult {
  video_id: string;
  status: string;
  metadata: VideoMetadata;
  frames_extracted: number;
  transcription?: TranscriptionResult;
  ocr_results?: OCRResult[];
  recipe_data?: ExtractedRecipeData;
  download_links: DownloadLinks;
  processing_time: number;
  cost_estimate: number;
}

export interface VideoMetadata {
  title: string;
  description?: string;
  duration: number;
  resolution?: string;
  platform: string;
  author?: string;
  thumbnail_url?: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  segments: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface OCRResult {
  frame_time: number;
  frame_path: string;
  text: string;
  confidence: number;
}

export interface ExtractedRecipeData {
  ingredients: string[];
  instructions: string[];
  cooking_time?: string;
  servings?: string;
  raw_text: string;
}

export interface DownloadLinks {
  video?: string;
  frames?: string;
  transcription?: string;
  srt?: string;
  recipe?: string;
}

export class VideoProcessorAPI {
  private baseURL: string;
  private apiKey?: string;

  constructor(baseURL?: string, apiKey?: string) {
    this.baseURL = baseURL || import.meta.env.VITE_VIDEO_PROCESSOR_API_URL || 'http://localhost:8000';
    this.apiKey = apiKey || import.meta.env.VITE_VIDEO_PROCESSOR_API_KEY;
  }

  /**
   * Process video from URL
   */
  async processVideoURL(url: string): Promise<VideoProcessingResponse> {
    const response = await fetch(`${this.baseURL}/process/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-API-Key': this.apiKey })
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to process video');
    }

    return response.json();
  }

  /**
   * Upload and process video file
   */
  async processVideoFile(file: File): Promise<VideoProcessingResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseURL}/process/upload`, {
      method: 'POST',
      headers: {
        ...(this.apiKey && { 'X-API-Key': this.apiKey })
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload video');
    }

    return response.json();
  }

  /**
   * Check processing status
   */
  async getStatus(taskId: string): Promise<VideoProcessingStatus> {
    const response = await fetch(`${this.baseURL}/status/${taskId}`, {
      headers: {
        ...(this.apiKey && { 'X-API-Key': this.apiKey })
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get status');
    }

    return response.json();
  }

  /**
   * Get processing result
   */
  async getResult(videoId: string): Promise<VideoProcessingResult> {
    const response = await fetch(`${this.baseURL}/result/${videoId}`, {
      headers: {
        ...(this.apiKey && { 'X-API-Key': this.apiKey })
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get result');
    }

    return response.json();
  }

  /**
   * Download file from processing result
   */
  async downloadFile(videoId: string, fileType: 'video' | 'frames' | 'transcription' | 'srt' | 'recipe'): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/download/${videoId}/${fileType}`, {
      headers: {
        ...(this.apiKey && { 'X-API-Key': this.apiKey })
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    return response.blob();
  }

  /**
   * Poll for processing completion
   */
  async waitForCompletion(
    taskId: string, 
    onProgress?: (status: VideoProcessingStatus) => void,
    maxWaitTime: number = 300000 // 5 minutes
  ): Promise<VideoProcessingResult> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getStatus(taskId);
      
      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'completed' && status.result) {
        return status.result;
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Processing failed');
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Processing timeout');
  }
}

// Singleton instance
let apiInstance: VideoProcessorAPI | null = null;

export function getVideoProcessorAPI(): VideoProcessorAPI {
  if (!apiInstance) {
    apiInstance = new VideoProcessorAPI();
  }
  return apiInstance;
}