import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { AdminDashboardComponent } from './pages/admin-dashboard.component';
import { AdminLoginComponent } from './pages/admin-login.component';
import { NotFoundComponent } from './pages/not-found.component';
import { PublicPageComponent } from './pages/public-page.component';

export const routes: Routes = [
  { path: 'admin/login', component: AdminLoginComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [adminGuard] },
  { path: '', component: PublicPageComponent, data: { slug: 'home' } },
  { path: ':slug', component: PublicPageComponent },
  { path: '**', component: NotFoundComponent },
];
