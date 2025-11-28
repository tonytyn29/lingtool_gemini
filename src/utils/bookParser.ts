/* Lightweight client-side book parsers for TXT, PDF (basic), and a stub for EPUB.
 * Note: PDF parsing uses pdfjs-dist via dynamic import to avoid bundler worker config.
 */

export type ParsedBook = {
  title: string;
  author: string;
  content: string;
  pages?: string[]; // 可选，用于向后兼容
  totalPages?: number; // 可选，用于向后兼容
  chapters?: Array<{ id: string; title: string; page: number; href?: string; absPath?: string; anchorId?: string }>;
  fileIndex?: Array<{ path: string; start: number; end: number; headingStart?: number }>; // EPUB内容文件的字符偏移索引
  anchorIndex?: Array<{ path: string; id: string; offset: number }>; // 每个内容文件内带 id 的元素在全文中的偏移
};

export async function parseTxt(file: File): Promise<ParsedBook> {
  const text = await file.text();
  
  // 提取文件名作为标题
  const fileName = file.name.replace(/\.[^/.]+$/, '');
  
  // 清理文本格式，保持换行符
  const cleanedText = text
    .replace(/\r\n/g, '\n')  // 统一换行符
    .replace(/\r/g, '\n')    // 处理Mac格式
    .replace(/\n{3,}/g, '\n\n')  // 限制连续换行
    .trim();
  
  return {
    title: fileName,
    author: '未知作者',
    content: cleanedText,
    chapters: []
  };
}

