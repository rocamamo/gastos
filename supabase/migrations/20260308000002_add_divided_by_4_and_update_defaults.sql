-- Añadir columnas para el monto dividido por 4
ALTER TABLE public.expenses
ADD COLUMN amount_divided_4_cop numeric(12,2) not null default 0,
ADD COLUMN amount_divided_4_usd numeric(12,2) not null default 0;

-- Establecer amount_divided a /2 para todas las categorías EXCEPTO las de /3 y /4
UPDATE public.expenses e
SET amount_divided_cop = ROUND(e.amount_cop / 2.0, 2),
    amount_divided_usd = ROUND(e.amount_usd / 2.0, 2)
FROM public.categories c
WHERE e.category_id = c.id
AND c.name NOT IN ('Medicos', 'Médicos', 'Mercado', 'Restaurantes');

-- Establecer amount_divided_4 a /4 para Mercado y Restaurantes, y asegurar que el de /2 es 0
UPDATE public.expenses e
SET amount_divided_4_cop = ROUND(e.amount_cop / 4.0, 2),
    amount_divided_4_usd = ROUND(e.amount_usd / 4.0, 2),
    amount_divided_cop = 0,
    amount_divided_usd = 0
FROM public.categories c
WHERE e.category_id = c.id
AND c.name IN ('Mercado', 'Restaurantes');
