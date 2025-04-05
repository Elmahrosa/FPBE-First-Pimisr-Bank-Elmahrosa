const CACHE_DURATION = 3600000; // 1 hour in milliseconds
let exchangeRateCache = {};
let lastFetchTime = 0;

// Function to fetch exchange rate from the API
const fetchExchangeRate = async (currency) => {
    const currentTime = Date.now();

    // Check if the rate is cached and still valid
    if (exchangeRateCache[currency] && (currentTime - lastFetchTime < CACHE_DURATION)) {
        return exchangeRateCache[currency];
    }

    try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
        
        if (!res.ok) {
            throw new Error('Failed to fetch exchange rates');
        }

        const data = await res.json();
        exchangeRateCache = data.rates; // Cache the rates
        lastFetchTime = currentTime; // Update the last fetch time

        return exchangeRateCache[currency];
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        // Fallback to a default rate if the API call fails
        return 1; // Assuming 1:1 rate if API fails
    }
};

// Function to localize Pi price based on the currency
export const localizePiPrice = async (piAmount, currency) => {
    const rate = await fetchExchangeRate(currency);
    return (piAmount * rate).toFixed(2); // Pi price in local currency
};
