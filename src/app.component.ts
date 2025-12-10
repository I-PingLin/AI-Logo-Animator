import { Component, ChangeDetectionStrategy, signal, computed, inject, WritableSignal } from '@angular/core';
import { GeminiService } from './services/gemini.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private geminiService = inject(GeminiService);
  private sanitizer = inject(DomSanitizer);

  // === State Signals ===
  activeTab: WritableSignal<'generate' | 'upload'> = signal('generate');
  
  // Generation state
  logoPrompt = signal('A minimalist logo for a coffee shop called "The Daily Grind", featuring a steaming coffee cup and a sun.');
  imageSize = signal('1K');
  isGeneratingLogo = signal(false);

  // Upload state
  uploadedFileName = signal<string | null>(null);

  // Shared image state
  generatedLogoBase64 = signal<string | null>(null);
  uploadedFileBase64 = signal<string | null>(null);

  // Animation state
  animationPrompt = signal('The steam from the coffee cup swirls and rises, subtly forming the company name "The Daily Grind" in the air before dissipating.');
  aspectRatio = signal('16:9');
  isAnimating = signal(false);
  animationStatus = signal('');
  generatedVideoUrl = signal<SafeUrl | null>(null);

  // General state
  error = signal<string | null>(null);

  // === Computed Signals ===
  imageToAnimateBase64 = computed<string | null>(() => this.generatedLogoBase64() ?? this.uploadedFileBase64());
  
  imageToDisplayUrl = computed<SafeUrl | null>(() => {
    const base64 = this.imageToAnimateBase64();
    if (base64) {
      return this.sanitizer.bypassSecurityTrustUrl(`data:image/png;base64,${base64}`);
    }
    return null;
  });

  // === Methods ===
  selectTab(tab: 'generate' | 'upload') {
    this.activeTab.set(tab);
    this.resetImageState();
  }
  
  private resetImageState() {
    this.generatedLogoBase64.set(null);
    this.uploadedFileBase64.set(null);
    this.uploadedFileName.set(null);
    this.generatedVideoUrl.set(null);
    this.isAnimating.set(false);
    this.animationStatus.set('');
    this.error.set(null);
  }

  async generateLogo() {
    if (!this.logoPrompt().trim()) {
      this.error.set('Please enter a description for your logo.');
      return;
    }
    this.error.set(null);
    this.isGeneratingLogo.set(true);
    this.resetImageState();

    try {
      const base64Image = await this.geminiService.generateLogo(this.logoPrompt(), this.imageSize());
      this.generatedLogoBase64.set(base64Image);
    } catch (e: any) {
      this.error.set(e.message || 'An unknown error occurred while generating the logo.');
    } finally {
      this.isGeneratingLogo.set(false);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        this.error.set('Please select an image file.');
        return;
      }
      this.error.set(null);
      this.resetImageState();
      this.uploadedFileName.set(file.name);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64String = e.target.result.split(',')[1];
        this.uploadedFileBase64.set(base64String);
      };
      reader.readAsDataURL(file);
    }
  }

  async animateLogo() {
    const imageBase64 = this.imageToAnimateBase64();
    if (!imageBase64) {
      this.error.set('Please generate or upload an image first.');
      return;
    }
    if (!this.animationPrompt().trim()) {
      this.error.set('Please enter a description for the animation.');
      return;
    }
    this.error.set(null);
    this.isAnimating.set(true);
    this.generatedVideoUrl.set(null);
    this.animationStatus.set('Starting...');

    try {
      const animator = this.geminiService.animateImage(
        this.animationPrompt(),
        imageBase64,
        this.aspectRatio()
      );

      for await (const update of animator) {
        if (typeof update === 'string') {
          this.animationStatus.set(update);
        } else if (update.videoUrl) {
          this.generatedVideoUrl.set(this.sanitizer.bypassSecurityTrustUrl(update.videoUrl));
          this.animationStatus.set('Animation complete!');
        }
      }
    } catch (e: any) {
      this.error.set(e.message || 'An unknown error occurred during animation.');
      this.animationStatus.set('Animation failed.');
    } finally {
      this.isAnimating.set(false);
    }
  }
}