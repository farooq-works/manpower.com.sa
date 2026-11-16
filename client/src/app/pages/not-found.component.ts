import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 class="text-4xl font-bold">Page not found</h1>
      <a routerLink="/" class="mt-6 inline-block text-red-700 underline">Return home</a>
    </section>
  `,
})
export class NotFoundComponent {}
