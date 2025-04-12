import React from "react";

const PiPayment = ({ amount, memo, onSuccess }) => {
  const handlePay = async () => {
    try {
      const payment = await window.Pi.createPayment({
        amount,
        memo,
        metadata: { orderId: "BANK1234" },
      });

      payment.onReadyForServerApproval(async (paymentId) => {
        const res = await fetch("http://localhost:5000/api/pi/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });

        const data = await res.json();
        if (data.success) onSuccess(data.payment);
      });

      payment.onCancel(() => console.log("Payment canceled"));
      payment.onError((err) => console.error(err));
    } catch (error) {
      console.error("Pi Payment error:", error);
    }
  };

  return <button onClick={handlePay}>Bayar dengan Pi</button>;
};

export default PiPayment;
