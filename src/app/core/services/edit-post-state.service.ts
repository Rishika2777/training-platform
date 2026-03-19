import { Injectable, signal } from '@angular/core';
import type { Post } from '../models/common-api.model';

/**
 * Holds the post being edited when user clicks Edit from My Post Feed.
 * Create-post component reads this to pre-fill the form.
 */
@Injectable({ providedIn: 'root' })
export class EditPostStateService {
  private readonly postToEditSignal = signal<Post | null>(null);

  readonly postToEdit = this.postToEditSignal.asReadonly();

  setPostToEdit(post: Post | null): void {
    this.postToEditSignal.set(post);
  }

  clearPostToEdit(): void {
    this.postToEditSignal.set(null);
  }
}
