'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LayoutDashboard, Package, Tag, Key, BarChart3, Settings, LogOut, Menu, X, Loader2, Plus, Search, Edit, Trash2, Download, Upload, FileText
} from 'lucide-react';
import { getCodes, getProducts, generateCodes, importCodes, exportCodes, blockCode, unblockCode, logout } from '@/lib/api';
import clsx from 'clsx';

const navigation = [
  { name: 'Дашборд', href: '/admin', icon: LayoutDashboard },
  { name: 'Товары', href: '/admin/products', icon: Package },
  { name: 'Инструкции', href: '/admin/instructions', icon: FileText },
  { name: 'Коды', href: '/admin/codes', icon: Key },
  { name: 'Статистика', href: '/admin/stats', icon: BarChart3 },
  { name: 'Настройки', href: '/admin/settings', icon: Settings },
];

export default function CodesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/admin/codes');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/admin/login');
  }, [router]);

  useEffect(() => { setCurrentPath(window.location.pathname); }, []);

  const { data: codesData, isLoading } = useQuery({ queryKey: ['codes', search, status], queryFn: () => getCodes({ search, status }) });
  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => getProducts({ limit: 100 }) });

  const generateMutation = useMutation({ mutationFn: generateCodes, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['codes'] }); setShowGenerateModal(false); } });
  const blockMutation = useMutation({ mutationFn: blockCode, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['codes'] }) });
  const unblockMutation = useMutation({ mutationFn: unblockCode, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['codes'] }) });

  const handleLogout = async () => { await logout(); router.push('/admin/login'); };

  const handleGenerate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    generateMutation.mutate({
      productId: formData.get('productId') as string,
      count: Number(formData.get('count')),
      prefix: formData.get('prefix') as string || undefined,
      length: Number(formData.get('length')) || 12,
      usageLimit: Number(formData.get('usageLimit')) || 1,
      expiresInDays: formData.get('expiresInDays') ? Number(formData.get('expiresInDays')) : undefined,
    });
  };

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      // Используем fetch напрямую для FormData
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3001/api/v1/admin/codes/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['codes'] });
        setShowImportModal(false);
      }
    }
  };

  const handleExport = async () => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`http://localhost:3001/api/v1/admin/codes/export?${status ? `status=${status}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'codes.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="lg:hidden">
        <div className="fixed inset-0 z-40 flex">
          <div className={clsx('fixed inset-0 z-50 flex flex-col w-72 bg-gradient-to-b from-indigo-600 to-purple-700 transition-transform', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
            <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
              <div><span className="text-2xl font-bold text-white">Mini Market</span><p className="text-xs text-white/70">Админ-панель</p></div>
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
          <div className="flex items-center h-20 px-8 border-b border-white/10"><div><span className="text-2xl font-bold text-white">Mini Market</span><p className="text-xs text-white/70">Админ-панель</p></div></div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (<Link key={item.name} href={item.href} className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium', currentPath === item.href ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10')}><item.icon className="w-5 h-5" />{item.name}</Link>))}
          </nav>
          <div className="px-4 py-6 border-t border-white/10"><button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-white/80 hover:bg-white/10 rounded-xl"><LogOut className="w-5 h-5" />Выйти</button></div>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-gray-900 border-b border-gray-700"><button onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6 text-gray-300" /></button><span className="text-lg font-semibold text-white">Коды</span><div className="w-10" /></div>
        <main className="p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-8">
            <div><h1 className="text-3xl font-bold text-white">Коды активации</h1><p className="mt-1 text-gray-400">Управление кодами</p></div>
            <div className="flex gap-2">
              <button onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"><Download className="w-5 h-5" />Экспорт</button>
              <button onClick={() => setShowImportModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"><Upload className="w-5 h-5" />Импорт</button>
              <button onClick={() => setShowGenerateModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"><Plus className="w-5 h-5" />Создать</button>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Поиск кодов..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white">
              <option value="">Все статусы</option>
              <option value="active">Активные</option>
              <option value="used">Использованные</option>
              <option value="blocked">Заблокированные</option>
            </select>
          </div>

          <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-700">
            {isLoading ? <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div> : (
              <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-700/50"><tr><th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Код</th><th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Товар</th><th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase">Статус</th><th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase">Лимит</th><th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase">Действия</th></tr></thead><tbody className="divide-y divide-gray-700">
                {codesData?.data?.codes?.length > 0 ? codesData.data.codes.map((code: any) => (<tr key={code.id} className="hover:bg-gray-700/30"><td className="px-6 py-4 font-mono text-sm text-white">{code.code}</td><td className="px-6 py-4 text-gray-400">{code.product?.name || '—'}</td><td className="px-6 py-4 text-center"><span className={clsx('px-2 py-1 rounded-full text-xs', code.status === 'active' ? 'bg-green-900/50 text-green-300' : code.status === 'used' ? 'bg-blue-900/50 text-blue-300' : 'bg-red-900/50 text-red-300')}>{code.status === 'active' ? 'Активен' : code.status === 'used' ? 'Использован' : 'Заблокирован'}</span></td><td className="px-6 py-4 text-center text-gray-400">{code.usageCount}/{code.usageLimit}</td><td className="px-6 py-4 text-center"><div className="flex justify-center gap-2">{code.status === 'active' ? <button onClick={() => blockMutation.mutate(code.id)} className="p-2 text-red-400 hover:bg-gray-700 rounded-lg">Блок</button> : code.status === 'blocked' ? <button onClick={() => unblockMutation.mutate(code.id)} className="p-2 text-green-400 hover:bg-gray-700 rounded-lg">Разблок</button> : null}</div></td></tr>)) : (<tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Коды не найдены</td></tr>)}
              </tbody></table></div>)}
          </div>
        </main>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Создать коды</h2>
              <button onClick={() => setShowGenerateModal(false)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Товар *</label><select name="productId" required className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"><option value="">Выберите товар</option>{productsData?.data?.products?.map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Количество *</label><input name="count" type="number" min="1" max="10000" defaultValue="10" required className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Префикс</label><input name="prefix" placeholder="Например: PRO-" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Длина кода</label><input name="length" type="number" min="4" max="32" defaultValue="12" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Лимит использования</label><input name="usageLimit" type="number" min="1" defaultValue="1" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Срок действия (дней)</label><input name="expiresInDays" type="number" placeholder="Без ограничения" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowGenerateModal(false)} className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800">Отмена</button>
                <button type="submit" disabled={generateMutation.isPending} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">{generateMutation.isPending ? 'Создание...' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Импорт кодов</h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleImport} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium mb-2 text-gray-300">CSV файл</label><input ref={fileInputRef} type="file" accept=".csv" required className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
              <p className="text-sm text-gray-500">Формат CSV: code,product_name (или product_id),usage_limit,expires_at</p>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowImportModal(false)} className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800">Отмена</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Импортировать</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
