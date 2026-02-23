import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Auth from './pages/Auth';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Flashcards from './pages/Flashcards';
import DeckView from './pages/DeckView';
import QuestionEngine from './pages/QuestionEngine';
import ExamSimulator from './pages/ExamSimulator';
import Tutor from './pages/Tutor';
import './styles.css';

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/auth" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Private><Layout /></Private>}>
            <Route index element={<Dashboard />} />
            <Route path="flashcards" element={<Flashcards />} />
            <Route path="flashcards/:deckId" element={<DeckView />} />
            <Route path="questions" element={<QuestionEngine />} />
            <Route path="exam" element={<ExamSimulator />} />
            <Route path="tutor" element={<Tutor />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
