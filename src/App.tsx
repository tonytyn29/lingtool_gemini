import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import LanguageSettingsPage from './pages/LanguageSettingsPage';
import LanguageLearningPage from './pages/LanguageLearningPage';
import SentenceImportPage from './pages/SentenceImportPage';
import SentenceManagementPage from './pages/SentenceManagementPage';
import BookShelfPage from './pages/BookShelfPage';
import BookReaderPage from './pages/BookReaderPage';
import BookSummarizerPage from './pages/BookSummarizerPage';
import AppHeader from './components/AppHeader';
import AppSider from './components/AppSider';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const { Content } = Layout;

const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!user?.nativeLanguage || !user?.targetLanguage) {
    return <LanguageSettingsPage />;
  }

  return (
    <ErrorBoundary>
      <Layout className="app-layout">
        <AppSider />
        <Layout>
          <AppHeader />
          <Content className="app-content">
            <Routes>
              <Route path="/" element={<Navigate to="/language-learning" replace />} />
              <Route path="/language-learning" element={<LanguageLearningPage />} />
              <Route path="/sentence-import" element={<SentenceImportPage />} />
              <Route path="/sentence-management" element={<SentenceManagementPage />} />
              <Route path="/bookshelf" element={<BookShelfPage />} />
              <Route path="/book-reader/:bookId" element={<BookReaderPage />} />
              <Route path="/book-summarizer/:bookId" element={<BookSummarizerPage />} />
              <Route path="*" element={<Navigate to="/language-learning" replace />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </ErrorBoundary>
  );
};

export default App;
