'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  LayoutDashboard, Package, Tag, Key, BarChart3, Settings, LogOut, Menu, X, Loader2, Zap, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { rechargeWithToken, checkRechargeStatus, logout } from '@/lib/api';
import clsx from 'clsx';

const navigation = [
  { name: 'Дашборд', href: '/admin', icon: LayoutDashboard },
  { name: 'Товары', href: '/admin/products', icon: Package },
  { name: 'Активация', href: '/admin/recharge', icon: Zap },
  { name: 'Коды', href: '/admin/codes', icon: Key },
  { name: 'Статистика', href: '/admin/stats', icon: BarChart3 },
  { name: 'Настройки', href: '/admin/settings', icon: Settings },
];

export default function RechargePage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/admin/recharge');
  const [cdk, setCdk] = useState('');
  const [token, setToken] = useState('');
  const [taskId, setTaskId] = useState('');
  const [status, setStatus] = useState<{
    pending?: boolean;
    success?: boolean;
    message?: string;
    cdk?: string;
  } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/admin/login');
  }, [router]);

  useEffect(() => { setCurrentPath(window.location.pathname); }, []);

  const handleLogout = async () => { await logout(); router.push('/admin/login'); };

  const rechargeMutation = useMutation({
    mutationFn: () => rechargeWithToken(cdk, token),
    onSuccess: (data) => {
      if (data.success) {
        setTaskId(data.data.taskId);
        setStatus({
          pending: true,
          cdk: data.data.cdk
        });
      } else {
        setStatus({
          success: false,
          message: data.error
        });
      }
    },
    onError: (err: any) => {
      setStatus({
        success: false,
        message: err.response?.data?.error || 'Ошибка активации'
      });
    }
  });

  // Polling for status
  useEffect(() => {
    if (!taskId) return;
    
    const interval = setInterval(async () => {
      try {
        const data = await checkRechargeStatus(taskId);
        if (data.success && data.data) {
          setStatus({
            pending: data.data.pending,
            success: data.data.success,
            message: data.data.message,
            cdk: data.data.cdk
          });
          
          if (!data.data.pending) {
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.error('Status check error:', e);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [taskId]);

  const handleReset = () => {
    setCdk('');
    setToken('');
    setTaskId('');
    setStatus(null);
  };

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
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-gray-900 border-b border-gray-700"><button onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6 text-gray-300" /></button><span className="text-lg font-semibold text-white">Активация</span><div className="w-10" /></div>
        <main className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Активация подписки</h1>
            <p className="mt-1 text-gray-400">Активация ChatGPT подписок через DurielAPI</p>
          </div>

          <div className="max-w-2xl">
            {/* Status Display */}
            {status && (
              <div className={clsx(
                'mb-6 p-4 rounded-xl border',
                status.success ? 'bg-green-900/20 border-green-500/30' : 
                status.pending ? 'bg-yellow-900/20 border-yellow-500/30' :
                'bg-red-900/20 border-red-500/30'
              )}>
                <div className="flex items-center gap-3">
                  {status.pending ? (
                    <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />
                  ) : status.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <p className={clsx(
                      'font-medium',
                      status.success ? 'text-green-400' : 
                      status.pending ? 'text-yellow-400' :
                      'text-red-400'
                    )}>
                      {status.pending ? 'Активация...' : status.success ? 'Успешно!' : 'Ошибка'}
                    </p>
                    {status.message && (
                      <p className="text-sm text-gray-300 mt-1">{status.message}</p>
                    )}
                    {status.cdk && (
                      <p className="text-sm text-gray-400 mt-1">CDK: {status.cdk}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <form onSubmit={(e) => { e.preventDefault(); rechargeMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">CDK</label>
                  <input
                    type="text"
                    value={cdk}
                    onChange={(e) => setCdk(e.target.value.toUpperCase())}
                    placeholder="Введите CDK код"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Токен пользователя</label>
                  <textarea
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Введите токен пользователя ChatGPT"
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700"
                  >
                    Сброс
                  </button>
                  <button
                    type="submit"
                    disabled={rechargeMutation.isPending || !cdk.trim() || !token.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {rechargeMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Активация...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Start Recharge
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Инструкция:</h3>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>Введите CDK код (из товаров)</li>
                <li>Введите токен пользователя ChatGPT</li>
                <li>Нажмите "Start Recharge"</li>
                <li>Дождитесь завершения активации</li>
              </ol>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
