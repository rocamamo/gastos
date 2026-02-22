'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, Trash2, Paperclip, FilterX, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ExpensesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [filters, setFilters] = useState({ month: '', category_id: '', currency: '' });
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await fetch('/api/categories');
            if (!res.ok) throw new Error('Failed to fetch categories');
            return res.json();
        }
    });

    const fetchExpenses = async () => {
        const params = new URLSearchParams();
        if (filters.month) params.append('month', filters.month);
        if (filters.category_id) params.append('category_id', filters.category_id);
        if (filters.currency) params.append('currency', filters.currency);

        const res = await fetch(`/api/expenses?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch expenses');
        return res.json();
    };

    const { data: expenses, isLoading, isError } = useQuery({
        queryKey: ['expenses', filters],
        queryFn: fetchExpenses,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        }
    });

    const handleDelete = (id: string, ownerId: string) => {
        if (user?.id !== ownerId) return alert('Solo el creador puede eliminar este gasto.');
        if (confirm('¿Estás seguro de eliminar este gasto?')) {
            deleteMutation.mutate(id);
        }
    };

    const clearFilters = () => setFilters({ month: '', category_id: '', currency: '' });

    const handleEdit = (expense: any) => {
        setSelectedExpense(expense);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setSelectedExpense(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Registro de Gastos</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona, añade y busca los gastos compartidos.</p>
                </div>
                <Button onClick={handleNew} className="sm:w-auto w-full gap-2">
                    <Plus className="h-5 w-5" /> Nuevo Gasto
                </Button>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-sm bg-white/60 dark:bg-slate-800/60 ring-1 ring-slate-200 dark:ring-slate-700/50">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-end">
                    <div className="w-full space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Mes</label>
                        <Input type="month" value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value })} />
                    </div>
                    <div className="w-full space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Categoría</label>
                        <select
                            value={filters.category_id}
                            onChange={e => setFilters({ ...filters, category_id: e.target.value })}
                            className="flex h-11 w-full rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium"
                        >
                            <option value="">Todas</option>
                            {categories?.map((cat: any) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Moneda</label>
                        <select
                            value={filters.currency}
                            onChange={e => setFilters({ ...filters, currency: e.target.value })}
                            className="flex h-11 w-full rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium"
                        >
                            <option value="">Todas</option>
                            <option value="COP">COP</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>
                    <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
                        <FilterX className="h-4 w-4 mr-2" /> Limpiar
                    </Button>
                </CardContent>
            </Card>

            {/* Data Table / List */}
            <div className="grid gap-4">
                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                ) : isError ? (
                    <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/10 rounded-2xl">
                        Error cargando los gastos. Por favor, intenta de nuevo.
                    </div>
                ) : expenses?.length === 0 ? (
                    <div className="px-6 py-16 text-center bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <Search className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No hay gastos encontrados</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            Aún no hay registros de gastos que coincidan con estos filtros.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden bg-white dark:bg-slate-800/40 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 uppercase">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 font-semibold rounded-tl-xl">Fecha</th>
                                        <th scope="col" className="px-6 py-4 font-semibold">Usuario</th>
                                        <th scope="col" className="px-6 py-4 font-semibold">Categoría</th>
                                        <th scope="col" className="px-6 py-4 font-semibold">Detalle</th>
                                        <th scope="col" className="px-6 py-4 font-semibold text-right">Monto (COP/USD)</th>
                                        <th scope="col" className="px-6 py-4 font-semibold text-center">Adjunto</th>
                                        <th scope="col" className="px-6 py-4 font-semibold text-right rounded-tr-xl">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {expenses?.map((expense: any) => (
                                        <tr key={expense.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">{formatDate(expense.expense_date)}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{expense.users?.name || 'Usuario'}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {expense.categories?.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{expense.detail}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {formatCurrency(Number(expense.amount_cop), 'COP')}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {formatCurrency(Number(expense.amount_usd), 'USD')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {expense.attachment_url ? (
                                                    <a href={expense.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-full transition-colors" title="Ver adjunto">
                                                        <Paperclip className="h-4 w-4" />
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-600">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {user?.id === expense.user_id && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEdit(expense)}
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(expense.id, expense.user_id)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedExpense ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}
            >
                <ExpenseForm
                    initialData={selectedExpense}
                    onSuccess={() => setIsModalOpen(false)}
                />
            </Modal>
        </div>
    );
}
