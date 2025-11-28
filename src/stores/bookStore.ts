import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BookChapter {
  id: string;
  bookId: string;
  chapterTitle: string;
  chapterOrder: number;
  startPage?: number;
  endPage?: number;
  parentChapterId?: string;
  href?: string;
  absPath?: string;
  anchorId?: string;
  createdAt: Date;
}

export interface BookSummary {
  id: string;
  bookId: string;
  chapterId?: string;
  summaryType: 'chapter' | 'book' | 'suggestion';
  summaryText: string;
  summaryOrder: number;
  startPosition?: number;
  endPosition?: number;
  createdAt: Date;
}

export interface ParagraphEntry {
  index: number;
  text: string;
  language: string;
  translations: Record<string, string>;
}

export interface ReadingNote {
  id: string;
  bookId: string;
  sentenceId?: string;
  noteType: 'highlight' | 'translation' | 'query' | 'learning';
  noteText?: string;
  startPosition?: number;
  endPosition?: number;
  pageNumber?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  languageCode: string;
  filePath?: string;
  fileType: 'pdf' | 'epub' | 'txt' | 'mobi';
  fileDataUrl?: string; // base64 data URL for original file (for rendering PDFs/EPUBs with images)
  totalPages?: number;
  currentPage: number;
  readingProgress: number;
  totalReadingTime: number;
  lastReadAt?: Date;
  // parsed content; for EPUB/MOBI we might use a runtime renderer instead
  content?: string; // 完整文本内容 - 不存储在localStorage中
  contentPages?: string[]; // 预分页内容（向后兼容）
  fileIndex?: Array<{ path: string; start: number; end: number }>; // EPUB: 内容文件在全文内的偏移索引
  anchorIndex?: Array<{ path: string; id: string; offset: number }>; // EPUB: id锚点的全局偏移
  chapters: BookChapter[];
  summaries: BookSummary[];
  notes: ReadingNote[];
  createdAt: Date;
  updatedAt: Date;
}

// 用于存储的轻量级Book接口（不包含大内容）
export interface StoredBook extends Omit<Book, 'content' | 'fileDataUrl'> {
  hasContent?: boolean; // 标记是否有内容
  hasFileData?: boolean; // 标记是否有文件数据
}

interface BookState {
  books: Book[];
  currentBook: Book | null;
  isLoading: boolean;
  paragraphsByBookId: Record<string, ParagraphEntry[]>;
  
