import React from 'react';
import { Layout, Avatar, Dropdown, Button, Space, Typography } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;
const { Text } = Typography;

const AppHeader: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => {
        // 导航到个人资料页面
      }
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '语言设置',
      onClick: () => {
        navigate('/language-settings');
      }
    },
    {
      type: 'divider' as const
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ];

  return (
    <Header className="app-header" style={{ 
      background: '#fff', 
      padding: '0 24px', 
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
          LingTool - 多语言学习平台
        </Text>
      </div>
      
      <Space>
        <Text type="secondary">
          欢迎回来，{user?.username}
        </Text>
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          arrow
        >
          <Button type="text" icon={<Avatar icon={<UserOutlined />} size="small" />} />
        </Dropdown>
      </Space>
    </Header>
  );
};

export default AppHeader;
