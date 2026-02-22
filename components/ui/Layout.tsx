'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from 'next-themes';
import {
    LayoutDashboard,
    Receipt,
    LogOut,
    Menu,
    Sun,
    Moon,
    User
} from 'lucide-react';

export function AppLayout({ children }: { children: ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user, profile, signOut } = useAuth();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Gastos', href: '/expenses', icon: Receipt },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Mobile sidebar backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-center p-6 border-b border-slate-200 dark:border-slate-700">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                        Gestor de Gastos
                    </h1>
                </div>

                <nav className="p-4 space-y-2 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                                    }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Main content */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Top header */}
                <header className="flex items-center justify-between h-16 px-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 lg:px-8 z-10">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -ml-2 text-slate-500 focus:outline-none lg:hidden hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="flex-1 lg:hidden text-center font-bold text-slate-800 dark:text-white">
                        Gastos
                    </div>

                    <div className="flex items-center space-x-3 ml-auto">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors focus:outline-none"
                            aria-label="Toggle theme"
                        >
                            <Sun className="h-5 w-5 hidden dark:block" />
                            <Moon className="h-5 w-5 block dark:hidden" />
                        </button>

                        <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full border border-slate-200 dark:border-slate-600">
                            <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {profile?.name || user?.email?.split('@')[0] || 'Usuario'}
                            </span>
                        </div>

                        <button
                            onClick={signOut}
                            className="flex items-center p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors focus:outline-none"
                            title="Cerrar sesión"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Main scrollable area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 lg:p-8">
                    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
