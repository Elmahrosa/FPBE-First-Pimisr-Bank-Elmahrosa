from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, Column, String, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import uuid
import random

app = FastAPI()
DATABASE_URL = "sqlite:///./ibandb.db"

# Setup Database
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Model IBAN Virtual
class VirtualIBAN(Base):
    __tablename__ = "virtual_ibans"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    iban = Column(String, unique=True, index=True)
    currency = Column(String)
    balance = Column(Float, default=0.0)
    user_id = Column(String)

Base.metadata.create_all(bind=engine)

# 🔹 Generate IBAN Virtual
def generate_iban():
    return f"DE{random.randint(10**8, 10**9)}{random.randint(10**10, 10**11)}"

@app.post("/create_iban/")
async def create_iban(user_id: str, currency: str):
    db = SessionLocal()
    iban = generate_iban()
    new_iban = VirtualIBAN(iban=iban, currency=currency, user_id=user_id)
    db.add(new_iban)
    db.commit()
    db.refresh(new_iban)
    db.close()
    return {"message": "IBAN Created!", "iban": iban, "currency": currency}

@app.get("/get_balance/{iban}")
async def get_balance(iban: str):
    db = SessionLocal()
    iban_data = db.query(VirtualIBAN).filter(VirtualIBAN.iban == iban).first()
    db.close()
    if not iban_data:
        raise HTTPException(status_code=404, detail="IBAN Not Found")
    return {"iban": iban_data.iban, "balance": iban_data.balance, "currency": iban_data.currency}
