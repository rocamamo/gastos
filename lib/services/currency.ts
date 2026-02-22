/**
 * Fetches the exchange rate for a specific date or the latest one.
 * Uses the highly reliable currency-api by @fawazahmed0 which includes COP.
 * @param date ISO string date (YYYY-MM-DD)
 */
export async function getExchangeRate(date?: string): Promise<number> {
    try {
        // Format: https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@YYYY-MM-DD/v1/currencies/usd.json
        // For 'latest', we use the 'latest' version if possible or just the root
        const datePart = date ? `@${date}` : '';
        const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api${datePart}/v1/currencies/usd.json`;

        console.log(`Fetching exchange rate from: ${url}`);

        const response = await fetch(url, {
            next: { revalidate: date ? 86400 : 3600 } // Cache historical for 24h, latest for 1h
        });

        if (!response.ok) {
            // Fallback to the latest available if a specific date fails
            if (date) {
                console.warn(`Historical date ${date} not found, falling back to latest.`);
                return await getExchangeRate();
            }
            throw new Error('Exchange rate API returned error');
        }

        const data = await response.json();

        // The API returns an object where keys are lowercase currency codes
        const rate = data.usd?.cop || data.rates?.COP;

        if (!rate) {
            console.error('COP rate not found in API response', data);
            return 4000; // Final safety fallback
        }

        return rate;
    } catch (error) {
        console.error('Exchange rate fetch error, using global fallback:', error);
        return 4000;
    }
}

export function convertCurrency(
    amount: number,
    fromCurrency: 'COP' | 'USD',
    exchangeRateCopPerUsd: number
): { amount_cop: number, amount_usd: number } {
    if (fromCurrency === 'COP') {
        const convertedUsd = Number((amount / exchangeRateCopPerUsd).toFixed(2));
        return {
            amount_cop: amount,
            amount_usd: convertedUsd
        };
    } else {
        const convertedCop = Number((amount * exchangeRateCopPerUsd).toFixed(2));
        return {
            amount_cop: convertedCop,
            amount_usd: amount
        };
    }
}
