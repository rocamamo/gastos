'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area,
    PieChart, Pie, Cell,
} from 'recharts';
import { Activity, CreditCard, DollarSign, Users } from 'lucide-react';
import { useState } from 'react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function DashboardPage() {
    const [currency, setCurrency] = useState<'COP' | 'USD'>('COP');

    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['analytics', 'summary'],
        queryFn: () => fetch('/api/analytics/summary').then(res => res.json()),
    });

    const { data: monthly, isLoading: loadingMonthly } = useQuery({
        queryKey: ['analytics', 'monthly'],
        queryFn: () => fetch('/api/analytics/monthly').then(res => res.json()),
    });

    const { data: categories, isLoading: loadingCategories } = useQuery({
        queryKey: ['analytics', 'categories'],
        queryFn: () => fetch('/api/analytics/categories').then(res => res.json()),
    });

    const isLoading = loadingSummary || loadingMonthly || loadingCategories;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const valueKey = currency === 'COP' ? 'total_cop' : 'total_usd';
    const formatVal = (val: number) => formatCurrency(val, currency);
    const formatTick = (val: number) => new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 0
    }).format(val);

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

            {/* KPI Cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">Promedio por Persona</CardTitle>
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
                            <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{summary ? formatVal(currency === 'COP' ? summary.average_cop : summary.average_usd) : '$0'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Transacciones</CardTitle>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                            <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {summary ? summary.by_person.reduce((acc: number, p: any) => acc + p.count, 0) : 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">Categoría Mayor</CardTitle>
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                            <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {categories && categories.length > 0 ? categories[0].category : 'N/A'}
                        </div>
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
                                        formatter={(value: any) => [formatVal(value || 0), 'Total']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
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
                                        formatter={(value: any) => [formatVal(value || 0), 'Gastado']}
                                        cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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
                                        formatter={(value: any) => [formatVal(value || 0), 'Total']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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
