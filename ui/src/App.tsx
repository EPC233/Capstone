import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SidebarProvider } from './contexts/SidebarContext.tsx';
import ProtectedRoute from './components/auth/ProtectedRoute.tsx';
import Layout from './components/layout/Layout.tsx';

// Auth pages
import LoginPage from './pages/auth/LoginPage.tsx';

// Admin pages - User management
import UsersPage from './pages/users/UsersPage.tsx';
import CreateUserPage from './pages/users/CreateUserPage.tsx';
import EditUserPage from './pages/users/EditUserPage.tsx';

// Workout pages
import WorkoutsPage from './pages/workouts/WorkoutsPage.tsx';

// Common pages
import HomePage from './pages/common/HomePage';
import UnauthorizedPage from './pages/common/UnauthorizedPage.tsx';
import './globals.css';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SidebarProvider>
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

                        {/* Admin routes - User management */}
                        <Route
                            path="/dashboard/users"
                            element={
                                <ProtectedRoute requiredRole="admin">
                                    <Layout>
                                        <UsersPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard/users/new"
                            element={
                                <ProtectedRoute requiredRole="admin">
                                    <Layout>
                                        <CreateUserPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard/users/:userId/edit"
                            element={
                                <ProtectedRoute requiredRole="admin">
                                    <Layout>
                                        <EditUserPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />

                        {/* Workout routes */}
                        <Route
                            path="/dashboard/workouts"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <WorkoutsPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />

                        {/* Error pages */}
                        <Route
                            path="/unauthorized"
                            element={<UnauthorizedPage />}
                        />

                        {/* Catch all - redirect to login */}
                        <Route
                            path="*"
                            element={<Navigate to="/login" replace />}
                        />
                    </Routes>
                </SidebarProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
