export const queueTx = (tx) => {
    localStorage.setItem('pendingTx', JSON.stringify(tx));
};
