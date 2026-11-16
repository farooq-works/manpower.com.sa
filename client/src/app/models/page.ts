export interface PageSection {
  heading: string;
  body: string;
  image: string;
}

export interface SitePage {
  slug: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  hero: {
    heading: string;
    body: string;
    image: string;
  };
  sections: PageSection[];
  updatedAt?: string;
}

export interface AdminUser {
  email: string;
}

export interface UploadedMedia {
  name: string;
  url: string;
}
