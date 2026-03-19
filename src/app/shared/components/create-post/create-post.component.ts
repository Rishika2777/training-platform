import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  effect,
  ElementRef,
  inject,
  NgZone,
  output,
  signal,
  input,
  ViewChild,
} from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { AvatarComponent } from '../avatar/avatar.component';
import type { Post } from '../../../core/models/common-api.model';
import { NgxImageCompressService } from 'ngx-image-compress';
import { NotificationService } from '../../../core/notifications/notification.service';

export type CreatePostType = 'CAMPUS' | 'STUDENT' | 'COMPANY' | 'DEPARTMENT';
export type CreatePostKind = 'FEED' | 'ANNOUNCEMENT';

export interface CreatePostSubmitPayload {
  text: string;
  postKind: CreatePostKind;
  mediaFile: File | null;
  postId?: string;
}

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, AvatarComponent],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.css',
})
export class CreatePostComponent {
  readonly visible = input.required<boolean>();
  readonly authorName = input<string>('');
  readonly authorImageUrl = input<string | null>(null);
  readonly authorFallbackImage = input<string>('assets/images/login-news-image.png');
  readonly postType = input.required<CreatePostType>();
  readonly isSubmitting = input(false);
  /** When set, pre-fills the form for editing. */
  readonly initialPost = input<Post | null>(null);

  readonly submitted = output<CreatePostSubmitPayload>();
  readonly closed = output<void>();

  readonly postMediaPreview = signal<string | null>(null);
  readonly postMediaType = signal<'image' | 'video' | null>(null);
  readonly isCompressing = signal<boolean>(false);
  readonly compressionStatus = signal<string>('');
  postMediaFile: File | null = null;
  postText = '';
  postKind: CreatePostKind = 'FEED';

  @ViewChild('postMediaInput') postMediaInput!: ElementRef<HTMLInputElement>;
  private readonly ngZone = inject(NgZone);
  private readonly notifications = inject(NotificationService);
  private readonly imageCompress = inject(NgxImageCompressService);

  private readonly MAX_IMAGE_SIZE_MB = 2;
  private readonly MAX_VIDEO_SIZE_MB = 12;

  constructor() {
    effect(() => {
      const v = this.visible();
      const initial = this.initialPost();
      if (v) {
        if (initial) {
          this.populateFromPost(initial);
        } else {
          this.resetForm();
        }
      }
    });
  }

  private populateFromPost(post: Post): void {
    this.postText = post.text?.trim() ?? '';
    this.postKind = (post.postKind === 'ANNOUNCEMENT' ? 'ANNOUNCEMENT' : 'FEED') as CreatePostKind;
    this.postMediaFile = null;
    const videoUrls = post.videoUrls ?? [];
    const imageUrls = post.imageUrls ?? [];
    if (videoUrls.length > 0 && videoUrls[0]) {
      this.postMediaType.set('video');
      this.postMediaPreview.set(videoUrls[0]);
    } else if (imageUrls.length > 0 && imageUrls[0]) {
      this.postMediaType.set('image');
      this.postMediaPreview.set(imageUrls[0]);
    } else {
      this.postMediaType.set(null);
      this.postMediaPreview.set(null);
    }
    if (this.postMediaInput?.nativeElement) {
      this.postMediaInput.nativeElement.value = '';
    }
  }

  private resetForm(): void {
    this.postText = '';
    this.postMediaPreview.set(null);
    this.postMediaType.set(null);
    this.postMediaFile = null;
    this.postKind = 'FEED';
    this.isCompressing.set(false);
    this.compressionStatus.set('');
    if (this.postMediaInput?.nativeElement) {
      this.postMediaInput.nativeElement.value = '';
    }
  }

  onCancel(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    const text = this.postText.trim();
    
    // For announcements, allow empty text (but require either text or media)
    if (this.postKind === 'ANNOUNCEMENT') {
      if (!text && !this.postMediaFile) {
        this.notifications.error('Announcement must have either text or media.');
        return;
      }
    } else {
      // For regular feed posts, text is required
      if (!text) return;
    }
    
    if (this.postText.length > 1500) return;
    if (this.isSubmitting()) return;

    const initial = this.initialPost();
    const postId = initial?.postId ?? initial?.id;

    const postKind = this.postType() === 'STUDENT' ? 'FEED' : this.postKind;
    this.submitted.emit({
      text,
      postKind,
      mediaFile: this.postMediaFile,
      ...(postId && { postId }),
    });
  }

  openMediaPicker(): void {
    this.postMediaInput?.nativeElement?.click();
  }

