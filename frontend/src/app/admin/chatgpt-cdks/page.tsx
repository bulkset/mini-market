'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LayoutDashboard, Package, Key, BarChart3, Settings, LogOut, Menu, X, Loader2, Plus, Trash2, FileText, CheckCircle, AlertCircle, Bot, History
} from 'lucide-react';
import { getChatGPTCDKs, importChatGPTCDKs, deleteChatGPTCDK, logout } from '@/lib/api';
import clsx from 'clsx';

const navigation = [
  { name: 'Дашборд', href: '/admin', icon: LayoutDashboard },
  { name: 'Товары', href: '/admin/products', icon: Package },
  { name: 'Инструкции', href: '/admin/instructions', icon: FileText },
  { name: 'Коды', href: '/admin/codes', icon: Key },
  { name: 'Активации', href: '/admin/activations', icon: History },
  { name: 'ChatGPT CDK', href: '/admin/chatgpt-cdks', icon: Bot },
  { name: 'Статистика', href: '/admin/stats', icon: BarChart3 },
  { name: 'Настройки', href: '/admin/settings', icon: Settings },
];

const GPT_TYPES = [
  { value: 'plus_1m', label: 'ChatGPT Plus 1 месяц' },
  { value: 'plus_12m', label: 'ChatGPT Plus 12 месяцев' },
  { value: 'pro_1m', label: 'ChatGPT Pro 1 месяц' },
  { value: 'go_12m', label: 'ChatGPT GO 12 месяцев' },
];

export default function ChatGPTCDKsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/admin/chatgpt-cdks');
  const [selectedType, setSelectedType] = useState('plus_1m');
  const [cdkText, setCdkText] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/admin/login');
  }, [router]);

  useEffect(() => { setCurrentPath(window.location.pathname); }, []);

  const { data: cdksData, isLoading } = useQuery({
    queryKey: ['chatgpt-cdks', filterType, filterStatus],
    queryFn: () => getChatGPTCDKs({ gptType: filterType || undefined, status: filterStatus || undefined })
  });

  const importMutation = useMutation({
    mutationFn: ({ gptType, cdks }: { gptType: string; cdks: string[] }) => importChatGPTCDKs(gptType, cdks),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chatgpt-cdks'] });
      setImportResult(data.data);
      setCdkText('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChatGPTCDK,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatgpt-cdks'] })
  });

  const handleLogout = async () => { await logout(); router.push('/admin/login'); };

  const handleImport = () => {
    const cdks = cdkText.split('\n').map(c => c.trim()).filter(Boolean);
    if (cdks.length === 0) return;
    setImportResult(null);
    importMutation.mutate({ gptType: selectedType, cdks });
  };

  const stats = cdksData?.data?.stats || {};
  const cdks = cdksData?.data?.cdks || [];

  const getTypeLabel = (type: string) => GPT_TYPES.find(t => t.value === type)?.label || type;

  const getStatusColor = (status: string) => {
    if (status === 'available') return 'bg-green-900/50 text-green-300';
    if (status === 'used') return 'bg-gray-700 text-gray-400';
    return 'bg-red-900/50 text-red-300';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'available') return 'Доступен';
    if (status === 'used') return 'Использован';
    return 'Ошибка';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Mobile sidebar */}
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

      {/* Desktop sidebar */}
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
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-gray-900 border-b border-gray-700">
          <button onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6 text-gray-300" /></button>
          <span className="text-lg font-semibold text-white">ChatGPT CDK</span>
          <div className="w-10" />
        </div>

        <main className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">ChatGPT CDK коды</h1>
            <p className="mt-1 text-gray-400">Управление CDK кодами для активации подписок ChatGPT</p>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {GPT_TYPES.map(type => (
              <div key={type.value} className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-3">{type.label}</h3>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{stats[type.value]?.available || 0}</div>
                    <div className="text-xs text-gray-500">Доступно</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-400">{stats[type.value]?.used || 0}</div>
                    <div className="text-xs text-gray-500">Использовано</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Форма импорта */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Загрузить CDK коды
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Тип подписки</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white"
                  >
                    {GPT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CDK коды (каждый с новой строки)
                  </label>
                  <textarea
                    value={cdkText}
                    onChange={(e) => setCdkText(e.target.value)}
                    rows={8}
                    placeholder="CDK-XXXX-XXXX-XXXX&#10;CDK-YYYY-YYYY-YYYY&#10;..."
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 font-mono text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Будет загружено: {cdkText.split('\n').filter(c => c.trim()).length} кодов
                  </p>
                </div>

                <button
                  onClick={handleImport}
                  disabled={importMutation.isPending || !cdkText.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {importMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Загрузка...</>
                  ) : (
                    <><Plus className="w-5 h-5" /> Загрузить коды</>
                  )}
                </button>

                {importResult && (
                  <div className={clsx('p-4 rounded-xl', importResult.errors.length > 0 ? 'bg-yellow-900/20 border border-yellow-500/30' : 'bg-green-900/20 border border-green-500/30')}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-medium">Загружено: {importResult.imported} кодов</span>
                    </div>
                    {importResult.errors.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 text-sm">Ошибки ({importResult.errors.length}):</span>
                        </div>
                        <ul className="text-xs text-gray-400 space-y-1 max-h-24 overflow-y-auto">
                          {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Список CDK */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">Список CDK кодов</h2>

              <div className="flex gap-3 mb-4">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm"
                >
                  <option value="">Все типы</option>
                  {GPT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm"
                >
                  <option value="">Все статусы</option>
                  <option value="available">Доступные</option>
                  <option value="used">Использованные</option>
                </select>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
              ) : cdks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">CDK коды не найдены</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {cdks.map((cdk: any) => (
                    <div key={cdk.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm text-white truncate">{cdk.cdk}</div>
                        <div className="text-xs text-gray-400">{getTypeLabel(cdk.gptType)}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span className={clsx('px-2 py-1 rounded-full text-xs', getStatusColor(cdk.status))}>
                          {getStatusLabel(cdk.status)}
                        </span>
                        {cdk.status === 'available' && (
                          <button
                            onClick={() => deleteMutation.mutate(cdk.id)}
                            className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
