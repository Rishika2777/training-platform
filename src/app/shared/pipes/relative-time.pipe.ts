import { Pipe, PipeTransform } from '@angular/core';
import { formatRelativeTime } from '../../core/utils/date.utils';

/**
 * Angular pipe to format dates as relative time (e.g., "2 hours ago", "1 min ago")
 * for recent dates, or as actual date/time for older dates (more than 2 days ago).
 *
 * @example
 * {{ post.createdAt | relativeTime }} // "2 hours ago" or "2/17/26, 10:00 AM"
 */
@Pipe({
  name: 'relativeTime',
  standalone: true,
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date | number | null | undefined): string {
    return formatRelativeTime(value);
  }
}
