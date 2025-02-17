import React, { useState } from "react";
import { ethers } from "ethers";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

const VoiceBanking = () => {
  const [balance, setBalance] = useState("0");

  const { transcript, resetTranscript } = useSpeechRecognition();

  const handleCommand = async () => {
    if (transcript.includes("cek saldo")) {
      const provider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_ETH_RPC_URL);
      const contract = new ethers.Contract(process.env.REACT_APP_CONTRACT_ADDRESS, ABI, provider);
      const userBalance = await contract.checkBalance();
      setBalance(ethers.utils.formatEther(userBalance));
    }
    resetTranscript();
  };

  return (
    <div>
      <h1>🔊 Voice-Activated Banking</h1>
      <button onClick={SpeechRecognition.startListening}>Mulai Bicara</button>
      <p>Perintah: {transcript}</p>
      <button onClick={handleCommand}>Proses</button>
      <h3>Saldo: {balance} ETH</h3>
    </div>
  );
};

export default VoiceBanking;
