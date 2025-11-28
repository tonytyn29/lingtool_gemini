import React, { useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { 
  BookOutlined, 
  FileTextOutlined, 
  PlusOutlined, 
  DatabaseOutlined,
  FileSearchOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;
const { Text } = Typography;

const AppSider: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: 'language-learning',
      icon: <BookOutlined />,
      label: '语言学习',
      children: [
        {
          key: '/language-learning',
          icon: <FileTextOutlined />,
          label: '学习复习'
        },
        {
          key: '/sentence-import',
          icon: <PlusOutlined />,
          label: '导入句子'
        },
        {
          key: '/sentence-management',
          icon: <DatabaseOutlined />,
          label: '句子管理'
        }
      ]
    },
    {
      key: 'bookshelf',
      icon: <BookOutlined />,
      label: '书架',
      children: [
        {
          key: '/bookshelf',
          icon: <FileSearchOutlined />,
          label: '书籍列表'
        }
      ]
    }
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/book-reader') || path.startsWith('/book-summarizer')) {
      return ['/bookshelf'];
    }
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/language-learning') || path.startsWith('/sentence-')) {
      return ['language-learning'];
    }
    if (path.startsWith('/book')) {
      return ['bookshelf'];
    }
    return [];
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      width={250}
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0'
      }}
    >
      <div style={{ 
        padding: '16px', 
        textAlign: 'center',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <Text strong style={{ 
          fontSize: collapsed ? '14px' : '16px',
          color: '#1890ff'
        }}>
          {collapsed ? 'LT' : 'LingTool'}
        </Text>
      </div>
      
      <Menu
        mode="inline"
        selectedKeys={getSelectedKeys()}
        defaultOpenKeys={getOpenKeys()}
        items={menuItems}
        onClick={handleMenuClick}
        style={{
          border: 'none',
          background: '#fff'
        }}
      />
    </Sider>
  );
};

export default AppSider;
