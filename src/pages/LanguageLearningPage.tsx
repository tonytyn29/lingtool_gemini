import React, { useState, useEffect } from 'react';
import { Card, Button, Progress, Typography, Space, Statistic, Row, Col, message } from 'antd';
import { 
  BookOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  StarOutlined,
  ReloadOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useSentenceStore } from '../stores/sentenceStore';
import { useAuthStore } from '../stores/authStore';

const { Title, Text } = Typography;

const LanguageLearningPage: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    mastered: 0,
    familiar: 0,
    unfamiliar: 0
  });

  const { 
    sentences, 
    getSentencesForReview, 
    updateLearningRecord,
    setCurrentSentence 
  } = useSentenceStore();
  const { user } = useAuthStore();

  const reviewSentences = getSentencesForReview();
  const currentSentence = reviewSentences[currentIndex];

  useEffect(() => {
    if (currentSentence) {
      setCurrentSentence(currentSentence);
    }
  }, [currentSentence, setCurrentSentence]);

  useEffect(() => {
    // 更新会话统计
    setSessionStats(prev => ({
      ...prev,
      total: reviewSentences.length
    }));
  }, [reviewSentences.length]);

  const handleAnswer = (familiarityLevel: 'unfamiliar' | 'familiar' | 'mastered') => {
    if (!currentSentence) return;

    updateLearningRecord(currentSentence.id, familiarityLevel);
    
    // 更新统计
    setSessionStats(prev => ({
      ...prev,
      [familiarityLevel]: prev[familiarityLevel] + 1
    }));

    // 移动到下一个句子
    if (currentIndex < reviewSentences.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      message.success('恭喜！今日复习完成！');
    }
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setSessionStats({
      total: reviewSentences.length,
      mastered: 0,
      familiar: 0,
      unfamiliar: 0
    });
  };

  const getLanguageName = (code: string) => {
    const languageMap: { [key: string]: string } = {
      'zh-CN': '中文',
      'en-US': '英语',
      'ja-JP': '日语',
      'fr-FR': '法语',
      'ko-KR': '韩语'
    };
    return languageMap[code] || code;
  };

  if (reviewSentences.length === 0) {
    return (
      <div className="empty-state">
        <BookOutlined className="empty-state-icon" />
        <Title level={3}>暂无需要复习的句子</Title>
        <Text type="secondary">
          请先导入一些句子，或者检查您的学习记录
        </Text>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-title">
        <Space>
          <BookOutlined />
          语言学习 - 复习模式
        </Space>
      </div>

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="总句子数"
              value={sessionStats.total}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <Statistic
              title="已掌握"
              value={sessionStats.mastered}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <Statistic
              title="熟悉"
              value={sessionStats.familiar}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <Statistic
              title="不熟悉"
              value={sessionStats.unfamiliar}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 进度条 */}
      <div className="progress-container">
        <Text strong>学习进度</Text>
        <Progress
          percent={Math.round(((currentIndex + 1) / reviewSentences.length) * 100)}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          style={{ marginTop: '8px' }}
        />
        <Text type="secondary">
          {currentIndex + 1} / {reviewSentences.length}
        </Text>
      </div>

      {/* 学习卡片 */}
      {currentSentence && (
        <motion.div
          key={currentSentence.id}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
        >
            <Card className="learning-card sentence-card">
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {getLanguageName(currentSentence.languageCode)}
                </Text>
                <Title level={2} style={{ color: 'white', margin: '16px 0' }}>
                  {currentSentence.originalText}
                </Title>
              </div>

              {currentSentence.focusedWords.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>聚焦单词：</Text>
                  <div style={{ marginTop: '8px' }}>
                    {currentSentence.focusedWords.map((word, index) => (
                      <span
                        key={index}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          marginRight: '8px',
                          color: 'white'
                        }}
                      >
                        {word.wordText}
                        {word.pronunciation && ` (${word.pronunciation})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!showAnswer ? (
                <div style={{ textAlign: 'center' }}>
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => setShowAnswer(true)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: 'white',
                      height: '48px',
                      paddingLeft: '32px',
                      paddingRight: '32px',
                      borderRadius: '24px'
                    }}
                  >
                    显示答案
                  </Button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div style={{ marginBottom: '24px' }}>
                    {currentSentence.translations.map((translation, index) => (
                      <div key={index} style={{ marginBottom: '12px' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                          {getLanguageName(translation.targetLanguage)}：
                        </Text>
                        <div style={{ 
                          background: 'rgba(255,255,255,0.1)', 
                          padding: '12px', 
                          borderRadius: '8px',
                          marginTop: '4px',
                          color: 'white'
                        }}>
                          {translation.translatedText}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="learning-buttons">
                    <Button
                      type="primary"
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => handleAnswer('unfamiliar')}
                      className="learning-button"
                    >
                      不熟悉
                    </Button>
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleAnswer('familiar')}
                      className="learning-button"
                      style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    >
                      熟悉
                    </Button>
                    <Button
                      type="primary"
                      icon={<StarOutlined />}
                      onClick={() => handleAnswer('mastered')}
                      className="learning-button"
                      style={{ background: '#faad14', borderColor: '#faad14' }}
                    >
                      掌握
                    </Button>
                  </div>
                </motion.div>
              )}
            </Card>
        </motion.div>
      )}

      {/* 控制按钮 */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={resetSession}
          style={{ marginRight: '16px' }}
        >
          重新开始
        </Button>
      </div>
    </div>
  );
};

export default LanguageLearningPage;
