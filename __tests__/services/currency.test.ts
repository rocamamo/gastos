import { convertCurrency } from '@/lib/services/currency';

describe('Currency Service', () => {
    it('converts COP to USD correctly', () => {
        const rate = 4000;
        const result = convertCurrency(80000, 'COP', rate);
        expect(result.amount_cop).toBe(80000);
        expect(result.amount_usd).toBe(20);
    });

    it('converts USD to COP correctly', () => {
        const rate = 4000;
        const result = convertCurrency(50, 'USD', rate);
        expect(result.amount_cop).toBe(200000);
        expect(result.amount_usd).toBe(50);
    });
});
