import React, { useState } from "react";
import WalletConnect from "@walletconnect/client";
import { ethers } from "ethers";

const WalletConnectComponent = () => {
  const [connector, setConnector] = useState(null);
  const [account, setAccount] = useState("");

  const connectWallet = async () => {
    const newConnector = new WalletConnect({
      bridge: "https://bridge.walletconnect.org"
    });

    if (!newConnector.connected) {
      await newConnector.createSession();
    }

    newConnector.on("connect", (error, payload) => {
      if (error) throw error;
      const { accounts } = payload.params[0];
      setAccount(accounts[0]);
    });

    setConnector(newConnector);
  };

  const sendTransaction = async () => {
    if (!connector) return alert("Hubungkan Wallet dulu!");
    
    const tx = {
      from: account,
      to: "0xReceiverAddressHere",
      value: ethers.utils.parseEther("0.01").toHexString()
    };

    const result = await connector.sendTransaction(tx);
    console.log("Transaction Sent!", result);
  };

  return (
    <div>
      <h2>WalletConnect Integration</h2>
      {account ? <p>Terhubung: {account}</p> : <button onClick={connectWallet}>Hubungkan Wallet</button>}
      <button onClick={sendTransaction} disabled={!account}>Kirim 0.01 ETH</button>
    </div>
  );
};

export default WalletConnectComponent;