export async function parsePdf(file: File): Promise<ParsedBook> {
  const arrayBuffer = await file.arrayBuffer();
  // Load pdf.js via CDN to avoid bundler worker configuration and type issues
  const pdfjsLib: any = await loadPdfJsFromCdn();
  const { getDocument, GlobalWorkerOptions, version } = pdfjsLib;
  const v = version || '3.11.174';
  if (GlobalWorkerOptions) {
    GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.js`;
  }

  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  // 提取文件名作为标题
  const fileName = file.name.replace(/\.[^/.]+$/, '');
  
  // 合并所有页面的文本内容
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((it: any) => ('str' in it ? it.str : '')).filter(Boolean);
    const text = normalizePdfText(strings.join(' '));
    if (fullText) fullText += '\n\n';
    fullText += text;
  }

  // 提取PDF大纲作为目录
  const outlineItems: Array<{ id: string; title: string; page: number }> = [];
  try {
    const outline = await pdf.getOutline?.();
    if (outline && Array.isArray(outline)) {
      const flatten = async (items: any[], acc: Array<{ id: string; title: string; page: number }>) => {
        for (const item of items) {
          const title: string = (item?.title || '').toString().trim();
          let pageNum: number | null = null;
          try {
            const dest = item?.dest || item?.url || null;
            if (dest) {
              const pageRef = Array.isArray(dest) ? dest[0] : (await pdf.getDestination?.(dest))?.[0];
              if (pageRef) {
                const index = await pdf.getPageIndex(pageRef);
                pageNum = index + 1;
              }
            }
          } catch {}
          if (title) {
            acc.push({ id: `pdf-${acc.length + 1}`, title, page: pageNum ?? 1 });
          }
          if (item?.items && item.items.length > 0) {
            await flatten(item.items, acc);
          }
        }
      };
      await flatten(outline, outlineItems);
    }
  } catch {}
  
  return {
    title: fileName,
    author: '未知作者',
    content: fullText,
    chapters: outlineItems
  };
}

export async function parseEpub(file: File): Promise<ParsedBook> {
  // Basic EPUB parsing: extract text from XHTML files
  try {
    console.log('开始解析EPUB文件:', file.name);
    const arrayBuffer = await file.arrayBuffer();
    console.log('文件大小:', arrayBuffer.byteLength, 'bytes');
    
    const zip = await import('jszip');
    console.log('JSZip加载成功');
    const zipFile = await zip.default.loadAsync(arrayBuffer);
    console.log('ZIP文件解压成功');
    
    // List all files in the ZIP for debugging
    const fileNames = Object.keys(zipFile.files);
    console.log('ZIP文件内容:', fileNames);
    
    // Find the main content file (usually in META-INF/container.xml)
    const containerXml = await zipFile.file('META-INF/container.xml')?.async('text');
    if (!containerXml) {
      console.error('未找到META-INF/container.xml文件');
      throw new Error('No container.xml found');
    }
    console.log('找到container.xml');
    
    // Parse container.xml to find the OPF file
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'text/xml');
    const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
    if (!opfPath) {
      console.error('在container.xml中未找到OPF文件路径');
      throw new Error('No OPF file found in container.xml');
    }
    console.log('OPF文件路径:', opfPath);
    
    // Read the OPF file to find content files
    const opfContent = await zipFile.file(opfPath)?.async('text');
    if (!opfContent) {
      console.error('OPF文件未找到:', opfPath);
      throw new Error('OPF file not found');
    }
    console.log('OPF文件内容长度:', opfContent.length);
    
    const opfDoc = parser.parseFromString(opfContent, 'text/xml');
    const manifestItems = opfDoc.querySelectorAll('manifest item');
    console.log('找到manifest项目数量:', manifestItems.length);
    
    // 解析路径基准
    const opfBase = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
    
    // 建立id到href的映射
    const idToHref: Record<string, string> = {};
    const xhtmlIds: Set<string> = new Set();
    let navHrefAbs: string | null = null;
    for (let i = 0; i < manifestItems.length; i++) {
      const item = manifestItems[i] as Element;
      const id = item.getAttribute('id') || '';
      const href = item.getAttribute('href') || '';
      const mediaType = item.getAttribute('media-type') || '';
      if (id && href) {
        idToHref[id] = resolvePath(opfBase, href);
      }
      if (mediaType.includes('xhtml') || mediaType.includes('html')) {
        xhtmlIds.add(id);
      }
      const properties = (item.getAttribute('properties') || '').toLowerCase();
      if (!navHrefAbs && (properties.includes('nav') || href.toLowerCase().includes('nav.xhtml') || href.toLowerCase().includes('toc.xhtml'))) {
        navHrefAbs = resolvePath(opfBase, href);
      }
    }

    // 按spine定义顺序获取内容文件
    const spineItemRefs = opfDoc.querySelectorAll('spine itemref');
    const contentFiles: string[] = [];
    for (let i = 0; i < spineItemRefs.length; i++) {
      const idref = spineItemRefs[i].getAttribute('idref') || '';
      const href = idToHref[idref];
      if (href) contentFiles.push(href);
    }
    // 兜底：如果spine为空，回退到所有xhtml
    if (contentFiles.length === 0) {
      for (const id of Object.keys(idToHref)) {
        if (xhtmlIds.has(id)) contentFiles.push(idToHref[id]);
      }
    }
    // 过滤：不将 nav/toc 文件作为正文内容
    const filteredContentFiles = contentFiles.filter((p) => {
      const low = p.toLowerCase();
      if (navHrefAbs && p === navHrefAbs) return false;
      if (low.endsWith('/nav.xhtml') || low.endsWith('/toc.xhtml') || low.endsWith('nav.xhtml') || low.endsWith('toc.xhtml')) return false;
      if (low.includes('/toc/') || low.includes('/nav/')) return false;
      return true;
    });
    
    console.log('找到内容文件:', filteredContentFiles);
    
    // Extract text from each content file and build chapters
    let fullText = '';
    let chapters: Array<{ id: string; title: string; page: number }> = [];
    let currentPage = 1;
    const contentIndex: Array<{ path: string; page: number; title: string }> = [];
    const fileIndex: Array<{ path: string; start: number; end: number; headingStart?: number }> = [];
    const anchorIndex: Array<{ path: string; id: string; offset: number }> = [];
    
    for (const contentFile of filteredContentFiles) {
      try {
        console.log('正在处理内容文件:', contentFile);
        
        let content = await tryReadZipText(zipFile, contentFile);
        
        if (content) {
          console.log('文件内容长度:', content.length);
          const contentDoc = parser.parseFromString(content, 'text/xml');
          const { text: textContent, anchors, headingOffsets } = extractTextAndAnchors(contentDoc);
          console.log('提取的文本长度:', textContent.length);
          
          if (textContent.trim()) {
            // Try to extract chapter title from the content
            let chapterTitle = '';
            const titleMatch = textContent.match(/^(.{1,50})/);
            if (titleMatch) {
              chapterTitle = titleMatch[1].trim();
              // Clean up chapter title
              chapterTitle = chapterTitle.replace(/[^\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\w\s]/g, '').trim();
              if (chapterTitle.length > 30) {
                chapterTitle = chapterTitle.substring(0, 30) + '...';
              }
            }
            
            // If no meaningful title, use filename
            if (!chapterTitle || chapterTitle.length < 3) {
              const fileName = contentFile.split('/').pop()?.replace('.xhtml', '') || contentFile;
              chapterTitle = fileName;
            }
            
            // Add chapter info (未知精确页码，置0，避免误跳页)
            chapters.push({ id: contentFile, title: chapterTitle, page: 0 });
            contentIndex.push({ path: contentFile, page: currentPage, title: chapterTitle });
            
            // Add to full text
            const sep = fullText ? '\n\n' : '';
            const startOffset = fullText.length + sep.length;
            fullText += sep + textContent;
            const endOffset = startOffset + textContent.length;
            const headingLocal = Array.isArray(headingOffsets) && headingOffsets.length > 0
              ? Math.max(0, headingOffsets[0])
              : 0;
            const headingStart = startOffset + headingLocal;
            fileIndex.push({ path: contentFile, start: startOffset, end: endOffset, headingStart });
            // 记录锚点（元素 id）全局偏移
            if (anchors && anchors.length > 0) {
              for (const a of anchors) {
                if (!a.id) continue;
                const globalOffset = startOffset + Math.max(0, a.offset);
                anchorIndex.push({ path: contentFile, id: a.id, offset: globalOffset });
              }
            }
            currentPage++;
            
            console.log('成功添加内容，当前章节数:', chapters.length);
          }
        } else {
          console.warn('无法读取文件内容:', contentFile);
          // Try to find the file in the ZIP
          const allFiles = Object.keys(zipFile.files);
          const possibleMatches = allFiles.filter(f => 
            f.includes(contentFile.split('/').pop() || '') || 
            f.endsWith(contentFile) ||
            f.includes(contentFile.replace('xhtml/', ''))
          );
          console.log('可能的匹配文件:', possibleMatches);
        }
      } catch (e) {
        console.warn(`Failed to parse content file ${contentFile}:`, e);
      }
    }
    
    console.log('最终文本长度:', fullText.length);
    console.log('章节信息(初步):', chapters);

    // 从NAV或NCX提取更准确的目录
    try {
      // nav
      const navItem = Array.from(manifestItems).find((el) => {
        const props = (el.getAttribute('properties') || '').toLowerCase();
        const mediaType = (el.getAttribute('media-type') || '').toLowerCase();
        return props.includes('nav') || mediaType.includes('nav');
      }) as Element | undefined;
      if (navItem) {
        const navPath = resolvePath(opfBase, navItem.getAttribute('href') || '');
        const navContent = await tryReadZipText(zipFile, navPath);
        if (navContent) {
          const navDoc = parser.parseFromString(navContent, 'text/xml');
          const navChapters = extractTocFromNavDoc(navDoc);
          if (navChapters.length > 0) {
            // 采用nav目录的标题与href作为章节源（页码交给阅读器标题/偏移定位）
            const navBase = navPath.includes('/') ? navPath.slice(0, navPath.lastIndexOf('/') + 1) : '';
            const mapped = navChapters.map((t, idx) => {
              const hrefVal = t.href || '';
              const hrefBase = hrefVal.split('#')[0] || '';
              const anchorId = (hrefVal.includes('#') ? hrefVal.split('#')[1] : '').trim();
              const abs = hrefBase ? resolvePath(navBase, hrefBase.trim()) : undefined;
              return { id: `nav-${idx + 1}`, title: t.title, page: 0, href: hrefVal, absPath: abs, anchorId };
            });
            chapters = mapped;
          }
        }
      } else {
        // ncx
        const ncxItem = Array.from(manifestItems).find((el) => {
          const mediaType = (el.getAttribute('media-type') || '').toLowerCase();
          const href = (el.getAttribute('href') || '').toLowerCase();
          return mediaType.includes('ncx') || href.endsWith('.ncx');
        }) as Element | undefined;
        if (ncxItem) {
          const ncxPath = resolvePath(opfBase, ncxItem.getAttribute('href') || '');
          const ncxContent = await tryReadZipText(zipFile, ncxPath);
          if (ncxContent) {
            const ncxDoc = parser.parseFromString(ncxContent, 'text/xml');
            const ncxChapters = extractTocFromNcxDoc(ncxDoc);
            if (ncxChapters.length > 0) {
              const ncxBase = ncxPath.includes('/') ? ncxPath.slice(0, ncxPath.lastIndexOf('/') + 1) : '';
              const mapped = ncxChapters.map((t, idx) => {
                const hrefVal = t.href || '';
                const hrefBase = hrefVal.split('#')[0] || '';
                const anchorId = (hrefVal.includes('#') ? hrefVal.split('#')[1] : '').trim();
                const abs = hrefBase ? resolvePath(ncxBase, hrefBase.trim()) : undefined;
                return { id: `ncx-${idx + 1}`, title: t.title, page: 0, href: hrefVal, absPath: abs, anchorId };
              });
              chapters = mapped;
            }
          }
        }
      }
    } catch {}
    
    // If no content extracted, return a fallback
    if (!fullText.trim()) {
      console.error('没有提取到任何内容');
      return { 
        title: file.name.replace(/\.[^/.]+$/, ''),
        author: '未知作者',
        content: 'EPUB文件解析失败，请尝试转换为PDF或TXT格式', 
        chapters: [] 
      };
    }
    
    return { 
      title: file.name.replace(/\.[^/.]+$/, ''),
      author: '未知作者',
      content: fullText, 
      chapters,
      fileIndex,
      anchorIndex
    };
  } catch (error) {
    console.error('EPUB parsing failed:', error);
    return { 
      title: file.name.replace(/\.[^/.]+$/, ''),
      author: '未知作者',
      content: 'EPUB文件解析失败，请尝试转换为PDF或TXT格式', 
      chapters: [] 
    };
  }
}

export async function parseBookByType(file: File, type: 'pdf' | 'epub' | 'txt' | 'mobi'): Promise<ParsedBook> {
  if (type === 'txt') return parseTxt(file);
  if (type === 'pdf') return parsePdf(file);
  if (type === 'epub') return parseEpub(file);
  // MOBI not supported in-browser; recommend conversion to EPUB/PDF/TXT
  return { 
    title: file.name.replace(/\.[^/.]+$/, ''),
    author: '未知作者',
    content: 'MOBI格式不支持（浏览器环境）。建议先将MOBI转换为EPUB或PDF以获得目录支持。',
    chapters: []
  };
}

function chunkString(input: string, size: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < input.length; i += size) {
    result.push(input.slice(i, i + size));
  }
  return result;
}

function normalizePdfText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s([\.,;:!\?])/g, '$1')
    .trim();
}

// Chunk a paragraph by preserving line breaks and wrapping by lines around target size
function chunkByLines(paragraph: string, target: number, hardMax: number): string[] {
  const lines = paragraph.split('\n');
  const chunks: string[] = [];
  let buf = '';
  const flush = () => {
    if (buf.trim().length > 0) {
      chunks.push(buf.trim());
      buf = '';
    }
  };
  for (const line of lines) {
    const candidate = buf.length === 0 ? line : buf + '\n' + line;
    if (candidate.length <= target) {
      buf = candidate;
    } else if (candidate.length <= hardMax && buf.length < target) {
      buf = candidate;
      flush();
    } else {
      flush();
      buf = line;
      if (buf.length > hardMax) {
        // line itself too long, hard split without breaking characters badly
        const parts = chunkString(buf, target);
        chunks.push(...parts.slice(0, parts.length - 1));
        buf = parts[parts.length - 1] || '';
      }
    }
  }
  flush();
  return chunks;
}

async function loadPdfJsFromCdn(): Promise<any> {
  const w = window as unknown as { pdfjsLib?: any };
  if (w.pdfjsLib) return w.pdfjsLib;
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  if (!w.pdfjsLib) {
    throw new Error('Failed to load pdf.js from CDN');
  }
  return w.pdfjsLib;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.setAttribute('data-pdfjs-loader', 'true'); // 添加标识
    
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      // 不立即清理，让脚本保留在DOM中
      resolve();
    };
    script.onerror = () => {
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
}

// Extract text content from XHTML document
function extractTextFromXhtml(doc: Document): string {
  // Remove script and style elements
  const scripts = doc.querySelectorAll('script, style, nav, header, footer');
  scripts.forEach(el => el.remove());
  
  // Function to extract text while preserving structure
  function extractTextWithStructure(element: Element): string {
    let result = '';
    
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes[i];
      
      if (node.nodeType === Node.TEXT_NODE) {
        // Text node - add the text
        const text = node.textContent || '';
        result += text;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        
        // Add line breaks for block elements
        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'li'].includes(tagName)) {
          if (result && !result.endsWith('\n')) {
            result += '\n';
          }
        }
        
        // Recursively process child elements
        result += extractTextWithStructure(element);
        
        // Add line breaks after block elements
        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'li'].includes(tagName)) {
          if (!result.endsWith('\n')) {
            result += '\n';
          }
        }
      }
    }
    
    return result;
  }
  
  // Try to get text from body first
  let text = '';
  if (doc.body) {
    text = extractTextWithStructure(doc.body);
  }
  
  // If no body or empty body, try document
  if (!text || text.trim().length === 0) {
    text = extractTextWithStructure(doc.documentElement);
  }
  
  // Clean up whitespace but preserve line breaks
  text = text
    .replace(/[ \t]+/g, ' ')  // Replace multiple spaces/tabs with single space
    .replace(/\n[ \t]+/g, '\n')  // Remove spaces at start of lines
    .replace(/[ \t]+\n/g, '\n')  // Remove spaces at end of lines
    .replace(/\n{3,}/g, '\n\n')  // Replace multiple newlines with double newline
    .trim();
  
  console.log('提取的原始文本长度:', text.length);
  console.log('提取的文本前200字符:', text.substring(0, 200));
  
  return text;
}

// 同时提取文本与各元素 id 在文档中的偏移
function extractTextAndAnchors(doc: Document): { text: string; anchors: Array<{ id: string; offset: number }>, headingOffsets: number[] } {
  const scripts = doc.querySelectorAll('script, style, nav, header, footer');
  scripts.forEach(el => el.remove());
  const anchors: Array<{ id: string; offset: number }> = [];
  const headingOffsets: number[] = [];
  let buffer = '';

  function append(text: string) {
    buffer += text;
  }

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      append(node.textContent || '');
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      // block start
      if (['p','div','h1','h2','h3','h4','h5','h6','li','br'].includes(tag)) {
        if (buffer && !buffer.endsWith('\n')) append('\n');
      }
      // record id anchor offset
      const id = el.getAttribute('id') || '';
      if (id) {
        anchors.push({ id, offset: buffer.length });
      }
      // record heading offsets (prefer章首): h1/h2/h3 开头位置
      if (['h1','h2','h3'].includes(tag)) {
        headingOffsets.push(buffer.length);
      }
      // recurse
      for (let i = 0; i < el.childNodes.length; i++) walk(el.childNodes[i]);
      // block end
      if (['p','div','h1','h2','h3','h4','h5','h6','li','br'].includes(tag)) {
        if (!buffer.endsWith('\n')) append('\n');
      }
      return;
    }
  }

  const root = doc.body || doc.documentElement;
  if (root) walk(root);

  let text = buffer
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  console.log('提取的原始文本长度:', text.length);
  console.log('提取的文本前200字符:', text.substring(0, 200));

  return { text, anchors, headingOffsets };
}

type TocItem = { title: string; href?: string };

// 解析EPUB导航文档(nav.xhtml)中的目录
function extractTocFromNavDoc(doc: Document): TocItem[] {
  const results: TocItem[] = [];
  // 寻找 epub:type="toc" 或者 role="doc-toc" 的<nav>
  const navs = doc.querySelectorAll('nav');
  let tocNav: Element | null = null;
  for (const nav of Array.from(navs)) {
    const epubType = (nav.getAttribute('epub:type') || '').toLowerCase();
    const role = (nav.getAttribute('role') || '').toLowerCase();
    if (epubType.includes('toc') || role.includes('doc-toc') || role.includes('toc')) {
      tocNav = nav;
      break;
    }
  }
  const root = tocNav || (doc.querySelector('nav') as Element | null);
  if (!root) return results;
  const links = root.querySelectorAll('a');
  for (const a of Array.from(links)) {
    const title = (a.textContent || '').trim();
    const href = a.getAttribute('href') || undefined;
    if (title) results.push({ title, href });
  }
  return results;
}

// 解析NCX文档中的目录
function extractTocFromNcxDoc(doc: Document): TocItem[] {
  const results: TocItem[] = [];
  const navPoints = doc.getElementsByTagName('navPoint');
  for (let i = 0; i < navPoints.length; i += 1) {
    const navPoint = navPoints[i];
    const navLabels = navPoint.getElementsByTagName('navLabel');
    const contentEls = navPoint.getElementsByTagName('content');
    if (navLabels.length > 0) {
      const textEls = navLabels[0].getElementsByTagName('text');
      if (textEls.length > 0) {
        const title = (textEls[0].textContent || '').trim();
        const href = contentEls.length > 0 ? (contentEls[0].getAttribute('src') || undefined) : undefined;
        if (title) results.push({ title, href });
      }
    }
  }
  return results;
}

function resolvePath(base: string, relative: string): string {
  if (!relative) return relative;
  if (relative.startsWith('/')) return relative.slice(1);
  if (!base) return relative;
  // Normalize ../ and ./
  const baseParts = base.split('/').filter(Boolean);
  const relParts = relative.split('/');
  for (const part of relParts) {
    if (part === '.' || part === '') continue;
    if (part === '..') baseParts.pop();
    else baseParts.push(part);
  }
  return baseParts.join('/');
}

// 在ZIP中尽可能鲁棒地读取文本内容（尝试多种路径变体与文件名匹配）
async function tryReadZipText(zipFile: any, path: string): Promise<string | null> {
  if (!path) return null;
  const candidates: string[] = [];
  const normalized = path.replace(/\\/g, '/');
  candidates.push(normalized);
  if (!normalized.startsWith('/')) candidates.push('/' + normalized);
  candidates.push(normalized.replace(/^\/+/, ''));
  // 去掉基准目录重试
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length > 1) {
    candidates.push(parts.slice(parts.length - 2).join('/'));
    candidates.push(parts[parts.length - 1]);
  }
  for (const p of candidates) {
    try {
      const file = zipFile.file(p);
      if (file) {
        const text = await file.async('text');
        if (typeof text === 'string' && text.length >= 0) return text;
      }
    } catch {}
  }
  // 最后兜底：通过文件名匹配
  try {
    const keys = Object.keys(zipFile.files || {});
    const base = normalized.split('/').pop() || normalized;
    const match = keys.find(k => k.endsWith('/' + base) || k === base || k.includes('/' + base));
    if (match) {
      const text = await zipFile.file(match)?.async('text');
      if (typeof text === 'string' && text.length >= 0) return text;
    }
  } catch {}
  return null;
}
