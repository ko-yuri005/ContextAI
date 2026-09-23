import dns from 'dns';
import net from 'net';

/**
 * Validates a user-supplied URL to ensure it is safe to fetch and protects against SSRF:
 * - Must be http:// or https:// protocol
 * - Must resolve to a valid, publicly routable IP address
 * - Explicitly rejects localhost, private networks (RFC 1918), link-local (169.254.x),
 *   cloud metadata, loopbacks, and multicast/reserved ranges.
 */
export async function validateSafeUrl(rawUrl: string): Promise<{ safe: boolean; url?: URL; error?: string }> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    return { safe: false, error: 'Invalid URL format. Please provide a full URL including http:// or https://' };
  }

  // 1. Protocol check
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      safe: false,
      error: `Unsupported protocol "${parsedUrl.protocol}". Only http:// and https:// URLs are allowed.`,
    };
  }

  // 2. Reject credentials in URL
  if (parsedUrl.username || parsedUrl.password) {
    return {
      safe: false,
      error: 'URLs containing embedded credentials (username/password) are not allowed.',
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 3. Quick hostname checks
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return {
      safe: false,
      error: 'Access to localhost or internal network hosts is restricted.',
    };
  }

  // 4. DNS resolution to inspect underlying IP addresses
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });

    if (!addresses || addresses.length === 0) {
      return {
        safe: false,
        error: `Could not resolve domain name "${hostname}". Please verify the URL.`,
      };
    }

    for (const record of addresses) {
      if (isRestrictedIp(record.address)) {
        return {
          safe: false,
          error: `The destination "${hostname}" resolves to a restricted or private IP address (${record.address}).`,
        };
      }
    }
  } catch (err: any) {
    return {
      safe: false,
      error: `DNS resolution failed for "${hostname}": ${err.message || 'Domain not found'}.`,
    };
  }

  return { safe: true, url: parsedUrl };
}

/**
 * Checks if an IP address belongs to private, loopback, link-local, cloud-metadata, or reserved ranges.
 */
export function isRestrictedIp(ip: string): boolean {
  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  const isV4 = net.isIPv4(ip);
  const isV6 = net.isIPv6(ip);

  if (!isV4 && !isV6) {
    return true; // Malformed or unrecognized IP
  }

  if (isV4) {
    const parts = ip.split('.').map(Number);
    const [a, b, c, d] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 10.0.0.0/8 (Private RFC 1918)
    if (a === 10) return true;

    // 172.16.0.0/12 (Private RFC 1918: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (Private RFC 1918)
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Metadata: 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 100.64.0.0/10 (Shared Address Space / CGNAT: 100.64.0.0 - 100.127.255.255)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (a === 192 && b === 0 && c === 0) return true;

    // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && (b === 18 || b === 19)) return true;

    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 (Reserved / Future Use)
    if (a >= 240) return true;

    // 255.255.255.255 (Broadcast)
    if (a === 255 && b === 255 && c === 255 && d === 255) return true;

    return false;
  }

  if (isV6) {
    const normalized = ip.toLowerCase();

    // Loopback
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

    // Unspecified
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

    // Unique Local Addresses (fc00::/7 -> fc00 to fdff)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

    // Link-local Unicast (fe80::/10 -> fe80 to febf)
    if (/^fe[89ab]/i.test(normalized)) return true;

    return false;
  }

  return true;
}
