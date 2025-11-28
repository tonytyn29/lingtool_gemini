import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Layout, 
  Button, 
  Typography, 
  Space, 
  Input, 
  Card, 
  List, 
  Tag,
  Modal,
  Form,
  message,
  Progress,
  Drawer,
  Slider,
  Select
} from 'antd';
import { 
  LeftOutlined, 
  RightOutlined, 
  SearchOutlined,
  HighlightOutlined,
  TranslationOutlined,
  QuestionCircleOutlined,
  MenuOutlined,
  BookOutlined,
  SettingOutlined,
  HistoryOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore, Book, ReadingNote } from '../stores/bookStore';
import { useAuthStore } from '../stores/authStore';
import aiService from '../utils/aiService';
import { addFuriganaInlineLocal } from '../utils/japanese';
import { ENV_CONFIG } from '../config/environment';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const BookReaderPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedText, setSelectedText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [translationMode, setTranslationMode] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteType, setNoteType] = useState<'highlight' | 'translation' | 'query' | 'learning'>('highlight');
  const [noteText, setNoteText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('toc');
  const [form] = Form.useForm();
  const [translatedPage, setTranslatedPage] = useState<string>('');
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [pageHeight, setPageHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [immersiveMode, setImmersiveMode] = useState(false);
  // 单页模式：取消分页
  const [dynamicPages, setDynamicPages] = useState<string[]>([]);
  const [dynamicTotalPages, setDynamicTotalPages] = useState(0);
  const [dynamicPageOffsets, setDynamicPageOffsets] = useState<number[]>([]);
  const [chapterBoundarySet, setChapterBoundarySet] = useState<Set<number>>(new Set());
  const [isMounted, setIsMounted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [loadedLineCount, setLoadedLineCount] = useState<number>(0);
  const [actualLineCount, setActualLineCount] = useState<number>(0);
  const [navDebugOpen, setNavDebugOpen] = useState(false);
  const [navDebug, setNavDebug] = useState<any>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 }); // viewport coords
  const [selectionBox, setSelectionBox] = useState<{ left: number; top: number; right: number; bottom: number; width: number; height: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const translationRef = useRef<HTMLDivElement>(null);
  const [translationVisible, setTranslationVisible] = useState(false);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationText, setTranslationText] = useState('');
  const [translationPos, setTranslationPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [furiganaLoading, setFuriganaLoading] = useState(false);
  const [furiganaDebugOpen, setFuriganaDebugOpen] = useState(false);
  const [furiganaDebug, setFuriganaDebug] = useState<any>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const debug = ENV_CONFIG.DEBUG;
  const contentRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);
  const readerRef = useRef<HTMLDivElement>(null);

  const { getBook, updateReadingProgress, addReadingNote, updateBook, getParagraphs, initParagraphsForBook, saveParagraphTranslationsMulti, persistParagraphs } = useBookStore();
  const { user } = useAuthStore();
  const book = bookId ? getBook(bookId) : null;
  const paragraphs = bookId ? getParagraphs(bookId) : [];
  const [batchTranslating, setBatchTranslating] = useState(false);
  const [translateDebugOpen, setTranslateDebugOpen] = useState(false);
  const [translateLogs, setTranslateLogs] = useState<string[]>([]);
  const [translateProgress, setTranslateProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  const pushTranslateLog = useCallback((line: string) => {
    setTranslateLogs((prev) => {
      const next = [...prev, line];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  // 单页模式：整本书全文
  const fullText = (book?.content && book.content.trim())
    ? book.content
    : ((Array.isArray(book?.contentPages) && (book?.contentPages?.length || 0) > 0)
      ? (book!.contentPages!.join('\n\n'))
      : '');

  // 初始化段落结构
  useEffect(() => {
    try {
      if (book && fullText && (!paragraphs || paragraphs.length === 0)) {
        initParagraphsForBook(book.id, fullText, book.languageCode);
      }
    } catch {}
  }, [book?.id, fullText]);


  // 定义翻页函数
  const handlePageChange = useCallback((direction: 'prev' | 'next') => {
    if (!book) return;
    
    const totalPages = dynamicTotalPages || book.totalPages || 1;
    console.log('handlePageChange called:', { direction, currentPage, totalPages, dynamicTotalPages });
    
    if (direction === 'prev' && currentPage > 1) {
      const newPage = currentPage - 1;
      console.log('Going to previous page:', newPage);
      setCurrentPage(newPage);
      updateReadingProgress(book.id, newPage);
    } else if (direction === 'next' && currentPage < totalPages) {
      const newPage = currentPage + 1;
      console.log('Going to next page:', newPage);
      setCurrentPage(newPage);
      updateReadingProgress(book.id, newPage);
    } else {
      console.log('Page change blocked:', { direction, currentPage, totalPages });
    }
  }, [book, currentPage, dynamicTotalPages, updateReadingProgress]);

  useEffect(() => {
    setIsMounted(true);
    setHasError(false);
    return () => setIsMounted(false);
  }, []);

  // 简化的错误处理
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.warn('捕获到错误:', event.message);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  useEffect(() => {
    if (book) {
      setCurrentPage(book.currentPage || 1);
    }
  }, [book]);

  // 计算页面高度和内容高度
  const calculatePageHeight = useCallback(() => {
    try {
      const bottomBarHeight = immersiveMode ? 0 : 48;
      const topOffset = contentRef.current
        ? contentRef.current.getBoundingClientRect().top
        : (readerRef.current ? readerRef.current.getBoundingClientRect().top : 0);
      const newPageHeight = Math.max(0, Math.floor(window.innerHeight - topOffset - bottomBarHeight));
      setPageHeight(newPageHeight);
      if (contentRef.current) {
        const contentRect = contentRef.current.getBoundingClientRect();
        setContentHeight(contentRect.height);
      }
    } catch {}
  }, [immersiveMode]);

  // 简化的分页逻辑，确保快速加载和显示
  const calculatePageContent = useCallback((content: string, pageHeight: number, fontSize: number, lineHeight: number, chapterBoundaries?: number[]) => {
    if (!content) {
      console.log('⚠️ 分页计算跳过 - 没有内容');
      return { pages: [''], totalPages: 1 };
    }
    
    // 如果pageHeight为0，使用默认值
    const effectivePageHeight = pageHeight > 0 ? pageHeight : 600;
    console.log('📏 分页计算参数:', { 
      contentLength: content.length, 
      pageHeight: effectivePageHeight, 
      fontSize, 
      lineHeight 
    });
    
    console.log('🔍 开始简化分页计算:', {
      contentLength: content.length,
      pageHeight: effectivePageHeight,
      fontSize,
      lineHeight
    });
    
    try {
      // 计算每页固定行数 - 保守估计
      const actualLineHeight = fontSize * lineHeight;
      const maxLinesPerPage = Math.max(10, Math.floor(effectivePageHeight / actualLineHeight) - 3); // 至少10行，减去3行安全边距
      
      console.log(`📏 每页最大行数: ${maxLinesPerPage}`);
      
      // 将内容按段落分割
      const paragraphs = content.split('\n\n').filter(p => p.trim());
      console.log(`📄 总段落数: ${paragraphs.length}`);
      
      const pages: string[] = [];
      const pageStartOffsets: number[] = [];
      let currentPageContent = '';
      let currentLines = 0;
      // 章节边界（字符偏移）用于“硬分页”：当到达下一章节的开头时，立即换页
      const boundaries = Array.isArray(chapterBoundaries)
        ? [...chapterBoundaries].filter(v => typeof v === 'number' && v > 0).sort((a, b) => a - b)
        : [];
      let boundaryIdx = 0;
      // 累计我们已纳入页面的字符数量（必须与 paragraphs 重建方式一致：段落间以"\n\n"连接）
      let processedChars = 0; // 已经输出到 pages 的字符
      let currentPageChars = 0; // 当前页中的字符（包括分隔符）
      let currentPageStartOffset = 0; // 当前页在全文中的起始偏移
      
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        if (!paragraph.trim()) continue;
        
        // 计算段落行数（简单估算）
        const paragraphLines = paragraph.split('\n').length;
        const paragraphSep = currentPageContent ? '\n\n' : '';
        const testContent = currentPageContent + paragraphSep + paragraph;
        const testLines = currentLines + paragraphLines + (currentPageContent ? 1 : 0); // +1 for paragraph spacing
        const addChars = paragraphSep.length + paragraph.length;
        const currentGlobalOffset = processedChars + currentPageChars;
        const candidateEndOffset = currentGlobalOffset + addChars;
        // 在添加段落前，若正好位于章节边界，则先换页
        while (boundaryIdx < boundaries.length && currentGlobalOffset >= boundaries[boundaryIdx]) {
          if (currentPageContent) {
            pages.push(currentPageContent);
            pageStartOffsets.push(currentPageStartOffset);
            console.log(`📑 因章节边界提前分页（边界=${boundaries[boundaryIdx]}）`);
            processedChars += currentPageChars;
            currentPageContent = '';
            currentPageChars = 0;
            currentLines = 0;
            currentPageStartOffset = processedChars;
          }
          boundaryIdx++;
        }
        // 如果本次添加会跨越章节边界，则先换页，再重新评估本段
        if (boundaryIdx < boundaries.length && currentGlobalOffset < boundaries[boundaryIdx] && candidateEndOffset > boundaries[boundaryIdx]) {
          if (currentPageContent) {
            pages.push(currentPageContent);
            pageStartOffsets.push(currentPageStartOffset);
            console.log(`📑 因跨越章节边界提前分页（边界=${boundaries[boundaryIdx]}）`);
            processedChars += currentPageChars;
            currentPageContent = '';
            currentPageChars = 0;
            currentLines = 0;
            currentPageStartOffset = processedChars;
          }
          // 边界已对齐到页首，继续按本段落处理（不增加 i）
        }
        
        if (testLines <= maxLinesPerPage) {
          // 可以添加到当前页
          currentPageContent = testContent;
          currentLines = testLines;
          currentPageChars += addChars;
          console.log(`✅ 段落 ${i + 1} 添加到当前页，当前行数: ${currentLines}`);
        } else {
          // 当前页已满，保存当前页并开始新页
          if (currentPageContent) {
            pages.push(currentPageContent);
            pageStartOffsets.push(currentPageStartOffset);
            console.log(`📄 完成第 ${pages.length} 页，行数: ${currentLines}`);
            processedChars += currentPageChars;
          }
          
          // 检查段落是否太长
          if (paragraphLines > maxLinesPerPage) {
            console.log(`⚠️ 段落 ${i + 1} 太长，按行分割`);
            // 按行分割长段落
            const lines = paragraph.split('\n');
            let currentPageLines: string[] = [];
            
            for (const line of lines) {
              if (currentPageLines.length >= maxLinesPerPage) {
                pages.push(currentPageLines.join('\n'));
                processedChars += currentPageLines.join('\n').length + (currentPageContent ? 0 : 0); // 近似：不插入额外段落间空行
                currentPageLines = [line];
              } else {
                currentPageLines.push(line);
              }
            }
            
            if (currentPageLines.length > 0) {
              currentPageContent = currentPageLines.join('\n');
              currentLines = currentPageLines.length;
              currentPageChars = currentPageContent.length;
            } else {
              currentPageContent = paragraph;
              currentLines = paragraphLines;
              currentPageChars = paragraph.length;
            }
          } else {
            currentPageContent = paragraph;
            currentLines = paragraphLines;
            currentPageChars = paragraph.length;
          }
          
          console.log(`🆕 开始新页，段落 ${i + 1}，行数: ${currentLines}`);
          currentPageStartOffset = processedChars; // 新页的全局起点
        }
      }
      
      // 添加最后一页
      if (currentPageContent) {
        pages.push(currentPageContent);
        pageStartOffsets.push(currentPageStartOffset);
        console.log(`📄 完成最后一页，行数: ${currentLines}`);
        processedChars += currentPageChars;
      }
      
      console.log(`📚 简化分页完成 - 总页数: ${pages.length}`);
      
      return {
        pages,
        totalPages: pages.length,
        pageStartOffsets
      };
    } catch (error) {
      console.error('❌ 分页计算失败:', error);
      // 返回简单分页作为后备
      return { pages: [content], totalPages: 1 };
    }
  }, []);

  // 监听窗口大小变化
  useEffect(() => {
    calculatePageHeight();
    window.addEventListener('resize', calculatePageHeight);
    return () => window.removeEventListener('resize', calculatePageHeight);
  }, [calculatePageHeight]);

  // 全局点击收起自定义菜单
  useEffect(() => {
    const close = (ev: MouseEvent) => {
      if (!contentRef.current) return;
      if (!contentRef.current.contains(ev.target as Node)) {
        setContextMenuVisible(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // 动态计算页面内容
  useEffect(() => {
    if (isMounted && book) {
      console.log('🔄 开始计算页面内容...', {
        hasContent: !!book.content,
        contentLength: book.content?.length || 0,
        pageHeight,
        isCalculating
      });
      
      // 如果没有内容，尝试从contentPages获取
      let contentToUse = book.content;
      if (!contentToUse && book.contentPages && book.contentPages.length > 0) {
        contentToUse = book.contentPages.join('\n\n');
        console.log('📄 使用contentPages作为内容源，长度:', contentToUse.length);
      }
      
      if (contentToUse && contentToUse.trim()) {
        setIsCalculating(true);
        
        try {
          // 如果pageHeight为0，使用默认值进行计算
          const effectivePageHeight = pageHeight > 0 ? pageHeight : 600;
          console.log('📏 使用页面高度:', effectivePageHeight);
          
          // 基于章节边界：把每个章节的标题在全文中的第一次出现作为硬分页边界
          let chapterBoundaries: number[] | undefined = undefined;
          try {
            const chapters = book.chapters || [];
            if (chapters.length > 0) {
              const lc = contentToUse.toLowerCase();
              const bounds: number[] = [];
              const seen = new Set<number>();
              const tokenize = (s: string) => s.toLowerCase().split(/[^a-zA-Z0-9\u4e00-\u9fa5]+/).filter(x => x && x.length >= 2);
              const extractPrimary = (title: string) => {
                const hyphen = title.indexOf('-');
                if (hyphen !== -1) return title.slice(hyphen + 1).trim();
                return title.replace(/^chapter\s+[\wivx]+\s*[:\-]?\s*/i, '').trim();
              };
              const pushBound = (off: number) => {
                if (typeof off === 'number' && off > 0 && !seen.has(off)) { bounds.push(off); seen.add(off); }
              };
              // 1) 锚点优先
              if (Array.isArray(book.anchorIndex) && book.anchorIndex.length > 0) {
                for (const ch of chapters as any[]) {
                  if (ch?.anchorId) {
                    const e = (book.anchorIndex as any[]).find((x: any) => x.id === ch.anchorId && (x.path === ch.absPath || (ch.absPath && ch.absPath.endsWith('/' + (x.path.split('/').pop() || '')))));
                    if (e) pushBound(e.offset);
                  }
                }
              }
              // 2) 文件起点与 headingStart（若存在则优先章标题起点）
              if (Array.isArray(book.fileIndex) && book.fileIndex.length > 0) {
                for (const fi of book.fileIndex) {
                  if (typeof (fi as any).headingStart === 'number' && (fi as any).headingStart > 0) {
                    pushBound((fi as any).headingStart as number);
                  } else {
                    pushBound(fi.start);
                  }
                }
              }
              // 3) 无锚点时，在对应文件局部窗口匹配标题/主关键词，推近章首
              for (const ch of chapters as any[]) {
                const title = (ch?.chapterTitle || '').toString();
                const absPath = ch?.absPath || '';
                let baseStart = -1;
                if (Array.isArray(book.fileIndex) && absPath) {
                  const fi = book.fileIndex.find(x => x.path === absPath || absPath.endsWith('/' + (x.path.split('/').pop() || '')));
                  baseStart = fi ? fi.start : -1;
                }
                if (baseStart >= 0) {
                  const windowText = lc.slice(baseStart, Math.min(lc.length, baseStart + 4000));
                  const fullTitle = title.toLowerCase();
                  const primary = extractPrimary(title).toLowerCase();
                  let local = -1;
                  if (fullTitle) local = windowText.indexOf(fullTitle);
                  if (local < 0 && primary) local = windowText.indexOf(primary);
                  if (local < 0) {
                    const toks = tokenize(title);
                    let firstPos = -1;
                    for (const tk of toks) {
                      const p = windowText.indexOf(tk);
                      if (p >= 0) firstPos = firstPos === -1 ? p : Math.min(firstPos, p);
                    }
                    if (firstPos >= 0) local = firstPos;
                  }
                  if (local >= 0) pushBound(baseStart + local);
                }
              }
              chapterBoundaries = bounds.sort((a, b) => a - b);
              console.log('📌 章节边界（字符偏移）:', chapterBoundaries.slice(0, 30));
            }
          } catch {}

          const result = calculatePageContent(contentToUse, effectivePageHeight, fontSize, lineHeight, chapterBoundaries);
          setDynamicPages(result.pages);
          setDynamicTotalPages(result.totalPages);
          setDynamicPageOffsets(result.pageStartOffsets || []);
          setChapterBoundarySet(new Set(chapterBoundaries || []));
          setHasError(false);
          console.log('✅ 页面内容计算完成:', { 
            totalPages: result.totalPages, 
            pageHeight: effectivePageHeight, 
            fontSize, 
            lineHeight,
            firstPagePreview: result.pages[0]?.substring(0, 100) + '...'
          });
        } catch (error) {
          console.error('❌ 页面内容计算失败:', error);
          setHasError(true);
          // 设置默认内容
          setDynamicPages([contentToUse]);
          setDynamicTotalPages(1);
        } finally {
          setIsCalculating(false);
        }
      } else {
        console.warn('⚠️ 没有可用的内容进行分页计算');
        setHasError(true);
        setDynamicPages([]);
        setDynamicTotalPages(0);
      }
    }
  }, [isMounted, book, pageHeight, fontSize, lineHeight, calculatePageContent]);

  // 切换页时，将内容容器滚动到顶部并获取焦点，避免页面聚焦在目录项
  useEffect(() => {
    if (contentRef.current) {
      try {
        contentRef.current.scrollTop = 0;
        contentRef.current.focus();
      } catch {}
    }
  }, [currentPage]);

  // 抽屉关闭后，聚焦阅读区域
  useEffect(() => {
    if (!drawerVisible && contentRef.current) {
      try { contentRef.current.focus(); } catch {}
    }
  }, [drawerVisible]);

  // 单页模式：统计可选的行数信息（基于全文）
  useEffect(() => {
    try {
      const linesLoaded = fullText ? fullText.split('\n').length : 0;
      setLoadedLineCount(linesLoaded);
      const linePx = fontSize * lineHeight;
      const scrollHeight = textRef.current ? textRef.current.scrollHeight : 0;
      const linesActual = linePx > 0 ? Math.max(0, Math.round(scrollHeight / linePx)) : 0;
      setActualLineCount(linesActual);
      if (debug) {
        console.log('[Lines] loaded (single page):', linesLoaded, 'actual:', linesActual, { scrollHeight, linePx });
      }
    } catch {}
  }, [fullText, fontSize, lineHeight, debug]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      console.log('Key pressed:', e.key, 'Target:', e.target);
      
      // 避免在输入框、按钮等交互元素中触发
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') {
        console.log('Key press ignored - in input element');
        return;
      }
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          console.log('Previous page key pressed');
          e.preventDefault();
          handlePageChange('prev');
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          console.log('Next page key pressed');
          e.preventDefault();
          handlePageChange('next');
          break;
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            navigate('/bookshelf');
          }
          break;
        case 'f':
        case 'F':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setIsFullscreen(!isFullscreen);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, navigate, handlePageChange]);

  // 鼠标滚轮事件处理
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // 检查是否在阅读区域内
      const target = e.target as HTMLElement;
      if (!contentRef.current || !contentRef.current.contains(target)) return;
      // 允许容器自身滚动，不进行翻页拦截
      return;
    };

    // 在整个文档上监听滚轮事件
    document.addEventListener('wheel', handleWheel, { passive: true });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [handlePageChange]);

  // 打开自定义选择菜单（坐标为viewport坐标）
  const computeMenuPosition = (box: { left: number; top: number; right: number; bottom: number; width: number; height: number }) => {
    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuWidth = menuRef.current?.offsetWidth || 280;
    const menuHeight = menuRef.current?.offsetHeight || 40;
    const preferredBelow = (vh - box.bottom) >= (menuHeight + margin);
    // place below if space, otherwise above
    let top = preferredBelow ? (box.bottom + margin) : (box.top - margin - menuHeight);
    // center to selection horizontally
    let left = box.left + box.width / 2 - menuWidth / 2;
    // clamp within viewport
    left = Math.max(margin, Math.min(left, vw - margin - menuWidth));
    top = Math.max(margin, Math.min(top, vh - margin - menuHeight));
    setContextMenuPos({ left, top });
  };

  const openSelectionMenuAt = (clientX: number, clientY: number) => {
    // If we have a selection box, use it; otherwise synthesize a small box around the point
    const box = selectionBox || { left: clientX - 1, top: clientY - 1, right: clientX + 1, bottom: clientY + 1, width: 2, height: 2 };
    computeMenuPosition(box);
    setContextMenuVisible(true);
  };

  const closeSelectionMenu = () => setContextMenuVisible(false);

  // 在选择文本后自动弹出菜单（桌面端常用）
  useEffect(() => {
    if (!selectedText || !selectedText.trim()) return;
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const r = range.getBoundingClientRect();
        if (r && r.width >= 0 && r.height >= 0) {
          const box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
          setSelectionBox(box);
          computeMenuPosition(box);
          setContextMenuVisible(true);
        }
      }
    } catch {}
    // 不自动关闭，以便用户点选操作
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedText]);

  // 当滚动或窗口大小变化时，若菜单可见则根据当前 selection 重新定位
  useEffect(() => {
    if (!contextMenuVisible && !translationVisible) return;
    const reposition = () => {
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const r = sel.getRangeAt(0).getBoundingClientRect();
          const box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
          setSelectionBox(box);
          computeMenuPosition(box);
          if (translationVisible) {
            // 同步翻译浮层位置
            const margin = 8;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const overlayWidth = translationRef.current?.offsetWidth || 300;
            const overlayHeight = translationRef.current?.offsetHeight || 120;
            const preferredBelow = (vh - box.bottom) >= (overlayHeight + 2 * margin);
            let top = preferredBelow ? (box.bottom + margin) : (box.top - margin - overlayHeight);
            let left = box.left + box.width / 2 - overlayWidth / 2;
            left = Math.max(margin, Math.min(left, vw - overlayWidth - margin));
            top = Math.max(margin, Math.min(top, vh - overlayHeight - margin));
            setTranslationPos({ left, top });
          }
        }
      } catch {}
    };
    window.addEventListener('resize', reposition);
    const scrollEl = contentRef.current;
    scrollEl?.addEventListener('scroll', reposition, { passive: true });
    return () => {
      window.removeEventListener('resize', reposition);
      scrollEl?.removeEventListener('scroll', reposition as any);
    };
  }, [contextMenuVisible]);

  // 右键菜单：禁用默认并展示自定义菜单
  const handleContextMenu: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (text) {
      setSelectedText(text);
    }
    openSelectionMenuAt(e.clientX, e.clientY);
  };

  // 移动端：长按呼出菜单 & 横向滑动翻页
  const LONG_PRESS_MS = 500;
  const SWIPE_X_THRESHOLD = 60;
  const SWIPE_Y_TOLERANCE = 40;

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    longPressTriggeredRef.current = false;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      // 若已有选择则使用选择位置，否则用触点位置
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';
      if (text) setSelectedText(text);
      openSelectionMenuAt(t.clientX, t.clientY);
    }, LONG_PRESS_MS);
  };

  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!touchStartRef.current) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchStartRef.current.x);
    const dy = Math.abs(t.clientY - touchStartRef.current.y);
    // 若移动过大则取消长按触发
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!touchStartRef.current) return;
    const t0 = touchStartRef.current;
    touchStartRef.current = null;
    if (longPressTriggeredRef.current) {
      // 已触发长按，不再翻页
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - t0.x;
    const dy = t.clientY - t0.y;
    if (Math.abs(dx) > SWIPE_X_THRESHOLD && Math.abs(dy) < SWIPE_Y_TOLERANCE) {
      if (dx < 0) {
        handlePageChange('next');
      } else {
        handlePageChange('prev');
      }
    }
  };

  const handleCopy = async () => {
    try {
      if (selectedText) await navigator.clipboard.writeText(selectedText);
      message.success('已复制');
    } catch {
      message.warning('复制失败');
    } finally {
      closeSelectionMenu();
    }
  };

  const computeOverlayPosition = (box: { left: number; top: number; right: number; bottom: number; width: number; height: number }) => {
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const overlayWidth = translationRef.current?.offsetWidth || 300;
    const overlayHeight = translationRef.current?.offsetHeight || 120;
    const preferredBelow = (vh - box.bottom) >= (overlayHeight + 2 * margin);
    let top = preferredBelow ? (box.bottom + margin) : (box.top - margin - overlayHeight);
    let left = box.left + box.width / 2 - overlayWidth / 2;
    left = Math.max(margin, Math.min(left, vw - overlayWidth - margin));
    top = Math.max(margin, Math.min(top, vh - overlayHeight - margin));
    setTranslationPos({ left, top });
  };

  const handleAction = async (action: 'highlight' | 'query' | 'translation' | 'learning') => {
    if (!selectedText) {
      message.warning('请先选择文本');
      return;
    }
    if (action === 'translation') {
      try {
        setTranslationVisible(true);
        setTranslationLoading(true);
        setTranslationText('');
        // 计算浮层位置
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const r = sel.getRangeAt(0).getBoundingClientRect();
          computeOverlayPosition({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
        } else if (selectionBox) {
          computeOverlayPosition(selectionBox);
        }
        // 目标语言
        const targetLanguage = user?.nativeLanguage || 'zh-CN';
        const sourceLanguage = book?.languageCode || undefined;
        // 使用 laozhang + gpt-4o
        const messages = [
          { role: 'system', content: `你是一个专业的翻译助手。请将用户提供的文本翻译成${targetLanguage}。只返回翻译结果。` },
          { role: 'user', content: selectedText }
        ] as any;
        const resp = await aiService.sendRequest(messages, 'deepseek-r1');
        setTranslationText(resp.content.trim());
      } catch (e) {
        message.error('翻译失败');
        setTranslationText('翻译失败');
      } finally {
        setTranslationLoading(false);
        closeSelectionMenu();
      }
      return;
    }
    // 其他动作沿用原来的标注模态
    setNoteType(action);
    setNoteModalVisible(true);
    closeSelectionMenu();
  };

  // Translate current page when translation mode is enabled (placed before any early return)
  useEffect(() => {
    const run = async () => {
      if (!translationMode || !book) {
        setTranslatedPage('');
        return;
      }
      const pages = Array.isArray(book.contentPages) ? book.contentPages : [];
      const index = Math.max(0, Math.min(currentPage - 1, Math.max(0, pages.length - 1)));
      const text = pages[index] || '';
      if (!text) {
        setTranslatedPage('');
        return;
      }
      try {
        if (debug) console.debug('[Reader] Start translating page', { page: currentPage, length: text.length });
        const model = 'gpt-3.5-turbo';
        const targetLanguage = 'zh-CN';
        const sourceLanguage = book.languageCode;
        const before = Date.now();
        const result = await aiService.translateText(text.slice(0, 1500), targetLanguage, sourceLanguage);
        const ms = Date.now() - before;
        if (debug) console.debug('[Reader] Translation done', { model, ms, charsIn: text.length, charsOut: result.length });
        setTranslatedPage(result);
      } catch (e) {
        console.warn('[Reader] Translation failed', e);
        setTranslatedPage('');
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationMode, currentPage, book]);

  // 不再进行脚本清理，避免DOM操作冲突

  // If PDF original exists, render page to canvas to keep images, match text height box, and then hide text content
  useEffect(() => {
    const run = async () => {
      if (!isMounted || !canvasRef.current || !book || book.fileType !== 'pdf' || !book.fileDataUrl) return;
      
      try {
        // 检查PDF.js是否已加载
        if (!(window as any).pdfjsLib) {
          console.log('PDF.js not loaded, skipping PDF rendering');
          return;
        }
        
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib?.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        if (!pdfDocRef.current) {
          pdfDocRef.current = await pdfjsLib.getDocument(book.fileDataUrl).promise;
        }
        
        const page = await pdfDocRef.current.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        // show canvas, hide text for PDFs to retain images/format
        canvas.style.display = 'block';
        if (contentRef.current) contentRef.current.style.display = 'none';
      } catch (e) {
        console.warn('PDF render failed, fallback to text pages', e);
        if (canvasRef.current) canvasRef.current.style.display = 'none';
        if (contentRef.current) contentRef.current.style.display = 'block';
      }
    };
    
    run();
  }, [isMounted, book, currentPage]);

  if (!book) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text type="secondary">书籍不存在</Text>
      </div>
    );
  }

  if (!isMounted) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text type="secondary">加载中...</Text>
      </div>
    );
  }

  if (hasError) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text type="secondary">页面加载出现问题，请刷新重试</Text>
        <Button 
          onClick={() => {
            setHasError(false);
            window.location.reload();
          }}
          style={{ marginTop: '16px' }}
        >
          刷新页面
        </Button>
      </div>
    );
  }

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  const handleAddNote = async () => {
    if (!selectedText) {
      message.warning('请先选择要标注的文本');
      return;
    }

    try {
      const noteData = {
        bookId: book.id,
        noteType,
        noteText: noteText || selectedText,
        startPosition: 0, // 简化处理
        endPosition: selectedText.length,
        pageNumber: currentPage
      };

      addReadingNote(book.id, noteData);
      setNoteModalVisible(false);
      setSelectedText('');
      setNoteText('');
      message.success('标注已保存');
    } catch (error) {
      message.error('保存失败');
    }
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'highlight': return <HighlightOutlined />;
      case 'translation': return <TranslationOutlined />;
      case 'query': return <QuestionCircleOutlined />;
      case 'learning': return <TranslationOutlined />;
      default: return <HighlightOutlined />;
    }
  };

  const getNoteColor = (type: string) => {
    switch (type) {
      case 'highlight': return 'yellow';
      case 'translation': return 'blue';
      case 'query': return 'orange';
      case 'learning': return 'green';
      default: return 'default';
    }
  };

  const currentPageNotes = book?.notes.filter(note => note.pageNumber === currentPage) || [];

  const goToChapter = (chapterTitle: string, fallbackPage: number) => {
    // 优先：PDF 直接使用大纲页码
    if (book.fileType === 'pdf') {
      const target = Math.max(1, fallbackPage || 1);
      setCurrentPage(target);
      updateReadingProgress(book.id, target);
      setNavDebugOpen(true);
      setNavDebug({
        fileType: book.fileType,
        chapterTitle,
        fallbackPage,
        method: 'pdfOutline',
        finalPage: target
      });
      return;
    }
    // 文本/EPUB：尝试在分页内容中查找标题所在页
    const pages = (dynamicPages && dynamicPages.length > 0)
      ? dynamicPages
      : (Array.isArray(book.contentPages) ? book.contentPages : []);
    if (!pages || pages.length === 0) {
      console.warn('[ToC] 无可用分页，跳到第1页');
      setCurrentPage(1);
      updateReadingProgress(book.id, 1);
      setNavDebugOpen(true);
      setNavDebug({ fileType: book.fileType, chapterTitle, fallbackPage, method: 'noPages', finalPage: 1 });
      return;
    }
    const chapterIdx = Math.max(0, (book.chapters || []).findIndex(c => (c.chapterTitle || '').trim() === (chapterTitle || '').trim()));
    const chapterMeta = (book.chapters || [])[chapterIdx] as any;
    const tokenize = (s: string) => s.toLowerCase().split(/[^a-zA-Z0-9\u4e00-\u9fa5]+/).filter(x => x && x.length >= 2);
    const extractPrimary = (title: string) => {
      const hyphen = title.indexOf('-');
      if (hyphen !== -1) return title.slice(hyphen + 1).trim();
      return title.replace(/^chapter\s+[\wivx]+\s*[:\-]?\s*/i, '').trim();
    };
    const looksLikeToc = (text: string) => /目\s*录|contents|table\s*of\s*contents|目录|目次/i.test(text) || /introduction|preface|foreword|版权|致谢/i.test(text);
    const titleLower = (chapterTitle || '').toLowerCase();
    const primary = extractPrimary(chapterTitle || '').toLowerCase();
    const stopWords = new Set(['chapter','the','of','and','a','an','in','on','to','for','by','with','at','from','as','is','are','be','this','that','these','those','one','two','three','four','five','six','seven','eight','nine','ten','i','ii','iii','iv','v','vi','vii','viii','ix','x']);
    const tokens = tokenize(chapterTitle || '').filter(t => !stopWords.has(t));
    const allPrimaries = Array.from(new Set((book.chapters || []).map(c => extractPrimary(c.chapterTitle || '').toLowerCase()).filter(Boolean)));
    const expectedRatio = (chapterIdx >= 0 && (book.chapters || []).length > 0) ? (chapterIdx + 0.5) / (book.chapters!.length) : 0.0;
    const expectedIdx = Math.max(0, Math.min(pages.length - 1, Math.round(expectedRatio * pages.length) - 1));
    const countOccurrences = (text: string, sub: string): number => {
      if (!sub) return 0;
      let count = 0, pos = 0;
      while (true) {
        const idx = text.indexOf(sub, pos);
        if (idx === -1) break;
        count++; pos = idx + sub.length;
      }
      return count;
    };
    const isLikelyTocPage = (text: string): { isToc: boolean; chapterMentions: number; primaryHits: number } => {
      const lower = text.toLowerCase();
      const head = lower.slice(0, 800);
      const chapterMentions = (head.match(/\bchapter\b/g) || []).length;
      let primaryHits = 0;
      for (const p of allPrimaries) { if (p && head.includes(p)) primaryHits++; }
      const tocKeywords = looksLikeToc(lower);
      const isToc = tocKeywords || chapterMentions >= 2 || primaryHits >= 3;
      return { isToc, chapterMentions, primaryHits };
    };
    const scorePage = (text: string, idx: number): number => {
      const lower = (text || '').toLowerCase();
      const first300 = lower.slice(0, 300);
      const first600 = lower.slice(0, 600);
      let score = 0;
      if (primary) {
        if (first300.includes(primary)) score += 6;
        else if (lower.includes(primary)) score += 3;
      }
      let tokenHits = 0;
      for (const tk of tokens) {
        if (first300.includes(tk)) { score += 2; tokenHits++; }
        else if (lower.includes(tk)) { score += 1; tokenHits++; }
      }
      if (tokenHits >= 2) score += 1; // 关键字同时命中
      if (first600.includes(titleLower)) score += 2; // 完整标题靠前
      const tocCheck = isLikelyTocPage(lower);
      if (tocCheck.isToc) score -= 10; // 强惩罚疑似目录页
      // 位置先验：靠近期望位置略加分
      if (Number.isFinite(expectedIdx)) {
        const dist = Math.abs(idx - expectedIdx);
        const prior = Math.max(0, 3 - dist / 8); // 距离期望越近，加分越多，最多+3
        score += prior;
      }
      return score;
    };

    // 如果fallbackPage是有效数字也作为候选之一
    let bestIdx = -1;
    let bestScore = -9999;
    const tocSignals: Array<{ idx: number; chapterMentions: number; primaryHits: number }> = [];
    for (let i = 0; i < pages.length; i++) {
      const lower = (pages[i] || '').toLowerCase();
      const sig = isLikelyTocPage(lower);
      if (sig.chapterMentions || sig.primaryHits) tocSignals.push({ idx: i, chapterMentions: sig.chapterMentions, primaryHits: sig.primaryHits });
      const s = scorePage(pages[i] || '', i);
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    }

    // 先尝试基于 EPUB href → fileIndex 偏移映射
    let hrefTargetPage = 0;
    let hrefApproxIdx: number | null = null;
    let hrefRefinedIdx: number | null = null;
    try {
      if (book.fileType === 'epub' && (book.content || '').length > 0 && chapterMeta) {
        const totalLen = (book.content || '').length;
        // 1) 优先锚点：anchorIndex
        if (chapterMeta.anchorId && Array.isArray((book as any).anchorIndex)) {
          const entryA = (book as any).anchorIndex.find((x: any) => x.id === chapterMeta.anchorId && (
            x.path === chapterMeta.absPath || (chapterMeta.absPath && chapterMeta.absPath.endsWith('/' + (x.path.split('/').pop() || '')))
          ));
          if (entryA) {
            const ratio = totalLen > 0 ? (entryA.offset / totalLen) : 0;
            const approxIdx = Math.max(0, Math.min(pages.length - 1, Math.round(ratio * pages.length)));
            hrefApproxIdx = approxIdx;
            let bestLocalIdx = approxIdx;
            let bestLocalScore = scorePage(pages[approxIdx] || '', approxIdx);
            const WINDOW = 6;
            for (let di = -WINDOW; di <= WINDOW; di++) {
              const j = approxIdx + di;
              if (j < 0 || j >= pages.length) continue;
              const sc = scorePage(pages[j] || '', j);
              if (sc > bestLocalScore) { bestLocalScore = sc; bestLocalIdx = j; }
            }
            hrefRefinedIdx = bestLocalIdx;
            hrefTargetPage = bestLocalIdx + 1;
          }
        }
        // 2) 退化到文件起点：fileIndex
        if (hrefTargetPage <= 0 && Array.isArray(book.fileIndex) && chapterMeta.absPath) {
          const entry = book.fileIndex.find(x => x.path === chapterMeta.absPath || chapterMeta.absPath.endsWith('/' + (x.path.split('/').pop() || '')));
          if (entry) {
            const ratioByStart = totalLen > 0 ? (entry.start / totalLen) : 0;
            const approxIdx = Math.max(0, Math.min(pages.length - 1, Math.round(ratioByStart * pages.length)));
            hrefApproxIdx = approxIdx;
            let bestLocalIdx = approxIdx;
            let bestLocalScore = scorePage(pages[approxIdx] || '', approxIdx);
            const WINDOW = 6;
            for (let di = -WINDOW; di <= WINDOW; di++) {
              const j = approxIdx + di;
              if (j < 0 || j >= pages.length) continue;
              const sc = scorePage(pages[j] || '', j);
              if (sc > bestLocalScore) { bestLocalScore = sc; bestLocalIdx = j; }
            }
            hrefRefinedIdx = bestLocalIdx;
            hrefTargetPage = bestLocalIdx + 1;
          }
        }
      }
    } catch {}

    let targetPage = hrefTargetPage > 0 ? hrefTargetPage : 0;
    let method: string = hrefTargetPage > 0 ? 'hrefOffset' : 'score';
    if (targetPage <= 0) {
      if (bestIdx !== -1 && bestScore >= 4) {
        targetPage = bestIdx + 1;
        method = 'score';
      } else {
        // 二次尝试：忽略目录惩罚后寻找primary的首次出现
        let firstPosIdx = -1;
        if (primary) {
          for (let i = 0; i < pages.length; i++) {
            const lower = (pages[i] || '').toLowerCase();
            if (lower.includes(primary) && !/table\s*of\s*contents|目录|目次/i.test(lower)) {
              firstPosIdx = i;
              break;
            }
          }
        }
        if (firstPosIdx !== -1) {
          targetPage = firstPosIdx + 1;
          method = 'primaryFirstPos';
        }
      }
    }

    // 仍未命中：按目录顺序比例估算页码（兜底）
    if (targetPage <= 0) {
      const ratio = (chapterIdx >= 0 && (book.chapters || []).length > 0)
        ? (chapterIdx + 0.5) / (book.chapters!.length)
        : 0.0;
      const approx = Math.max(1, Math.min(pages.length, Math.round(ratio * pages.length)));
      targetPage = approx;
      console.warn('[ToC] 标题定位失败，使用比例兜底', { chapterIdx, chapters: (book.chapters || []).length, pages: pages.length, approx });
      method = 'ratioFallback';
    }

    const finalPage = Math.max(1, Math.min(targetPage, pages.length));
    console.debug('[ToC] goToChapter 结果', { chapterTitle, fallbackPage, bestIdx, bestScore, finalPage, pages: pages.length });
    setCurrentPage(finalPage);
    updateReadingProgress(book.id, finalPage);
    setNavDebugOpen(true);
    setNavDebug({
      fileType: book.fileType,
      chapterTitle,
      fallbackPage,
      chapterIdx,
      chapters: (book.chapters || []).length,
      pages: pages.length,
      primary,
      href: chapterMeta?.href,
      absPath: chapterMeta?.absPath,
      hrefApproxIdx,
      hrefRefinedIdx,
      tokens,
      bestIdx,
      bestScore,
      method,
      finalPage,
      expectedIdx,
      tocSignals: tocSignals.slice(0, 5),
      anchorId: chapterMeta?.anchorId
    });
  };

  return (
    <div 
      ref={readerRef}
      style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        background: isFullscreen ? '#fff' : '#f5f5f5'
      }}
    >
      {/* 上栏：搜索、历史、翻译、设置 */}
      {!immersiveMode && (
      <div style={{
        background: '#fff', 
        padding: '6px 12px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '40px'
      }}>
        <Space>
          <Button 
            icon={<LeftOutlined />} 
            onClick={() => navigate('/bookshelf')}
            size="small"
          >
            返回书架
          </Button>
          <Text strong style={{ fontSize: '14px' }}>
            {book.title}
          </Text>
        </Space>

        <Space>
          <Input
            placeholder="搜索内容..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            size="small"
          />
          <Button
            type={translationMode ? 'primary' : 'default'}
            icon={<TranslationOutlined />}
            onClick={() => setTranslationMode(!translationMode)}
            size="small"
          >
            翻译
          </Button>
          <Button
            loading={batchTranslating}
            onClick={async () => {
              if (!book) return;
              try {
                setBatchTranslating(true);
                setTranslateDebugOpen(true);
                setTranslateLogs([]);
                setTranslateProgress({ current: 0, total: 0 });
                // 按段落文本批量翻译
                const targetLanguage = user?.nativeLanguage || 'zh-CN';
                const parTexts = paragraphs.map(p => p.text);
                const toPersistIndices: number[] = [];
                const toPersistTexts: string[] = [];
                await aiService.translateParagraphsInBatches(parTexts, targetLanguage, book.languageCode, {
                  model: 'o3-mini',
                  endpoint: 'laozhang',
                  maxTokensPerBatch: 2000,
                  concurrency: 4,
                  onBatch: (ev, info) => {
                    if (ev === 'start') {
                      setTranslateProgress((prev) => ({ current: info.index, total: info.total }));
                      pushTranslateLog(`开始批次 #${info.index + 1}/${info.total} (${info.start}-${info.end}) 段落数=${info.items}`);
                    } else if (ev === 'success') {
                      setTranslateProgress({ current: info.index + 1, total: translateProgress.total || info.index + 1 });
                      const indices = Array.from({ length: info.end - info.start + 1 }, (_, k) => info.start + k);
                      // 内存写入，不持久化，降低同步阻塞
                      saveParagraphTranslationsMulti(book.id, indices, targetLanguage, info.translations || [], { persist: false });
                      // 归并到待持久化缓冲
                      toPersistIndices.push(...indices);
                      toPersistTexts.push(...(info.translations || []));
                      // 节流：每 5 批合并一次持久化
                      if ((info.index + 1) % 5 === 0 || (info.index + 1) === (translateProgress.total || info.total)) {
                        try { persistParagraphs(book.id); } catch {}
                        pushTranslateLog(`合并持久化：截至批次 #${info.index + 1}`);
                      }
                      pushTranslateLog(`完成批次 #${info.index + 1}，已写入 ${indices.length} 段`);
                    } else if (ev === 'retry') {
                      pushTranslateLog(`批次 #${info.index + 1} 第 ${info.attempt} 次重试：${info.error}`);
                    } else if (ev === 'error') {
                      pushTranslateLog(`批次 #${info.index + 1} 失败：${info.error}`);
                    }
                  }
                });
                // 结束后统一再持久化一次兜底
                try { persistParagraphs(book.id); } catch {}
                message.success('整书翻译完成');
              } catch (e) {
                message.error('整书翻译失败');
                pushTranslateLog(`整体失败：${String((e as any)?.message || e)}`);
              } finally {
                setBatchTranslating(false);
              }
            }}
            size="small"
          >
            整书翻译
          </Button>
          <Button
            onClick={() => setImmersiveMode(true)}
            size="small"
          >
            沉浸
          </Button>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setDrawerVisible(true)}
            size="small"
          >
            历史
          </Button>
          <Button
            icon={<MenuOutlined />}
            onClick={() => setDrawerVisible(true)}
            size="small"
          >
            菜单
          </Button>
        </Space>
      </div>
      )}

      {/* 中栏：单页全文阅读 */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '4px',
        background: '#fff',
        position: 'relative'
      }}>
        {/* PDF canvas (if using original file render) */}
        {book.fileType === 'pdf' && book.fileDataUrl && (
          <canvas 
            ref={canvasRef} 
            style={{ 
              display: 'none', 
              maxWidth: '100%', 
              maxHeight: '100%',
              objectFit: 'contain'
            }} 
          />
        )}

        {/* 文本内容区域 */}
        <div 
          style={{ 
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight,
              userSelect: 'text',
            padding: '20px',
              background: '#fff',
              borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            whiteSpace: 'pre-wrap',
            width: '100%',
            maxWidth: '1200px',
            height: pageHeight > 0 ? `${pageHeight}px` : 'calc(100vh - 120px)',
            overflow: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
          ref={contentRef}
          tabIndex={-1}
          onContextMenu={handleContextMenu}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
            onMouseUp={handleTextSelection}
            onKeyUp={handleTextSelection}
          >
          {isCalculating ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: '#1890ff',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ fontSize: '18px' }}>📖</div>
              <div>正在计算页面内容...</div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                请稍候，这可能需要几秒钟
              </div>
            </div>
          ) : fullText ? (
            <div ref={textRef}>
              {Array.isArray(paragraphs) && paragraphs.length > 0 ? (
                paragraphs.map((p) => (
                  <div key={p.index} style={{ marginBottom: '1.1em' }}>
                    <div>{p.text}</div>
                    {translationMode && (
                      <div style={{ color: '#4d7c0f', marginTop: 6 }}>
                        {p.translations?.[(user?.nativeLanguage || 'zh-CN')] || ''}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <>{fullText}</>
              )}
              {translationVisible && (
                <div
                  ref={translationRef}
                  style={{
                    position: 'fixed',
                    left: `${translationPos.left}px`,
                    top: `${translationPos.top}px`,
                    maxWidth: '320px',
                    background: 'rgba(255,255,255,0.98)',
                    border: '1px solid #e8e8e8',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    padding: '10px 12px',
                    zIndex: 1250
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <Text strong>翻译</Text>
                    <Button size="small" type="text" onClick={() => setTranslationVisible(false)}>关闭</Button>
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {translationLoading ? '正在翻译…' : (translationText || '无内容')}
                  </div>
                </div>
              )}
              {contextMenuVisible && (
                <div
                  ref={menuRef}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'fixed',
                    left: `${contextMenuPos.left}px`,
                    top: `${contextMenuPos.top}px`,
                    transform: 'none',
                    background: 'rgba(50,50,50,0.95)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    display: 'flex',
                    gap: '8px',
                    zIndex: 1200,
                    boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
                  }}
                >
                  <Button size="small" onClick={handleCopy}>复制</Button>
                  <Button size="small" onClick={() => handleAction('highlight')}>划线</Button>
                  <Button size="small" onClick={() => handleAction('query')}>查询</Button>
                  <Button size="small" onClick={() => handleAction('translation')}>翻译</Button>
                  <Button size="small" onClick={() => handleAction('learning')}>学习</Button>
                  {book?.languageCode?.toLowerCase().startsWith('ja') && (
                    <Button size="small" loading={furiganaLoading} onClick={async () => {
                      try {
                        setFuriganaLoading(true);
                        const sel = window.getSelection();
                        const text = sel ? sel.toString().trim() : '';
                        if (!text) { message.warning('请先选择文本'); setFuriganaLoading(false); return; }
                        console.debug('[Furigana] selected:', text);
                        const withFurigana = await addFuriganaInlineLocal(text);
                        console.debug('[Furigana] converted:', withFurigana);
                        if (paragraphs && paragraphs.length > 0) {
                          const idx = paragraphs.findIndex(p => (p.text || '').includes(text));
                          console.debug('[Furigana] paragraph index:', idx);
                          if (idx >= 0) {
                            const orig = paragraphs[idx].text;
                            const replaced = orig.replace(text, withFurigana);
                            // 更新段落文本
                            try { (useBookStore.getState() as any).setParagraphText?.(book!.id, idx, replaced); } catch {}
                            message.success('已添加日文假名');
                          } else {
                            message.info('未定位到段落，已复制带假名文本');
                            await navigator.clipboard.writeText(withFurigana);
                          }
                        } else {
                          await navigator.clipboard.writeText(withFurigana);
                          message.success('已复制带假名文本');
                        }
                      } catch (e) {
                        console.warn('[Furigana] failed:', e);
                        message.error('添加假名失败');
                      } finally {
                        setFuriganaLoading(false);
                        setContextMenuVisible(false);
                      }
                    }}>发音</Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: '#999',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ fontSize: '18px' }}>📚</div>
              <div>未找到内容</div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                请导入支持的书籍文件或检查解析
              </div>
            </div>
          )}
        </div>

        {/* 翻译覆盖层 */}
        {translationMode && translatedPage && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '300px',
            maxHeight: '200px',
            overflow: 'auto',
            fontSize: '14px',
            lineHeight: '1.6',
            zIndex: 10
          }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>翻译</Text>
            <div style={{ whiteSpace: 'pre-wrap' }}>{translatedPage}</div>
          </div>
        )}
        {/* 翻译调试悬浮层 */}
        {translateDebugOpen && (
          <div
            style={{
              position: 'fixed',
              right: 16,
              bottom: 16,
              width: 360,
              maxHeight: '50vh',
              overflow: 'auto',
              padding: 12,
              borderRadius: 10,
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              fontSize: 12,
              zIndex: 1500,
              backdropFilter: 'blur(2px)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#fff' }} strong>{`整书翻译调试 ${translateProgress.current}/${translateProgress.total || '?'}`}</Text>
              <Space>
                <Button size="small" onClick={() => setTranslateDebugOpen(false)}>关闭</Button>
              </Space>
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {(translateLogs || []).slice(-200).map((l, i) => (
                <div key={i}>• {l}</div>
              ))}
            </div>
          </div>
        )}
          </div>

      {/* 下栏：目录、笔记、进度、翻译、返回 */}
      {!immersiveMode && (
      <div style={{
        background: '#fff',
        padding: '8px 12px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '48px'
      }}>
        {/* 左侧：目录、笔记、进度 */}
        <Space size="large">
          <Button
            icon={<BookOutlined />}
            onClick={() => setDrawerVisible(true)}
              size="small" 
          >
            目录
          </Button>
          <Button
            icon={<HighlightOutlined />}
            onClick={() => setDrawerVisible(true)}
            size="small"
          >
            笔记
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text style={{ fontSize: '12px' }}>进度</Text>
            <Progress 
              percent={book.readingProgress} 
              size="small"
              style={{ width: '100px' }}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <Text style={{ fontSize: '12px' }}>
              {currentPage} / {dynamicTotalPages || book.totalPages || '?'} 页
            </Text>
          </div>
        </Space>

        {/* 中间：字体设置 */}
        <Space>
          <Text style={{ fontSize: '12px' }}>字体</Text>
          <Slider
            min={12}
            max={24}
            value={fontSize}
            onChange={setFontSize}
            style={{ width: '80px' }}
          />
          <Text style={{ fontSize: '12px' }}>行距</Text>
          <Slider
            min={1.2}
            max={2.5}
            step={0.1}
            value={lineHeight}
            onChange={setLineHeight}
            style={{ width: '80px' }}
          />
        </Space>

        {/* 右侧：翻译、调试、返回 */}
        <Space>
          {debug && (
            <Button
              onClick={() => {
                if (book && book.content && pageHeight > 0) {
                  console.log('🔧 手动触发分页计算...');
                  const result = calculatePageContent(book.content, pageHeight, fontSize, lineHeight);
                  setDynamicPages(result.pages);
                  setDynamicTotalPages(result.totalPages);
                  
                  // 使用实际阅读器容器进行验证测量
                  if (contentRef.current) {
                    console.log('🔍 使用实际容器验证测量:');
                    result.pages.forEach((page, index) => {
                      contentRef.current!.textContent = page;
                      const actualHeight = contentRef.current!.scrollHeight;
                      console.log(`📏 实际容器第 ${index + 1} 页高度: ${actualHeight}px (限制: ${pageHeight}px)`);
                    });
                  }
                }
              }}
              size="small"
              type="dashed"
            >
              重新分页
            </Button>
          )}
          <Button
            type={translationMode ? 'primary' : 'default'}
            icon={<TranslationOutlined />}
            onClick={() => setTranslationMode(!translationMode)}
            size="small"
          >
            翻译
          </Button>
          <Button
            onClick={() => setImmersiveMode(false)}
            size="small"
          >
            退出沉浸
          </Button>
        <Button
            icon={<LeftOutlined />}
            onClick={() => navigate('/bookshelf')}
            size="small"
          >
            返回书架
        </Button>
        </Space>
      </div>
      )}

      {/* 标注模态框 */}
      <Modal
        title={`添加${noteType === 'highlight' ? '高亮' : noteType === 'translation' ? '翻译' : noteType === 'query' ? '疑问' : '学习'}标注`}
        open={noteModalVisible}
        onCancel={() => setNoteModalVisible(false)}
        onOk={handleAddNote}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ marginBottom: '16px' }}>
          <Text strong>选中文本：</Text>
          <div style={{ 
            background: '#f5f5f5', 
            padding: '8px', 
            borderRadius: '4px',
            marginTop: '8px'
          }}>
            {selectedText}
          </div>
        </div>

        <Form form={form} layout="vertical">
          <Form.Item label="标注内容">
            <TextArea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="请输入标注内容（可选）"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 侧边抽屉 */}
      <Drawer
        title="阅读菜单"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={320}
      >
        <div>
          {/* 目录 */}
          <div style={{ marginBottom: '24px' }}>
            <Title level={5}>目录</Title>
            <List
              dataSource={book.chapters && book.chapters.length > 0 ? book.chapters.map((c) => ({ id: c.id, title: c.chapterTitle, page: c.startPage || 0 })) : []}
              renderItem={(chapter) => (
                <List.Item
                  style={{ 
                    cursor: 'pointer',
                    background: (chapter as any).page === currentPage ? '#e6f7ff' : 'transparent',
                    borderRadius: '4px',
                    padding: '8px'
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const { title, page } = chapter as any;
                    // 不再信任目录序号页码。若页码无效，强制用标题定位
                    const p = typeof page === 'number' && page > 0 ? page : 0;
                    goToChapter(title, p);
                    setDrawerVisible(false);
                  }}
                >
                  <Text>{(chapter as any).title}</Text>
                </List.Item>
              )}
            />
          </div>

          {/* 笔记/热门划线 */}
          <div style={{ marginBottom: '24px' }}>
            <Title level={5}>笔记/热门划线</Title>
            <List
              dataSource={book.notes}
              renderItem={(note) => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (note.pageNumber) {
                      setCurrentPage(note.pageNumber);
                      updateReadingProgress(book.id, note.pageNumber);
                      setDrawerVisible(false);
                    }
                  }}
                >
                  <div>
                    <Space>
                      <Tag 
                        color={getNoteColor(note.noteType)} 
                        icon={getNoteIcon(note.noteType)}
                      >
                        {note.noteType}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        第 {note.pageNumber} 页
                      </Text>
                    </Space>
                    <div style={{ marginTop: '4px' }}>
                      <Text style={{ fontSize: '14px' }}>{note.noteText}</Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </div>

          {/* 阅读进度/阅读时长/画线条 */}
          <div>
            <Title level={5}>阅读统计</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>阅读时长：</Text>
                <Text strong>{book.totalReadingTime} 分钟</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>阅读进度：</Text>
                <Text strong>{book.readingProgress.toFixed(1)}%</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>画线条数：</Text>
                <Text strong>{book.notes.length} 条</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>最后阅读：</Text>
                <Text strong>
                  {book.lastReadAt ? new Date(book.lastReadAt).toLocaleDateString() : '从未'}
                </Text>
              </div>
            </Space>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default BookReaderPage;
