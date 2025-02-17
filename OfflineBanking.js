import React, { useState } from "react";
import { ethers } from "ethers";
import axios from "axios";

const OfflineBanking = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [transactionData, setTransactionData] = useState("");

  const sendTransactionViaSMS = async () => {
    await axios.post("http://localhost:8000/send_sms_transaction/", {
      phone_number: phoneNumber,
      transaction_data: transactionData,
    });
  };

  return (
    <div>
      <h1>📶 Offline Transactions</h1>
      <input type="text" placeholder="No HP Tujuan" onChange={(e) => setPhoneNumber(e.target.value)} />
      <input type="text" placeholder="Data Transaksi" onChange={(e) => setTransactionData(e.target.value)} />
      <button onClick={sendTransactionViaSMS}>Kirim via SMS</button>
    </div>
  );
};

export default OfflineBanking;