  // Actions
  addBook: (book: Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'chapters' | 'summaries' | 'notes'>) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  getBook: (id: string) => Book | undefined;
  getRecentBooks: () => Book[];
  searchBooks: (query: string) => Book[];
  setCurrentBook: (book: Book | null) => void;
  updateReadingProgress: (bookId: string, page: number) => void;
  addReadingNote: (bookId: string, note: Omit<ReadingNote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReadingNote: (noteId: string, updates: Partial<ReadingNote>) => void;
  deleteReadingNote: (noteId: string) => void;
  addBookSummary: (bookId: string, summary: Omit<BookSummary, 'id' | 'createdAt'>) => void;
  updateBookSummary: (summaryId: string, updates: Partial<BookSummary>) => void;
  deleteBookSummary: (summaryId: string) => void;
  
  // Content management
  setBookContent: (bookId: string, content: string) => void;
  getBookContent: (bookId: string) => string | null;
  setBookFileData: (bookId: string, fileDataUrl: string) => void;
  getBookFileData: (bookId: string) => string | null;
  clearBookContent: (bookId: string) => void;

  // Paragraphs & translations
  initParagraphsForBook: (bookId: string, content: string, sourceLanguage: string) => void;
  getParagraphs: (bookId: string) => ParagraphEntry[];
  setParagraphTranslation: (bookId: string, index: number, lang: string, text: string) => void;
  saveParagraphTranslationsMulti: (bookId: string, indices: number[], lang: string, texts: string[], options?: { persist?: boolean }) => void;
  persistParagraphs: (bookId: string) => void;
  setParagraphText: (bookId: string, index: number, newText: string) => void;
}

// 内容存储管理
const contentStorage = {
  setContent: (bookId: string, content: string): boolean => {
    try {
      // 压缩内容
      const compressed = btoa(unescape(encodeURIComponent(content)));
      localStorage.setItem(`book-content-${bookId}`, compressed);
      return true;
    } catch (error) {
      console.warn('Failed to store book content:', error);
      return false;
    }
  },
  
  getContent: (bookId: string): string | null => {
    try {
      const compressed = localStorage.getItem(`book-content-${bookId}`);
      if (!compressed) return null;
      return decodeURIComponent(escape(atob(compressed)));
    } catch (error) {
      console.warn('Failed to retrieve book content:', error);
      return null;
    }
  },
  
  setFileData: (bookId: string, fileDataUrl: string): boolean => {
    try {
      localStorage.setItem(`book-filedata-${bookId}`, fileDataUrl);
      return true;
    } catch (error) {
      console.warn('Failed to store book file data:', error);
      return false;
    }
  },
  
  getFileData: (bookId: string): string | null => {
    try {
      return localStorage.getItem(`book-filedata-${bookId}`);
    } catch (error) {
      console.warn('Failed to retrieve book file data:', error);
      return null;
    }
  },
  
  clearContent: (bookId: string) => {
    localStorage.removeItem(`book-content-${bookId}`);
    localStorage.removeItem(`book-filedata-${bookId}`);
    localStorage.removeItem(`book-paragraphs-${bookId}`);
  },

  setParagraphs: (bookId: string, paragraphs: any[]): boolean => {
    try {
      const raw = JSON.stringify(paragraphs || []);
      const compressed = btoa(unescape(encodeURIComponent(raw)));
      localStorage.setItem(`book-paragraphs-${bookId}`, compressed);
      return true;
    } catch (error) {
      console.warn('Failed to store book paragraphs:', error);
      return false;
    }
  },

  getParagraphs: (bookId: string): any[] | null => {
    try {
      const compressed = localStorage.getItem(`book-paragraphs-${bookId}`);
      if (!compressed) return null;
      const raw = decodeURIComponent(escape(atob(compressed)));
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
      return null;
    } catch (error) {
      console.warn('Failed to retrieve book paragraphs:', error);
      return null;
    }
  }
};

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => ({
      books: [],
      currentBook: null,
      isLoading: false,
      paragraphsByBookId: {},

      addBook: (bookData) => {
        const generatedId = Date.now().toString();
        const incomingChapters = (bookData as any)?.chapters as Array<any> | undefined;
        const mappedChapters: BookChapter[] = Array.isArray(incomingChapters)
          ? incomingChapters.map((ch: any, idx: number) => ({
              id: `${generatedId}-ch-${idx + 1}`,
              bookId: generatedId,
              chapterTitle: ch.chapterTitle || ch.title || `章节 ${idx + 1}`,
              chapterOrder: idx + 1,
              startPage: ch.startPage ?? (typeof ch.page === 'number' && ch.page > 0 ? ch.page : undefined),
              endPage: ch.endPage,
              parentChapterId: undefined,
              href: ch.href,
              absPath: ch.absPath,
              anchorId: ch.anchorId,
              createdAt: new Date()
            }))
          : [];

        const newBook: Book = {
          ...bookData,
          id: generatedId,
          chapters: mappedChapters,
          summaries: [],
          notes: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // 存储大内容到单独的存储空间（若超限则保留在内存、但不持久化）
        if (bookData.content) {
          // 初始化段落索引（内存存储）
          try {
            const srcLang = bookData.languageCode || 'unknown';
            const text = (bookData.content || '')
              .replace(/\r\n/g, '\n')
              .replace(/\r/g, '\n');
            const paras = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
            const entries: ParagraphEntry[] = paras.map((p, idx) => ({ index: idx, text: p, language: srcLang, translations: { [srcLang]: p } }));
            set((state) => ({ paragraphsByBookId: { ...state.paragraphsByBookId, [generatedId]: entries } }));
          } catch {}
          const ok = contentStorage.setContent(newBook.id, bookData.content);
          if (ok) {
            newBook.content = undefined; // 从主存储中移除
          } else {
            // 标记但不清空内存字段，让会话内可用
            (newBook as any).hasContent = true;
          }
        }
        if (bookData.fileDataUrl) {
          const ok2 = contentStorage.setFileData(newBook.id, bookData.fileDataUrl);
          if (ok2) {
            newBook.fileDataUrl = undefined; // 从主存储中移除
          } else {
            (newBook as any).hasFileData = true;
          }
        }

        set((state) => ({ books: [...state.books, newBook] }));
        // 尝试加载已有段落缓存（若存在）
        try {
          const cached = contentStorage.getParagraphs(generatedId);
          if (Array.isArray(cached) && cached.length > 0) {
            set((state) => ({ paragraphsByBookId: { ...state.paragraphsByBookId, [generatedId]: cached as any } }));
          }
        } catch {}
      },

      updateBook: (id, updates) => {
        set((state) => ({
          books: state.books.map(book =>
            book.id === id
              ? { ...book, ...updates, updatedAt: new Date() }
              : book
          )
        }));
      },

      deleteBook: (id) => {
        // 清理内容存储
        contentStorage.clearContent(id);
        
        set((state) => ({
          books: state.books.filter(book => book.id !== id)
        }));
      },

      getBook: (id) => {
        const book = get().books.find(book => book.id === id);
        if (!book) return undefined;
        
        // 动态加载内容
        const content = contentStorage.getContent(id);
        const fileDataUrl = contentStorage.getFileData(id);
        // 尝试加载段落
        try {
          const cachedParas = contentStorage.getParagraphs(id);
          if (Array.isArray(cachedParas) && cachedParas.length > 0) {
            set((state) => ({ paragraphsByBookId: { ...state.paragraphsByBookId, [id]: cachedParas as any } }));
          }
        } catch {}
        
        return {
          ...book,
          content: content || book.content,
          fileDataUrl: fileDataUrl || book.fileDataUrl
        };
      },

      getRecentBooks: () => {
        const toTime = (d?: Date | string): number => {
          if (!d) return 0;
          if (d instanceof Date) return d.getTime();
          const t = new Date(d);
          const n = t.getTime();
          return Number.isNaN(n) ? 0 : n;
        };
        return get().books
          .filter(book => !!book.lastReadAt)
          .sort((a, b) => toTime(b.lastReadAt) - toTime(a.lastReadAt))
          .slice(0, 5);
      },

      searchBooks: (query) => {
        const lowercaseQuery = query.toLowerCase();
        return get().books.filter(book =>
          book.title.toLowerCase().includes(lowercaseQuery) ||
          (book.author && book.author.toLowerCase().includes(lowercaseQuery))
        );
      },

      setCurrentBook: (book) => {
        set({ currentBook: book });
      },

      updateReadingProgress: (bookId, page) => {
        set((state) => ({
          books: state.books.map(book => {
            if (book.id !== bookId) return book;

            const progress = book.totalPages ? (page / book.totalPages) * 100 : 0;
            return {
              ...book,
              currentPage: page,
              readingProgress: progress,
              lastReadAt: new Date(),
              updatedAt: new Date()
            };
          })
        }));
      },

      addReadingNote: (bookId, noteData) => {
        const newNote: ReadingNote = {
          ...noteData,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        set((state) => ({
          books: state.books.map(book =>
            book.id === bookId
              ? { ...book, notes: [...book.notes, newNote] }
              : book
          )
        }));
      },

      updateReadingNote: (noteId, updates) => {
        set((state) => ({
          books: state.books.map(book => ({
            ...book,
            notes: book.notes.map(note =>
              note.id === noteId
                ? { ...note, ...updates, updatedAt: new Date() }
                : note
            )
          }))
        }));
      },

      deleteReadingNote: (noteId) => {
        set((state) => ({
          books: state.books.map(book => ({
            ...book,
            notes: book.notes.filter(note => note.id !== noteId)
          }))
        }));
      },

      addBookSummary: (bookId, summaryData) => {
        const newSummary: BookSummary = {
          ...summaryData,
          id: Date.now().toString(),
          createdAt: new Date()
        };

        set((state) => ({
          books: state.books.map(book =>
            book.id === bookId
              ? { ...book, summaries: [...book.summaries, newSummary] }
              : book
          )
        }));
      },

      updateBookSummary: (summaryId, updates) => {
        set((state) => ({
          books: state.books.map(book => ({
            ...book,
            summaries: book.summaries.map(summary =>
              summary.id === summaryId
                ? { ...summary, ...updates }
                : summary
            )
          }))
        }));
      },

      deleteBookSummary: (summaryId) => {
        set((state) => ({
          books: state.books.map(book => ({
            ...book,
            summaries: book.summaries.filter(summary => summary.id !== summaryId)
          }))
        }));
      },

      // Content management methods
      setBookContent: (bookId, content) => {
        contentStorage.setContent(bookId, content);
      },

      getBookContent: (bookId) => {
        return contentStorage.getContent(bookId);
      },

      setBookFileData: (bookId, fileDataUrl) => {
        contentStorage.setFileData(bookId, fileDataUrl);
      },

      getBookFileData: (bookId) => {
        return contentStorage.getFileData(bookId);
      },

      clearBookContent: (bookId) => {
        contentStorage.clearContent(bookId);
      },

      // Paragraphs & translations
      initParagraphsForBook: (bookId, content, sourceLanguage) => {
        try {
          const text = (content || '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
          const paras = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
          const entries: ParagraphEntry[] = paras.map((p, idx) => ({ index: idx, text: p, language: sourceLanguage || 'unknown', translations: { [sourceLanguage || 'unknown']: p } }));
          set((state) => ({ paragraphsByBookId: { ...state.paragraphsByBookId, [bookId]: entries } }));
        } catch {}
      },
      getParagraphs: (bookId) => {
        const map = get().paragraphsByBookId || {};
        return map[bookId] || [];
      },
      setParagraphTranslation: (bookId, index, lang, text) => {
        set((state) => {
          const existing = state.paragraphsByBookId[bookId] || [];
          const next = existing.map((p) => p.index === index ? { ...p, translations: { ...p.translations, [lang]: text } } : p);
          // 持久化
          try { contentStorage.setParagraphs(bookId, next as any); } catch {}
          return { paragraphsByBookId: { ...state.paragraphsByBookId, [bookId]: next } };
        });
      },
      saveParagraphTranslationsMulti: (bookId, indices, lang, texts, options) => {
        set((state) => {
          const existing = state.paragraphsByBookId[bookId] || [];
          const indexToText = new Map<number, string>();
          indices.forEach((idx, i) => indexToText.set(idx, texts[i] || ''));
          const next = existing.map((p) => indexToText.has(p.index)
            ? { ...p, translations: { ...p.translations, [lang]: indexToText.get(p.index) as string } }
            : p
          );
          if (options?.persist !== false) {
            try { contentStorage.setParagraphs(bookId, next as any); } catch {}
          }
          return { paragraphsByBookId: { ...state.paragraphsByBookId, [bookId]: next } };
        });
      },
      setParagraphText: (bookId, index, newText) => {
        set((state) => {
          const existing = state.paragraphsByBookId[bookId] || [];
          const next = existing.map((p) => p.index === index ? { ...p, text: newText, translations: { ...p.translations, [p.language]: newText } } : p);
          try { contentStorage.setParagraphs(bookId, next as any); } catch {}
          return { paragraphsByBookId: { ...state.paragraphsByBookId, [bookId]: next } };
        });
      },
      persistParagraphs: (bookId) => {
        try {
          const arr = (get().paragraphsByBookId[bookId] || []) as any[];
          contentStorage.setParagraphs(bookId, arr);
        } catch (e) {
          console.warn('persistParagraphs failed:', e);
        }
      }
    }),
    {
      name: 'book-storage',
      version: 2,
      // 捕获持久化写入错误，避免配额超限导致整体失败
      onRehydrateStorage: () => (state) => {
        try { /* no-op */ } catch {}
      },
      // 只存储轻量级数据，不存储大内容
      partialize: (state) => ({
        books: state.books.map(book => ({
          ...book,
          content: undefined,
          fileDataUrl: undefined,
          contentPages: undefined,
          fileIndex: undefined,
          anchorIndex: undefined
        })),
        currentBook: state.currentBook ? {
          ...state.currentBook,
          content: undefined,
          fileDataUrl: undefined,
          contentPages: undefined,
          fileIndex: undefined,
          anchorIndex: undefined
        } : null,
        isLoading: state.isLoading,
        paragraphsByBookId: {}
      })
    }
  )
);
