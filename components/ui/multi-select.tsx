'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

// ─── Multi-select dropdown component ──────────────────────────────────────────
interface MultiSelectProps {
    label: string;
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
}

export function MultiSelect({ label, options, selected, onChange, placeholder = 'Todos' }: MultiSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const displayText = selected.length === 0
        ? placeholder
        : selected.length <= 2
            ? options.filter(o => selected.includes(o.value)).map(o => o.label).join(', ')
            : `${selected.length} seleccionados`;

    return (
        <div className="w-full space-y-1.5" ref={ref}>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium text-left"
                >
                    <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-900 dark:text-white truncate'}>
                        {displayText}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
                </button>
                {selected.length > 0 && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onChange([]); }}
                        className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
                {open && (
                    <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg py-1 animate-in fade-in-0 zoom-in-95">
                        {options.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-slate-400">Sin opciones</div>
                        ) : (
                            options.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => toggle(opt.value)}
                                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors
                                        ${selected.includes(opt.value)
                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        }`}
                                >
                                    <span className={`flex items-center justify-center shrink-0 h-4 w-4 rounded border transition-colors
                                        ${selected.includes(opt.value)
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                        {selected.includes(opt.value) && <Check className="h-3 w-3 text-white" />}
                                    </span>
                                    <span className="truncate">{opt.label}</span>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Month single-select (calendar-style grid) ───────────────────────────────
interface MonthSelectProps {
    label: string;
    selected: string;
    onChange: (value: string) => void;
}

export function MonthSelect({ label, selected, onChange }: MonthSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const currentYear = new Date().getFullYear();
    const [viewYear, setViewYear] = useState(currentYear);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const handleSelect = (month: string) => {
        if (selected === month) {
            onChange('');
        } else {
            onChange(month);
        }
        setOpen(false);
    };

    const formatMonthDisplay = (m: string) => {
        const [y, monthNum] = m.split('-');
        return `${monthNames[parseInt(monthNum) - 1]} ${y}`;
    };

    const displayText = selected ? formatMonthDisplay(selected) : 'Todos';

    return (
        <div className="w-full space-y-1.5" ref={ref}>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium text-left"
                >
                    <span className={!selected ? 'text-slate-400' : 'text-slate-900 dark:text-white truncate'}>
                        {displayText}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
                </button>
                {selected && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onChange(''); }}
                        className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
                {open && (
                    <div className="absolute z-50 mt-1 w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg p-3 animate-in fade-in-0 zoom-in-95">
                        <div className="flex items-center justify-between mb-3">
                            <button type="button" onClick={() => setViewYear(viewYear - 1)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <ChevronDown className="h-4 w-4 rotate-90 text-slate-500" />
                            </button>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{viewYear}</span>
                            <button type="button" onClick={() => setViewYear(viewYear + 1)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <ChevronDown className="h-4 w-4 -rotate-90 text-slate-500" />
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                            {monthNames.map((name, idx) => {
                                const monthStr = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
                                const isSelected = selected === monthStr;
                                return (
                                    <button
                                        key={monthStr}
                                        type="button"
                                        onClick={() => handleSelect(monthStr)}
                                        className={`py-2 px-1 text-xs font-medium rounded-lg transition-colors
                                            ${isSelected
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                            }`}
                                    >
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
