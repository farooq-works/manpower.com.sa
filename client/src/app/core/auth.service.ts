import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminUser } from '../models/page';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  login(email: string, password: string): Observable<AdminUser> {
    return this.http.post<AdminUser>(
      '/api/auth/login',
      { email, password },
      { withCredentials: true },
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/password', { currentPassword, newPassword }, { withCredentials: true });
  }

  me(): Observable<AdminUser> {
    return this.http.get<AdminUser>('/api/auth/me', { withCredentials: true });
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}, { withCredentials: true });
  }
}
