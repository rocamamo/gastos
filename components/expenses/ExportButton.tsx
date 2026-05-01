'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function ExportButton() {
    const searchParams = useSearchParams();
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const params = new URLSearchParams(searchParams.toString());
            // We don't want page and per_page for export
            params.delete('page');
            params.delete('per_page');

            const url = `/api/export/excel?${params.toString()}`;
            
            // Create a link and trigger download
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al exportar el archivo');
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            
            // Get filename from header if possible
            const disposition = response.headers.get('Content-Disposition');
            let filename = `gastos_${new Date().toISOString().split('T')[0]}.xlsx`;
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            
            toast.success('Exportación completada');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('No se pudo exportar el archivo Excel');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button 
            variant="outline" 
            onClick={handleExport} 
            disabled={isExporting}
            className="gap-2"
        >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exportando...' : 'Exportar Excel'}
        </Button>
    );
}
