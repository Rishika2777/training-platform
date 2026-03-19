import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, computed, inject } from '@angular/core';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { NewsResponse, NewsService } from '../../services/news.service';
import { OnInit } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-admin-news',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './admin-news.component.html',
  styleUrl: './admin-news.component.css',
})
export class AdminNewsComponent implements OnInit {
  readonly modalService = inject(ModalService);
  private readonly notify = inject(NotificationService);
private readonly newsService = inject(NewsService);
  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isAddNewsModalOpen = computed(() => this.activeModal() === 'add-news');

  showDeleteNewsModal = false;
  newsToDeleteId: string | null = null;

  private readonly cdr = inject(ChangeDetectorRef);

  readonly announcementDate = 'January 7th, 2025';
  newsTitle = '';
  newsText = '';
  editingNewsId: string | null = null;

newsList: NewsResponse[] = [];
loadingNews = false;

  submitting = false;

titleError = '';
textError = '';

validateTitle(): void {
  const length = (this.newsTitle || '').trim().length;

  if (!length) {
    this.titleError = 'Title is required';
    return;
  }

  if (length > 35) {
    this.titleError = `Minimum 30 characters required (${length}/30)`;
    return;
  }

  this.titleError = '';
}

validateText(): void {
  const length = (this.newsText || '').trim().length;

  if (!length) {
    this.textError = 'Description is required';
    return;
  }

  if (length > 300) {
    this.textError = `Minimum 300 characters required (${length}/300)`;
    return;
  }

  this.textError = '';
}


ngOnInit(): void {
  this.loadNews();
}



onAddNews(): void {
  this.newsTitle = '';
  this.newsText = '';
  this.editingNewsId = null;   // add this
  this.modalService.openModal('add-news');
}


// ---------------- get all news -----------------
loadNews(): void {
  this.loadingNews = true;

  this.newsService.getAllNews().subscribe({
    next: (res) => {
      this.newsList = res;
      this.loadingNews = false;

      this.cdr.detectChanges();
    },
    error: () => {
      this.loadingNews = false;
      this.notify.error('Failed to load news');

      this.cdr.detectChanges();
    }
  });
}


// ------------------- delete news ---------------
onDeleteNews(newsId: string): void {
  this.newsToDeleteId = newsId;
  this.showDeleteNewsModal = true;
}

closeDeleteNewsModal(): void {
  this.showDeleteNewsModal = false;
  this.newsToDeleteId = null;
}

confirmDeleteNews(): void {
  const newsId = this.newsToDeleteId;
  if (!newsId) return;
  this.closeDeleteNewsModal();

  this.newsService.deleteNews(newsId).subscribe({
    next: () => {
      this.notify.success('News deleted successfully');
      this.loadNews();
    },
    error: () => {
      this.notify.error('Failed to delete news');
    }
  });
}

// --------------------- get new by id ----------------
viewNews(newsId: string): void {
  this.newsService.getNewsById(newsId).subscribe({
    next: (news) => {
      this.newsTitle = news.title;
      this.newsText = news.description;
      this.editingNewsId = news.id;
      this.modalService.openModal('add-news');
    },
    error: () => {
      this.notify.error('Failed to load news details');
    }
  });
}


onPostNews(): void {

  this.validateTitle();
  this.validateText();

  if (this.titleError || this.textError) {
    return;
  }

  this.submitting = true;

  const request = this.editingNewsId
    ? this.newsService.updateNews(this.editingNewsId, this.newsTitle, this.newsText)
    : this.newsService.createNews(this.newsTitle, this.newsText);

  request.subscribe({
    next: () => {
      this.submitting = false;
      this.notify.success(
        this.editingNewsId
          ? 'News updated successfully!'
          : 'News posted successfully!'
      );

      this.newsTitle = '';
      this.newsText = '';
      this.editingNewsId = null;
      this.titleError = '';
      this.textError = '';

      this.modalService.closeModal();
      this.loadNews();
    },
    error: () => {
      this.submitting = false;
      this.notify.error('Operation failed');
    }
  });
}


  onCancel(): void {
  this.newsTitle = '';
  this.newsText = '';
  this.modalService.closeModal();
}

}

