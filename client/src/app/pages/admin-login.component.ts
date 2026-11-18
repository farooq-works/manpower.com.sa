import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule, RouterLink],
  styleUrl: './admin-login.component.css',
  templateUrl: './admin-login.component.html',
})
export class AdminLoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);

  email = '';
  password = '';
  error = '';
  submitting = false;
  showPassword = false;

  submit(): void {
    if (!this.email.trim() || !this.password) {
      this.error = 'Enter your email and password to continue.';
      return;
    }
    this.error = '';
    this.submitting = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => void this.router.navigateByUrl('/admin'),
      error: () => {
        this.error = 'Could not sign in. Check your credentials and that the API is configured.';
        this.submitting = false;
        this.changeDetector.markForCheck();
      },
    });
  }
}
