'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  Package, 
  Tag, 
  Key, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Loader2,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  FileText
} from 'lucide-react';
import { getStats, logout } from '@/lib/api';
import clsx from 'clsx';

const navigation = [
  { name: 'Дашборд', href: '/admin', icon: LayoutDashboard },
  { name: 'Товары', href: '/admin/products', icon: Package },
  { name: 'Инструкции', href: '/admin/instructions', icon: FileText },
  { name: 'Коды', href: '/admin/codes', icon: Key },
  { name: 'Статистика', href: '/admin/stats', icon: BarChart3 },
  { name: 'Настройки', href: '/admin/settings', icon: Settings },
];

export default function AdminPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  // Проверка авторизации
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  });

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Mobile navigation */}
      <div className="lg:hidden">
        <div className="fixed inset-0 z-40 flex">
          <div className={clsx(
            'fixed inset-0 z-50 flex flex-col w-72 bg-gradient-to-b from-indigo-600 to-purple-700 transition-transform',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}>
            <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
              <div>
                <span className="text-2xl font-bold text-white">KABAN STORE</span>
                <p className="text-xs text-white/70">Админ-панель</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                    currentPath === item.href
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="px-4 py-6 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Выйти
              </button>
            </div>
          </div>

          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Desktop navigation */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-1 bg-gradient-to-b from-indigo-600 to-purple-700">
          <div className="flex items-center h-20 px-8 border-b border-white/10">
            <div>
              <span className="text-2xl font-bold text-white">KABAN STORE</span>
              <p className="text-xs text-white/70">Админ-панель</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  currentPath === item.href
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="px-4 py-6 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Выйти
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-gray-900 border-b border-gray-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-lg font-semibold text-white">
            KABAN STORE
          </span>
          <div className="w-10" />
        </div>

        {/* Page content */}
        <main className="p-6 lg:p-8">
          <DashboardContent stats={stats} isLoading={isLoading} />
        </main>
      </div>
    </div>
  );
}

function DashboardContent({ stats, isLoading }: { stats: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const statCards = [
    {
      name: 'Всего кодов',
      value: stats?.data?.codes?.total || 0,
      color: 'from-blue-500 to-blue-600',
      icon: Key,
    },
    {
      name: 'Использовано',
      value: stats?.data?.codes?.used || 0,
      color: 'from-green-500 to-green-600',
      icon: CheckCircle,
    },
    {
      name: 'Активных',
      value: stats?.data?.codes?.active || 0,
      color: 'from-yellow-500 to-yellow-600',
      icon: Clock,
    },
    {
      name: 'Заблокировано',
      value: stats?.data?.codes?.blocked || 0,
      color: 'from-red-500 to-red-600',
      icon: XCircle,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Дашборд
        </h1>
        <p className="mt-1 text-gray-400">
          Обзор системы активационных кодов
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className={clsx(
                'w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br',
                stat.color
              )}>
                <stat.icon className="w-7 h-7 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stat.name}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Products table */}
      <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            По товарам
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Товар
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Всего
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Использовано
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Процент
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {stats?.data?.byProduct?.length > 0 ? (
                stats.data.byProduct.map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {item.product?.name || 'Без товара'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                      {item.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                      {item.used}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        item.total > 0 && (item.used / item.total) >= 0.7
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                          : item.total > 0 && (item.used / item.total) >= 0.3
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      )}>
                        {item.total > 0 ? Math.round((item.used / item.total) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Нет данных о товарах
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
