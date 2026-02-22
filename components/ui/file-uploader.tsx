import React, { useCallback, useState } from 'react';
import { UploadCloud, X, File as FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
    onFileSelect: (file: File | null) => void;
    className?: string;
    accept?: string;
    maxSizeMB?: number;
}

export function FileUploader({ onFileSelect, className, accept, maxSizeMB = 10 }: FileUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const processFile = (file: File) => {
        setError(null);
        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(`El archivo no debe superar los ${maxSizeMB}MB.`);
            return;
        }
        setSelectedFile(file);
        onFileSelect(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    }, [maxSizeMB, onFileSelect]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setError(null);
        onFileSelect(null);
    };

    if (selectedFile) {
        return (
            <div className={cn("relative flex items-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm", className)}>
                <FileIcon className="h-8 w-8 text-blue-500 mr-3 shrink-0" />
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{selectedFile.name}</p>
                    <p className="text-xs font-medium text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                    onClick={removeFile}
                    className="p-2 ml-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/40 text-slate-400 hover:text-red-500 transition-colors"
                    type="button"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        );
    }

    return (
        <div className={cn("w-full", className)}>
            <div
                className={cn(
                    "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all duration-200 bg-slate-50 dark:bg-slate-800/20 group",
                    dragActive
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-500/10"
                        : "border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-500",
                    error ? "border-red-500 bg-red-50 dark:bg-red-900/10" : ""
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    accept={accept}
                    onChange={handleChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className={`p-3 rounded-full mb-3 transition-colors ${dragActive ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-700 text-slate-400 group-hover:text-blue-500 shadow-sm'}`}>
                    <UploadCloud className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">
                    Haz clic o arrastra un archivo aquí
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5 text-center">
                    SVG, PNG, JPG, PDF (Max. {maxSizeMB}MB)
                </p>
            </div>
            {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        </div>
    );
}
