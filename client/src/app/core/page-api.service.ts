import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SitePage, UploadedMedia } from '../models/page';

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
}
