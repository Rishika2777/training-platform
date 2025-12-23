import { Routes } from '@angular/router';
import { SettingsComponent } from './pages/settings/settings.component';

export const settingsRoutes: Routes = [
  { path: ':section', component: SettingsComponent },
  { path: '', component: SettingsComponent },
];



