import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, inject, Injectable, PLATFORM_ID, REQUEST } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface PageSeo {
  title: string;
  description?: string;
  image?: string;
  path?: string;
  type?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const JSON_LD_ID = 'arena-structured-data';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly platform = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });

  readonly origin = this.resolveOrigin();

  setPage(seo: PageSeo): void {
    this.title.setTitle(seo.title);
    this.setTag('description', seo.description ?? '');
    this.setTag('robots', seo.noIndex ? 'noindex, nofollow' : 'index, follow');

    const url = seo.path ? this.absolute(seo.path) : this.absolute(this.currentPath());
    this.setTag('og:title', seo.title, true);
    this.setTag('og:description', seo.description ?? '', true);
    this.setTag('og:url', url, true);
    this.setTag('og:type', seo.type ?? 'website', true);
    this.setTag('og:site_name', 'Arena.ge', true);
    this.setTag('twitter:card', seo.image ? 'summary_large_image' : 'summary');
    this.setTag('twitter:title', seo.title);
    this.setTag('twitter:description', seo.description ?? '');

    if (seo.image) {
      const image = this.absolute(seo.image);
      this.setTag('og:image', image, true);
      this.setTag('twitter:image', image);
    } else {
      this.removeTag('og:image', true);
      this.removeTag('twitter:image');
    }

    this.setCanonical(url);
    this.setJsonLd(seo.jsonLd);
  }

  absolute(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }
    return `${this.origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  }

  private currentPath(): string {
    if (isPlatformBrowser(this.platform)) {
      return window.location.pathname;
    }
    return this.request?.url ? new URL(this.request.url, this.origin).pathname : '/';
  }

  private resolveOrigin(): string {
    if (isPlatformBrowser(this.platform)) {
      return window.location.origin;
    }
    const configured =
      typeof process !== 'undefined' ? process.env['PUBLIC_ORIGIN'] : undefined;
    if (configured) {
      return configured.replace(/\/+$/, '');
    }
    if (this.request?.url) {
      try {
        return new URL(this.request.url).origin;
      } catch {
        return 'http://localhost:4200';
      }
    }
    return 'http://localhost:4200';
  }

  private setTag(name: string, content: string, isProperty = false): void {
    const selector = isProperty ? `property="${name}"` : `name="${name}"`;
    if (this.meta.getTag(selector)) {
      this.meta.updateTag({ [isProperty ? 'property' : 'name']: name, content });
    } else {
      this.meta.addTag({ [isProperty ? 'property' : 'name']: name, content });
    }
  }

  private removeTag(name: string, isProperty = false): void {
    this.meta.removeTag(isProperty ? `property="${name}"` : `name="${name}"`);
  }

  private setCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(data?: Record<string, unknown> | Record<string, unknown>[]): void {
    const existing = this.document.getElementById(JSON_LD_ID);
    if (existing) {
      existing.remove();
    }
    if (!data) {
      return;
    }
    const script = this.document.createElement('script');
    script.id = JSON_LD_ID;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    this.document.head.appendChild(script);
  }
}
