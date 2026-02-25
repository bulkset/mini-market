'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  Key,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Loader2,
  FileText,
  History
} from 'lucide-react';
import { getActivations, logout } from '@/lib/api';
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

export default function ActivationsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/admin/activations');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/admin/login');
  }, [router]);

  useEffect(() => { setCurrentPath(window.location.pathname); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['activations'],
    queryFn: () => getActivations({ limit: 100 })
  });

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
            <div className="px-4 py-6 border-t border-white/10"><button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-white/80 hover:bg-white/10 rounded-xl"><LogOut className="w-5 h-5" />Выйти</button></div>
          </div>
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
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-gray-900 border-b border-gray-700"><button onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6 text-gray-300" /></button><span className="text-lg font-semibold text-white">Активации</span><div className="w-10" /></div>
        <main className="p-6 lg:p-8">
          <div className="mb-8"><h1 className="text-3xl font-bold text-white">История активаций</h1><p className="mt-1 text-gray-400">Последние 100 активаций</p></div>

          <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-700">
            {isLoading ? <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50"><tr><th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Код</th><th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Товар</th><th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase">Статус</th><th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase">CDK</th><th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase">Дата</th></tr></thead>
                  <tbody className="divide-y divide-gray-700">
                    {data?.data?.activations?.length > 0 ? data.data.activations.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-700/30">
                        <td className="px-6 py-4 font-mono text-sm text-white">{item.code?.code || '—'}</td>
                        <td className="px-6 py-4 text-gray-400">{item.code?.product?.name || '—'}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-300">{item.code?.status || '—'}</td>
                        <td className="px-6 py-4 text-center font-mono text-xs text-gray-300">{item.code?.cdkCode || '—'}</td>
                        <td className="px-6 py-4 text-center text-gray-400">{item.activatedAt ? new Date(item.activatedAt).toLocaleString() : '—'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Нет данных</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
