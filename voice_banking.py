from fastapi import FastAPI, HTTPException
import speech_recognition as sr
from transformers import pipeline
from web3 import Web3
from stellar_sdk import Server, Keypair, TransactionBuilder, Network
import os

app = FastAPI()

# 🔹 NLP Model
nlp_pipeline = pipeline("text-classification", model="facebook/bart-large-mnli")

# 🔹 Ethereum Blockchain
ETH_RPC_URL = "https://mainnet.infura.io/v3/YOUR_INFURA_KEY"
w3 = Web3(Web3.HTTPProvider(ETH_RPC_URL))

# 🔹 Stellar Blockchain
stellar_server = Server("https://horizon.stellar.org")

# 🔹 Voice Command Processing
def process_voice_command(command: str):
    result = nlp_pipeline(command)
    intent = result[0]['label']
    return intent

@app.post("/voice_command/")
async def voice_command(audio_data: bytes):
    recognizer = sr.Recognizer()
    with sr.AudioFile(audio_data) as source:
        audio = recognizer.record(source)
    try:
        command_text = recognizer.recognize_google(audio, language="id-ID")
        intent = process_voice_command(command_text)

        if intent == "TRANSFER_FUNDS":
            return {"action": "Transfer Dana", "details": command_text}
        elif intent == "CHECK_BALANCE":
            return {"action": "Cek Saldo", "details": command_text}
        else:
            return {"action": "Tidak Diketahui", "details": command_text}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
