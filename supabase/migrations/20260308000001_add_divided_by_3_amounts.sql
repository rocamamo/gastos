-- Añadir columnas para el monto dividido por 3
ALTER TABLE public.expenses
ADD COLUMN amount_divided_3_cop numeric(12,2) not null default 0,
ADD COLUMN amount_divided_3_usd numeric(12,2) not null default 0;

-- Actualizar registros existentes que coincidan con la categoría aplicable (Médicos / Medicos)
UPDATE public.expenses e
SET amount_divided_3_cop = ROUND(e.amount_cop / 3.0, 2),
    amount_divided_3_usd = ROUND(e.amount_usd / 3.0, 2)
FROM public.categories c
WHERE e.category_id = c.id
AND c.name IN ('Medicos', 'Médicos');
