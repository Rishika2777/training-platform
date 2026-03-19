import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnInit,
  computed,
  signal,
} from '@angular/core';

export interface AnnouncementCarouselItem {
  id?: string;
  text: string;
  date?: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
}

@Component({
  selector: 'app-announcement-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './announcement-carousel.component.html',
  styleUrl: './announcement-carousel.component.css',
})
export class AnnouncementCarouselComponent implements OnInit, OnDestroy {
  @Input() items: readonly AnnouncementCarouselItem[] = [];
  @Input() loading = false;
  @Input() defaultDate = '';
  @Input() defaultTitle = 'Synkup Announcement';
  @Input() intervalMs = 50000;

  @Output() mediaClick = new EventEmitter<{ url: string; type: 'image' | 'video' }>();

  readonly currentIndex = signal(0);
  readonly currentItem = computed(() => {
    const list = this.items;
    const idx = this.currentIndex();
    if (!list.length) return null;
    const safeIdx = Math.max(0, Math.min(idx, list.length - 1));
    return list[safeIdx];
  });

  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startCarousel();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
  }

  onDotClick(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.currentIndex.set(index);
      this.startCarousel();
    }
  }

  previous(): void {
    const list = this.items;
    if (list.length <= 1) return;
    const nextIdx = this.currentIndex() <= 0 ? list.length - 1 : this.currentIndex() - 1;
    this.currentIndex.set(nextIdx);
    this.startCarousel();
  }

  next(): void {
    const list = this.items;
    if (list.length <= 1) return;
    const nextIdx = (this.currentIndex() + 1) % list.length;
    this.currentIndex.set(nextIdx);
    this.startCarousel();
  }

  onMediaClick(url: string, type: 'image' | 'video'): void {
    this.mediaClick.emit({ url, type });
  }

  private startCarousel(): void {
    if (typeof window === 'undefined') return;
    this.stopCarousel();
    this.intervalId = setInterval(() => {
      const list = this.items;
      if (list.length > 1) {
        const nextIdx = (this.currentIndex() + 1) % list.length;
        this.currentIndex.set(nextIdx);
      }
    }, this.intervalMs);
  }

  private stopCarousel(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
