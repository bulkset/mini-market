'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { Loader2, KeyRound } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        router.push('/admin');
      } else {
        setError(result.error || 'Ошибка входа');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Mini Market
            </h1>
            <p className="text-white/80 text-sm mt-1">
              Админ-панель
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-xl">
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-3 border-2 border-gray-600 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Пароль
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 border-gray-600 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </button>
          </form>

          <div className="px-8 py-4 bg-gray-700/50 text-center">
            <a href="/" className="text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400">
              ← Вернуться на главную
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
