'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { activateCode, rechargeWithToken, checkRechargeStatus, getPublicSettings } from '@/lib/api';
import { Loader2, Key, Download, FileText, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState('');
  const [storeName, setStoreName] = useState('KABAN STORE');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [taskId, setTaskId] = useState('');
  const [rechargeStatus, setRechargeStatus] = useState<any>(null);
  const [rechargeStartTs, setRechargeStartTs] = useState<number>(0);

  useEffect(() => {
    getPublicSettings().then((data) => {
      if (data.success && data.data) {
        if (data.data.store_name) setStoreName(data.data.store_name);
      }
    }).catch(console.error);
  }, []);

  const mutation = useMutation({
    mutationFn: (code: string) => activateCode(code),
    onSuccess: (data) => {
      if (data.success) {
        setProduct(data.data);
        setError('');
        setCurrentSlide(0);
        // Если товар требует токен - показать поле для ввода
        if (data.data.requiresToken) {
          setShowTokenInput(true);
        }
      } else {
        setError(data.error || 'Ошибка активации');
        setProduct(null);
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Ошибка соединения');
      setProduct(null);
    },
  });

  const rechargeMutation = useMutation({
    mutationFn: ({ gptType, token, code }: { gptType: string; token: string; code?: string }) => rechargeWithToken(gptType, token, code),
    onSuccess: (data) => {
      if (data.success) {
        setTaskId(data.data.taskId);
        setRechargeStartTs(Date.now());
        setShowTokenInput(false);
      } else {
        setError(data.error || 'Ошибка активации');
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Ошибка соединения');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      setError('');
      mutation.mutate(code.trim());
    }
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim() && product?.gptType) {
      setError('');
      rechargeMutation.mutate({ gptType: product.gptType, token: token.trim(), code: code.trim() });
    }
  };

  // Polling for recharge status (каждые 10 секунд как рекомендует API)
  useEffect(() => {
    if (!taskId) return;
    
    // Первый запрос через 3 секунды
    const timeout = setTimeout(async () => {
      try {
        const data = await checkRechargeStatus(taskId);
        if (data.success && data.data) {
          setRechargeStatus(data.data);
          if (data.data.pending) {
            // Если ещё в процессе - продолжаем опрашивать
            const interval = setInterval(async () => {
              try {
                const statusData = await checkRechargeStatus(taskId);
                if (statusData.success && statusData.data) {
                  setRechargeStatus(statusData.data);
                  if (!statusData.data.pending) {
                    clearInterval(interval);
                  }
                }
              } catch (e) {
                console.error('Status check error:', e);
              }
            }, 10000);
            return () => clearInterval(interval);
          }
        }
      } catch (e) {
        console.error('Status check error:', e);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [taskId]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="h-20 w-auto" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-xl mx-auto px-6 py-16">
        {!product ? (
          /* Activation Form */
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Активация кода</h1>
              <p className="text-gray-400">Введите ваш активационный код для получения товара</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Введите код"
                  className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg uppercase tracking-wider font-mono"
                  disabled={mutation.isPending}
                />
              </div>

              <button
                type="submit"
                disabled={mutation.isPending || !code.trim()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-medium py-4 px-6 rounded-xl transition-all"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Активация...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    Активировать
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-gray-500 text-sm">
              Код можно найти в email или на чеке
            </p>
          </div>
        ) : (
          /* Product Card */
          <div className="space-y-6 animate-fadeIn">
            {!product?.requiresToken && (
              <div className="flex items-center gap-3 text-green-400 bg-green-400/10 px-4 py-3 rounded-xl border border-green-400/20">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Код успешно активирован</span>
              </div>
            )}

            <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl">
              {/* Product Header */}
              <div className="p-6 pb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-full text-xs font-medium mb-4 border border-indigo-500/30">
                  {product.type === 'digital_file' ? (
                    <><FileText className="w-3.5 h-3.5" /> Файл</>
                  ) : product.type === 'text_instruction' ? (
                    <><FileText className="w-3.5 h-3.5" /> Инструкция</>
                  ) : product.type === 'link' ? (
                    <><Download className="w-3.5 h-3.5" /> Ссылка</>
                  ) : (
                    <><FileText className="w-3.5 h-3.5" /> Страница</>
                  )}
                </span>
                <h2 className="text-2xl font-bold text-white leading-tight">{product.name}</h2>
                {product.shortDescription && (
                  <p className="text-gray-400 mt-2 text-sm leading-relaxed">{product.shortDescription}</p>
                )}
              </div>

              {product.partnerProduct && (
                <div className="px-6 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full" />
                    <h3 className="text-sm font-semibold text-gray-300">Товар 2</h3>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl border border-emerald-500/20">
                    <p className="text-gray-200 font-semibold">{product.partnerProduct.name}</p>
                    {product.partnerProduct.shortDescription && (
                      <p className="text-gray-400 mt-1 text-sm">{product.partnerProduct.shortDescription}</p>
                    )}
                    {product.partnerCode && (
                      <div className="mt-3 p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Код товара 2</div>
                        <div className="font-mono text-sm text-white break-all">{product.partnerCode}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Product Image */}
              {product.imageUrl && (
                <div className="px-6 pb-4">
                  <div className="relative rounded-xl overflow-hidden border border-gray-700/50 shadow-lg">
                    <img src={product.imageUrl} alt={product.name} className="w-full max-h-72 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Product Description 1 */}
              {product.description && (
                <div className="px-6 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                    <h3 className="text-sm font-semibold text-gray-300">{product.productTitle1 || 'Товар 1'}</h3>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                    <p className="text-gray-300 leading-relaxed">{product.description}</p>
                  </div>
                </div>
              )}

              {/* Product Description 2 */}
              {product.description2 && (
                <div className="px-6 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                    <h3 className="text-sm font-semibold text-gray-300">{product.productTitle2 || 'Товар 2'}</h3>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                    <p className="text-gray-300 leading-relaxed">{product.description2}</p>
                  </div>
                </div>
              )}

              {/* Instruction Section */}
              {(product.instruction || product.description) && (
                <div className="px-6 pb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                    <h3 className="text-lg font-semibold text-white">Инструкция</h3>
                  </div>
                  {(product.instructionType === 'steps' || (product.instruction && product.instruction.includes('---'))) ? (
                    <div className="bg-gray-800/40 rounded-xl overflow-hidden border border-gray-700/30">
                      {(() => {
                        const content = product.instruction || product.description || '';
                        const steps = content.split(/---/g).map((s: string) => s.trim()).filter((s: string) => s);
                        const currentStep = steps[currentSlide] || '';
                        return (
                          <div>
                            <div className="p-5 min-h-[160px]">
                              <div className="markdown-content">
                                <ReactMarkdown>{currentStep}</ReactMarkdown>
                              </div>
                            </div>
                            {steps.length > 1 && (
                              <div className="flex items-center justify-between p-4 border-t border-gray-700/50 bg-gray-800/30">
                                <button
                                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                                  disabled={currentSlide === 0}
                                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-700/80 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                  Назад
                                </button>
                                <div className="flex items-center gap-2">
                                  {steps.map((_: string, idx: number) => (
                                    <div
                                      key={idx}
                                      className={`w-2 h-2 rounded-full transition-all ${
                                        idx === currentSlide 
                                          ? 'bg-indigo-500 w-6' 
                                          : idx < currentSlide 
                                            ? 'bg-green-500' 
                                            : 'bg-gray-600'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <button
                                  onClick={() => setCurrentSlide(Math.min(steps.length - 1, currentSlide + 1))}
                                  disabled={currentSlide === steps.length - 1}
                                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
                                >
                                  Далее
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="p-5 bg-gray-800/40 rounded-xl border border-gray-700/30">
                      <div className="markdown-content">
                        <ReactMarkdown>
                          {product.instruction || product.description || ''}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Files Section */}
              {product.files && product.files.length > 0 && (
                <div className="px-6 pb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full" />
                    <h3 className="text-lg font-semibold text-white">Файлы для скачивания</h3>
                  </div>
                  <div className="space-y-2">
                    {product.files.map((file: any) => (
                      <a
                        key={file.id}
                        href={file.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-gray-800/40 hover:bg-gray-700/50 border border-gray-700/30 hover:border-gray-600/50 rounded-xl transition-all group"
                      >
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="flex-1 text-sm text-gray-300 group-hover:text-white transition-colors">{file.originalName}</span>
                        <div className="w-8 h-8 bg-gray-700/50 rounded-lg flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                          <Download className="w-4 h-4 text-gray-400 group-hover:text-indigo-400" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="px-6 pb-6">
                {showTokenInput ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl">
                      <h4 className="text-indigo-400 font-medium mb-2">🔑 Введите ваш ChatGPT токен</h4>
                      <p className="text-sm text-gray-400 mb-3">Для активации подписки введите токен вашего аккаунта ChatGPT</p>
                      <textarea
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Введите токен..."
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none"
                      />
                      <button
                        onClick={() => product?.gptType && rechargeMutation.mutate({ gptType: product.gptType, token, code: code.trim() })}
                        disabled={!token.trim() || rechargeMutation.isPending || !product?.gptType}
                        className="w-full mt-3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-medium py-3 px-6 rounded-xl transition-all"
                      >
                        {rechargeMutation.isPending ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Отправка запроса...</>
                        ) : (
                          <><Key className="w-5 h-5" /> Активировать подписку</>
                        )}
                      </button>
                    </div>
                  </div>
                ) : taskId && !rechargeStatus ? (
                  /* Ожидание результата */
                  <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl">
                    <div className="flex items-center gap-3 text-indigo-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="font-medium">Активация в процессе...</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">Пожалуйста, подождите. Это может занять несколько секунд.</p>
                  </div>
                ) : taskId && rechargeStatus ? (
                  /* Результат активации - показываем успех, скрываем ошибки */
                  (rechargeStatus.pending || (!rechargeStatus.success && Date.now() - rechargeStartTs < 15000)) ? (
                    <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl">
                      <div className="flex items-center gap-3 text-indigo-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-medium">Активация в процессе...</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">Пожалуйста, подождите. Это может занять несколько секунд.</p>
                    </div>
                  ) : rechargeStatus.success ? (
                    <div className="p-4 rounded-xl border bg-green-900/20 border-green-500/30">
                      <div className="flex items-center gap-3 text-green-400 mb-2">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Подписка успешно активирована! 🎉</span>
                      </div>
                      <p className="text-sm text-gray-400">Ваша подписка ChatGPT активирована. Пожалуйста, оставьте отзыв — ваше мнение помогает нам становиться лучше ❤️</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl">
                      <div className="flex items-center gap-3 text-indigo-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-medium">Активация в процессе...</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">Пожалуйста, подождите. Это может занять несколько секунд.</p>
                    </div>
                  )
                ) : !product?.requiresToken ? (
                  /* Обычный товар - кнопка активировать ещё */
                  <button
                    onClick={() => {
                      setProduct(null);
                      setCode('');
                      setToken('');
                      setError('');
                      setShowTokenInput(false);
                      setTaskId('');
                      setRechargeStatus(null);
                    }}
                    className="w-full py-3.5 bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white border border-gray-700/30 hover:border-gray-600/50 rounded-xl transition-all text-sm font-medium"
                  >
                    Активировать ещё код
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-500 text-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Send className="w-4 h-4 text-sky-400" />
            <a href="https://t.me/kab_store" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">@kab_store</a>
          </div>
          © 2026 KABAN STORE
        </div>
      </footer>
    </div>
  );
}
