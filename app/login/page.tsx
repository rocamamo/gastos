'use client';

import { createClient } from '@/lib/supabase/client';
import { Receipt } from 'lucide-react';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const [error, setError] = useState(false);

    useEffect(() => {
        if (searchParams.get('error')) {
            setError(true);
        }
    }, [searchParams]);

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
            <div className="w-full max-w-md space-y-8 rounded-3xl bg-white dark:bg-slate-800 p-10 shadow-xl border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mb-6 ring-8 ring-blue-50 dark:ring-blue-900/20">
                        <Receipt className="h-8 w-8" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                        Gestor de Gastos
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 text-center px-4">
                        Ingresa para gestionar y analizar tus gastos compartidos de forma colaborativa.
                    </p>
                </div>

                {error && (
                    <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-red-900/30 dark:text-red-400" role="alert">
                        <span className="font-medium">Error de autenticación.</span> Por favor, intenta de nuevo.
                    </div>
                )}

                <button
                    onClick={handleGoogleLogin}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-white dark:bg-slate-800 px-4 py-4 border border-slate-200 dark:border-slate-600 shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md transition-all duration-200 ring-2 ring-transparent focus:ring-blue-500 outline-none"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Continuar con Google
                </button>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginContent />
        </Suspense>
    );
}
