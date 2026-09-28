import raw from '../data/site.json' with { type: 'json' };

export type AnalyticsProvider = 'plausible' | 'umami';
export interface SiteConfig { domain: string; appUrl: string; supportEmail: string; brandName: string; productName: string; tagline: string; descriptor: string; analyticsEndpoint: string; analyticsProvider: AnalyticsProvider; public: boolean; }

export function readSite(env: Record<string, string | undefined> = process.env): SiteConfig {
  const provider = env.ANALYTICS_PROVIDER ?? raw.analyticsProvider;
  if (provider !== 'plausible' && provider !== 'umami') throw new Error(`ANALYTICS_PROVIDER invalide : ${provider}`);
  const pub = env.SITE_PUBLIC === undefined ? raw.public : env.SITE_PUBLIC === 'true';
  return { ...raw, analyticsProvider: provider, analyticsEndpoint: env.ANALYTICS_ENDPOINT ?? raw.analyticsEndpoint, public: pub };
}
