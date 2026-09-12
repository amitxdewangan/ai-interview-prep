import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isPrivateOrBlockedIp, assertSafeUrl, SSRFError } from '../security/ssrf.js';

describe('Phase 2: SSRF Guard & IP Range Filtering', () => {
  const originalEnv = process.env.ALLOW_LOCAL_URLS;

  beforeEach(() => {
    delete process.env.ALLOW_LOCAL_URLS;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ALLOW_LOCAL_URLS = originalEnv;
    } else {
      delete process.env.ALLOW_LOCAL_URLS;
    }
  });

  describe('isPrivateOrBlockedIp', () => {
    it('blocks loopback addresses by default', () => {
      expect(isPrivateOrBlockedIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIp('127.0.0.2')).toBe(true);
      expect(isPrivateOrBlockedIp('127.255.255.255')).toBe(true);
      expect(isPrivateOrBlockedIp('::1')).toBe(true);
      expect(isPrivateOrBlockedIp('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('allows loopback addresses when allowLocal is true', () => {
      expect(isPrivateOrBlockedIp('127.0.0.1', true)).toBe(false);
      expect(isPrivateOrBlockedIp('::1', true)).toBe(false);
    });

    it('always blocks cloud metadata and link-local addresses even if allowLocal is true', () => {
      expect(isPrivateOrBlockedIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrBlockedIp('169.254.169.254', true)).toBe(true);
      expect(isPrivateOrBlockedIp('169.254.1.1')).toBe(true);
      expect(isPrivateOrBlockedIp('fe80::1')).toBe(true);
      expect(isPrivateOrBlockedIp('fe80::1', true)).toBe(true);
    });

    it('blocks RFC 1918 private IPv4 networks', () => {
      // 10.0.0.0/8
      expect(isPrivateOrBlockedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIp('10.254.0.1')).toBe(true);

      // 172.16.0.0/12
      expect(isPrivateOrBlockedIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrBlockedIp('172.31.255.255')).toBe(true);
      // 172.32.0.1 is public
      expect(isPrivateOrBlockedIp('172.32.0.1')).toBe(false);

      // 192.168.0.0/16
      expect(isPrivateOrBlockedIp('192.168.1.1')).toBe(true);
      expect(isPrivateOrBlockedIp('192.168.254.254')).toBe(true);
    });

    it('blocks carrier-grade NAT, multicast, and broadcast addresses', () => {
      expect(isPrivateOrBlockedIp('100.64.0.1')).toBe(true);
      expect(isPrivateOrBlockedIp('224.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIp('255.255.255.255')).toBe(true);
      expect(isPrivateOrBlockedIp('0.0.0.0')).toBe(true);
    });

    it('blocks IPv4-mapped IPv6 addresses for restricted ranges', () => {
      expect(isPrivateOrBlockedIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIp('::ffff:169.254.169.254')).toBe(true);
      expect(isPrivateOrBlockedIp('::ffff:10.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedIp('::ffff:127.0.0.1', true)).toBe(false);
    });

    it('permits public IP addresses', () => {
      expect(isPrivateOrBlockedIp('8.8.8.8')).toBe(false);
      expect(isPrivateOrBlockedIp('1.1.1.1')).toBe(false);
      expect(isPrivateOrBlockedIp('93.184.216.34')).toBe(false); // example.com
    });
  });

  describe('assertSafeUrl', () => {
    it('rejects invalid URL formats', async () => {
      await expect(assertSafeUrl('not a url')).rejects.toThrow(SSRFError);
      await expect(assertSafeUrl('htt://broken')).rejects.toThrow(SSRFError);
    });

    it('rejects non-http/https protocols', async () => {
      await expect(assertSafeUrl('file:///etc/passwd')).rejects.toThrow(SSRFError);
      await expect(assertSafeUrl('ftp://ftp.example.com/file')).rejects.toThrow(SSRFError);
      await expect(assertSafeUrl('gopher://127.0.0.1:70/')).rejects.toThrow(SSRFError);
      await expect(assertSafeUrl('javascript:alert(1)')).rejects.toThrow(SSRFError);
    });

    it('rejects cloud metadata IP in URL', async () => {
      await expect(
        assertSafeUrl('http://169.254.169.254/latest/meta-data/')
      ).rejects.toThrow(SSRFError);
    });

    it('rejects private IPs in URL', async () => {
      await expect(assertSafeUrl('http://10.0.0.5:8080/admin')).rejects.toThrow(SSRFError);
      await expect(assertSafeUrl('http://192.168.1.1/')).rejects.toThrow(SSRFError);
      await expect(assertSafeUrl('http://172.16.10.20/api')).rejects.toThrow(SSRFError);
    });

    it('rejects localhost by default', async () => {
      await expect(assertSafeUrl('http://localhost:3000/')).rejects.toThrow(SSRFError);
      await expect(assertSafeUrl('http://127.0.0.1:8080/')).rejects.toThrow(SSRFError);
    });

    it('permits localhost when allowLocal is true or ALLOW_LOCAL_URLS=true', async () => {
      const url1 = await assertSafeUrl('http://localhost:3000/test', { allowLocal: true });
      expect(url1.hostname).toBe('localhost');
      expect(url1.port).toBe('3000');

      process.env.ALLOW_LOCAL_URLS = 'true';
      const url2 = await assertSafeUrl('http://127.0.0.1:8080/acme');
      expect(url2.hostname).toBe('127.0.0.1');
    });

    it('permits valid public URLs', async () => {
      const url = await assertSafeUrl('https://example.com/careers');
      expect(url.hostname).toBe('example.com');
      expect(url.pathname).toBe('/careers');
    });
  });
});
