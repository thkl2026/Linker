import { createBrowserRouter } from 'react-router-dom'

export const router = createBrowserRouter([
  {
    path: '/',
    lazy: () => import('./pages/LandingPage').then(m => ({ Component: m.LandingPage })),
  },
  {
    path: '/app',
    lazy: () => import('./pages/RootLayout').then(m => ({ Component: m.RootLayout })),
    children: [
      {
        index: true,
        lazy: () => import('./pages/HomePage').then(m => ({ Component: m.HomePage })),
      },

      // ── SYSTEM ADMIN ───────────────────────────────────────
      {
        path: 'system-admin',
        lazy: () => import('./pages/system-admin/SystemAdminDashboardPage').then(m => ({ Component: m.SystemAdminDashboardPage })),
      },
      {
        path: 'system-admin/users',
        lazy: () => import('./pages/admin/UserManagementPage').then(m => ({ Component: m.UserManagementPage })),
      },
      {
        path: 'system-admin/stats',
        lazy: () => import('./pages/admin/StatsDashboardPage').then(m => ({ Component: m.StatsDashboardPage })),
      },
      {
        path: 'system-admin/settings',
        lazy: () => import('./pages/admin/SystemSettingsPage').then(m => ({ Component: m.SystemSettingsPage })),
      },

      // ── SERVICE ADMIN ──────────────────────────────────────
      {
        path: 'service-admin',
        lazy: () => import('./pages/service-admin/ServiceAdminDashboardPage').then(m => ({ Component: m.ServiceAdminDashboardPage })),
      },
      {
        path: 'service-admin/talents',
        lazy: () => import('./pages/admin/TalentCareerPage').then(m => ({ Component: m.TalentCareerPage })),
      },
      {
        path: 'service-admin/projects',
        lazy: () => import('./pages/admin/ProjectManagementPage').then(m => ({ Component: m.ProjectManagementPage })),
      },
      {
        path: 'service-admin/projects/create',
        lazy: () => import('./pages/admin/CreateProjectPage').then(m => ({ Component: m.CreateProjectPage })),
      },
      {
        path: 'service-admin/projects/:id',
        lazy: () => import('./pages/admin/ProjectDetailPage').then(m => ({ Component: m.ProjectDetailPage })),
      },
      {
        path: 'service-admin/evaluations',
        lazy: () => import('./pages/admin/EvaluationManagementPage').then(m => ({ Component: m.EvaluationManagementPage })),
      },
      {
        path: 'service-admin/settings',
        lazy: () => import('./pages/admin/ServiceAdminSettingsPage').then(m => ({ Component: m.ServiceAdminSettingsPage })),
      },
      {
        path: 'service-admin/notices',
        lazy: () => import('./pages/admin/NoticeManagementPage').then(m => ({ Component: m.NoticeManagementPage })),
      },

      // ── PM ─────────────────────────────────────────────────
      {
        path: 'projects',
        lazy: () => import('./pages/pm/ProjectListPage').then(m => ({ Component: m.ProjectListPage })),
      },
      {
        path: 'projects/register',
        lazy: () => import('./pages/pm/ProjectRegisterPage').then(m => ({ Component: m.ProjectRegisterPage })),
      },

      // ── PROCUREMENT ────────────────────────────────────────
      {
        path: 'experts/search',
        lazy: () => import('./pages/procurement/ExpertSearchPage').then(m => ({ Component: m.ExpertSearchPage })),
      },
      {
        path: 'matching',
        lazy: () => import('./pages/procurement/MatchingPage').then(m => ({ Component: m.MatchingPage })),
      },
      {
        path: 'contracts',
        lazy: () => import('./pages/procurement/ContractListPage').then(m => ({ Component: m.ContractListPage })),
      },
      {
        path: 'settlements',
        lazy: () => import('./pages/procurement/SettlementListPage').then(m => ({ Component: m.SettlementListPage })),
      },
      {
        path: 'evaluations',
        lazy: () => import('./pages/procurement/EvaluationListPage').then(m => ({ Component: m.EvaluationListPage })),
      },
    ],
  },
  {
    path: '/auth',
    lazy: () => import('./pages/AuthLayout').then(m => ({ Component: m.AuthLayout })),
    children: [
      {
        path: 'login',
        lazy: () => import('./pages/LoginPage').then(m => ({ Component: m.LoginPage })),
      },
      {
        path: 'register',
        lazy: () => import('./pages/RegisterPage').then(m => ({ Component: m.RegisterPage })),
      },
      {
        path: 'onboarding',
        lazy: () => import('./pages/OnboardingPage').then(m => ({ Component: m.OnboardingPage })),
      },
    ],
  },
])
