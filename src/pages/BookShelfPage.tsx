import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Typography, 
  Space, 
  Row, 
  Col, 
  Select,
  Upload,
  message,
  Modal,
  Form,
  Progress,
  Tag,
  Empty,
  Popconfirm
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined,
  BookOutlined,
  FileTextOutlined,
  UploadOutlined,
  EyeOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  FileOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useBookStore, Book } from '../stores/bookStore';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { UploadFile } from 'antd/es/upload/interface';
import { parseBookByType } from '../utils/bookParser';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;

const languages = [
  { code: 'zh-CN', name: '中文（简体）' },
  { code: 'zh-TW', name: '中文（繁体）' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'ko-KR', name: '한국어' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'es-ES', name: 'Español' },
  { code: 'it-IT', name: 'Italiano' },
  { code: 'pt-PT', name: 'Português' },
  { code: 'ru-RU', name: 'Русский' }
];

const BookShelfPage: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [addBookModalVisible, setAddBookModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const { books, addBook, deleteBook, getRecentBooks, searchBooks } = useBookStore();
  const navigate = useNavigate();

  const getLanguageName = (code: string) => {
    return languages.find(lang => lang.code === code)?.name || code;
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileTextOutlined style={{ color: '#ff4d4f' }} />;
      case 'epub': return <BookOutlined style={{ color: '#1890ff' }} />;
      case 'txt': return <FileOutlined style={{ color: '#52c41a' }} />;
      case 'mobi': return <BookOutlined style={{ color: '#722ed1' }} />;
      default: return <FileOutlined />;
    }
  };

  // 过滤后的书籍
  const filteredBooks = useMemo(() => {
    let filtered = books;

    // 搜索过滤
    if (searchText) {
      filtered = searchBooks(searchText);
    }

    // 语言过滤
    if (selectedLanguage) {
      filtered = filtered.filter(book => book.languageCode === selectedLanguage);
    }

    return filtered;
  }, [books, searchText, selectedLanguage, searchBooks]);

  const recentBooks = getRecentBooks();

  const handleAddBook = async (values: any) => {
    setLoading(true);
    try {
      const uploadList: UploadFile[] | undefined = values.file;
      const fileObj: File | undefined = Array.isArray(uploadList)
        ? (uploadList[0]?.originFileObj as File | undefined)
        : (uploadList as any)?.[0]?.originFileObj;

      if (!fileObj) {
        message.warning('请选择文件');
        return;
      }

      let content: string | undefined = undefined;
      let contentPages: string[] | undefined = undefined;
      let fileIndex: Array<{ path: string; start: number; end: number }> | undefined = undefined;
      let anchorIndex: Array<{ path: string; id: string; offset: number }> | undefined = undefined;
      let fileDataUrl: string | undefined = undefined;
      let totalPages = Number(values.totalPages) || 0;

      if (fileObj) {
        // Keep original file as data URL to render images for PDF/EPUB later
        const asDataUrl = await new Promise<string>((resolve, reject) => {
          try {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
            reader.readAsDataURL(fileObj);
          } catch (e) {
            reject(e);
          }
        });
        fileDataUrl = asDataUrl;

        // 解析
        let fileType = values.fileType as 'pdf' | 'epub' | 'txt' | 'mobi';
        if (!fileType) {
          const ext = (fileObj.name.split('.').pop() || '').toLowerCase();
          if (ext === 'pdf' || ext === 'epub' || ext === 'txt' || ext === 'mobi') {
            fileType = ext as any;
          } else {
            throw new Error('无法识别的文件类型');
          }
        }
        const parsed = await parseBookByType(fileObj, fileType);
        content = parsed.content;
        contentPages = parsed.pages; // 向后兼容
        fileIndex = (parsed as any).fileIndex;
        anchorIndex = (parsed as any).anchorIndex;
        if (contentPages && contentPages.length > 0) {
          totalPages = contentPages.length;
        }
        // 将解析出来的章节传递到store，由store完成结构映射
        if ((parsed as any).chapters && (parsed as any).chapters.length > 0) {
          (values as any)._chapters = (parsed as any).chapters;
        }
      }

      const bookData = {
        title: values.title,
        author: values.author,
        languageCode: values.languageCode,
        fileType: values.fileType,
        totalPages,
        currentPage: 1,
        readingProgress: totalPages > 0 ? (1 / totalPages) * 100 : 0,
        totalReadingTime: 0,
        content,
        contentPages,
        fileDataUrl,
        fileIndex,
        anchorIndex,
        chapters: (values as any)._chapters
      } as any;

      // 若内容超大导致持久化失败，尽量减少持久负担：
      // - 对于PDF/EPUB，优先保留 fileDataUrl（用于渲染图片/原文），如仍超限则两者都仅保存在内存（由store标记）
      if (fileObj && values.fileType !== 'txt' && content && (!contentPages || contentPages.length === 0)) {
        // 这里不强制清空，以便store尝试持久化；失败则store会保留在内存
      }

      try {
        addBook(bookData);
      } catch (e) {
        console.error('addBook 失败:', e, { bookData });
        throw e;
      }
      setAddBookModalVisible(false);
      form.resetFields();
      message.success('书籍添加成功！');
    } catch (error) {
      console.error('添加书籍失败:', error);
      const msg = (error as any)?.message || '添加失败，请重试';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReadBook = (book: Book) => {
    navigate(`/book-reader/${book.id}`);
  };

  const handleSummarizeBook = (book: Book) => {
    navigate(`/book-summarizer/${book.id}`);
  };

  const handleDeleteBook = (bookId: string) => {
    deleteBook(bookId);
    message.success('书籍删除成功！');
  };

  // 从文件名提取书名和文件类型
  const extractBookInfo = (fileName: string) => {
    const lastDotIndex = fileName.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
    const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1).toLowerCase() : '';
    
    return {
      title: nameWithoutExt,
      fileType: extension
    };
  };

  // 处理文件上传变化
  const handleFileChange = (info: any) => {
    if (info.fileList && info.fileList.length > 0) {
      const file = info.fileList[0].originFileObj;
      if (file) {
        const { title, fileType } = extractBookInfo(file.name);
        form.setFieldsValue({
          title: title,
          fileType: fileType,
          languageCode: 'ja-JP' // 默认日语
        });
      }
    }
  };

  const BookCard: React.FC<{ book: Book }> = ({ book }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className="book-card"
        cover={
          <div className="book-cover">
            {getFileTypeIcon(book.fileType)}
          </div>
        }
        actions={[
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleReadBook(book)}
          >
            阅读
          </Button>,
          <Button
            type="text"
            icon={<BarChartOutlined />}
            onClick={() => handleSummarizeBook(book)}
          >
            总结
          </Button>,
          <Popconfirm
            title="确定要删除这本书吗？"
            description="删除后无法恢复"
            onConfirm={() => handleDeleteBook(book.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        ]}
      >
        <Card.Meta
          title={
            <div>
              <Text ellipsis={{ tooltip: book.title }} style={{ fontWeight: 'bold' }}>
                {book.title}
              </Text>
              {book.author && (
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {book.author}
                  </Text>
                </div>
              )}
            </div>
          }
          description={
            <div>
              <div style={{ marginBottom: '8px' }}>
                <Tag color="blue">{getLanguageName(book.languageCode)}</Tag>
                <Tag color="green">{book.fileType.toUpperCase()}</Tag>
              </div>
              
              {book.totalPages && (
                <div style={{ marginBottom: '8px' }}>
                  <Progress
                    percent={book.readingProgress}
                    size="small"
                    showInfo={false}
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {book.currentPage} / {book.totalPages} 页
                  </Text>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size="small">
                  <ClockCircleOutlined style={{ fontSize: '12px' }} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {book.totalReadingTime} 分钟
                  </Text>
                </Space>
                {book.lastReadAt && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {dayjs(book.lastReadAt).fromNow()}
                  </Text>
                )}
              </div>
            </div>
          }
        />
      </Card>
    </motion.div>
  );

  return (
    <div className="fade-in">
      <div className="page-title">
        <Space>
          <BookOutlined />
          我的书架
        </Space>
      </div>

      {/* 搜索和过滤 */}
      <Card className="learning-card" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Input
              placeholder="搜索书籍..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择语言"
              value={selectedLanguage}
              onChange={setSelectedLanguage}
              allowClear
              style={{ width: '100%' }}
            >
              {languages.map(lang => (
                <Option key={lang.code} value={lang.code}>
                  {lang.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddBookModalVisible(true)}
            >
              添加书籍
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 最近阅读 */}
      {recentBooks.length > 0 && (
        <Card title="最近阅读" className="learning-card" style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
            {recentBooks.slice(0, 4).map(book => (
              <Col span={6} key={book.id}>
                <BookCard book={book} />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 所有书籍 */}
      <Card title="所有书籍" className="learning-card">
        {filteredBooks.length > 0 ? (
          <Row gutter={[16, 16]}>
            {filteredBooks.map(book => (
              <Col xs={24} sm={12} md={8} lg={6} key={book.id}>
                <BookCard book={book} />
              </Col>
            ))}
          </Row>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无书籍"
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddBookModalVisible(true)}
            >
              添加第一本书
            </Button>
          </Empty>
        )}
      </Card>

      {/* 添加书籍模态框 */}
      <Modal
        title="添加书籍"
        open={addBookModalVisible}
        onCancel={() => setAddBookModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          onFinish={handleAddBook}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="书名"
                rules={[{ required: true, message: '请输入书名!' }]}
              >
                <Input placeholder="请输入书名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="author"
                label="作者"
              >
                <Input placeholder="请输入作者" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="languageCode"
                label="语言"
                rules={[{ required: true, message: '请选择语言!' }]}
                initialValue="ja-JP"
              >
                <Select placeholder="选择语言">
                  {languages.map(lang => (
                    <Option key={lang.code} value={lang.code}>
                      {lang.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="fileType"
                label="文件类型"
                rules={[{ required: true, message: '请选择文件类型!' }]}
              >
                <Select placeholder="选择文件类型">
                  <Option value="pdf">PDF</Option>
                  <Option value="epub">EPUB</Option>
                  <Option value="txt">TXT</Option>
                  <Option value="mobi">MOBI</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="totalPages"
            label="总页数（可选）"
          >
            <Input type="number" placeholder="请输入总页数" />
          </Form.Item>

          <Form.Item
            name="file"
            label="上传文件（可选）"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
          >
            <Upload.Dragger
              name="file"
              multiple={false}
              beforeUpload={() => false}
              onChange={handleFileChange}
              accept=".pdf,.epub,.txt,.mobi"
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 PDF、EPUB、TXT、MOBI 格式
              </p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setAddBookModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                添加
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BookShelfPage;
