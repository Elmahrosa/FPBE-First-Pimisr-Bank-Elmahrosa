const express = require("express");
const router = express.Router();
const axios = require("axios");

const API_KEY = "YOUR_PI_API_KEY";
const SECRET_KEY = "YOUR_PI_SECRET_KEY";

router.post("/verify-payment", async (req, res) => {
  const { paymentId } = req.body;
  try {
    const response = await axios.get(`https://api.minepi.com/v2/payments/${paymentId}`, {
      headers: {
        Authorization: `Key ${SECRET_KEY}`
      }
    });

    const payment = response.data;
    if (payment && payment.status === "completed") {
      // Simpan ke DB / verifikasi layanan
      return res.status(200).json({ success: true, payment });
    }

    return res.status(400).json({ success: false, message: "Payment not completed" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
