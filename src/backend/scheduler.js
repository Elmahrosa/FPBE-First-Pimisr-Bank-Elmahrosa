const cron = require('node-cron');
const fetch = require('node-fetch');

module.exports = (app) => {
    cron.schedule('0 0 1 * *', async () => {
        try {
            const response = await fetch('http://localhost:3000/buy-pi', {
                method: 'POST',
                body: JSON.stringify({ amount: 5000, currency: 'usd' }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Failed to execute scheduled buy.');
            }
        } catch (error) {
            console.error('Error in scheduled task:', error);
        }
    });
};
