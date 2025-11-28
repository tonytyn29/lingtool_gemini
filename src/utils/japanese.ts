// Lightweight helpers to add Japanese furigana locally in the browser using Kuroshiro + kuromoji
// No external paid APIs required. We load from public CDNs at runtime.

let kuroshiroInstance: any | null = null;
const LOG_ENDPOINT = 'http://localhost:4001/log';

async function sink(level: 'debug'|'info'|'warn'|'error', tag: string, message: string, data?: any) {
  try {
    await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, tag, message, data })
    });
  } catch (_) {
    // fallback to console when sink not available
    // eslint-disable-next-line no-console
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`[${tag}] ${message}`, data || '');
  }
}

async function loadScript(src: string, attrs?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        sink('debug', 'Japanese', 'script already loaded', src);
        resolve();
        return;
      }
      sink('debug', 'Japanese', 'waiting existing script to load', src);
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    if (attrs) Object.entries(attrs).forEach(([k, v]) => script.setAttribute(k, v));
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      sink('debug', 'Japanese', 'script loaded', src);
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureKuroshiro(): Promise<any> {
  if (kuroshiroInstance) return kuroshiroInstance;
  // Load kuromoji (tokenizer) first so analyzer can build
  // Then load kuroshiro and its analyzer
  const KUROMOJI_JS = 'https://unpkg.com/kuromoji@0.1.2/dist/kuromoji.js';
  const KUROSHIRO_JS = 'https://unpkg.com/kuroshiro@1.3.2/dist/kuroshiro.min.js';
  const ANALYZER_JS = 'https://unpkg.com/kuroshiro-analyzer-kuromoji@1.1.0/dist/kuroshiro-analyzer-kuromoji.min.js';
  const DICT_PATH = 'https://unpkg.com/kuromoji@0.1.2/dict/';

  await loadScript(KUROMOJI_JS);
  await loadScript(KUROSHIRO_JS);
  await loadScript(ANALYZER_JS);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Kuroshiro: any = (window as any).Kuroshiro;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const KuromojiAnalyzer: any = (window as any).KuroshiroAnalyzerKuromoji;
  if (!Kuroshiro || !KuromojiAnalyzer) throw new Error('Kuroshiro libraries not available');

  sink('info', 'Japanese', 'initializing Kuroshiro with Kuromoji analyzer');
  const kuro = new Kuroshiro();
  const analyzer = new KuromojiAnalyzer({ dictPath: DICT_PATH });
  await kuro.init(analyzer);
  sink('info', 'Japanese', 'Kuroshiro initialized');
  kuroshiroInstance = kuro;
  return kuroshiroInstance;
}

// Convert ruby HTML to "詞（かな）" text. This is a simplified converter.
function rubyToParentheses(input: string): string {
  // Replace <ruby>...<rt>reading</rt>...</ruby> with base(reading)
  // Handle common patterns output by Kuroshiro
  let s = input
    .replace(/<rp>[^<]*<\/rp>/g, '')
    .replace(/<rb>/g, '')
    .replace(/<\/rb>/g, '')
    .replace(/<ruby>/g, '')
    .replace(/<\/ruby>/g, '');
  s = s.replace(/([^<]*?)<rt>(.*?)<\/rt>/g, (_m, base, reading) => {
    const baseTrim = String(base || '').trim();
    const readTrim = String(reading || '').trim();
    if (!baseTrim) return baseTrim;
    if (!readTrim) return baseTrim;
    return `${baseTrim}（${readTrim}）`;
  });
  // Strip any residual tags
  s = s.replace(/<[^>]+>/g, '');
  return s;
}

export async function addFuriganaInlineLocal(text: string): Promise<string> {
  sink('debug', 'Japanese', 'addFuriganaInlineLocal input', text);
  const kuro = await ensureKuroshiro();
  const html = await kuro.convert(text, {
    to: 'hiragana',
    mode: 'furigana' // returns ruby HTML
  });
  sink('debug', 'Japanese', 'ruby html', html);
  return rubyToParentheses(html);
}

export default {
  addFuriganaInlineLocal
};


