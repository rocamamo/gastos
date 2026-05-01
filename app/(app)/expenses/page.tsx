'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { MultiSelect, MonthSelect } from '@/components/ui/multi-select';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExportButton } from '@/components/expenses/ExportButton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, Trash2, Paperclip, FilterX, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const ALLOWED_PER_PAGE = new Set([10, 20, 50]);
const DEFAULT_PER_PAGE = 20;

function parsePositiveInt(value: string | null): number | null {
    if (!value) return null;
    if (!/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
    return parsed;
}

type ExpenseRow = {
    id: string;
    user_id: string;
    category_id: string;
    expense_date: string;
    detail: string;
    amount_cop: number;
    amount_usd: number;
    amount_divided_cop?: number | null;
    amount_divided_usd?: number | null;
    amount_divided_3_cop?: number | null;
    amount_divided_3_usd?: number | null;
    amount_divided_4_cop?: number | null;
    amount_divided_4_usd?: number | null;
    attachment_url?: string | null;
    users?: { name?: string | null } | null;
    categories?: { name?: string | null } | null;
};

type ExpensesApiResponse = {
    data: ExpenseRow[];
    pagination: { total: number; page: number; per_page: number; total_pages: number };
    totals: {
        amount_cop: number;
        amount_usd: number;
        amount_divided_cop: number;
        amount_divided_usd: number;
        amount_divided_3_cop: number;
        amount_divided_3_usd: number;
        amount_divided_4_cop: number;
        amount_divided_4_usd: number;
    };
};

type Category = { id: string; name: string };
type UserListItem = { id: string; name: string };

const AttachmentLink = ({ url }: { url: string }) => {
    const [sizeMB, setSizeMB] = useState<string | null>(null);

    useEffect(() => {
        const fetchSize = async () => {
            try {
                const res = await fetch(url, { method: 'HEAD' });
                const length = res.headers.get('content-length');
                if (length) {
                    const bytes = parseInt(length, 10);
                    const mb = (bytes / (1024 * 1024)).toFixed(2);
                    setSizeMB(mb);
                }
            } catch (err) {
                console.error("Failed to fetch attachment size", err);
            }
        };
        fetchSize();
    }, [url]);

    return (
        <div className="flex flex-col items-center justify-center gap-1">
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-full transition-colors" title="Ver adjunto">
                <Paperclip className="h-4 w-4" />
            </a>
            {sizeMB && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{sizeMB} MB</span>
            )}
        </div>
    );
};

