const express = require("express");
const noble = require("@abandonware/noble");

const app = express();
const PORT = 3001;

noble.on("stateChange", (state) => {
  if (state === "poweredOn") {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on("discover", (device) => {
  console.log(`🔗 Ditemukan node: ${device.address}`);
});

app.get("/send-mesh-transaction/:data", (req, res) => {
  const transactionData = req.params.data;
  noble.on("discover", (device) => {
    device.connect((err) => {
      if (!err) {
        console.log(`📡 Mengirim transaksi ke node: ${device.address}`);
        device.write(transactionData, true);
        res.json({ status: "Transaction Sent via Mesh Network" });
      }
    });
  });
});

app.listen(PORT, () => console.log(`🌍 Mesh Network aktif di port ${PORT}`));
