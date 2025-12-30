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

  // Redirect to Udemy third-party page
  redirectToUdemy(): void {
    window.open('https://www.udemy.com/?utm_campaign=Brand-Udemy_la.EN_cc.India_dev.&utm_source=google&utm_medium=paid-search&portfolio=BrandDirect&utm_audience=mx&utm_tactic=brand&utm_term=udemy&utm_content=g&funnel=&test=&gad_source=1&gad_campaignid=17099057432&gbraid=0AAAAADROdO1fyGQgpzubfBjy8bD2GOMQC&gclid=Cj0KCQiA6sjKBhCSARIsAJvYcpPVCxqy6GP09unCN3QEw-8xvNll30tRqNbBtxZsvlZfInjpk1XdAUkaAqT1EALw_wcB', '_blank');
  }

  // Old method kept for reference (commented courses use this)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEnroll(_course: CertificationCourse): void {
    this.redirectToUdemy();
  }
}

