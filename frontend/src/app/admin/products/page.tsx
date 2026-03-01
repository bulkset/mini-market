'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LayoutDashboard, Package, Tag, Key, BarChart3, Settings, LogOut, Menu, X, Loader2, Plus, Search, Edit, Trash2, FileText, Image, History
} from 'lucide-react';
import { getProducts, getCategories, getInstructions, createProduct, updateProduct, deleteProduct, generateCodes, importPairedCodes, getStats, logout } from '@/lib/api';
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

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/admin/products');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [bulkPartnerProductId, setBulkPartnerProductId] = useState('');
  const [bulkPrimaryCodes, setBulkPrimaryCodes] = useState('');
  const [bulkPartnerCodes, setBulkPartnerCodes] = useState('');
  const [bulkImportError, setBulkImportError] = useState('');
  const [bulkImportResult, setBulkImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [refillProduct, setRefillProduct] = useState<any>(null);
  const [refillPartnerProductId, setRefillPartnerProductId] = useState('');
  const [refillPrimaryCodes, setRefillPrimaryCodes] = useState('');
  const [refillPartnerCodes, setRefillPartnerCodes] = useState('');
  const [refillError, setRefillError] = useState('');
  const [refillResult, setRefillResult] = useState<{ imported: number; errors: string[] } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/admin/login');
  }, [router]);

  useEffect(() => { setCurrentPath(window.location.pathname); }, []);

  const { data: productsData, isLoading } = useQuery({ queryKey: ['products', search], queryFn: () => getProducts({ search }) });
  const { data: instructionsData } = useQuery({ queryKey: ['instructions'], queryFn: () => getInstructions() });
  const { data: statsData } = useQuery({ queryKey: ['stats'], queryFn: () => getStats() });

  const createMutation = useMutation({ mutationFn: createProduct, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setShowModal(false); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => updateProduct(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setShowModal(false); setEditingProduct(null); } });
  const generateCodesMutation = useMutation({ mutationFn: generateCodes, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); queryClient.invalidateQueries({ queryKey: ['codes'] }); setShowModal(false); } });
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      alert('Ошибка удаления: ' + (error.response?.data?.error || error.message));
    }
  });

  const handleLogout = async () => { await logout(); router.push('/admin/login'); };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleOpenRefill = (product: any) => {
    setRefillProduct(product);
    setRefillPartnerProductId('');
    setRefillPrimaryCodes('');
    setRefillPartnerCodes('');
    setRefillError('');
    setRefillResult(null);
    setShowRefillModal(true);
  };

  const handleRefillSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRefillError('');
    setRefillResult(null);

    if (!refillProduct?.id) {
      setRefillError('Не выбран товар');
      return;
    }
    if (!refillPartnerProductId) {
      setRefillError('Выберите товар 2 для парного импорта');
      return;
    }
    if (!refillPrimaryCodes.trim() || !refillPartnerCodes.trim()) {
      setRefillError('Нужны оба списка кодов (товар 1 и товар 2)');
      return;
    }

    try {
      const response = await importPairedCodes({
        productId: String(refillProduct.id),
        partnerProductId: refillPartnerProductId,
        primaryCodesText: refillPrimaryCodes,
        partnerCodesText: refillPartnerCodes
      });
      if (response.success) {
        setRefillResult(response.data);
        queryClient.invalidateQueries({ queryKey: ['stats'] });
      } else {
        setRefillError(response.error || 'Ошибка импорта');
      }
    } catch (error: any) {
      setRefillError(error.response?.data?.error || error.message || 'Ошибка импорта');
    }
  };

  const productStatsMap = new Map<string, { total: number; used: number }>(
    (statsData?.data?.byProduct || []).map((p: any) => [
      String(p.productId || p.product?.id),
      { total: Number(p.total || 0), used: Number(p.used || 0) }
    ])
  );

  const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productId = editingProduct?.id || formData.get('productId') as string;
    const generateCodesChecked = formData.get('generateCodes') === 'on';
    
    const productData = {
      name: formData.get('name') as string,
      type: formData.get('type') as string || 'digital_file',
      gptType: formData.get('gptType') as string || undefined,
      categoryId: formData.get('categoryId') as string || undefined,
      instructionTemplateId: formData.get('instructionTemplateId') as string || undefined,
      imageUrl: formData.get('imageUrl') as string || undefined,
      description: formData.get('description') as string || undefined,
      description2: formData.get('description2') as string || undefined,
      productTitle1: formData.get('productTitle1') as string || undefined,
      productTitle2: formData.get('productTitle2') as string || undefined,
      shortDescription: formData.get('shortDescription') as string || undefined,
      status: (formData.get('status') as string) || 'active',
    };
    
    const hasBulkPairs = bulkPrimaryCodes.trim().length > 0 || bulkPartnerCodes.trim().length > 0;

    if (editingProduct?.id) {
      setBulkImportError('');
      setBulkImportResult(null);
      updateMutation.mutate({ id: editingProduct.id, data: productData });
      return;
    }
    
    if (productId && generateCodesChecked) {
      generateCodesMutation.mutate({
        productId,
        count: Number(formData.get('codesCount')) || 10,
        prefix: formData.get('codesPrefix') as string || undefined,
        length: Number(formData.get('codesLength')) || 12,
        usageLimit: Number(formData.get('codesLimit')) || 1,
      });
    } else if (generateCodesChecked) {
      const product = await createMutation.mutateAsync(productData);
      const productIdStr = String(product.data.id);
      generateCodesMutation.mutate({
        productId: productIdStr,
        count: Number(formData.get('codesCount')) || 10,
        prefix: formData.get('codesPrefix') as string || undefined,
        length: Number(formData.get('codesLength')) || 12,
        usageLimit: Number(formData.get('codesLimit')) || 1,
      });
    } else {
      const created = await createMutation.mutateAsync(productData);
      const createdProductId = String(created.data.id);

      if (hasBulkPairs) {
        setBulkImportError('');
        setBulkImportResult(null);

        if (!bulkPartnerProductId) {
          setBulkImportError('Выберите товар 2 для парного импорта');
          return;
        }

        if (!bulkPrimaryCodes.trim() || !bulkPartnerCodes.trim()) {
          setBulkImportError('Нужны оба списка кодов (товар 1 и товар 2)');
          return;
        }

        try {
          const response = await importPairedCodes({
            productId: createdProductId,
            partnerProductId: bulkPartnerProductId,
            primaryCodesText: bulkPrimaryCodes,
            partnerCodesText: bulkPartnerCodes
          });
          if (response.success) {
            setBulkImportResult(response.data);
          } else {
            setBulkImportError(response.error || 'Ошибка импорта');
          }
        } catch (error: any) {
          setBulkImportError(error.response?.data?.error || error.message || 'Ошибка импорта');
        }
      }
    }
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
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-gray-900 border-b border-gray-700"><button onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6 text-gray-300" /></button><span className="text-lg font-semibold text-white">Товары</span><div className="w-10" /></div>
        <main className="p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div><h1 className="text-3xl font-bold text-white">Товары</h1><p className="mt-1 text-gray-400">Управление товарами</p></div>
            <button onClick={() => { setEditingProduct(null); setShowModal(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"><Plus className="w-5 h-5" />Добавить товар</button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Поиск товаров..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          </div>

          <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-700">
            {isLoading ? <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50"><tr><th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Название</th><th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Инструкция</th><th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase">Остаток</th><th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase">Статус</th><th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase">Действия</th></tr></thead>
                  <tbody className="divide-y divide-gray-700">
                    {productsData?.data?.products?.length > 0 ? productsData.data.products.map((product: any) => {
                      const stats = productStatsMap.get(String(product.id));
                      const total = stats?.total ?? 0;
                      const used = stats?.used ?? 0;
                      const remaining = Math.max(total - used, 0);
                      return (
                        <tr key={product.id} className="hover:bg-gray-700/30">
                          <td className="px-6 py-4"><div className="font-medium text-white">{product.name}</div></td>
                          <td className="px-6 py-4 text-gray-400">{product.instructionTemplate?.name || '—'}</td>
                          <td className="px-6 py-4 text-center text-gray-300">{remaining}</td>
                          <td className="px-6 py-4 text-center"><span className={clsx('px-2 py-1 rounded-full text-xs', product.status === 'active' ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400')}>{product.status === 'active' ? 'Активен' : 'Скрыт'}</span></td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleOpenRefill(product)} className="px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700">Пополнить</button>
                              <button onClick={() => handleEditProduct(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => deleteMutation.mutate(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (<tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Товары не найдены</td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">{editingProduct ? 'Редактировать товар' : 'Добавить товар'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Название *</label><input name="name" required defaultValue={editingProduct?.name || ''} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Тип товара</label><select name="type" defaultValue={editingProduct?.type || 'digital_file'} onChange={(e) => { const form = e.target.form; if (form) { const typeSelect = form.querySelector('[name="gptType"]') as HTMLSelectElement; if (typeSelect) typeSelect.style.display = e.target.value === 'chatgpt_token' ? 'block' : 'none'; }}} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"><option value="digital_file">Обычный товар (файл/код)</option><option value="text_instruction">Текстовая инструкция</option><option value="link">Ссылка</option><option value="chatgpt_token">ChatGPT токен (активация)</option></select></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Тип ChatGPT</label><select name="gptType" defaultValue={editingProduct?.gptType || ''} style={{ display: editingProduct?.type === 'chatgpt_token' ? 'block' : 'none' }} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"><option value="">Выберите тип...</option><option value="plus_1m">ChatGPT Plus 1 месяц</option><option value="plus_12m">ChatGPT Plus 12 месяцев</option><option value="pro_1m">ChatGPT Pro 1 месяц</option><option value="go_12m">ChatGPT GO 12 месяцев</option></select></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Инструкция</label><select name="instructionTemplateId" defaultValue={editingProduct?.instructionTemplateId || ''} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"><option value="">Без инструкции</option>{instructionsData?.data?.instructions?.map((inst: any) => (<option key={inst.id} value={inst.id}>{inst.name}</option>))}</select></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Краткое описание</label><input name="shortDescription" defaultValue={editingProduct?.shortDescription || ''} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-2 text-gray-300">Название товара 1</label><input name="productTitle1" defaultValue={editingProduct?.productTitle1 || ''} placeholder="Товар 1" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
                <div><label className="block text-sm font-medium mb-2 text-gray-300">Название товара 2</label><input name="productTitle2" defaultValue={editingProduct?.productTitle2 || ''} placeholder="Товар 2" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Изображение (URL)</label><input name="imageUrl" defaultValue={editingProduct?.imageUrl || ''} placeholder="https://example.com/image.jpg" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Товар 1</label><textarea name="description" rows={3} defaultValue={editingProduct?.description || ''} className="w-full px-4 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl text-white" /></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Товар 2</label><textarea name="description2" rows={3} defaultValue={editingProduct?.description2 || ''} placeholder="Второй товар" className="w-full px-4 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl text-white" /></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Статус</label><select name="status" defaultValue={editingProduct?.status || 'active'} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"><option value="active">Активный</option><option value="hidden">Скрытый</option></select></div>
              
              {!editingProduct && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <input type="checkbox" id="generateCodes" name="generateCodes" className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-indigo-600" />
                  <label htmlFor="generateCodes" className="text-sm text-gray-300">Сгенерировать коды автоматически</label>
                </div>
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div><label className="block text-xs text-gray-500 mb-1">Количество кодов</label><input name="codesCount" type="number" defaultValue="10" min="1" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Префикс</label><input name="codesPrefix" placeholder="Напр. PROD-" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Длина кода</label><input name="codesLength" type="number" defaultValue="12" min="4" max="32" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Лимит использования</label><input name="codesLimit" type="number" defaultValue="1" min="1" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm" /></div>
                  </div>
                </div>
              )}

              {!editingProduct && (
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Парный импорт (товар 1 + товар 2)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Товар 2 (партнёр)</label>
                      <select
                        value={bulkPartnerProductId}
                        onChange={(e) => setBulkPartnerProductId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm"
                      >
                        <option value="">Выберите товар</option>
                        {productsData?.data?.products?.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Товар 1 — это создаваемый товар</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Список кодов товара 1</label>
                      <textarea
                        value={bulkPrimaryCodes}
                        onChange={(e) => setBulkPrimaryCodes(e.target.value)}
                        rows={6}
                        placeholder="https://one.google.com/offer/XXX\nhttps://one.google.com/offer/YYY"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs font-mono resize-none"
                      />
                      <p className="mt-1 text-xs text-gray-500">Строк: {bulkPrimaryCodes.split('\n').filter(Boolean).length}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Список кодов товара 2</label>
                      <textarea
                        value={bulkPartnerCodes}
                        onChange={(e) => setBulkPartnerCodes(e.target.value)}
                        rows={6}
                        placeholder="52362dfd-...-первый\n52362dfd-...-второй"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs font-mono resize-none"
                      />
                      <p className="mt-1 text-xs text-gray-500">Строк: {bulkPartnerCodes.split('\n').filter(Boolean).length}</p>
                    </div>
                  </div>
                  {bulkImportError && (
                    <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                      {bulkImportError}
                    </div>
                  )}
                  {bulkImportResult && (
                    <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-xl text-green-400 text-sm">
                      Загружено пар: {bulkImportResult.imported}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingProduct(null); }} className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800">Отмена</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">{createMutation.isPending || updateMutation.isPending ? (editingProduct ? 'Сохранение...' : 'Создание...') : (editingProduct ? 'Сохранить' : 'Создать')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRefillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl w-full max-w-3xl border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Пополнить товар: {refillProduct?.name}</h2>
              <button onClick={() => { setShowRefillModal(false); setRefillError(''); setRefillResult(null); }} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRefillSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Товар 2 (партнёр) *</label>
                <select
                  value={refillPartnerProductId}
                  onChange={(e) => setRefillPartnerProductId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                  required
                >
                  <option value="">Выберите товар</option>
                  {productsData?.data?.products?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Список кодов товара 1</label>
                  <textarea
                    value={refillPrimaryCodes}
                    onChange={(e) => setRefillPrimaryCodes(e.target.value)}
                    rows={10}
                    placeholder="https://one.google.com/offer/XXX\nhttps://one.google.com/offer/YYY"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Строк: {refillPrimaryCodes.split('\n').filter(Boolean).length}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Список кодов товара 2</label>
                  <textarea
                    value={refillPartnerCodes}
                    onChange={(e) => setRefillPartnerCodes(e.target.value)}
                    rows={10}
                    placeholder="52362dfd-...-первый\n52362dfd-...-второй"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Строк: {refillPartnerCodes.split('\n').filter(Boolean).length}</p>
                </div>
              </div>

              {refillError && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {refillError}
                </div>
              )}

              {refillResult && (
                <div className="p-4 rounded-xl bg-green-900/20 border border-green-500/30">
                  <div className="text-green-400 font-medium">Загружено пар: {refillResult.imported}</div>
                  {refillResult.errors?.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-400 space-y-1 max-h-24 overflow-y-auto">
                      {refillResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowRefillModal(false); setRefillError(''); setRefillResult(null); }} className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800">Отмена</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700">Импортировать</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
