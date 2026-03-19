import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Parameterized routes should use Client rendering (opened in new tabs)
  {
    path: 'student/profile/:studentId/:userId',
    renderMode: RenderMode.Client
  },
  {
    path: 'campus/about/:campusId/:userId',
    renderMode: RenderMode.Client
  },
  {
    path: 'department/about/:campusId/:userId',
    renderMode: RenderMode.Client
  },
  {
    path: 'company/about/:companyId/:userId',
    renderMode: RenderMode.Client
  },
  {
    path: 'profile/student/:publicStudentId',
    renderMode: RenderMode.Client
  },
  {
    path: 'profile/company/:publicCompanyId',
    renderMode: RenderMode.Client
  },
  {
    path: 'profile/campus/:publicCampusId',
    renderMode: RenderMode.Client
  },
  {
    path: 'reset-password/:userId',
    renderMode: RenderMode.Client
  },
  {
    path: 'reset-password',
    renderMode: RenderMode.Client
  },
  // All other routes use prerendering
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
