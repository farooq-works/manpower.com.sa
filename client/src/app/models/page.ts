export interface PageSection {
  id?: string;
  sourceHeading?: string;
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
  pdf?: string;
  sections: PageSection[];
  updatedAt?: string;
}

export interface AdminUser {
  email: string;
  role: 'super-admin' | 'editor';
}

export interface UploadedMedia {
  name: string;
  url: string;
}

export interface ManagedUser {
  email: string;
  role: 'super-admin' | 'editor';
}
