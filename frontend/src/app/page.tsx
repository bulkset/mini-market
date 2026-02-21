'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { activateCode, getPublicSettings } from '@/lib/api';
import { Loader2, Key, Download, FileText, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [code, setCode] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState('');
  const [storeName, setStoreName] = useState('KABAN STORE');
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Загрузка настроек магазина
    getPublicSettings().then((data) => {
      if (data.success && data.data) {
        if (data.data.store_name) setStoreName(data.data.store_name);
      }
    }).catch(console.error);
  }, []);

  const mutation = useMutation({
    mutationFn: (code: string) => activateCode(code),
    onSuccess: (data) => {
      console.log('Frontend - Activation response:', data);
      console.log('Frontend - product.instruction:', data.data?.instruction);
      console.log('Frontend - product.description:', data.data?.description);
      console.log('Frontend - product.type:', data.data?.type);
      if (data.success) {
        setProduct(data.data);
        setError('');
        setCurrentSlide(0); // Сброс слайда при новой активации
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      setError('');
      mutation.mutate(code.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
              <span className="text-xl font-semibold">{storeName}</span>
            </div>
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

              {error && (
                <div className="flex items-center gap-3 text-red-400 bg-red-900/20 p-4 rounded-xl">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

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
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle className="w-6 h-6" />
              <span className="text-lg font-medium">Код активирован</span>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
              <div>
                <span className="inline-block px-3 py-1 bg-indigo-900/50 text-indigo-400 rounded-full text-sm mb-3">
                  {product.type === 'digital_file' ? 'Файл' : product.type === 'text_instruction' ? 'Инструкция' : product.type === 'link' ? 'Ссылка' : 'Страница'}
                </span>
                <h2 className="text-2xl font-bold">{product.name}</h2>
                {product.shortDescription && (
                  <p className="text-gray-400 mt-1">{product.shortDescription}</p>
                )}
              </div>

              {/* Instruction */}
              {(product.instruction || product.description) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Инструкция</h3>
                  {(product.instructionType === 'steps' || (product.instruction && product.instruction.includes('---'))) ? (
                    // Пошаговая инструкция (слайды)
                    <div className="bg-gray-800/50 rounded-xl overflow-hidden">
                      {(() => {
                        const content = product.instruction || product.description || '';
                        const steps = content.split(/---/g).map((s: string) => s.trim()).filter((s: string) => s);
                        const currentStep = steps[currentSlide] || '';
                        return (
                          <div>
                            <div className="p-4 min-h-[150px]">
                              <ReactMarkdown>{currentStep}</ReactMarkdown>
                            </div>
                            {steps.length > 1 && (
                              <div className="flex items-center justify-between p-4 border-t border-gray-700">
                                <button
                                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                                  disabled={currentSlide === 0}
                                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                  Назад
                                </button>
                                <span className="text-sm text-gray-400">
                                  {currentSlide + 1} / {steps.length}
                                </span>
                                <button
                                  onClick={() => setCurrentSlide(Math.min(steps.length - 1, currentSlide + 1))}
                                  disabled={currentSlide === steps.length - 1}
                                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white"
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
                    // Простая инструкция
                    <div className="prose prose-invert prose-sm max-w-none p-4 bg-gray-800/50 rounded-xl">
                      <ReactMarkdown>
                        {product.instruction || product.description || ''}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* Files */}
              {product.files && product.files.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Файлы</h3>
                  <div className="space-y-2">
                    {product.files.map((file: any) => (
                      <a
                        key={file.id}
                        href={file.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-750 border border-gray-800 hover:border-gray-700 rounded-xl transition-colors group"
                      >
                        <FileText className="w-5 h-5 text-gray-500" />
                        <span className="flex-1 text-sm">{file.originalName}</span>
                        <Download className="w-4 h-4 text-gray-500 group-hover:text-white" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setProduct(null);
                  setCode('');
                  setError('');
                }}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors text-sm"
              >
                Активировать ещё код
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-500 text-sm">
          © 2024 KABAN STORE
        </div>
      </footer>
    </div>
  );
}
