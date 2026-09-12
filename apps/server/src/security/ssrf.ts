import dns from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import net from 'node:net';

export class SSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SSRFError';
  }
}

/**
 * Checks whether an IP address is private, loopback, link-local, cloud metadata,
 * or otherwise restricted from public fetching.
 */
export function isPrivateOrBlockedIp(ip: string, allowLocal = false): boolean {
  // Check if IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1 or ::ffff:7f00:1)
  const ipv4MappedMatch = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (ipv4MappedMatch) {
    return isPrivateOrBlockedIp(ipv4MappedMatch[1], allowLocal);
  }

  const ipVersion = net.isIP(ip);
  if (ipVersion === 4) {
    const parts = ip.split('.').map(Number);
    const [b0, b1, b2, b3] = parts;

    // 127.0.0.0/8 - Loopback
    if (b0 === 127) {
      return !allowLocal;
    }

    // 0.0.0.0/8 - Current network
    if (b0 === 0) return true;

    // 10.0.0.0/8 - Private-use networks
    if (b0 === 10) return true;

    // 100.64.0.0/10 - Carrier-grade NAT
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

    // 169.254.0.0/16 - Link-local / Cloud metadata (e.g. 169.254.169.254)
    if (b0 === 169 && b1 === 254) return true;

    // 172.16.0.0/12 - Private-use networks (172.16.0.0 - 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

    // 192.0.0.0/24 - IETF protocol assignments
    if (b0 === 192 && b1 === 0 && b2 === 0) return true;

    // 192.0.2.0/24 - TEST-NET-1
    if (b0 === 192 && b1 === 0 && b2 === 2) return true;

    // 192.168.0.0/16 - Private-use networks
    if (b0 === 192 && b1 === 168) return true;

    // 198.18.0.0/15 - Benchmarking
    if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

    // 198.51.100.0/24 - TEST-NET-2
    if (b0 === 198 && b1 === 51 && b2 === 100) return true;

    // 203.0.113.0/24 - TEST-NET-3
    if (b0 === 203 && b1 === 0 && b2 === 113) return true;

    // 224.0.0.0/4 - Multicast
    if (b0 >= 224 && b0 <= 239) return true;

    // 240.0.0.0/4 - Reserved
    if (b0 >= 240) return true;

    return false;
  }

  if (ipVersion === 6) {
    const normalized = ip.toLowerCase();

    // ::1 - Loopback
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
      return !allowLocal;
    }

    // :: - Unspecified
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') {
      return true;
    }

    // Unique Local Addresses (fc00::/7 -> fc00:: to fdff::)
    if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) {
      return true;
    }

    // Link-local unicast (fe80::/10 -> fe80:: to febf::)
    if (/^fe[89ab][0-9a-f]:/i.test(normalized)) {
      return true;
    }

    // Multicast (ff00::/8)
    if (/^ff[0-9a-f]{2}:/i.test(normalized)) {
      return true;
    }

    return false;
  }

  // Not a standard recognized IP string
  return false;
}

export interface ValidateUrlOptions {
  allowLocal?: boolean;
}

/**
 * Validates a target URL against SSRF vulnerabilities:
 * - Scheme must be http: or https:
 * - Hostname cannot be a private/loopback/cloud-metadata IP or domain
 * - Resolves all DNS A and AAAA records and ensures none point to restricted addresses
 */
export async function assertSafeUrl(
  inputUrl: string | URL,
  options?: ValidateUrlOptions
): Promise<URL> {
  const allowLocal =
    options?.allowLocal ?? process.env.ALLOW_LOCAL_URLS === 'true';

  let parsed: URL;
  try {
    parsed = typeof inputUrl === 'string' ? new URL(inputUrl) : inputUrl;
  } catch {
    throw new SSRFError(`Invalid URL format: "${inputUrl}"`);
  }

  // Enforce protocol whitelist
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SSRFError(
      `Disallowed URL protocol "${parsed.protocol}". Only "http:" and "https:" are permitted.`
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  // Strip IPv6 enclosing brackets if present
  const cleanedHost = hostname.replace(/^\[|\]$/g, '');

  // Check localhost variations
  if (
    cleanedHost === 'localhost' ||
    cleanedHost.endsWith('.localhost') ||
    cleanedHost.endsWith('.local') ||
    cleanedHost.endsWith('.internal')
  ) {
    if (!allowLocal) {
      throw new SSRFError(`Access to local domain "${hostname}" is restricted.`);
    }
  }

  // If host is directly an IP literal
  if (net.isIP(cleanedHost)) {
    if (isPrivateOrBlockedIp(cleanedHost, allowLocal)) {
      throw new SSRFError(
        `Target IP "${cleanedHost}" is restricted (private, loopback, or cloud-metadata).`
      );
    }
    return parsed;
  }

  // Resolve hostname through DNS
  let lookupResults: LookupAddress[];
  try {
    lookupResults = await dns.lookup(cleanedHost, { all: true, verbatim: true });
  } catch (err: unknown) {
    // If local URLs are allowed and it's localhost, allow lookup failure fallback
    if (allowLocal && (cleanedHost === 'localhost' || cleanedHost === '127.0.0.1')) {
      return parsed;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new SSRFError(`DNS resolution failed for host "${cleanedHost}": ${message}`);
  }

  if (!lookupResults || lookupResults.length === 0) {
    throw new SSRFError(`No DNS records found for host "${cleanedHost}".`);
  }

  // Validate every resolved IP
  for (const { address } of lookupResults) {
    if (isPrivateOrBlockedIp(address, allowLocal)) {
      throw new SSRFError(
        `Host "${cleanedHost}" resolves to restricted IP "${address}".`
      );
    }
  }

  return parsed;
}

export interface SafeFetchOptions extends RequestInit {
  allowLocal?: boolean;
  timeoutMs?: number;
  maxRedirects?: number;
}

/**
 * Executes a network fetch guarded by strict SSRF validation and manual redirect tracking.
 * Each redirect target is validated to prevent redirect-based SSRF bypasses.
 */
export async function safeFetch(
  inputUrl: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const {
    allowLocal = process.env.ALLOW_LOCAL_URLS === 'true',
    timeoutMs = 5000,
    maxRedirects = 5,
    headers,
    ...fetchInit
  } = options;

  let currentUrl = inputUrl;
  let redirectsCount = 0;

  while (true) {
    const safeUrl = await assertSafeUrl(currentUrl, { allowLocal });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(safeUrl.toString(), {
        ...fetchInit,
        headers: {
          'User-Agent': 'AIInterviewPrepKit-Bot/1.0 (+https://ai-interview-prep.local)',
          ...headers,
        },
        redirect: 'manual', // Intercept redirects to validate every hop
        signal: controller.signal,
      });

      // Handle redirects manually
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        redirectsCount++;
        if (redirectsCount > maxRedirects) {
          throw new SSRFError(`Too many redirects (limit: ${maxRedirects})`);
        }

        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
          throw new SSRFError(
            `Redirect status ${response.status} returned without a Location header`
          );
        }

        // Resolve redirect relative to the current URL
        const nextUrl = new URL(locationHeader, safeUrl).toString();
        currentUrl = nextUrl;
        continue;
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }
}
