import { AppLayout } from '@/components/ui/Layout';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
