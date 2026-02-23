'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema, type ExpenseInput } from '@/lib/validations/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUploader } from '@/components/ui/file-uploader';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function ExpenseForm({
    onSuccess,
    initialData
}: {
    onSuccess?: () => void;
    initialData?: any;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [displayAmount, setDisplayAmount] = useState('');
    const queryClient = useQueryClient();
    const supabase = createClient();

    const isEditing = !!initialData;

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data, error } = await supabase.from('categories').select('*').order('name');
            if (error) throw error;
            return data;
        }
    });

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        setValue,
        watch,
    } = useForm<ExpenseInput>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            currency: initialData?.currency || 'COP',
            expense_date: initialData?.expense_date || new Date().toISOString().split('T')[0],
            amount: initialData?.amount || 0,
            category_id: initialData?.category_id || '',
            detail: initialData?.detail || '',
        },
    });

    useEffect(() => {
        if (initialData?.amount) {
            const formatted = new Intl.NumberFormat('es-CO', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(initialData.amount);
            setDisplayAmount(formatted);
        }
    }, [initialData]);

    const formatNumber = (value: string) => {
        // Remove everything except numbers and decimal separator
        const numbers = value.replace(/[^\d]/g, '');
        if (!numbers) return '';

        const amount = parseInt(numbers) / 100;
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const [exchangeRate, setExchangeRate] = useState<number | null>(null);
    const [isLoadingRate, setIsLoadingRate] = useState(false);

    const watchedAmount = watch('amount');
    const watchedCurrency = watch('currency');
    const watchedDate = watch('expense_date');

    useEffect(() => {
        const fetchRate = async () => {
            setIsLoadingRate(true);
            try {
                const res = await fetch(`/api/exchange-rate?date=${watchedDate}`);
                const data = await res.json();
                if (data.rate) {
                    setExchangeRate(data.rate);
                }
            } catch (err) {
                console.error('Error fetching rate:', err);
            } finally {
                setIsLoadingRate(false);
            }
        };

        fetchRate();
    }, [watchedDate]);

    const getConvertedPreview = () => {
        if (!watchedAmount || !exchangeRate) return null;

        if (watchedCurrency === 'COP') {
            const inUsd = (watchedAmount / exchangeRate).toFixed(2);
            return `≈ $${inUsd} USD (Tasa: $${exchangeRate.toLocaleString('es-CO')})`;
        } else {
            const inCop = (watchedAmount * exchangeRate).toLocaleString('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
            });
            return `≈ ${inCop} (Tasa: $${exchangeRate.toLocaleString('es-CO')})`;
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^\d]/g, '');
        const numericValue = parseInt(rawValue || '0') / 100;

        setValue('amount', numericValue, { shouldValidate: true });
        setDisplayAmount(formatNumber(rawValue));
    };

    const uploadFile = async (currentFile: File) => {
        const formData = new FormData();
        formData.append('file', currentFile);

        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Upload failed');
        }

        return await res.json();
    };

    const expenseMutation = useMutation({
        mutationFn: async (data: ExpenseInput) => {
            const url = isEditing ? `/api/expenses/${initialData.id}` : '/api/expenses';
            const method = isEditing ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(isEditing ? 'Error al actualizar' : 'Error al crear');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success(isEditing ? 'Gasto actualizado correctamente' : 'Gasto registrado correctamente');
            reset();
            setFile(null);
            setDisplayAmount('');
            onSuccess?.();
        },
        onError: (error: any) => {
            toast.error(error.message || 'Error al procesar el gasto');
        }
    });

    const onSubmit = async (data: ExpenseInput) => {
        setUploadError(null);
        let attachment_url = initialData?.attachment_url || '';

        if (file) {
            setIsUploading(true);
            try {
                const uploadResult = await uploadFile(file);
                attachment_url = uploadResult.url;
            } catch (err: any) {
                setUploadError(err.message);
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        expenseMutation.mutate({ ...data, attachment_url });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Categoría</label>
                <select
                    {...register('category_id')}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 transition-all font-medium"
                >
                    <option value="">Selecciona una categoría</option>
                    {categories?.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
                {errors.category_id && <p className="text-xs font-medium text-red-500">{errors.category_id.message}</p>}
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Detalle del gasto</label>
                <Input placeholder="Ej. Almuerzo con el equipo" {...register('detail')} />
                {errors.detail && <p className="text-xs font-medium text-red-500">{errors.detail.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Monto</label>
                    <Input
                        placeholder="0,00"
                        value={displayAmount}
                        onChange={handleAmountChange}
                        className="text-right font-mono"
                    />
                    <input type="hidden" {...register('amount', { valueAsNumber: true })} />
                    {getConvertedPreview() && (
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 animate-in fade-in slide-in-from-top-1">
                            {getConvertedPreview()}
                        </p>
                    )}
                    {errors.amount && <p className="text-xs font-medium text-red-500">{errors.amount.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Moneda</label>
                    <select
                        {...register('currency')}
                        className="flex h-11 w-full rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 transition-all font-medium"
                    >
                        <option value="COP">COP</option>
                        <option value="USD">USD</option>
                    </select>
                    {errors.currency && <p className="text-xs font-medium text-red-500">{errors.currency.message}</p>}
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha del gasto</label>
                <Input type="date" {...register('expense_date')} />
                {errors.expense_date && <p className="text-xs font-medium text-red-500">{errors.expense_date.message}</p>}
            </div>

            <div className="space-y-1.5 pt-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {isEditing ? 'Cambiar archivo Adjunto (Opcional)' : 'Archivo Adjunto (Opcional)'}
                </label>
                <FileUploader onFileSelect={setFile} accept="image/*,application/pdf" />
                {initialData?.attachment_url && !file && (
                    <p className="text-xs text-slate-500 mt-1">Ya tienes un archivo adjunto. Sube uno nuevo para reemplazarlo.</p>
                )}
                {uploadError && <p className="text-xs font-medium text-red-500">{uploadError}</p>}
            </div>

            <div className="pt-4">
                <Button type="submit" disabled={isSubmitting || isUploading} className="w-full h-12 text-base">
                    {isSubmitting || isUploading ? 'Procesando...' : (isEditing ? 'Actualizar Gasto' : 'Guardar Gasto')}
                </Button>
            </div>
        </form>
    );
}
