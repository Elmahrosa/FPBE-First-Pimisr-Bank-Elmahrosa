const StellarSdk = require('stellar-sdk');
const server = new StellarSdk.Server('https://api.testnet.minepi.com');

export const sendPi = async (fromPassphrase, toAddress, amount) => {
    try {
        const keypair = StellarSdk.Keypair.fromSecret(fromPassphrase);
        const account = await server.loadAccount(keypair.publicKey());
        const tx = new StellarSdk.TransactionBuilder(account, { fee: StellarSdk.BASE_FEE, networkPassphrase: 'Pi Testnet' })
            .addOperation(StellarSdk.Operation.payment({ destination: toAddress, asset: StellarSdk.Asset.native(), amount }))
            .setTimeout(30)
            .build();
        tx.sign(keypair);
        return await server.submitTransaction(tx);
    } catch (error) {
        console.error('Error sending Pi:', error);
        throw new Error('Transaction failed. Please try again.');
    }
};
