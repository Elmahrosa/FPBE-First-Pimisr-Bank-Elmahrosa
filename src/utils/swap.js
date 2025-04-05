export const swapPi = async (piAmount, targetCrypto) => {
    try {
        const rate = 0.00001; // Simulated Pi to ETH rate
        return piAmount * rate;
    } catch (error) {
        console.error('Error swapping Pi:', error);
        throw new Error('Swap operation failed.');
    }
};
