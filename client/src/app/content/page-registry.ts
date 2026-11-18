export interface LegacyPageDefinition {
  slug: string;
  sourceFile: string;
  label: string;
  template: 'home' | 'service' | 'report' | 'contact';
}

/**
 * The registry is the Angular source of truth for the public page set.
 * Each definition keeps the original wwwroot template as its visual contract
 * while the CMS data supplies editable content at runtime.
 */
export const PAGE_DEFINITIONS: readonly LegacyPageDefinition[] = [
  { slug: 'home', sourceFile: 'index.html', label: 'Home', template: 'home' },
  { slug: 'about-us', sourceFile: 'about-us.html', label: 'About Us', template: 'service' },
  { slug: 'contact-us', sourceFile: 'contact-us.html', label: 'Contact Us', template: 'contact' },
  { slug: 'global-staffing', sourceFile: 'global-staffing.html', label: 'Global Staffing', template: 'service' },
  { slug: 'healthcare-and-life-sciences-world-of-work-outlook', sourceFile: 'Healthcare-&-Life-Sciences-World-of-Work-Outlook.html', label: 'Healthcare & Life Sciences World of Work Outlook', template: 'report' },
  { slug: 'hr-consultancy-management', sourceFile: 'hr-consultancy-management.html', label: 'HR Consultancy Management', template: 'service' },
  { slug: 'job-opportunities', sourceFile: 'job-opportunities.html', label: 'Job Opportunities', template: 'service' },
  { slug: 'manpowergroup-employment-outlook-survey-q2-2026', sourceFile: 'manpowergroup-employment-outlook-survey-q2-2026.html', label: 'Employment Outlook Survey Q2 2026', template: 'report' },
  { slug: 'manpowergroup-employment-outlook-survey-q3-2026', sourceFile: 'manpowergroup-employment-outlook-survey-q3-2026.html', label: 'Employment Outlook Survey Q3 2026', template: 'report' },
  { slug: 'manpowergroup-employment-outlook-survey-q4-2026', sourceFile: 'manpowergroup-employment-outlook-survey-q4-2026.html', label: 'Employment Outlook Survey Q4 2026', template: 'report' },
  { slug: 'our-solutions', sourceFile: 'our-solutions.html', label: 'Our Solutions', template: 'service' },
  { slug: 'our-story-history', sourceFile: 'our-story-history.html', label: 'Our Story History', template: 'service' },
  { slug: 'our-values', sourceFile: 'our-values.html', label: 'Our Values', template: 'service' },
  { slug: 'outsourcing', sourceFile: 'outsourcing.html', label: 'Outsourcing', template: 'service' },
  { slug: 'recruitment', sourceFile: 'recruitment.html', label: 'Recruitment', template: 'service' },
  { slug: 'recruitment-services', sourceFile: 'recruitment-services.html', label: 'Recruitment Services', template: 'service' },
  { slug: 'reports-market-updates', sourceFile: 'reports-market-updates.html', label: 'Reports & Market Updates', template: 'report' },
  { slug: 'the-human-edge-2026-global-trends-report', sourceFile: 'the-human-edge-2026-global-trends-report.html', label: 'The Human Edge 2026 Global Trends Report', template: 'report' },
  { slug: '2026-global-talen-survey', sourceFile: '2026-global-talen-survey.html', label: '2026 Global Talent Survey', template: 'report' },
  { slug: 'why-choose-us', sourceFile: 'why-choose-us.html', label: 'Why Choose Us', template: 'service' },
];

export const PAGE_DEFINITION_MAP = new Map(PAGE_DEFINITIONS.map((page) => [page.slug, page]));
