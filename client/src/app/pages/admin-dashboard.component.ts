import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PageApi } from '../core/page-api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminUser, ManagedUser, SitePage, UploadedMedia } from '../models/page';
import { PAGE_DEFINITION_MAP } from '../content/page-registry';

@Component({
  selector: 'app-admin-dashboard',
  imports: [FormsModule],
  styleUrl: '../app.css',
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
  currentUser: AdminUser | null = null;
  users: ManagedUser[] = [];
  newUserEmail = '';
  newUserPassword = '';
  newUserRole: ManagedUser['role'] = 'editor';
  duplicateSlug = '';
  duplicateTitle = '';
  currentPassword = '';
  newPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showUserPassword = false;

  templateFor(slug: string): string {
    return PAGE_DEFINITION_MAP.get(slug)?.template ?? 'custom';
  }

  preview(slug: string): void {
    window.open(slug === 'home' ? '/' : `/${slug}`, '_blank', 'noopener,noreferrer');
  }

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: (user) => {
        this.currentUser = user;
        if (user.role === 'super-admin') this.loadUsers();
        this.changeDetector.markForCheck();
      },
    });
    this.loadPages();
  }

  loadUsers(): void {
    this.api.getUsers().subscribe({ next: (users) => { this.users = users; this.changeDetector.markForCheck(); } });
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
      pdf: '',
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

  uploadImage(event: Event, sectionIndex: number | null = null): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading = true;
    this.error = '';
    this.api.uploadImage(file).subscribe({
      next: (media: UploadedMedia) => {
        if (this.selected) {
          if (sectionIndex === null) this.selected.hero.image = media.url;
          else this.selected.sections[sectionIndex].image = media.url;
        }
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

  uploadPdf(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading = true;
    this.api.uploadReport(file).subscribe({
      next: (report) => {
        if (this.selected) this.selected.pdf = report.url;
        this.uploading = false;
        input.value = '';
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.error ?? 'PDF upload failed. Use a PDF under 25 MB.';
        this.uploading = false;
        input.value = '';
        this.changeDetector.markForCheck();
      },
    });
  }

  duplicate(): void {
    if (!this.selected || !this.duplicateSlug.trim()) { this.error = 'Enter a slug for the duplicate page.'; return; }
    this.api.duplicatePage(this.selected.slug, this.duplicateSlug.trim().toLowerCase(), this.duplicateTitle.trim()).subscribe({
      next: (page) => {
        this.pages = [...this.pages, page].sort((left, right) => left.title.localeCompare(right.title));
        this.selected = structuredClone(page);
        this.duplicateSlug = '';
        this.duplicateTitle = '';
        this.message = 'Page duplicated as a draft.';
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error ?? 'Page could not be duplicated.'; this.changeDetector.markForCheck(); },
    });
  }

  deleteSelected(): void {
    if (!this.selected || !confirm(`Delete ${this.selected.title}? This can be recovered from revisions, but the page will be removed.`)) return;
    const slug = this.selected.slug;
    this.api.deletePage(slug).subscribe({
      next: () => { this.pages = this.pages.filter((page) => page.slug !== slug); this.selected = null; this.message = 'Page deleted.'; this.changeDetector.markForCheck(); },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error ?? 'Page could not be deleted.'; this.changeDetector.markForCheck(); },
    });
  }

  changePassword(): void {
    if (!this.currentPassword || this.newPassword.length < 12) {
      this.error = 'Enter your current password and a new password with at least 12 characters.';
      this.message = '';
      return;
    }
    this.error = '';
    this.message = '';
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => { this.currentPassword = ''; this.newPassword = ''; this.showCurrentPassword = false; this.showNewPassword = false; this.message = 'Your password was changed.'; this.changeDetector.markForCheck(); },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error ?? 'Password could not be changed.'; this.changeDetector.markForCheck(); },
    });
  }

  addUser(): void {
    if (!this.newUserEmail.trim() || this.newUserPassword.length < 12) {
      this.error = 'Enter a valid email and a temporary password with at least 12 characters.';
      this.message = '';
      return;
    }
    this.error = '';
    this.message = '';
    this.api.createUser(this.newUserEmail, this.newUserPassword, this.newUserRole).subscribe({
      next: (user) => { this.users = [...this.users, user].sort((left, right) => left.email.localeCompare(right.email)); this.newUserEmail = ''; this.newUserPassword = ''; this.showUserPassword = false; this.message = 'User added.'; this.changeDetector.markForCheck(); },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error ?? 'User could not be added.'; this.changeDetector.markForCheck(); },
    });
  }

  removeUser(user: ManagedUser): void {
    if (!confirm(`Remove ${user.email} from CMS access?`)) return;
    this.api.deleteUser(user.email).subscribe({
      next: () => { this.users = this.users.filter((entry) => entry.email !== user.email); this.message = 'User removed.'; this.changeDetector.markForCheck(); },
      error: (error: HttpErrorResponse) => { this.error = error.error?.error ?? 'User could not be removed.'; this.changeDetector.markForCheck(); },
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
