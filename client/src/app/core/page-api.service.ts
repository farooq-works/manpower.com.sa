import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ManagedUser, SitePage, UploadedMedia } from '../models/page';

@Injectable({ providedIn: 'root' })
export class PageApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  getPage(slug: string): Observable<SitePage> {
    return this.http.get<SitePage>(`${this.apiUrl}/pages/${encodeURIComponent(slug)}`);
  }

  getAdminPages(): Observable<SitePage[]> {
    return this.http.get<SitePage[]>(`${this.apiUrl}/admin/pages`, { withCredentials: true });
  }

  createPage(page: SitePage): Observable<SitePage> {
    return this.http.post<SitePage>(`${this.apiUrl}/admin/pages`, page, { withCredentials: true });
  }

  duplicatePage(slug: string, duplicateSlug: string, title: string): Observable<SitePage> {
    return this.http.post<SitePage>(`${this.apiUrl}/admin/pages/${encodeURIComponent(slug)}/duplicate`, { slug: duplicateSlug, title }, { withCredentials: true });
  }

  deletePage(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/pages/${encodeURIComponent(slug)}`, { withCredentials: true });
  }

  savePage(page: SitePage): Observable<SitePage> {
    return this.http.put<SitePage>(
      `${this.apiUrl}/admin/pages/${encodeURIComponent(page.slug)}`,
      page,
      { withCredentials: true },
    );
  }

  uploadImage(file: File): Observable<UploadedMedia> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadedMedia>(`${this.apiUrl}/admin/media`, formData, {
      withCredentials: true,
    });
  }

  uploadReport(file: File): Observable<UploadedMedia> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadedMedia>(`${this.apiUrl}/admin/reports`, formData, { withCredentials: true });
  }

  getUsers(): Observable<ManagedUser[]> {
    return this.http.get<ManagedUser[]>(`${this.apiUrl}/admin/users`, { withCredentials: true });
  }

  createUser(email: string, password: string, role: ManagedUser['role']): Observable<ManagedUser> {
    return this.http.post<ManagedUser>(`${this.apiUrl}/admin/users`, { email, password, role }, { withCredentials: true });
  }

  deleteUser(email: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/users/${encodeURIComponent(email)}`, { withCredentials: true });
  }
}
