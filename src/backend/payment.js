const express = require('express');
const stripe = require('stripe')('your_stripe_secret_key');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

const buyPi = async (fiatAmount) => {
    // Simulated rate: 1 USD = 2 Pi
    return fiatAmount * 2;
};

app.post('/buy-pi', async (req, res) => {
    const { amount, currency, userPublicKey } = req.body;

    // Validate input
    if (!amount || !currency || !userPublicKey) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            payment_method_types: ['card'],
        });

        const piAmount = await buyPi(amount / 100); // Convert cents to dollars

        // Respond with the client secret and Pi amount
        res.json({ clientSecret: paymentIntent.client_secret, piAmount });
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: 'Payment processing failed. Please try again later.' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
