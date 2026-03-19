import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { signal, computed } from '@angular/core';

const PWA_DISMISSED_KEY = 'synkup-pwa-install-dismissed';
const MOBILE_BREAKPOINT = 768;

/** Event fired by browsers when PWA is installable (Chrome, Edge, etc.) */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly platformId = inject(PLATFORM_ID);

  /** The deferred install prompt (only set when browser fires beforeinstallprompt) */
  readonly deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);

  /** True when viewport is mobile (reactive to resize) */
  readonly isMobile = signal(false);

  /** True when we're on mobile and install prompt is available */
  readonly canInstall = computed(() => {
    const prompt = this.deferredPrompt();
    return prompt !== null && this.isMobile();
  });

  /** True when running as installed PWA (standalone) */
  readonly isStandalone = signal(false);

  /** True when user has dismissed the install banner */
  readonly isDismissed = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId as object)) {
      this.init();
    }
  }

  private init(): void {
    // Only works on secure context (HTTPS or localhost)
    if (typeof window === 'undefined' || !window.isSecureContext) {
      return;
    }

    this.updateMobileState();
    window.addEventListener('resize', () => this.updateMobileState());

    // Check if already in standalone mode (installed)
    const standalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window as Window & { __PWADisplayMode?: string }).__PWADisplayMode === 'standalone';
    this.isStandalone.set(standalone);

    // Restore dismissed state
    try {
      const dismissed = localStorage.getItem(PWA_DISMISSED_KEY);
      this.isDismissed.set(dismissed === 'true');
    } catch {
      this.isDismissed.set(false);
    }

    window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.handleAppInstalled);
  }

  private readonly handleBeforeInstallPrompt = (e: Event): void => {
    e.preventDefault();
    const ev = e as BeforeInstallPromptEvent;
    this.deferredPrompt.set(ev);
  };

  private readonly handleAppInstalled = (): void => {
    this.deferredPrompt.set(null);
    this.isStandalone.set(true);
    this.isDismissed.set(true);
    try {
      localStorage.setItem(PWA_DISMISSED_KEY, 'true');
    } catch {
      /* ignore */
    }
  };

  private updateMobileState(): void {
    if (typeof window === 'undefined') return;
    const mobile = window.innerWidth <= MOBILE_BREAKPOINT || window.matchMedia('(max-width: 768px)').matches;
    this.isMobile.set(mobile);
  }

  /** Whether to show the install banner (mobile + installable + not dismissed + not standalone) */
  readonly shouldShowBanner = computed(
    () =>
      this.canInstall() &&
      !this.isStandalone() &&
      !this.isDismissed()
  );

  async promptInstall(): Promise<boolean> {
    const prompt = this.deferredPrompt();
    if (!prompt) return false;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      return outcome === 'accepted';
    } catch {
      return false;
    }
  }

  dismiss(): void {
    this.isDismissed.set(true);
    try {
      localStorage.setItem(PWA_DISMISSED_KEY, 'true');
    } catch {
      /* ignore */
    }
  }
}
