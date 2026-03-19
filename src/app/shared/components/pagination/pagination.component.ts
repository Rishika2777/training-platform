import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, signal, OnInit, OnDestroy } from '@angular/core';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function buildVisiblePages(current: number, total: number, maxVisible: number): number[] {
  if (total <= 0) {
    return [];
  }
  const safeMax = Math.max(1, maxVisible);
  const safeCurrent = clamp(current, 1, total);

  const half = Math.floor(safeMax / 2);
  let start = safeCurrent - half;
  let end = start + safeMax - 1;

  if (start < 1) {
    start = 1;
    end = Math.min(total, start + safeMax - 1);
  }
  if (end > total) {
    end = total;
    start = Math.max(1, end - safeMax + 1);
  }

  const pages: number[] = [];
  for (let p = start; p <= end; p++) {
    pages.push(p);
  }
  return pages;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
})
export class PaginationComponent implements OnInit, OnDestroy {
  private readonly currentPageSig = signal(1);
  private readonly totalPagesSig = signal(1);
  private readonly baseMaxVisibleSig = signal(6);
  private readonly isMobileSig = signal(false);
  private mediaQuery: MediaQueryList | null = null;
  private mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;

  @Input()
  set currentPage(value: number) {
    this.currentPageSig.set(Number.isFinite(value) ? value : 1);
  }
  get currentPage(): number {
    return this.currentPageSig();
  }

  @Input()
  set totalPages(value: number) {
    this.totalPagesSig.set(Number.isFinite(value) ? value : 1);
  }
  get totalPages(): number {
    return this.totalPagesSig();
  }

  @Input()
  set maxVisible(value: number) {
    this.baseMaxVisibleSig.set(Number.isFinite(value) ? value : 6);
  }
  get maxVisible(): number {
    return this.baseMaxVisibleSig();
  }

  @Output() pageChange = new EventEmitter<number>();

  private readonly effectiveMaxVisible = computed(() =>
    this.isMobileSig() ? Math.min(3, this.baseMaxVisibleSig()) : this.baseMaxVisibleSig(),
  );

  readonly pages = computed(() =>
    buildVisiblePages(this.currentPageSig(), this.totalPagesSig(), this.effectiveMaxVisible()),
  );

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(max-width: 600px)');
      this.isMobileSig.set(this.mediaQuery.matches);
      this.mediaQueryHandler = (e: MediaQueryListEvent) => this.isMobileSig.set(e.matches);
      this.mediaQuery.addEventListener('change', this.mediaQueryHandler);
    }
  }

  ngOnDestroy(): void {
    if (this.mediaQuery && this.mediaQueryHandler) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryHandler);
    }
  }

  readonly canPrev = computed(() => this.currentPageSig() > 1);
  readonly canNext = computed(() => this.currentPageSig() < this.totalPagesSig());

  goTo(page: number): void {
    const total = this.totalPagesSig();
    const next = clamp(page, 1, total);
    if (next === this.currentPageSig()) {
      return;
    }
    this.pageChange.emit(next);
  }

  prev(): void {
    this.goTo(this.currentPageSig() - 1);
  }

  next(): void {
    this.goTo(this.currentPageSig() + 1);
  }
}


