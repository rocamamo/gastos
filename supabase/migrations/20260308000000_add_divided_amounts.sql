-- Añadir columnas para el monto dividido
ALTER TABLE public.expenses
ADD COLUMN amount_divided_cop numeric(12,2) not null default 0,
ADD COLUMN amount_divided_usd numeric(12,2) not null default 0;

-- Actualizar registros existentes que coincidan con las categorías aplicables
UPDATE public.expenses e
SET amount_divided_cop = ROUND(e.amount_cop / 2, 2),
    amount_divided_usd = ROUND(e.amount_usd / 2, 2)
FROM public.categories c
WHERE e.category_id = c.id
AND c.name IN ('Colegio', 'Administración', 'Empleada', 'Profesoras');
