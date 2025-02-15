import React, { useState } from "react";

function QuantumWallet() {
  const [publicKey, setPublicKey] = useState("");

  const registerKey = async () => {
    const response = await fetch("http://localhost:3001/registerPublicKey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKey }),
    });
    const data = await response.json();
    alert(`Public Key Registered: ${data.txHash}`);
  };

  return (
    <div>
      <h2>🔐 Quantum-Resistant Encryption</h2>
      <input placeholder="Enter Public Key" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} />
      <button onClick={registerKey}>Register Public Key</button>
    </div>
  );
}

export default QuantumWallet;
