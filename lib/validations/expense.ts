import { z } from 'zod';

export const expenseSchema = z.object({
    category_id: z.string().uuid({ message: "ID de categoría inválido" }),
    detail: z.string().min(3, { message: "El detalle debe tener al menos 3 caracteres" }),
    amount: z.number().positive({ message: "El monto debe ser mayor a 0" }),
    currency: z.enum(['COP', 'USD'], { message: "La moneda es requerida" } as any),
    expense_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Formato de fecha inválido" }),
    attachment_url: z.string().url().optional().or(z.literal('')),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
