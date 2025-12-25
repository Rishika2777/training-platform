import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

export interface CertificationCourse {
  id: string;
  title: string;
  imageUrl: string;
}

@Component({
  selector: 'app-student-learning-pathway',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-learning-pathway.component.html',
  styleUrl: './student-learning-pathway.component.css',
})
export class StudentLearningPathwayComponent {
  readonly courses: readonly CertificationCourse[] = [
    {
      id: '1',
      title: 'UI/UX',
      imageUrl: 'assets/images/login-news-image.png',
    },
    {
      id: '2',
      title: 'Course Name',
      imageUrl: 'assets/images/login-news-image.png',
    },
    {
      id: '3',
      title: 'Course Name',
      imageUrl: 'assets/images/login-news-image.png',
    },
    {
      id: '4',
      title: 'Course Name',
      imageUrl: 'assets/images/login-news-image.png',
    },
    {
      id: '5',
      title: 'Course Name',
      imageUrl: 'assets/images/login-news-image.png',
    },
    {
      id: '6',
      title: 'Course Name',
      imageUrl: 'assets/images/login-news-image.png',
    },
    {
      id: '7',
      title: 'Course Name',
      imageUrl: 'assets/images/login-news-image.png',
    },
    {
      id: '8',
      title: 'Course Name',
      imageUrl: 'assets/images/login-news-image.png',
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEnroll(_course: CertificationCourse): void {
    // TODO: Implement enrollment logic
  }
}

