import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DataSourcesPage from './pages/DataSourcesPage';
import './styles/App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route — no auth required */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes — AppLayout checks auth and renders Outlet */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
