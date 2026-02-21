'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LayoutDashboard, Package, Key, BarChart3, Settings, LogOut, Menu, X, Loader2, Plus, Search, Edit, Trash2, FileText, Save
} from 'lucide-react';
import { getInstructions, createInstruction, updateInstruction, deleteInstruction, logout } from '@/lib/api';
import clsx from 'clsx';

const navigation = [
  { name: 'Дашборд', href: '/admin', icon: LayoutDashboard },
  { name: 'Товары', href: '/admin/products', icon: Package },
  { name: 'Инструкции', href: '/admin/instructions', icon: FileText },
  { name: 'Коды', href: '/admin/codes', icon: Key },
  { name: 'Статистика', href: '/admin/stats', icon: BarChart3 },
  { name: 'Настройки', href: '/admin/settings', icon: Settings },
];

export default function InstructionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/admin/instructions');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/admin/login');
  }, [router]);

  useEffect(() => { setCurrentPath(window.location.pathname); }, []);

  const { data: instructionsData, isLoading } = useQuery({ queryKey: ['instructions', search], queryFn: () => getInstructions({ search }) });

  const createMutation = useMutation({ 
    mutationFn: createInstruction, 
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['instructions'] }); 
      setShowModal(false);
      setEditingInstruction(null);
    } 
  });
  
  const updateMutation = useMutation({ 
    mutationFn: ({ id, data }: { id: string; data: any }) => updateInstruction(id, data), 
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['instructions'] }); 
      setShowModal(false);
      setEditingInstruction(null);
    } 
  });
  
  const deleteMutation = useMutation({ mutationFn: deleteInstruction, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instructions'] }) });

  const handleLogout = async () => { await logout(); router.push('/admin/login'); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      sortOrder: Number(formData.get('sortOrder')) || 0,
      isActive: formData.get('isActive') === 'on',
    };
    
    if (editingInstruction) {
      updateMutation.mutate({ id: editingInstruction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (instruction: any) => {
    setEditingInstruction(instruction);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingInstruction(null);
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
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-gray-900 border-b border-gray-700"><button onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6 text-gray-300" /></button><span className="text-lg font-semibold text-white">Инструкции</span><div className="w-10" /></div>
        <main className="p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div><h1 className="text-3xl font-bold text-white">Инструкции</h1><p className="mt-1 text-gray-400">Управление инструкциями</p></div>
            <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"><Plus className="w-5 h-5" />Добавить инструкцию</button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Поиск инструкций..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          </div>

          <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-700">
            {isLoading ? <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50"><tr><th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-400">Название</th><th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-400">Сортировка</th><th className="px-6 py-4 text-center text-xs font-medium uppercase text-gray-400">Статус</th><th className="px-6 py-4 text-center text-xs font-medium uppercase text-gray-400">Действия</th></tr></thead>
                  <tbody className="divide-y divide-gray-700">
                    {instructionsData?.data?.instructions?.length > 0 ? instructionsData.data.instructions.map((instruction: any) => (<tr key={instruction.id} className="hover:bg-gray-700/30"><td className="px-6 py-4"><div className="font-medium text-white">{instruction.name}</div></td><td className="px-6 py-4 text-gray-400">{instruction.sortOrder}</td><td className="px-6 py-4 text-center"><span className={clsx('px-2 py-1 rounded-full text-xs', instruction.isActive ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400')}>{instruction.isActive ? 'Активна' : 'Неактивна'}</span></td><td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => openEditModal(instruction)} className="p-2 text-blue-400 hover:bg-gray-700 rounded-lg"><Edit className="w-4 h-4" /></button><button onClick={() => deleteMutation.mutate(instruction.id)} className="p-2 text-red-400 hover:bg-gray-700 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>)) : (<tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Инструкции не найдены</td></tr>)}
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
              <h2 className="text-xl font-semibold text-white">{editingInstruction ? 'Редактировать инструкцию' : 'Добавить инструкцию'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Название *</label><input name="title" required defaultValue={editingInstruction?.title} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Содержание (Markdown)</label><textarea name="content" rows={8} defaultValue={editingInstruction?.content} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono text-sm" /></div>
              <div><label className="block text-sm font-medium mb-2 text-gray-300">Сортировка</label><input name="sortOrder" type="number" defaultValue={editingInstruction?.sortOrder || 0} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" name="isActive" defaultChecked={editingInstruction?.isActive !== false} className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-indigo-600" />
                <label htmlFor="isActive" className="text-sm text-gray-300">Активна</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800">Отмена</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">{createMutation.isPending || updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
