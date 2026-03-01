'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MultiSelect, MonthSelect } from '@/components/ui/multi-select';
import { formatCurrency } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area,
    PieChart, Pie, Cell,
} from 'recharts';
import { DollarSign, CalendarDays, TrendingUp, FilterX } from 'lucide-react';
import { useState, useMemo } from 'react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const TOP5_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc'];

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
    const [currency, setCurrency] = useState<'COP' | 'USD'>('COP');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    // Fetch filter options
    const { data: usersList } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await fetch('/api/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            return res.json();
        }
    });

    const { data: categoriesList } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await fetch('/api/categories');
            if (!res.ok) throw new Error('Failed to fetch categories');
            return res.json();
        }
    });

    // Build query string for analytics APIs
    const filterParams = useMemo(() => {
        const params = new URLSearchParams();
        selectedUsers.forEach(id => params.append('user_id', id));
        if (selectedMonth) params.append('month', selectedMonth);
        selectedCategories.forEach(id => params.append('category_id', id));
        return params.toString();
    }, [selectedUsers, selectedMonth, selectedCategories]);

    const hasFilters = selectedUsers.length > 0 || selectedMonth !== '' || selectedCategories.length > 0;

    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['analytics', 'summary', filterParams],
        queryFn: () => fetch(`/api/analytics/summary?${filterParams}`).then(res => res.json()),
        placeholderData: keepPreviousData,
    });

    const { data: monthly, isLoading: loadingMonthly } = useQuery({
        queryKey: ['analytics', 'monthly', filterParams],
        queryFn: () => fetch(`/api/analytics/monthly?${filterParams}`).then(res => res.json()),
        placeholderData: keepPreviousData,
    });

    const { data: categories, isLoading: loadingCategories } = useQuery({
        queryKey: ['analytics', 'categories', filterParams],
        queryFn: () => fetch(`/api/analytics/categories?${filterParams}`).then(res => res.json()),
        placeholderData: keepPreviousData,
    });

    const isLoading = loadingSummary || loadingMonthly || loadingCategories;
    const isInitialLoad = isLoading && !summary && !monthly && !categories;

    const clearFilters = () => {
        setSelectedUsers([]);
        setSelectedMonth('');
        setSelectedCategories([]);
    };

    const valueKey = currency === 'COP' ? 'total_cop' : 'total_usd';
    const formatVal = (val: number) => formatCurrency(val, currency);
    const formatTick = (val: number) => new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 0
    }).format(val);

    // Top 5 categories
    const top5Categories = (categories || []).slice(0, 5);


    if (isInitialLoad) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Analítico</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Visión general de gastos y estadísticas colaborativas.</p>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setCurrency('COP')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${currency === 'COP' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        COP
                    </button>
                    <button
                        onClick={() => setCurrency('USD')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${currency === 'USD' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        USD
                    </button>
                </div>
            </div>

            {/* ───── Multi-select Filters ───── */}
            <Card className="relative z-20 border-0 shadow-sm bg-white/60 dark:bg-slate-800/60 ring-1 ring-slate-200 dark:ring-slate-700/50">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-end">
                    <MultiSelect
                        label="Usuario"
                        placeholder="Todos"
                        options={(usersList || []).map((u: any) => ({ value: u.id, label: u.name }))}
                        selected={selectedUsers}
                        onChange={setSelectedUsers}
                    />
                    <MonthSelect
                        label="Mes"
                        selected={selectedMonth}
                        onChange={setSelectedMonth}
                    />
                    <MultiSelect
                        label="Categoría"
                        placeholder="Todas"
                        options={(categoriesList || []).map((c: any) => ({ value: c.id, label: c.name }))}
                        selected={selectedCategories}
                        onChange={setSelectedCategories}
                    />
                    {hasFilters && (
                        <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto shrink-0">
                            <FilterX className="h-4 w-4 mr-2" /> Limpiar
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* ───── KPI Cards ───── */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Total Gastado */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Gastado</CardTitle>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{summary ? formatVal(summary[valueKey]) : '$0'}</div>
                    </CardContent>
                </Card>

                {/* Promedio por Mes */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">Promedio por Mes</CardTitle>
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
                            <CalendarDays className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {summary ? formatVal(currency === 'COP' ? summary.monthly_average_cop : summary.monthly_average_usd) : '$0'}
                        </div>
                    </CardContent>
                </Card>

                {/* Top 5 Categorías */}
                <Card className="sm:col-span-2 lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">Top 5 Categorías</CardTitle>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                            <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {top5Categories.length > 0 ? (
                            <div className="space-y-2.5">
                                {top5Categories.map((cat: any, idx: number) => {
                                    const maxVal = top5Categories[0]?.[valueKey] || 1;
                                    const pct = (cat[valueKey] / maxVal) * 100;
                                    return (
                                        <div key={cat.category} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-400 w-4 text-right">{idx + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{cat.category}</span>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white ml-2 shrink-0">{formatVal(cat[valueKey])}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%`, backgroundColor: TOP5_COLORS[idx] }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">Sin datos</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Monthly Area Chart */}
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Acumulado Mensual</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthly} margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatTick} />
                                    <Tooltip
                                        formatter={(value: any) => [formatVal(value || 0), 'Monto Total']}
                                        labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#1e293b' }}
                                    />
                                    <Area type="monotone" dataKey={valueKey} stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Expenses by Person Bar Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Gastos por Persona</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={summary?.by_person} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatTick} />
                                    <Tooltip
                                        formatter={(value: any) => [formatVal(value || 0), 'Monto Gastado']}
                                        labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                                        cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#1e293b' }}
                                    />
                                    <Bar dataKey={valueKey} fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Category Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Distribución por Categorías</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80 w-full mt-4 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categories}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={3}
                                        dataKey={valueKey}
                                        nameKey="category"
                                    >
                                        {categories?.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: any, name?: string) => [formatVal(value || 0), name || '']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#1e293b' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
