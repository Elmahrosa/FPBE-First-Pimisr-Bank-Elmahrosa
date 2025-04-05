module.exports = (app) => {
    app.post('/sell-pi', async (req, res) => {
        const { piAmount, currency } = req.body;

        // Validate input
        if (!piAmount || !currency) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        try {
            const fiatAmount = piAmount * 0.5; // Simulated rate
            // Integrate with bank payout API (e.g., Stripe)
            // Here you would call the payout API to process the transaction
            res.json({ fiatAmount });
        } catch (error) {
            console.error('Error processing sell request:', error);
            res.status(500).json({ error: 'Failed to process sell request.' });
        }
    });
};
