import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

// This is needed for TypeScript to compile, as 'process' is not a standard browser global.
// The Applet environment is expected to provide this at runtime.
declare var process: {
  env: {
    API_KEY: string;
  };
};

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      // In a real scenario, the app might not function without the key.
      // We log an error, but the API calls will fail gracefully.
      console.error('API_KEY environment variable not found.');
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  async generateLogo(prompt: string, size: string): Promise<string> {
    const fullPrompt = `${prompt}, professional logo, vector style, clean background, high quality, ${size} resolution`;
    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
      }
      throw new Error('No images were generated. The prompt may have been blocked.');
    } catch (error) {
      console.error('Error generating logo:', error);
      throw new Error('Failed to generate logo. Please try a different prompt or check the console for details.');
    }
  }

  async *animateImage(
    prompt: string,
    imageBase64: string,
    aspectRatio: string
  ): AsyncGenerator<string | { videoUrl: string }> {
    try {
      yield '🚀 Kicking off the animation process...';
      let operation = await this.ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt,
        image: {
          imageBytes: imageBase64,
          mimeType: 'image/png',
        },
        config: {
          numberOfVideos: 1,
          aspectRatio: aspectRatio,
        },
      });

      yield '🧠 The AI is warming up... This can take a few minutes.';
      
      const pollInterval = 10000; // 10 seconds
      let pollCount = 0;
      const messages = [
        '🎨 Painting pixels into motion...',
        '🎬 Directing the digital scene...',
        '✨ Adding a touch of AI magic...',
        '🎞️ Rendering the final frames...',
        '🔬 Analyzing quantum foam for inspiration...',
      ];

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        yield messages[pollCount % messages.length];
        pollCount++;
        operation = await this.ai.operations.getVideosOperation({ operation });
      }

      yield '✅ Almost there! Fetching your video...';

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new Error('Video generation finished, but no download link was found.');
      }
      
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const videoBlob = await response.blob();
      const videoUrl = URL.createObjectURL(videoBlob);

      yield { videoUrl };
    } catch (error) {
      console.error('Error animating image:', error);
      if (error instanceof Error) {
        throw new Error(`Animation failed: ${error.message}`);
      }
      throw new Error('An unknown error occurred during animation.');
    }
  }
}