import React, { useState } from "react";

function VirtualWallet() {
  const [iban, setIban] = useState("");
  const [currency, setCurrency] = useState("");
  const [balance, setBalance] = useState(null);

  const createIBAN = async () => {
    const response = await fetch("http://localhost:3001/registerIBAN", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iban, currency }),
    });
    const data = await response.json();
    alert(`IBAN Created: ${data.txHash}`);
  };

  const getBalance = async () => {
    const response = await fetch(`http://localhost:3001/getBalance/${iban}`);
    const data = await response.json();
    setBalance(data.balance);
  };

  return (
    <div>
      <h2>🏦 Multi-Currency Virtual IBAN</h2>
      <input placeholder="IBAN" value={iban} onChange={(e) => setIban(e.target.value)} />
      <input placeholder="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
      <button onClick={createIBAN}>Create IBAN</button>
      <button onClick={getBalance}>Check Balance</button>
      {balance !== null && <p>Balance: {balance}</p>}
    </div>
  );
}

export default VirtualWallet;
