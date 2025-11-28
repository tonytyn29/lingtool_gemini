import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Table, 
  Input, 
  Select, 
  Button, 
  Typography, 
  Space, 
  Tag, 
  Popconfirm, 
  message,
  Row,
  Col,
  Statistic,
  DatePicker,
  Modal
} from 'antd';
import { 
  SearchOutlined, 
  DeleteOutlined, 
  EditOutlined,
  EyeOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  StarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSentenceStore, Sentence } from '../stores/sentenceStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

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

const SentenceManagementPage: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState<Sentence | null>(null);

  const { sentences, deleteSentence, searchSentences } = useSentenceStore();

  const getLanguageName = (code: string) => {
    return languages.find(lang => lang.code === code)?.name || code;
  };

  const getFamiliarityColor = (level?: string) => {
    switch (level) {
      case 'mastered': return 'success';
      case 'familiar': return 'processing';
      case 'unfamiliar': return 'error';
      default: return 'default';
    }
  };

  const getFamiliarityText = (level?: string) => {
    switch (level) {
      case 'mastered': return '已掌握';
      case 'familiar': return '熟悉';
      case 'unfamiliar': return '不熟悉';
      default: return '未学习';
    }
  };

  const getFamiliarityIcon = (level?: string) => {
    switch (level) {
      case 'mastered': return <StarOutlined />;
      case 'familiar': return <CheckCircleOutlined />;
      case 'unfamiliar': return <CloseCircleOutlined />;
      default: return <DatabaseOutlined />;
    }
  };

  // 统计数据
  const stats = useMemo(() => {
    const total = sentences.length;
    const mastered = sentences.filter(s => s.learningRecord?.familiarityLevel === 'mastered').length;
    const familiar = sentences.filter(s => s.learningRecord?.familiarityLevel === 'familiar').length;
    const unfamiliar = sentences.filter(s => s.learningRecord?.familiarityLevel === 'unfamiliar').length;
    const unlearned = total - mastered - familiar - unfamiliar;

    return { total, mastered, familiar, unfamiliar, unlearned };
  }, [sentences]);

  // 过滤后的句子
  const filteredSentences = useMemo(() => {
    let filtered = sentences;

    // 搜索过滤
    if (searchText) {
      filtered = searchSentences(searchText);
    }

    // 语言过滤
    if (selectedLanguage) {
      filtered = filtered.filter(s => s.languageCode === selectedLanguage);
    }

    // 状态过滤
    if (selectedStatus) {
      filtered = filtered.filter(s => s.learningRecord?.familiarityLevel === selectedStatus);
    }

    // 日期过滤
    if (dateRange) {
      const [start, end] = dateRange;
      filtered = filtered.filter(s => {
        const date = dayjs(s.createdAt);
        return date.isAfter(start) && date.isBefore(end);
      });
    }

    return filtered;
  }, [sentences, searchText, selectedLanguage, selectedStatus, dateRange, searchSentences]);

  const handleDelete = (id: string) => {
    deleteSentence(id);
    message.success('删除成功');
  };

  const handleBatchDelete = () => {
    selectedRowKeys.forEach(key => {
      deleteSentence(key as string);
    });
    setSelectedRowKeys([]);
    message.success(`已删除 ${selectedRowKeys.length} 条记录`);
  };

  const showDetail = (sentence: Sentence) => {
    setSelectedSentence(sentence);
    setDetailModalVisible(true);
  };

  const columns = [
    {
      title: '原句',
      dataIndex: 'originalText',
      key: 'originalText',
      ellipsis: true,
      width: 300,
      render: (text: string, record: Sentence) => (
        <div>
          <div style={{ marginBottom: '4px' }}>
            <Tag color="blue">{getLanguageName(record.languageCode)}</Tag>
            <Tag color="green">{record.sourceType}</Tag>
          </div>
          <Text ellipsis={{ tooltip: text }}>{text}</Text>
        </div>
      )
    },
    {
      title: '聚焦单词',
      dataIndex: 'focusedWords',
      key: 'focusedWords',
      width: 150,
      render: (words: any[]) => (
        <div>
          {words.slice(0, 2).map((word, index) => (
            <Tag key={index}>
              {word.wordText}
            </Tag>
          ))}
          {words.length > 2 && <Tag>+{words.length - 2}</Tag>}
        </div>
      )
    },
    {
      title: '翻译',
      dataIndex: 'translations',
      key: 'translations',
      width: 200,
      render: (translations: any[]) => (
        <div>
          {translations.slice(0, 1).map((translation, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              <Tag>{getLanguageName(translation.targetLanguage)}</Tag>
              <Text ellipsis={{ tooltip: translation.translatedText }} style={{ fontSize: '12px' }}>
                {translation.translatedText}
              </Text>
            </div>
          ))}
          {translations.length > 1 && <Text type="secondary" style={{ fontSize: '12px' }}>+{translations.length - 1} 更多</Text>}
        </div>
      )
    },
    {
      title: '学习状态',
      dataIndex: 'learningRecord',
      key: 'learningRecord',
      width: 120,
      render: (record: any) => (
        <Tag 
          color={getFamiliarityColor(record?.familiarityLevel)} 
          icon={getFamiliarityIcon(record?.familiarityLevel)}
        >
          {getFamiliarityText(record?.familiarityLevel)}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: Date) => dayjs(date).format('MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Sentence) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
            size="small"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
          />
          <Popconfirm
            title="确定删除这个句子吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  return (
    <div className="fade-in">
      <div className="page-title">
        <Space>
          <DatabaseOutlined />
          句子管理
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="总句子数"
              value={stats.total}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <Statistic
              title="已掌握"
              value={stats.mastered}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <Statistic
              title="熟悉"
              value={stats.familiar}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <Statistic
              title="不熟悉"
              value={stats.unfamiliar}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
            <Statistic
              title="未学习"
              value={stats.unlearned}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' }}>
            <Statistic
              title="掌握率"
              value={stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和过滤 */}
      <Card className="learning-card" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Input
              placeholder="搜索句子内容..."
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
            <Select
              placeholder="学习状态"
              value={selectedStatus}
              onChange={setSelectedStatus}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="mastered">已掌握</Option>
              <Option value="familiar">熟悉</Option>
              <Option value="unfamiliar">不熟悉</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={4}>
            <Space>
              {selectedRowKeys.length > 0 && (
                <Popconfirm
                  title={`确定删除选中的 ${selectedRowKeys.length} 条记录吗？`}
                  onConfirm={handleBatchDelete}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    批量删除
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 句子列表 */}
      <Card className="learning-card">
        <Table
          columns={columns}
          dataSource={filteredSentences}
          rowKey="id"
          rowSelection={rowSelection}
          pagination={{
            total: filteredSentences.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 详情模态框 */}
      <Modal
        title="句子详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedSentence && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>原句：</Text>
              <div style={{ 
                background: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '8px',
                marginTop: '8px'
              }}>
                <Tag color="blue">{getLanguageName(selectedSentence.languageCode)}</Tag>
                {selectedSentence.originalText}
              </div>
            </div>

            {selectedSentence.focusedWords.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>聚焦单词：</Text>
                <div style={{ marginTop: '8px' }}>
                  {selectedSentence.focusedWords.map((word, index) => (
                    <Tag key={index} color="green">
                      {word.wordText}
                      {word.pronunciation && ` (${word.pronunciation})`}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {selectedSentence.translations.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>翻译：</Text>
                {selectedSentence.translations.map((translation, index) => (
                  <div key={index} style={{ 
                    background: '#f5f5f5', 
                    padding: '12px', 
                    borderRadius: '8px',
                    marginTop: '8px'
                  }}>
                    <Tag color="purple">{getLanguageName(translation.targetLanguage)}</Tag>
                    {translation.translatedText}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <Text strong>学习状态：</Text>
              <div style={{ marginTop: '8px' }}>
                <Tag 
                  color={getFamiliarityColor(selectedSentence.learningRecord?.familiarityLevel)} 
                  icon={getFamiliarityIcon(selectedSentence.learningRecord?.familiarityLevel)}
                >
                  {getFamiliarityText(selectedSentence.learningRecord?.familiarityLevel)}
                </Tag>
                {selectedSentence.learningRecord && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    <div>复习次数: {selectedSentence.learningRecord.reviewCount}</div>
                    <div>最后复习: {selectedSentence.learningRecord.lastReviewedAt?.toLocaleString()}</div>
                    <div>下次复习: {selectedSentence.learningRecord.nextReviewAt?.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Text strong>创建时间：</Text>
              <Text style={{ marginLeft: '8px' }}>
                {dayjs(selectedSentence.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SentenceManagementPage;
