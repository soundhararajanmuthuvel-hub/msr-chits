import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChitProvider } from './context/ChitContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chits from './pages/Chits';
import ChitDetails from './pages/ChitDetails';
import Members from './pages/Members';
import MemberDetails from './pages/MemberDetails';
import Payments from './pages/Payments';
import Payouts from './pages/Payouts';
import Reports from './pages/Reports';
import ProfitLossAnalysis from './pages/ProfitLossAnalysis';
import Settings from './pages/Settings';
import WhatsApp from './pages/WhatsApp';
import LoadingState from './components/common/LoadingState';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0FCF4] flex items-center justify-center">
        <LoadingState message="Checking authentication session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export function App() {
  return (
    <AuthProvider>
      <ChitProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes inside Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chits" element={<Chits />} />
              <Route path="/chits/:chitId" element={<ChitDetails />} />
              <Route path="/members" element={<Members />} />
              <Route path="/members/:memberId" element={<MemberDetails />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/payouts" element={<Payouts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/reports/profit-loss" element={<ProfitLossAnalysis />} />
              <Route path="/whatsapp" element={<WhatsApp />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ChitProvider>
    </AuthProvider>
  );
}

export default App;
