export const generateTaxReport = (transactions) => {
    try {
        return {
            gains: transactions.reduce((sum, t) => sum + t.profit, 0),
        };
    } catch (error) {
        console.error('Error generating tax report:', error);
        throw new Error('Failed to generate tax report.');
    }
};
