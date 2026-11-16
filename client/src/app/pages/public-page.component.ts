import { HttpClient } from '@angular/common/http';
import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

const PAGE_FILES: Record<string, string> = {
  home: 'index.html',
  'healthcare-and-life-sciences-world-of-work-outlook': 'Healthcare-&-Life-Sciences-World-of-Work-Outlook.html',
  'index-bp': 'index=bp.html',
};

const IMAGE_FALLBACKS: Record<string, string> = {
  '/legacy/assist/images/2026-Global-Talent-Survey.avif': '/legacy/assist/images/2026-Global-Talent-Survey.jpg?v=2',
  '/legacy/assist/images/The-Human-Edge-1080x675.png.avif': '/legacy/assist/images/The-Human-Edge-1080x675.jpg?v=2',
};

function toSlug(value: string): string {
  return value.replace(/\.html$/i, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

@Component({ selector: 'app-public-page', templateUrl: './public-page.component.html' })
export class PublicPageComponent implements AfterViewChecked, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly loadedScripts = new Set<string>();
  private bodyClass = '';
  private scriptEntries: Array<{ src?: string; code?: string }> = [];
  private stylesheetHrefs: string[] = [];
  private inlineStyles: string[] = [];
  private injectedStyles: HTMLStyleElement[] = [];
  private injectedStylesheets: HTMLLinkElement[] = [];
  private legacyHost?: HTMLElement;
  private readonly handleLinkClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest('a');
    const href = anchor?.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    event.preventDefault();
    void this.router.navigateByUrl(href);
  };
  private readonly handleFaqClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const title = target?.closest<HTMLElement>('.dsm-title-wrapper');
    if (!title) return;
    const item = title.closest<HTMLElement>('.dsm-faq-item-wrapper');
    const container = title.closest<HTMLElement>('.dsm-faq-container');
    const content = item?.querySelector<HTMLElement>('.dsm-faq-content');
    if (!item || !container || !content) return;

    const isOpen = item.classList.toggle('dsm-faq-item-active');
    content.style.display = isOpen ? 'block' : 'none';

    if (isOpen && container.dataset['accordion'] === 'on') {
      for (const sibling of container.querySelectorAll<HTMLElement>('.dsm-faq-item-wrapper')) {
        if (sibling === item) continue;
        sibling.classList.remove('dsm-faq-item-active');
        const siblingContent = sibling.querySelector<HTMLElement>('.dsm-faq-content');
        if (siblingContent) siblingContent.style.display = 'none';
      }
    }
  };

  @ViewChild('legacyContent') private legacyContent?: ElementRef<HTMLElement>;

  loading = true;
  notFound = false;
  loadError = '';
  markup = '';
  private renderedMarkup = '';

  constructor() {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const routeSlug = params.get('slug') ?? (this.route.snapshot.data['slug'] as string | undefined) ?? 'home';
        const slug = toSlug(routeSlug);
        const filename = PAGE_FILES[slug] ?? `${slug}.html`;
        this.loading = true;
        this.notFound = false;
        this.loadError = '';
        return this.http.get(`/legacy/${encodeURIComponent(filename)}`, { responseType: 'text' }).pipe(
          catchError((error: { status?: number }) => {
            if (error.status === 404) this.notFound = true;
            else this.loadError = 'Unable to load this page. Please try again later.';
            return of('');
          }),
        );
      }),
    ).subscribe((source) => {
      this.loading = false;
      if (!source) { this.markup = ''; this.renderedMarkup = ''; this.changeDetector.markForCheck(); return; }

      const parsed = new DOMParser().parseFromString(source, 'text/html');
      this.bodyClass = parsed.body.className;
      this.inlineStyles = [...parsed.querySelectorAll('style')]
        .map((style) => style.textContent ?? '')
        .filter(Boolean)
        .map((style) => style.replaceAll('./assist/', '/legacy/assist/').replaceAll('url(assist/', 'url(/legacy/assist/'));
      this.stylesheetHrefs = [...parsed.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"], link[rel="preload"][as="style"]')]
        .map((link) => link.getAttribute('href') ?? '')
        .filter(Boolean)
        .map((href) => href.startsWith('./assist/') ? `/legacy/${href.slice(2)}` : href.startsWith('assist/') ? `/legacy/${href}` : href);
      this.scriptEntries = [...parsed.querySelectorAll<HTMLScriptElement>('script')]
        .map((script) => {
          const source = script.getAttribute('src');
          if (source) return source.startsWith('http') ? {} : { src: `/legacy/${source.replace(/^\.?\//, '')}` };
          return script.textContent?.trim() ? { code: script.textContent } : {};
        })
        .filter((entry) => entry.src || entry.code);
      this.scriptEntries.sort((left, right) => {
        const priority = (entry: { src?: string }) => entry.src?.includes('jquery') ? -2 : entry.src?.includes('easypiechart') ? -1 : 0;
        return priority(left) - priority(right);
      });
      parsed.querySelectorAll('script, style, link[rel="stylesheet"]').forEach((node) => node.remove());

      parsed.querySelectorAll<HTMLElement>('[src], [href], [srcset]').forEach((element) => {
        for (const attribute of ['src', 'href', 'srcset']) {
          const value = element.getAttribute(attribute);
          if (!value) continue;
          const assetPath = value.startsWith('./assist/') ? `/legacy/${value.slice(2)}` : value.startsWith('assist/') ? `/legacy/${value}` : value;
          let normalized = assetPath
            .replaceAll('/2026-Global-Talent-Survey.avif', '/2026-Global-Talent-Survey.jpg')
            .replaceAll('/The-Human-Edge-1080x675.png.avif', '/The-Human-Edge-1080x675.jpg');
          if (attribute === 'src' && IMAGE_FALLBACKS[assetPath]) normalized = IMAGE_FALLBACKS[assetPath];
          if (attribute === 'href' && /\.html(?:[?#]|$)/i.test(value)) {
            normalized = this.angularPath(value);
          } else if (attribute === 'href' && !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(value)) {
            normalized = `/legacy/${value.replace(/^\.\//, '')}`;
          }
          if (normalized !== value) element.setAttribute(attribute, normalized);
        }
      });

      this.markup = parsed.body.innerHTML;
      this.renderedMarkup = '';
      this.title.setTitle(parsed.title || 'Manpower Saudi Arabia');
      const description = parsed.querySelector('meta[name="description"]')?.getAttribute('content');
      if (description) this.meta.updateTag({ name: 'description', content: description });
      this.changeDetector.detectChanges();
      this.renderLegacyPage();
    });
  }

  ngAfterViewChecked(): void { this.renderLegacyPage(); }

  ngOnDestroy(): void {
    this.legacyHost?.removeEventListener('click', this.handleLinkClick);
    this.legacyHost?.removeEventListener('click', this.handleFaqClick);
    this.removeInjectedResources();
    document.body.className = '';
  }

  private renderLegacyPage(): void {
    const host = this.legacyContent?.nativeElement;
    if (!host || !this.markup || this.renderedMarkup === this.markup) return;
    this.removeInjectedResources();
    this.ensureTiltNeonFont();
    for (const href of this.stylesheetHrefs) {
      if (href.includes('fonts.googleapis.com/css2?family=Tilt+Neon')) continue;
      if ([...document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
        .some((link) => link.getAttribute('href') === href)) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.append(link);
      this.injectedStylesheets.push(link);
    }
    for (const styleText of this.inlineStyles) {
      const style = document.createElement('style');
      style.textContent = styleText;
      document.head.append(style);
      this.injectedStyles.push(style);
    }
    host.innerHTML = this.markup;
    this.renderedMarkup = this.markup;
    this.legacyHost = host;
    this.initializeFaqState();
    host.addEventListener('click', this.handleLinkClick);
    host.addEventListener('click', this.handleFaqClick);
    document.body.className = this.bodyClass;
    void this.loadScripts();
  }

  private async loadScripts(): Promise<void> {
    for (const entry of this.scriptEntries) {
      if (entry.src) {
        if (this.loadedScripts.has(entry.src)) continue;
        this.loadedScripts.add(entry.src);
      }
      const script = document.createElement('script');
      if (entry.src) script.src = entry.src;
      else script.textContent = entry.code ?? '';
      document.body.append(script);
      if (entry.src) {
        await new Promise<void>((resolve) => {
          script.addEventListener('load', () => resolve(), { once: true });
          script.addEventListener('error', () => resolve(), { once: true });
        });
      }
    }
    this.initializeFaqState();
  }

  private initializeFaqState(): void {
    for (const container of this.legacyHost?.querySelectorAll<HTMLElement>('.dsm-faq-container') ?? []) {
      const openFirst = container.dataset['open_first_item'] === 'on';
      const items = [...container.querySelectorAll<HTMLElement>('.dsm-faq-item-wrapper')];
      items.forEach((item, index) => {
        const open = openFirst && index === 0;
        item.classList.toggle('dsm-faq-item-active', open);
        const content = item.querySelector<HTMLElement>('.dsm-faq-content');
        if (content) content.style.display = open ? 'block' : 'none';
      });
    }
  }

  private removeInjectedResources(): void {
    for (const style of this.injectedStyles) style.remove();
    this.injectedStyles = [];
    for (const stylesheet of this.injectedStylesheets) stylesheet.remove();
    this.injectedStylesheets = [];
  }

  private ensureTiltNeonFont(): void {
    if (document.querySelector('link[data-manpower-tilt-neon]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Tilt+Neon&display=swap';
    link.dataset['manpowerTiltNeon'] = 'true';
    document.head.append(link);
  }

  private angularPath(value: string): string {
    const filename = value.split(/[?#]/, 1)[0].split('/').pop() ?? '';
    return filename === 'index.html' ? '/' : `/${toSlug(filename)}`;
  }
}
