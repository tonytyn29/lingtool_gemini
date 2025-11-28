import React, { useState } from 'react';
import { Form, Select, Button, Card, Typography, Space, message, Row, Col } from 'antd';
import { GlobalOutlined, CheckOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;
const { Option } = Select;

const languages = [
  { code: 'zh-CN', name: '中文（简体）', native: '中文' },
  { code: 'zh-TW', name: '中文（繁体）', native: '中文' },
  { code: 'en-US', name: 'English (US)', native: '英语' },
  { code: 'en-GB', name: 'English (UK)', native: '英语' },
  { code: 'ja-JP', name: '日本語', native: '日语' },
  { code: 'ko-KR', name: '한국어', native: '韩语' },
  { code: 'fr-FR', name: 'Français', native: '法语' },
  { code: 'de-DE', name: 'Deutsch', native: '德语' },
  { code: 'es-ES', name: 'Español', native: '西班牙语' },
  { code: 'it-IT', name: 'Italiano', native: '意大利语' },
  { code: 'pt-PT', name: 'Português', native: '葡萄牙语' },
  { code: 'ru-RU', name: 'Русский', native: '俄语' },
  { code: 'ar-SA', name: 'العربية', native: '阿拉伯语' },
  { code: 'hi-IN', name: 'हिन्दी', native: '印地语' },
  { code: 'th-TH', name: 'ไทย', native: '泰语' },
  { code: 'vi-VN', name: 'Tiếng Việt', native: '越南语' }
];

const LanguageSettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { updateLanguageSettings } = useAuthStore();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const learningLanguages = [
        { code: values.learning1, name: languages.find(l => l.code === values.learning1)?.native || '', order: 1 },
        { code: values.learning2, name: languages.find(l => l.code === values.learning2)?.native || '', order: 2 },
        { code: values.learning3, name: languages.find(l => l.code === values.learning3)?.native || '', order: 3 }
      ].filter(lang => lang.code);

      updateLanguageSettings({
        nativeLanguage: values.nativeLanguage,
        targetLanguage: values.targetLanguage,
        learningLanguages
      });

      message.success('语言设置已保存！');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card
          style={{
            width: 600,
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            border: 'none'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Space direction="vertical" size="large">
              <GlobalOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              <div>
                <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                  语言设置
                </Title>
                <Text type="secondary">
                  请设置您的母语、精通语言和学习语言
                </Text>
              </div>
            </Space>
          </div>

          <Form
            form={form}
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="nativeLanguage"
                  label="母语"
                  rules={[{ required: true, message: '请选择母语!' }]}
                >
                  <Select
                    placeholder="选择您的母语"
                    showSearch
                    optionFilterProp="children"
                  >
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
                  name="targetLanguage"
                  label="精通语言"
                  rules={[{ required: true, message: '请选择精通语言!' }]}
                >
                  <Select
                    placeholder="选择您要精通的语言"
                    showSearch
                    optionFilterProp="children"
                  >
                    {languages.map(lang => (
                      <Option key={lang.code} value={lang.code}>
                        {lang.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Title level={4} style={{ marginTop: '24px', marginBottom: '16px' }}>
              学习语言（最多3个）
            </Title>

            <Row gutter={24}>
              <Col span={8}>
                <Form.Item
                  name="learning1"
                  label="学习语言 1"
                >
                  <Select
                    placeholder="选择学习语言"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {languages.map(lang => (
                      <Option key={lang.code} value={lang.code}>
                        {lang.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item
                  name="learning2"
                  label="学习语言 2"
                >
                  <Select
                    placeholder="选择学习语言"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {languages.map(lang => (
                      <Option key={lang.code} value={lang.code}>
                        {lang.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item
                  name="learning3"
                  label="学习语言 3"
                >
                  <Select
                    placeholder="选择学习语言"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {languages.map(lang => (
                      <Option key={lang.code} value={lang.code}>
                        {lang.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginTop: '32px', textAlign: 'center' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                icon={<CheckOutlined />}
                style={{
                  height: '48px',
                  paddingLeft: '32px',
                  paddingRight: '32px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </motion.div>
    </div>
  );
};

export default LanguageSettingsPage;
