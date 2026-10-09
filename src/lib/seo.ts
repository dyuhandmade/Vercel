type SeoEnvironment = {NODE_ENV?: string; DEMO_MODE?: string; SITE_INDEXING_ENABLED?: string; NEXT_PUBLIC_SITE_URL?: string};

export function stableSiteOrigin(environment: SeoEnvironment = process.env): string | null {
  try {
    const url = new URL(environment.NEXT_PUBLIC_SITE_URL || '');
    const host = url.hostname.toLowerCase();
    const preview = ['localhost', '.localhost', '.local', '.test', '.invalid', '.trycloudflare.com', '.ngrok.io', '.ngrok.app', '.ngrok-free.app', '.ngrok-free.dev', '.loca.lt'].some(domain => host === domain || host.endsWith(domain));
    if (url.protocol !== 'https:' || url.username || url.password || preview || /^[\d.]+$/.test(host) || host.includes(':') || !host.includes('.')) return null;
    if (url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

export function storefrontIndexable(environment: SeoEnvironment = process.env): boolean {
  return environment.NODE_ENV === 'production' && environment.DEMO_MODE !== 'true' && environment.SITE_INDEXING_ENABLED === 'true' && stableSiteOrigin(environment) !== null;
}

export function canonicalMetadata(path: string) {
  const origin = stableSiteOrigin();
  return storefrontIndexable() && origin ? {alternates: {canonical: new URL(path, origin).toString()}} : {};
}
