import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PageApi } from '../core/page-api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SitePage, UploadedMedia } from '../models/page';

@Component({
  selector: 'app-admin-dashboard',
  imports: [FormsModule],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(PageApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);

  pages: SitePage[] = [];
  selected: SitePage | null = null;
  newPageSlug = '';
  newPageTitle = '';
  message = '';
  error = '';
  saving = false;
  uploading = false;

  ngOnInit(): void {
    this.loadPages();
  }

  loadPages(): void {
    this.api.getAdminPages().subscribe({
      next: (pages) => {
        this.pages = pages;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.error = 'Could not load pages. Confirm the API is running and sign in again.';
        this.changeDetector.markForCheck();
      },
    });
  }

  edit(slug: string): void {
    const page = this.pages.find((entry) => entry.slug === slug);
    if (!page) return;
    this.selected = structuredClone(page);
    this.message = '';
    this.error = '';
  }

  createPage(): void {
    const slug = this.newPageSlug.trim().toLowerCase();
    const title = this.newPageTitle.trim();
    if (!slug || !title) {
      this.message = '';
      this.error = 'Enter a page slug and title.';
      return;
    }

    const page: SitePage = {
      slug,
      title,
      description: '',
      status: 'draft',
      hero: { heading: title, body: '', image: '' },
      sections: [],
    };
    this.error = '';
    this.api.createPage(page).subscribe({
      next: (created) => {
        this.pages = [...this.pages, created].sort((left, right) => left.title.localeCompare(right.title));
        this.selected = structuredClone(created);
        this.newPageSlug = '';
        this.newPageTitle = '';
        this.message = 'Draft page created.';
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.error ?? 'Page could not be created.';
        this.changeDetector.markForCheck();
      },
    });
  }

  addSection(): void {
    this.selected?.sections.push({ heading: '', body: '', image: '' });
  }

  removeSection(index: number): void {
    this.selected?.sections.splice(index, 1);
  }

  uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading = true;
    this.error = '';
    this.api.uploadImage(file).subscribe({
      next: (media: UploadedMedia) => {
        if (this.selected) this.selected.hero.image = media.url;
        this.uploading = false;
        input.value = '';
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.error = 'Image upload failed. Use an image under 5 MB in JPEG, PNG, WebP, GIF, or AVIF format.';
        this.uploading = false;
        input.value = '';
        this.changeDetector.markForCheck();
      },
    });
  }

  save(): void {
    if (!this.selected) return;
    this.saving = true;
    this.message = '';
    this.error = '';
    this.api.savePage(this.selected).subscribe({
      next: (saved) => {
        this.selected = structuredClone(saved);
        this.pages = this.pages.map((page) => (page.slug === saved.slug ? saved : page));
        this.message = 'Page saved.';
        this.saving = false;
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.error ?? 'Page could not be saved. Check the content fields and try again.';
        this.saving = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/admin/login'),
      error: () => {
        this.error = 'Could not sign out. Please try again.';
        this.changeDetector.markForCheck();
      },
    });
  }

}