  async onPostMediaSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    // Validate file type
    if (!isVideo && !isImage) {
      this.notifications.error('Please select an image or video file.');
      if (this.postMediaInput?.nativeElement) {
        this.postMediaInput.nativeElement.value = '';
      }
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    const maxSizeMB = isVideo ? this.MAX_VIDEO_SIZE_MB : this.MAX_IMAGE_SIZE_MB;

    if (fileSizeMB > maxSizeMB) {
      this.notifications.error(
        `${isVideo ? 'Video' : 'Image'} file is too large (${fileSizeMB.toFixed(2)}MB). Maximum size: ${maxSizeMB}MB.`,
      );
      if (this.postMediaInput?.nativeElement) {
        this.postMediaInput.nativeElement.value = '';
      }
      return;
    }

    this.postMediaType.set(isVideo ? 'video' : 'image');

    try {
      let processedFile: File;

      if (isImage) {
        // Check if image compression is needed
        if (fileSizeMB > this.MAX_IMAGE_SIZE_MB) {
          this.isCompressing.set(true);
          this.compressionStatus.set('Compressing image...');
          processedFile = await this.compressImage(file);
          this.isCompressing.set(false);
          this.compressionStatus.set('');
        } else {
          processedFile = file; // Use original if already small enough
        }
      } else {
        // For videos, just use the original file (no compression)
        processedFile = file;
      }

      // Validate final file size
      const finalSizeMB = processedFile.size / (1024 * 1024);
      if (finalSizeMB > maxSizeMB) {
        this.notifications.error(
          `File is still too large (${finalSizeMB.toFixed(2)}MB). Maximum size: ${maxSizeMB}MB.`,
        );
        this.postMediaPreview.set(null);
        this.postMediaType.set(null);
        this.postMediaFile = null;
        return;
      }

      this.postMediaFile = processedFile;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.ngZone.run(() => {
          this.postMediaPreview.set(dataUrl);
        });
      };
      reader.readAsDataURL(processedFile);
    } catch (error) {
      console.error('File processing error:', error);
      this.notifications.error('Failed to process file. Please try again or select a different file.');
      this.postMediaPreview.set(null);
      this.postMediaType.set(null);
      this.postMediaFile = null;
      this.isCompressing.set(false);
      this.compressionStatus.set('');
    } finally {
      if (this.postMediaInput?.nativeElement) {
        this.postMediaInput.nativeElement.value = '';
      }
    }
  }

  private async compressImage(file: File): Promise<File> {
    try {
      // Convert File to DataURL for ngx-image-compress
      const dataUrl = await this.fileToDataUrl(file);
      
      // Compress image using ngx-image-compress
      // compressFile(image: string, orientation: number, ratio: number, quality: number, maxwidth?: number)
      // Returns compressed image as DataURL string
      const compressedDataUrl = await this.imageCompress.compressFile(
        dataUrl,
        -1, // orientation (auto-detect)
        50, // ratio (50% scale)
        50, // quality (50%)
        1920, // maxwidth in pixels
      );

      // Check compressed size
      const compressedSizeMB = this.imageCompress.byteCount(compressedDataUrl) / (1024 * 1024);
      
      // If still too large, try more aggressive compression
      if (compressedSizeMB > this.MAX_IMAGE_SIZE_MB) {
        const moreCompressedDataUrl = await this.imageCompress.compressFile(
          dataUrl,
          -1,
          30, // More aggressive ratio
          40, // Lower quality
          1280, // Smaller max width
        );
        const newSizeMB = this.imageCompress.byteCount(moreCompressedDataUrl) / (1024 * 1024);
        if (newSizeMB <= this.MAX_IMAGE_SIZE_MB) {
          return this.dataUrlToFile(moreCompressedDataUrl, file.name, file.type);
        }
      }

      // Convert DataURL back to File
      return this.dataUrlToFile(compressedDataUrl, file.name, file.type);
    } catch (error) {
      console.error('Image compression error:', error);
      throw new Error('Failed to compress image');
    }
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private dataUrlToFile(dataUrl: string, fileName: string, mimeType: string): File {
    // Extract base64 data from DataURL
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || mimeType;
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], fileName, { type: mime });
  }


  removePostMedia(): void {
    this.postMediaPreview.set(null);
    this.postMediaType.set(null);
    this.postMediaFile = null;
    this.isCompressing.set(false);
    this.compressionStatus.set('');
    if (this.postMediaInput?.nativeElement) {
      this.postMediaInput.nativeElement.value = '';
    }
  }

  onPostTextChange(event: Event): void {
    this.postText = (event.target as HTMLTextAreaElement).value;
  }
}
