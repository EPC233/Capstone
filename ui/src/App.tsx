import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute.tsx';
import Layout from './components/layout/Layout.tsx';

// Auth pages
import LoginPage from './pages/auth/LoginPage.tsx';

// Workout pages
import WorkoutsPage from './pages/workouts/WorkoutsPage';

// Common pages
import HomePage from './pages/common/HomePage';
import './globals.css';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected routes */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <HomePage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Workout routes */}
                    <Route
                        path="/workouts"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <WorkoutsPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Catch all - redirect to home */}
                    <Route
                        path="*"
                        element={<Navigate to="/" replace />}
                    />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
