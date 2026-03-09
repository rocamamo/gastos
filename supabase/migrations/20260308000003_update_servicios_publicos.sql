-- Configurar amount_divided_4 a /4 para "Servicios Públicos" y resetear amount_divided (/2) a 0
UPDATE public.expenses e
SET amount_divided_4_cop = ROUND(e.amount_cop / 4.0, 2),
    amount_divided_4_usd = ROUND(e.amount_usd / 4.0, 2),
    amount_divided_cop = 0,
    amount_divided_usd = 0
FROM public.categories c
WHERE e.category_id = c.id
AND c.name = 'Servicios Públicos';
