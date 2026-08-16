export const CIPHER_SUITES =
  'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256';

export const FINAL_MASK_JSON = JSON.stringify({
  tcp: [
    {
      type: 'fragment',
      settings: {
        packets: 'tlshello',
        lengths: ['5', '94', '1'],
        delays: ['0'],
        maxSplit: '0'
      }
    },
    {
      type: 'fragment',
      settings: {
        packets: '1-1',
        lengths: ['109', '1'],
        delays: ['1'],
        maxSplit: '355'
      }
    }
  ]
});

export interface OptimizerOptions {
  cleanIp?: string;
  fingerprint?: string;
  cipherSuites?: string;
  finalMask?: string;
  enableFragment?: boolean;
  enableCipherSuites?: boolean;
}

export async function fetchSubscriptionContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    
    if (!text || text.trim().length === 0) {
      throw new Error('پاسخ خالی دریافت شد');
    }

    // بررسی اینکه آیا پاسخ Base64 است (فرمت رایج ساب‌سکریپشن)
    try {
      const cleanText = text.trim().replace(/\s/g, '');
      if (/^[A-Za-z0-9+/=]+$/.test(cleanText) && cleanText.length > 0 && cleanText.length % 4 === 0) {
        const decoded = atob(cleanText);
        if (decoded.includes('://')) {
          return decoded;
        }
      }
    } catch {}

    return text;
  } catch (error) {
    console.error('خطا در دریافت اشتراک:', error);
    throw new Error('خطا در دریافت لینک اشتراک. لطفاً اتصال اینترنت یا صحت لینک را بررسی کنید.');
  }
}

export function parseRawInput(raw: string): string[] {
  let text = raw.trim();
  if (!text) return [];

  // اگر ورودی یک URL باشد (شروع با http)، آن را برنمی‌گردانیم تا توسط تابع اصلی پردازش شود
  if (text.startsWith('http://') || text.startsWith('https://')) {
    return [text]; 
  }

  // بررسی دیکود Base64 برای ساب‌سکریپشن‌های یک‌تکه (غیر URL)
  if (!text.includes('\n') && !text.startsWith('vless://') && !text.startsWith('trojan://')) {
    try {
      const decoded = atob(text);
      if (decoded.includes('://')) {
        text = decoded;
      }
    } catch {}
  }

  return text
    .split(/[\r\n]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));
}

export function optimizeNodeUri(rawUri: string, options: OptimizerOptions = {}): string {
  const trimmed = rawUri.trim();
  if (!trimmed.startsWith('vless://') && !trimmed.startsWith('trojan://')) {
    return trimmed;
  }

  try {
    const protocol = trimmed.startsWith('vless://') ? 'vless://' : 'trojan://';
    const rest = trimmed.slice(protocol.length);
    const hashIndex = rest.indexOf('#');
    const fragment = hashIndex !== -1 ? rest.slice(hashIndex + 1) : '';
    const mainPart = hashIndex !== -1 ? rest.slice(0, hashIndex) : rest;

    const qIndex = mainPart.indexOf('?');
    const authority = qIndex !== -1 ? mainPart.slice(0, qIndex) : mainPart;
    const queryStr = qIndex !== -1 ? mainPart.slice(qIndex + 1) : '';

    let userInfo = '';
    let hostPort = authority;
    if (authority.includes('@')) {
      const atIdx = authority.indexOf('@');
      userInfo = authority.slice(0, atIdx);
      hostPort = authority.slice(atIdx + 1);
    }

    let origHost = hostPort;
    let origPort = '443';
    if (hostPort.includes(':')) {
      const parts = hostPort.split(':');
      origHost = parts[0];
      origPort = parts[1] || '443';
    }

    const searchParams = new URLSearchParams(queryStr);

    if (!searchParams.get('sni')) searchParams.set('sni', origHost);
    if (!searchParams.get('host')) searchParams.set('host', origHost);

    let targetHost = origHost;
    let targetPort = origPort;
    if (options.cleanIp && options.cleanIp.trim()) {
      const clean = options.cleanIp.trim();
      if (clean.includes(':')) {
        const parts = clean.split(':');
        targetHost = parts[0];
        targetPort = parts[1] || '443';
      } else {
        targetHost = clean;
      }
    }

    searchParams.set('fp', options.fingerprint || 'chrome');

    if (options.enableCipherSuites !== false) {
      searchParams.set('cs', options.cipherSuites || CIPHER_SUITES);
    }

    if (options.enableFragment !== false) {
      searchParams.set('fm', options.finalMask || FINAL_MASK_JSON);
    }

    const newAuthority = `${userInfo ? userInfo + '@' : ''}${targetHost}:${targetPort}`;
    const newQuery = searchParams.toString();
    const newFragment = fragment ? `#${fragment}` : '';

    return `${protocol}${newAuthority}?${newQuery}${newFragment}`;
  } catch {
    return rawUri;
  }
}

export function buildXrayProfileJson(configs: string[], options: OptimizerOptions = {}): any {
  const outbounds: any[] = [];

  for (const raw of configs) {
    const optUri = optimizeNodeUri(raw, options);
    if (optUri.startsWith('vless://')) {
      const protoPrefix = 'vless://';
      const rest = optUri.slice(protoPrefix.length);
      const hashIdx = rest.indexOf('#');
      const tag = hashIdx !== -1 ? decodeURIComponent(rest.slice(hashIdx + 1)) : '';
      const mainPart = hashIdx !== -1 ? rest.slice(0, hashIdx) : rest;

      const qIdx = mainPart.indexOf('?');
      const auth = qIdx !== -1 ? mainPart.slice(0, qIdx) : mainPart;
      const query = qIdx !== -1 ? mainPart.slice(qIdx + 1) : '';

      const [uuid, hostPort] = auth.split('@');
      const [address, portStr] = (hostPort || '').split(':');
      const params = new URLSearchParams(query);

      outbounds.push({
        tag: tag || `VLESS-${address}`,
        protocol: 'vless',
        settings: {
          vnext: [
            {
              address: address,
              port: parseInt(portStr || '443', 10),
              users: [{ id: uuid, encryption: 'none' }]
            }
          ]
        },
        streamSettings: {
          network: params.get('type') || 'ws',
          security: 'tls',
          tlsSettings: {
            serverName: params.get('sni') || address,
            fingerprint: params.get('fp') || 'chrome',
            cipherSuites: params.get('cs') || CIPHER_SUITES
          },
          finalmask: params.get('fm') ? JSON.parse(params.get('fm')!) : JSON.parse(FINAL_MASK_JSON),
          wsSettings: {
            path: params.get('path') || '/?ed=2048',
            headers: { Host: params.get('host') || params.get('sni') || address }
          }
        }
      });
    }
  }

  return {
    log: { loglevel: 'warning' },
    inbounds: [
      {
        port: 10808,
        protocol: 'socks',
        settings: { auth: 'noauth', udp: true },
        tag: 'socks-in'
      }
    ],
    outbounds: outbounds.length > 0 ? outbounds : [{ protocol: 'freedom', tag: 'direct' }]
  };
}
