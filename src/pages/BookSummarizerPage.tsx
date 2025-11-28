import React, { useState, useMemo } from 'react';
import { 
  Layout, 
  Button, 
  Typography, 
  Space, 
  Card, 
  List, 
  Tag,
  Collapse,
  message,
  Spin,
  Empty
} from 'antd';
import { 
  LeftOutlined, 
  BookOutlined,
  BulbOutlined,
  FileTextOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore, Book, BookSummary, BookChapter } from '../stores/bookStore';
import aiService from '../utils/aiService';
import { ENV_CONFIG } from '../config/environment';
import { motion } from 'framer-motion';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const BookSummarizerPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [selectedSummary, setSelectedSummary] = useState<BookSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugOverlayOpen, setDebugOverlayOpen] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  const { getBook, addBookSummary, getBookContent } = useBookStore();
  const book = bookId ? getBook(bookId) : null;
  const debug = ENV_CONFIG.DEBUG;

  // 基于真实目录构建章节面板（按 startPage 排序，过滤无效页码=0）
  const chapterPanels = useMemo(() => {
    if (!book) return [] as Array<{ id: string; title: string; startPage: number; endPage: number; summaries: BookSummary[] }>;
    const chapters: BookChapter[] = [...(book.chapters || [])].sort((a, b) => (a.chapterOrder || 0) - (b.chapterOrder || 0));
    const valid = chapters.filter(ch => (ch.startPage || 0) > 0);
    const endFor = (idx: number): number => {
      if (idx < valid.length - 1) {
        const next = valid[idx + 1];
        const end = (next.startPage || 1) - 1;
        return end > 0 ? end : (book.totalPages || end);
      }
      return book.totalPages || (Array.isArray(book.contentPages) ? book.contentPages.length : 0);
    };
    return valid.map((ch, i) => ({
      id: ch.id,
      title: ch.chapterTitle,
      startPage: ch.startPage || 1,
      endPage: endFor(i) || (ch.startPage || 1),
      summaries: (book.summaries || []).filter(s => s.chapterId === ch.id)
    }));
  }, [book]);

  const handleGenerateSummary = async (chapterId: string) => {
    setLoading(true);
    setDebugOverlayOpen(true);
    try {
      if (!book) return;
      const panel = chapterPanels.find(c => c.id === chapterId);
      if (!panel) {
        message.warning('未找到该章节');
        return;
      }

      // 获取章节文本：优先 contentPages 的页范围，其次全文按标题切片
      const contentFromStore = bookId ? (getBookContent(bookId) || '') : '';
      const fullContent = contentFromStore || book.content || '';
      let chapterText = '';
      let debugLocate: any = {};
      const extractPrimaryKeyword = (title: string): string => {
        const hyphenIdx = title.indexOf('-');
        if (hyphenIdx !== -1) {
          return title.slice(hyphenIdx + 1).trim();
        }
        return title.replace(/^chapter\s+[\wivx]+\s*[:\-]?\s*/i, '').trim();
      };
      if (Array.isArray(book.contentPages) && book.contentPages.length > 0) {
        const looksLikeToc = (text: string) => /目\s*录|contents|table\s*of\s*contents|目录|目次/i.test(text);
        const tokenize = (title: string) => (title.toLowerCase().split(/[^a-zA-Z0-9\u4e00-\u9fa5]+/).filter(t => t && t.length >= 3));
        const titleTokens = tokenize(panel.title);
        const scorePage = (text: string): number => {
          const lowerText = (text || '').toLowerCase();
          const first300 = lowerText.slice(0, 300);
          let score = 0;
          for (const tk of titleTokens) {
            if (first300.includes(tk)) score += 2;
            if (lowerText.includes(tk)) score += 1;
          }
          if (looksLikeToc(lowerText)) score -= 5;
          return score;
        };
        let startIdx = -1;
        let endIdx = -1;
        // 优先使用章节的 startPage
        if (panel.startPage > 0 && panel.startPage <= book.contentPages.length) {
          startIdx = panel.startPage - 1;
        }
        // 再尝试用主关键词（标题中 '-' 后的短语）定位
        if (startIdx === -1) {
          const primary = extractPrimaryKeyword(panel.title).toLowerCase();
          if (primary && primary.length >= 4) {
            const hit = book.contentPages.findIndex(p => (p || '').toLowerCase().includes(primary));
            if (hit !== -1) startIdx = hit;
          }
        }
        // 若没有有效 startPage，则评分扫描
        if (startIdx === -1) {
          let best = -1, bestScore = -9999;
          for (let i = 0; i < book.contentPages.length; i++) {
            const s = scorePage(book.contentPages[i] || '');
            if (s > bestScore) { bestScore = s; best = i; }
          }
          if (best !== -1 && bestScore > 0) startIdx = best;
        }
        // 结束页：用 next 章节标题评分确定，或窗口兜底
        if (startIdx !== -1) {
          const currentIndex = chapterPanels.findIndex(c => c.id === panel.id);
          const next = currentIndex >= 0 ? chapterPanels[currentIndex + 1] : undefined;
          if (panel.endPage && panel.endPage > (panel.startPage || 0)) {
            endIdx = Math.min(book.contentPages.length - 1, panel.endPage - 1);
          } else if (next) {
            const nextTokens = tokenize(next.title);
            const scoreNext = (text: string): number => {
              const lowerText = (text || '').toLowerCase();
              const first300 = lowerText.slice(0, 300);
              let score = 0;
              for (const tk of nextTokens) {
                if (first300.includes(tk)) score += 2;
                if (lowerText.includes(tk)) score += 1;
              }
              if (looksLikeToc(lowerText)) score -= 3;
              return score;
            };
            let bestNext = -1, bestNextScore = -9999;
            for (let i = startIdx + 1; i < book.contentPages.length; i++) {
              const s = scoreNext(book.contentPages[i] || '');
              if (s > bestNextScore) { bestNextScore = s; bestNext = i; }
            }
            if (bestNext !== -1 && bestNextScore > 0) endIdx = Math.max(startIdx, bestNext - 1);
          }
          if (endIdx === -1) endIdx = Math.min(book.contentPages.length - 1, startIdx + 5);
        }
        if (startIdx !== -1 && endIdx !== -1) {
          chapterText = book.contentPages.slice(startIdx, endIdx + 1).join('\n\n');
          debugLocate = { method: 'pages', startIdx, endIdx, totalPages: book.contentPages.length };
          if (debug) console.debug('[Summary] Located by pages', debugLocate);
        }
      }
      if (!chapterText && fullContent) {
        const title = panel.title;
        const lc = fullContent.toLowerCase();
        const t = title.toLowerCase();
        let startPos = lc.indexOf(t);
        if (debug) {
          console.debug('[Summary] Fallback to fullContent slicing', { title, fullContentLength: fullContent.length, startPosByFullTitle: startPos });
        }
        // 尝试用主关键词定位（去掉“Chapter X - ”等前缀）
        if (startPos < 0) {
          const primary = extractPrimaryKeyword(title).toLowerCase();
          if (primary && primary.length >= 4) {
            const p = lc.indexOf(primary);
            if (p >= 0) {
              startPos = p;
              debugLocate = { method: 'fullContentByPrimary', startPos, primary };
            }
          }
        }
        // 再尝试用标题关键词打散后逐一搜索，取最早出现位置
        if (startPos < 0) {
          const tokenize = (s: string) => s.toLowerCase().split(/[^a-zA-Z0-9\u4e00-\u9fa5]+/).filter(x => x && x.length >= 3);
          const tokens = tokenize(title);
          let firstPos = -1;
          for (const tk of tokens) {
            const pos = lc.indexOf(tk);
            if (pos >= 0) {
              firstPos = firstPos === -1 ? pos : Math.min(firstPos, pos);
            }
          }
          if (firstPos >= 0) {
            startPos = firstPos;
            debugLocate = { method: 'fullContentByTokens', startPos, tokens };
          }
        }
        if (startPos >= 0) {
          // 寻找下一章的边界；若边界过近，则使用最小窗口兜底
          const allTitles = (book.chapters || []).map(c => c.chapterTitle).filter(Boolean) as string[];
          const primaryOf = (s: string) => {
            const hyphenIdx = s.indexOf('-');
            if (hyphenIdx !== -1) return s.slice(hyphenIdx + 1).trim();
            return s.replace(/^chapter\s+[\wivx]+\s*[:\-]?\s*/i, '').trim();
          };
          const candidateNexts: string[] = [];
          for (const tRaw of allTitles) {
            if (!tRaw) continue;
            if (tRaw === title) continue;
            candidateNexts.push(tRaw);
            const p = primaryOf(tRaw);
            if (p && p.toLowerCase() !== primaryOf(title).toLowerCase()) candidateNexts.push(p);
          }
          let nextPos = -1;
          for (const cand of candidateNexts) {
            const pos = lc.indexOf(cand.toLowerCase(), startPos + 1);
            if (pos > startPos && (nextPos === -1 || pos < nextPos)) nextPos = pos;
          }
          const MIN_WINDOW = 1200; // 至少截取一定长度，避免命中目录附近导致内容过短
          if (nextPos === -1 || (nextPos - startPos) < MIN_WINDOW) {
            const endPos = Math.min(lc.length, startPos + Math.max(2000, 8000));
            chapterText = fullContent.slice(startPos, endPos);
            if (!debugLocate || !debugLocate.method) {
              debugLocate = { method: 'fullContentByTitle', startPos, nextPos, adjusted: 'minWindow', endPos } as any;
            } else {
              debugLocate = { ...debugLocate, nextPos, adjusted: 'minWindow', endPos } as any;
            }
          } else {
            chapterText = fullContent.slice(startPos, nextPos);
            if (!debugLocate || !debugLocate.method) {
              debugLocate = { method: 'fullContentByTitle', startPos, nextPos } as any;
            } else {
              debugLocate = { ...debugLocate, nextPos } as any;
            }
          }
        } else {
          // 仍未定位到，则兜底为全文（避免空内容），并明确标注
          chapterText = fullContent;
          debugLocate = { method: 'fullContentAll' };
        }
      }
      if (!chapterText || chapterText.trim().length === 0) {
        message.warning('未找到可总结的章节内容');
        return;
      }

      // 控制输入长度，避免请求过大
      const MAX_INPUT = 8000;
      const input = chapterText.slice(0, MAX_INPUT);
      if (debug) {
        console.debug('[Summary] Prepared input', {
          bookId,
          chapterId,
          chapterTitle: panel.title,
          inputLength: input.length,
          inputPreviewStart: input.slice(0, 200),
          inputPreviewEnd: input.slice(Math.max(0, input.length - 200))
        });
      }
      const summaryText = await aiService.generateChapterSummary(input, panel.title);
      setDebugData({
        prepared: {
          chapterId,
          chapterTitle: panel.title,
          inputLength: input.length,
          inputPreviewStart: input.slice(0, 200),
          inputPreviewEnd: input.slice(Math.max(0, input.length - 200)),
          locate: debugLocate
        },
        ai: aiService.getLastDebug(),
        result: {
          length: summaryText.length,
          previewStart: summaryText.slice(0, 200),
          previewEnd: summaryText.slice(Math.max(0, summaryText.length - 200))
        }
      });
      if (debug) {
        console.debug('[Summary] Result', {
          chapterId,
          length: summaryText.length,
          resultPreviewStart: summaryText.slice(0, 200),
          resultPreviewEnd: summaryText.slice(Math.max(0, summaryText.length - 200))
        });
      }
      
      const newSummary: Omit<BookSummary, 'id' | 'createdAt'> = {
        bookId: bookId || '',
        chapterId,
        summaryType: 'chapter',
        summaryText,
        summaryOrder: 1,
        startPosition: 0,
        endPosition: Math.min(input.length, chapterText.length)
      };

      addBookSummary(bookId || '', newSummary);
      message.success('总结生成成功！');
    } catch (error) {
      message.error('生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSummaryClick = (summary: BookSummary) => {
    setSelectedSummary(summary);
    // 这里可以跳转到对应的原文位置
    message.info(`跳转到第 ${summary.startPosition} 个字符位置`);
  };

  const getSummaryIcon = (type: string) => {
    switch (type) {
      case 'chapter': return <FileTextOutlined />;
      case 'suggestion': return <BulbOutlined />;
      case 'book': return <BookOutlined />;
      default: return <FileTextOutlined />;
    }
  };

  const getSummaryColor = (type: string) => {
    switch (type) {
      case 'chapter': return 'blue';
      case 'suggestion': return 'orange';
      case 'book': return 'green';
      default: return 'default';
    }
  };

  if (!book) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text type="secondary">书籍不存在</Text>
      </div>
    );
  }

  return (
    <Layout className="summarizer-layout">
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space>
          <Button 
            icon={<LeftOutlined />} 
            onClick={() => navigate('/bookshelf')}
          >
            返回书架
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {book.title} - 智能总结
          </Title>
        </Space>

        <Space>
          <Button
            onClick={() => setDebugOverlayOpen(!debugOverlayOpen)}
            type={debugOverlayOpen ? 'primary' : 'default'}
          >
            调试信息
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => message.info('重新生成总结功能开发中...')}
          >
            重新生成
          </Button>
        </Space>
      </Header>

      <Layout>
        <Sider width={400} className="summarizer-sider">
          <div style={{ padding: '16px' }}>
            <Title level={5}>目录与总结</Title>
            
            <Collapse defaultActiveKey={['1']} ghost>
              {chapterPanels.map(chapter => (
                <Panel 
                  header={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>{chapter.title}</Text>
                      <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateSummary(chapter.id);
                        }}
                        loading={loading}
                      >
                        生成总结
                      </Button>
                    </div>
                  }
                  key={chapter.id}
                >
                  {chapter.summaries && chapter.summaries.length > 0 ? (
                    <List
                      dataSource={chapter.summaries}
                      renderItem={(summary) => (
                        <List.Item
                          style={{ 
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '4px',
                            background: selectedSummary?.id === summary.id ? '#e6f7ff' : 'transparent',
                            border: selectedSummary?.id === summary.id ? '1px solid #91d5ff' : '1px solid transparent'
                          }}
                          onClick={() => handleSummaryClick(summary)}
                        >
                          <div style={{ width: '100%' }}>
                            <div style={{ marginBottom: '8px' }}>
                              <Tag 
                                color={getSummaryColor(summary.summaryType)} 
                                icon={getSummaryIcon(summary.summaryType)}
                              >
                                {summary.summaryType === 'chapter' ? '章节总结' : 
                                 summary.summaryType === 'suggestion' ? '学习建议' : '书籍总结'}
                              </Tag>
                            </div>
                            <Text style={{ fontSize: '14px' }}>
                              {summary.summaryText}
                            </Text>
                          </div>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暂无总结"
                        imageStyle={{ height: 40 }}
                      />
                      <Button
                        type="dashed"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => handleGenerateSummary(chapter.id)}
                        loading={loading}
                      >
                        生成总结
                      </Button>
                    </div>
                  )}
                </Panel>
              ))}
            </Collapse>
          </div>
        </Sider>

        <Content className="summarizer-content">
          {selectedSummary ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                title={
                  <Space>
                    <Tag 
                      color={getSummaryColor(selectedSummary.summaryType)} 
                      icon={getSummaryIcon(selectedSummary.summaryType)}
                    >
                      {selectedSummary.summaryType === 'chapter' ? '章节总结' : 
                     selectedSummary.summaryType === 'suggestion' ? '学习建议' : '书籍总结'}
                    </Tag>
                    <Text type="secondary">
                      对应位置: {selectedSummary.startPosition} - {selectedSummary.endPosition}
                    </Text>
                  </Space>
                }
                extra={
                  <Button
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={() => message.info('跳转到原文位置')}
                  >
                    查看原文
                  </Button>
                }
              >
                <Paragraph style={{ fontSize: '16px', lineHeight: '1.8' }}>
                  {selectedSummary.summaryText}
                </Paragraph>

                {/* 相关建议 */}
                {selectedSummary.summaryType === 'chapter' && (
                  <div style={{ marginTop: '24px' }}>
                    <Title level={5}>
                      <BulbOutlined style={{ marginRight: '8px' }} />
                      学习建议
                    </Title>
                    <Card size="small" style={{ background: '#fff7e6' }}>
                      <Text>
                        基于此章节内容，建议您：
                        <br />
                        1. 重点掌握本章提到的核心概念
                        <br />
                        2. 结合实际例子进行练习
                        <br />
                        3. 将重要内容添加到学习计划中
                        <br />
                        4. 定期复习相关知识点
                      </Text>
                    </Card>
                  </div>
                )}

                {/* 相关句子 */}
                <div style={{ marginTop: '24px' }}>
                  <Title level={5}>
                    <FileTextOutlined style={{ marginRight: '8px' }} />
                    相关句子
                  </Title>
                  <List
                    dataSource={[
                      '这是与总结相关的第一个重要句子。',
                      '这是与总结相关的第二个重要句子。',
                      '这是与总结相关的第三个重要句子。'
                    ]}
                    renderItem={(item, index) => (
                      <List.Item>
                        <Card size="small" style={{ width: '100%' }}>
                          <Text>{item}</Text>
                          <div style={{ marginTop: '8px' }}>
                            <Button size="small" type="dashed">
                              添加到学习
                            </Button>
                            <Button size="small" type="dashed" style={{ marginLeft: '8px' }}>
                              翻译
                            </Button>
                          </div>
                        </Card>
                      </List.Item>
                    )}
                  />
                </div>
              </Card>
            </motion.div>
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              flexDirection: 'column'
            }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="请从左侧选择一个总结来查看详情"
              />
              <Text type="secondary">
                点击左侧的总结项目来查看详细内容和相关建议
              </Text>
            </div>
          )}
        </Content>
      </Layout>

      {/* 调试悬浮层 */}
      {debugOverlayOpen && (
        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            width: 420,
            maxHeight: '60vh',
            overflow: 'auto',
            padding: 12,
            borderRadius: 8,
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            fontSize: 12,
            zIndex: 2000
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: '#fff' }} strong>总结调试信息</Text>
            <Button size="small" onClick={() => setDebugOverlayOpen(false)}>关闭</Button>
          </div>
          {!debugData ? (
            <div>暂无数据，先点击“生成总结”。</div>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap' }}>
              <div style={{ marginBottom: 8 }}>
                <Text style={{ color: '#fff' }} strong>Prepared Input</Text>
                <div>chapterId: {debugData.prepared?.chapterId}</div>
                <div>title: {debugData.prepared?.chapterTitle}</div>
                <div>length: {debugData.prepared?.inputLength}</div>
                <div>previewStart: {debugData.prepared?.inputPreviewStart}</div>
                <div>previewEnd: {debugData.prepared?.inputPreviewEnd}</div>
                {debugData.prepared?.locate && (
                  <div style={{ marginTop: 6, background: 'rgba(255,255,255,0.08)', padding: 6, borderRadius: 4 }}>
                    <div><b>locate.method</b>: {debugData.prepared.locate.method || 'unknown'}</div>
                    {'startIdx' in (debugData.prepared.locate || {}) && (
                      <div>startIdx: {debugData.prepared.locate.startIdx}, endIdx: {debugData.prepared.locate.endIdx}, totalPages: {debugData.prepared.locate.totalPages}</div>
                    )}
                    {'startPos' in (debugData.prepared.locate || {}) && (
                      <div>startPos: {debugData.prepared.locate.startPos}, nextPos: {debugData.prepared.locate.nextPos}</div>
                    )}
                    {'primary' in (debugData.prepared.locate || {}) && (
                      <div>primary: {debugData.prepared.locate.primary}</div>
                    )}
                    {'tokens' in (debugData.prepared.locate || {}) && (
                      <div>tokens: {Array.isArray(debugData.prepared.locate.tokens) ? debugData.prepared.locate.tokens.join(', ') : ''}</div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text style={{ color: '#fff' }} strong>AI Request</Text>
                <div>endpoint: {debugData.ai?.request?.endpoint}</div>
                <div>url: {debugData.ai?.request?.url}</div>
                <div>model: {debugData.ai?.request?.model}</div>
                <div>max_completion_tokens: {debugData.ai?.request?.max_completion_tokens}</div>
                <div>messagesPreview:</div>
                <div style={{ maxHeight: 120, overflow: 'auto', background: 'rgba(255,255,255,0.08)', padding: 6, borderRadius: 4 }}>
                  {debugData.ai?.request?.messagesPreview?.map((m: any, idx: number) => (
                    <div key={idx}>- [{m.role}] {m.content}</div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text style={{ color: '#fff' }} strong>AI Response</Text>
                <div>usage: {debugData.ai?.response?.usage ? JSON.stringify(debugData.ai.response.usage) : 'n/a'}</div>
                <div>model: {debugData.ai?.response?.model || 'n/a'}</div>
                <div>finish_reason: {debugData.ai?.response?.finish_reason || 'n/a'}</div>
                <div>contentPreview: {debugData.ai?.response?.contentPreview || 'n/a'}</div>
              </div>
              <div>
                <Text style={{ color: '#fff' }} strong>Summary Result</Text>
                <div>length: {debugData.result?.length}</div>
                <div>previewStart: {debugData.result?.previewStart}</div>
                <div>previewEnd: {debugData.result?.previewEnd}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default BookSummarizerPage;
