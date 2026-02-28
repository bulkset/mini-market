'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, Package, Tag, Key, BarChart3, Settings, LogOut, Menu, X, Loader2, TrendingUp, CheckCircle, Clock, XCircle, FileText, History
} from 'lucide-react';
import { getStats, logout } from '@/lib/api';
import clsx from 'clsx';

const navigation = [
  { name: 'Дашборд', href: '/admin', icon: LayoutDashboard },
  { name: 'Товары', href: '/admin/products', icon: Package },
  { name: 'Инструкции', href: '/admin/instructions', icon: FileText },
  { name: 'Коды', href: '/admin/codes', icon: Key },
  { name: 'Активации', href: '/admin/activations', icon: History },
  { name: 'ChatGPT CDK', href: '/admin/chatgpt-cdks', icon: Key },
  { name: 'Статистика', href: '/admin/stats', icon: BarChart3 },
  { name: 'Настройки', href: '/admin/settings', icon: Settings },
];

export default function StatsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/admin/stats');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/admin/login');
  }, [router]);

  useEffect(() => { setCurrentPath(window.location.pathname); }, []);

  const { data: stats, isLoading } = useQuery({ queryKey: ['stats'], queryFn: getStats });

  const handleLogout = async () => { await logout(); router.push('/admin/login'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="lg:hidden">
        <div className="fixed inset-0 z-40 flex">
          <div className={clsx('fixed inset-0 z-50 flex flex-col w-72 bg-gradient-to-b from-indigo-600 to-purple-700 transition-transform', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
            <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
              <div><span className="text-2xl font-bold text-white">KABAN STORE</span><p className="text-xs text-white/70">Админ-панель</p></div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 text-white/70"><X className="w-6 h-6" /></button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navigation.map((item) => (<Link key={item.name} href={item.href} className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium', currentPath === item.href ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10')} onClick={() => setSidebarOpen(false)}><item.icon className="w-5 h-5" />{item.name}</Link>))}
            </nav>
            <div className="px-4 py-6 border-t border-white/10"><button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-white/80 hover:bg-white/10 rounded-xl"><LogOut className="w-5 h-5" /></button></div>
Выйти          </div>
          {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}
        </div>
      </div>

      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-1 bg-gradient-to-b from-indigo-600 to-purple-700">
          <div className="flex items-center h-20 px-8 border-b border-white/10"><div><span className="text-2xl font-bold text-white">KABAN STORE</span><p className="text-xs text-white/70">Админ-панель</p></div></div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (<Link key={item.name} href={item.href} className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium', currentPath === item.href ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10')}><item.icon className="w-5 h-5" />{item.name}</Link>))}
          </nav>
          <div className="px-4 py-6 border-t border-white/10"><button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-white/80 hover:bg-white/10 rounded-xl"><LogOut className="w-5 h-5" />Выйти</button></div>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-gray-900 border-b border-gray-700"><button onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6 text-gray-300" /></button><span className="text-lg font-semibold text-white">Статистика</span><div className="w-10" /></div>
        <main className="p-6 lg:p-8">
          <div className="mb-8"><h1 className="text-3xl font-bold text-white">Статистика</h1><p className="mt-1 text-gray-400">Подробная статистика системы</p></div>

          {isLoading ? <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div> : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {[{ name: 'Всего кодов', value: stats?.data?.codes?.total || 0, color: 'from-blue-500 to-blue-600', icon: Key }, { name: 'Использовано', value: stats?.data?.codes?.used || 0, color: 'from-green-500 to-green-600', icon: CheckCircle }, { name: 'Активных', value: stats?.data?.codes?.active || 0, color: 'from-yellow-500 to-yellow-600', icon: Clock }, { name: 'Заблокировано', value: stats?.data?.codes?.blocked || 0, color: 'from-red-500 to-red-600', icon: XCircle }, { name: 'Активаций сегодня', value: stats?.data?.codes?.today || 0, color: 'from-indigo-500 to-indigo-600', icon: TrendingUp }].map((stat) => (
                    <div key={stat.name} className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className={clsx('w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br', stat.color)}><stat.icon className="w-7 h-7 text-white" /></div>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="mt-4"><p className="text-3xl font-bold text-white">{stat.value}</p><p className="text-sm text-gray-400">{stat.name}</p></div>
                    </div>
                  ))}
              </div>

              <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-700">
                <div className="px-6 py-4 border-b border-gray-700"><h2 className="text-lg font-semibold text-white">По товарам</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50"><tr><th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Товар</th><th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Всего</th><th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Использовано</th><th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Процент</th></tr></thead>
                    <tbody className="divide-y divide-gray-700">
                      {stats?.data?.byProduct?.length > 0 ? stats.data.byProduct.map((item: any, i: number) => (<tr key={i} className="hover:bg-gray-700/30"><td className="px-6 py-4 font-medium text-white">{item.product?.name || 'Без товара'}</td><td className="px-6 py-4 text-right text-gray-400">{item.total}</td><td className="px-6 py-4 text-right text-gray-400">{item.used}</td><td className="px-6 py-4 text-right text-gray-400">{item.total > 0 ? Math.round((item.used / item.total) * 100) : 0}%</td></tr>)) : (<tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Нет данных</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-700">
                <div className="px-6 py-4 border-b border-gray-700"><h2 className="text-lg font-semibold text-white">По датам (последние 30 дней)</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50"><tr><th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Дата</th><th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Активаций</th></tr></thead>
                    <tbody className="divide-y divide-gray-700">
                      {stats?.data?.byDate?.length > 0 ? stats.data.byDate.map((item: any, i: number) => (<tr key={i} className="hover:bg-gray-700/30"><td className="px-6 py-4 text-gray-400">{item.date}</td><td className="px-6 py-4 text-right text-gray-400">{item.count}</td></tr>)) : (<tr><td colSpan={2} className="px-6 py-8 text-center text-gray-500">Нет данных</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
