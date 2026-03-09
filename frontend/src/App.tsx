import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute.tsx';
import Layout from './components/layout/Layout.tsx';

// Auth pages
import LoginPage from './pages/auth/LoginPage.tsx';
import RegisterPage from './pages/auth/RegisterPage.tsx';

// Session pages
import SessionsPage from './pages/sessions/SessionsPage';
import SessionDetailPage from './pages/sessions/SessionDetailPage';

// Friends pages
import FriendsPage from './pages/friends/FriendsPage';

// Profile pages
import ProfilePage from './pages/profile/ProfilePage';
import EditProfilePage from './pages/profile/EditProfilePage';

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
                    <Route path="/register" element={<RegisterPage />} />

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

                    {/* Session routes */}
                    <Route
                        path="/sessions"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <SessionsPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/sessions/:sessionId"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <SessionDetailPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Friends routes */}
                    <Route
                        path="/friends"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <FriendsPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Profile routes */}
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <ProfilePage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile/edit"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <EditProfilePage />
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
