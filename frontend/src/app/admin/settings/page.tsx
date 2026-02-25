'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LayoutDashboard, Package, Tag, Key, BarChart3, Settings, LogOut, Menu, X, Loader2, Save, FileText, History
} from 'lucide-react';
import { getSettings, updateSettings, logout } from '@/lib/api';
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

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/admin/settings');
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/admin/login');
  }, [router]);

  useEffect(() => { setCurrentPath(window.location.pathname); }, []);

  const { data: settingsData, isLoading } = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  useEffect(() => {
    if (settingsData?.data) {
      setFormData(settingsData.data);
    }
  }, [settingsData]);

  const mutation = useMutation({ mutationFn: updateSettings, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }) });

  const handleLogout = async () => { await logout(); router.push('/admin/login'); };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); mutation.mutate(formData); };

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
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-gray-900 border-b border-gray-700"><button onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6 text-gray-300" /></button><span className="text-lg font-semibold text-white">Настройки</span><div className="w-10" /></div>
        <main className="p-6 lg:p-8">
          <div className="mb-8"><h1 className="text-3xl font-bold text-white">Настройки</h1><p className="mt-1 text-gray-400">Настройки системы</p></div>

          {isLoading ? <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div> : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-white">Основные настройки</h2>
                <div className="grid gap-4">
                  <div><label className="block text-sm font-medium mb-2 text-gray-300">Название магазина</label><input type="text" value={formData.store_name || ''} onChange={(e) => setFormData({ ...formData, store_name: e.target.value })} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white" /></div>
                  <div><label className="block text-sm font-medium mb-2 text-gray-300">Описание</label><textarea value={formData.store_description || ''} onChange={(e) => setFormData({ ...formData, store_description: e.target.value })} rows={3} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white" /></div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-white">Настройки кодов</h2>
                <div className="grid gap-4">
                  <div><label className="block text-sm font-medium mb-2 text-gray-300">Срок действия кодов (дней)</label><input type="number" value={formData.default_expiration_days || '365'} onChange={(e) => setFormData({ ...formData, default_expiration_days: e.target.value })} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white" /></div>
                  <div><label className="block text-sm font-medium mb-2 text-gray-300">Максимальное количество попыток</label><input type="number" value={formData.max_attempts || '5'} onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white" /></div>
                </div>
              </div>

              <button type="submit" disabled={mutation.isPending} className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                <Save className="w-5 h-5" />{mutation.isPending ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
