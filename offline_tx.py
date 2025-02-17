from fastapi import FastAPI, HTTPException
from Crypto.Cipher import AES
import base64
import requests
import os

app = FastAPI()

# 🔹 Enkripsi AES untuk keamanan transaksi SMS
def encrypt_message(message, key):
    cipher = AES.new(key, AES.MODE_EAX)
    nonce = cipher.nonce
    ciphertext, tag = cipher.encrypt_and_digest(message.encode('utf-8'))
    return base64.b64encode(nonce + ciphertext).decode('utf-8')

# 🔹 API untuk mengirim transaksi melalui SMS
@app.post("/send_sms_transaction/")
async def send_sms_transaction(phone_number: str, transaction_data: str):
    try:
        encrypted_tx = encrypt_message(transaction_data, b'secretkey1234567')  # Kunci 16-byte
        response = requests.post(
            "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json",
            auth=("YOUR_ACCOUNT_SID", "YOUR_AUTH_TOKEN"),
            data={"To": phone_number, "From": "YOUR_TWILIO_NUMBER", "Body": encrypted_tx}
        )
        return {"status": "Transaction Sent via SMS", "response": response.json()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
