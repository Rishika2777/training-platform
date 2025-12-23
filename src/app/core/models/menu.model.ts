import { UserRole } from '../config/app.constants';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  route: string;
  order: number;
  module: string;
  roles: UserRole[];
  permissions: string[];
}

export interface MenuConfig {
  items: MenuItem[];
  lastUpdated: string;
}