function ExpensesPageContent() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRow | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchText, setSearchText] = useState('');
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const page = useMemo(() => parsePositiveInt(searchParams.get('page')) ?? 1, [searchParams]);
    const perPageFromUrl = useMemo(() => parsePositiveInt(searchParams.get('per_page')), [searchParams]);
    const per_page = useMemo(() => {
        const candidate = perPageFromUrl ?? DEFAULT_PER_PAGE;
        return ALLOWED_PER_PAGE.has(candidate) ? candidate : DEFAULT_PER_PAGE;
    }, [perPageFromUrl]);

    const { data: categories } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await fetch('/api/categories');
            if (!res.ok) throw new Error('Failed to fetch categories');
            return res.json();
        }
    });

    const { data: usersList } = useQuery<UserListItem[]>({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await fetch('/api/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            return res.json();
        }
    });

    // Initialize filter state from URL (deep links + back/forward support).
    useEffect(() => {
        const month = searchParams.get('month') ?? '';
        const categoryIds = searchParams.getAll('category_id');
        const userIds = searchParams.getAll('user_id');
        const search = searchParams.get('search') ?? '';

        // Only set when different to avoid loops.
        setSelectedMonth((prev) => (prev === month ? prev : month));
        setSelectedCategories((prev) => (prev.join('|') === categoryIds.join('|') ? prev : categoryIds));
        setSelectedUsers((prev) => (prev.join('|') === userIds.join('|') ? prev : userIds));
        setSearchText((prev) => (prev === search ? prev : search));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.toString()]);

    const filterParams = useMemo(() => {
        const params = new URLSearchParams();
        if (selectedMonth) params.append('month', selectedMonth);
        selectedCategories.forEach(id => params.append('category_id', id));
        selectedUsers.forEach(id => params.append('user_id', id));
        if (searchText) params.append('search', searchText);
        return params.toString();
    }, [selectedMonth, selectedCategories, selectedUsers, searchText]);

    // Debounce URL updates for search to avoid rewriting on every keypress.
    // Si el texto ya coincide con la URL, no llamar a setFiltersInUrl: esa función
    // borra siempre `page` y anulaba ?page=2 cuando el usuario paginaba antes de 350ms.
    useEffect(() => {
        const handle = setTimeout(() => {
            const inUrl = new URLSearchParams(window.location.search).get('search') ?? '';
            if (searchText === inUrl) return;
            setFiltersInUrl({ search: searchText });
        }, 350);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchText]);

    const listParams = useMemo(() => {
        const params = new URLSearchParams(filterParams);
        params.set('page', String(page));
        params.set('per_page', String(per_page));
        return params.toString();
    }, [filterParams, page, per_page]);

    const { data: expensesResponse, isLoading, isError, isFetching } = useQuery<ExpensesApiResponse>({
        queryKey: ['expenses', filterParams, page, per_page],
        queryFn: async () => {
            const res = await fetch(`/api/expenses?${listParams}`);
            if (!res.ok) throw new Error('Failed to fetch expenses');
            return res.json();
        },
        placeholderData: keepPreviousData,
    });

    const expenses = expensesResponse?.data ?? [];
    const pagination = expensesResponse?.pagination ?? { total: 0, page, per_page, total_pages: 0 };
    const totals = expensesResponse?.totals ?? {
        amount_cop: 0,
        amount_usd: 0,
        amount_divided_cop: 0,
        amount_divided_usd: 0,
        amount_divided_3_cop: 0,
        amount_divided_3_usd: 0,
        amount_divided_4_cop: 0,
        amount_divided_4_usd: 0,
    };

    const setPaginationInUrl = (next: { page?: number; per_page?: number }) => {
        const params = new URLSearchParams(searchParams.toString());
        const nextPage = next.page ?? page;
        const nextPerPage = next.per_page ?? per_page;

        params.set('page', String(nextPage));
        params.set('per_page', String(nextPerPage));

        // keep URL clean when defaults
        if (nextPage === 1) params.delete('page');
        if (nextPerPage === DEFAULT_PER_PAGE) params.delete('per_page');

        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
    };

    const setFiltersInUrl = (next: {
        month?: string;
        categoryIds?: string[];
        userIds?: string[];
        search?: string;
    }) => {
        const params = new URLSearchParams(searchParams.toString());

        const month = next.month ?? selectedMonth;
        const categoryIds = next.categoryIds ?? selectedCategories;
        const userIds = next.userIds ?? selectedUsers;
        const search = next.search ?? searchText;

        // month
        if (month) params.set('month', month);
        else params.delete('month');

        // multi
        params.delete('category_id');
        categoryIds.forEach((id) => params.append('category_id', id));
        params.delete('user_id');
        userIds.forEach((id) => params.append('user_id', id));

        // search
        if (search) params.set('search', search);
        else params.delete('search');

        // filter change => page 1
        params.delete('page');

        // keep per_page clean when default
        if (per_page === DEFAULT_PER_PAGE) params.delete('per_page');

        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
    };

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('No se pudo eliminar el gasto');
            if (res.status === 204) return null;
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success('Gasto eliminado exitosamente');
            setIsDeleteModalOpen(false);
            setExpenseToDelete(null);
        },
        onError: (error: unknown) => {
            toast.error(error instanceof Error ? error.message : 'Error eliminando el gasto');
        }
    });

    const handleDelete = (expense: ExpenseRow) => {
        if (user?.id !== expense.user_id) {
            toast.error('Solo el creador puede eliminar este gasto.');
            return;
        }

        setExpenseToDelete(expense);
        setIsDeleteModalOpen(true);
    };

    const hasFilters = selectedMonth !== '' || selectedCategories.length > 0 || selectedUsers.length > 0 || searchText !== '';

    const clearFilters = () => {
        setSelectedMonth('');
        setSelectedCategories([]);
        setSelectedUsers([]);
        setSearchText('');
        setFiltersInUrl({ month: '', categoryIds: [], userIds: [], search: '' });
    };

    const handleEdit = (expense: ExpenseRow) => {
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
                <div className="flex items-center gap-2 sm:w-auto w-full">
                    <ExportButton />
                    <Button onClick={handleNew} className="flex-1 sm:flex-initial gap-2">
                        <Plus className="h-5 w-5" /> Nuevo Gasto
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="relative z-20 border-0 shadow-sm bg-white/60 dark:bg-slate-800/60 ring-1 ring-slate-200 dark:ring-slate-700/50">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-end">
                    <MonthSelect
                        label="Mes"
                        selected={selectedMonth}
                        onChange={(m) => {
                            setSelectedMonth(m);
                            setFiltersInUrl({ month: m });
                        }}
                    />
                    <MultiSelect
                        label="Categoría"
                        placeholder="Todas"
                        options={(categories || []).map((cat) => ({ value: cat.id, label: cat.name }))}
                        selected={selectedCategories}
                        onChange={(ids) => {
                            setSelectedCategories(ids);
                            setFiltersInUrl({ categoryIds: ids });
                        }}
                    />
                    <MultiSelect
                        label="Usuario"
                        placeholder="Todos"
                        options={(usersList || []).map((u) => ({ value: u.id, label: u.name }))}
                        selected={selectedUsers}
                        onChange={(ids) => {
                            setSelectedUsers(ids);
                            setFiltersInUrl({ userIds: ids });
                        }}
                    />
                    <div className="w-full space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Buscar Detalle</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Escribe para buscar..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    {hasFilters && (
                        <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto shrink-0">
                            <FilterX className="h-4 w-4 mr-2" /> Limpiar
                        </Button>
                    )}
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
                                        <th scope="col" className="px-6 py-4 font-semibold text-right">Monto Total (COP/USD)</th>
                                        <th scope="col" className="px-6 py-4 font-semibold text-right">Monto ÷ 2 (COP/USD)</th>
                                        <th scope="col" className="px-6 py-4 font-semibold text-right">Monto ÷ 3 (COP/USD)</th>
                                        <th scope="col" className="px-6 py-4 font-semibold text-right">Monto ÷ 4 (COP/USD)</th>
                                        <th scope="col" className="px-6 py-4 font-semibold text-center">Adjunto</th>
                                        <th scope="col" className="px-6 py-4 font-semibold text-right rounded-tr-xl">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {expenses?.map((expense: ExpenseRow) => (
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
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                                    {formatCurrency(Number(expense.amount_divided_cop || 0), 'COP')}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {formatCurrency(Number(expense.amount_divided_usd || 0), 'USD')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                                    {formatCurrency(Number(expense.amount_divided_3_cop || 0), 'COP')}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {formatCurrency(Number(expense.amount_divided_3_usd || 0), 'USD')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                                    {formatCurrency(Number(expense.amount_divided_4_cop || 0), 'COP')}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {formatCurrency(Number(expense.amount_divided_4_usd || 0), 'USD')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {expense.attachment_url ? (
                                                    <AttachmentLink url={expense.attachment_url} />
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
                                                                onClick={() => handleDelete(expense)}
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
                                <tfoot className="bg-slate-50/80 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-slate-900 dark:text-white text-right">TOTAL</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-slate-900 dark:text-white">
                                                {formatCurrency(Number(totals.amount_cop) || 0, 'COP')}
                                            </div>
                                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                                {formatCurrency(Number(totals.amount_usd) || 0, 'USD')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-slate-800 dark:text-slate-200 font-medium">
                                                {formatCurrency(Number(totals.amount_divided_cop) || 0, 'COP')}
                                            </div>
                                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                                {formatCurrency(Number(totals.amount_divided_usd) || 0, 'USD')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-slate-800 dark:text-slate-200 font-medium">
                                                {formatCurrency(Number(totals.amount_divided_3_cop) || 0, 'COP')}
                                            </div>
                                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                                {formatCurrency(Number(totals.amount_divided_3_usd) || 0, 'USD')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-slate-800 dark:text-slate-200 font-medium">
                                                {formatCurrency(Number(totals.amount_divided_4_cop) || 0, 'COP')}
                                            </div>
                                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                                {formatCurrency(Number(totals.amount_divided_4_usd) || 0, 'USD')}
                                            </div>
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {!isLoading && !isError && pagination.total > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                        {(() => {
                            const from = (pagination.page - 1) * pagination.per_page + 1;
                            const to = Math.min(pagination.page * pagination.per_page, pagination.total);
                            return (
                                <span>
                                    Mostrando <span className="font-semibold">{from}</span>–<span className="font-semibold">{to}</span> de{' '}
                                    <span className="font-semibold">{pagination.total}</span>
                                    {isFetching ? <span className="ml-2 text-xs text-slate-400">(actualizando…)</span> : null}
                                </span>
                            );
                        })()}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Por página</span>
                            <select
                                value={per_page}
                                onChange={(e) => {
                                    const next = Number(e.target.value);
                                    setPaginationInUrl({ per_page: next, page: 1 });
                                }}
                                className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm"
                            >
                                {[10, 20, 50].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setPaginationInUrl({ page: Math.max(1, page - 1) })}
                                disabled={page <= 1}
                            >
                                Anterior
                            </Button>
                            <div className="text-sm text-slate-700 dark:text-slate-200">
                                Página <span className="font-semibold">{pagination.page}</span> de <span className="font-semibold">{pagination.total_pages || 1}</span>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setPaginationInUrl({ page: Math.min(pagination.total_pages || 1, page + 1) })}
                                disabled={pagination.total_pages === 0 || page >= pagination.total_pages}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                </div>
            )}

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

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirmar eliminación"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                            ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
                        </p>
                        {expenseToDelete && (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-500">Detalle:</span>
                                    <span className="text-slate-900 dark:text-white font-medium">{expenseToDelete.detail}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-500">Monto:</span>
                                    <span className="text-slate-900 dark:text-white font-medium">
                                        {formatCurrency(Number(expenseToDelete.amount_cop), 'COP')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-500">Fecha:</span>
                                    <span className="text-slate-900 dark:text-white font-medium">{formatDate(expenseToDelete.expense_date)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsDeleteModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            onClick={() => expenseToDelete && deleteMutation.mutate(expenseToDelete.id)}
                            disabled={deleteMutation.isPending || !expenseToDelete}
                        >
                            {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default function ExpensesPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" aria-label="Cargando" />
                </div>
            }
        >
            <ExpensesPageContent />
        </Suspense>
    );
}
