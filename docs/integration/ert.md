# 🏦 FPBE + Elmahrosa Reserve Token ($ERT) Integration

## 🔗 Overview

This module integrates **Elmahrosa Reserve Token ($ERT)** into the **First Pi Bank Elmahrosa (FPBE)** banking flow. $ERT is the official stable reserve asset of Elmahrosa International, built on **Solana** and backed by **TEOS**, **TUT**, and locked liquidity pools.

Unlike speculative tokens, $ERT is designed for **stability, trust, and utility**—serving as the financial backbone of Elmahrosa’s Smart City, cultural, and digital service projects.

---

## 🧩 Integration Features

- ✅ Display $ERT balance alongside Pi, TEOS, and TUT
- ✅ Show $ERT as fixed $1 equivalent (reserve-backed)
- ✅ Enable Pi → $ERT swap via presale logic
- ✅ Track TEOS vault contributions for ERT conversion
- ✅ Mint Genesis NFT badges for early contributors
- ✅ Log referrals and apply ERT bonuses via Supabase

---

## 🔐 Wallets & Pool Links

- **$ERT Mint Wallet**: [`DHJkzU4yVpBMtDGs78hmw5KSYvfpQ2Jfqd8j7y8fSZ9m`](https://solscan.io/token/DHJkzU4yVpBMtDGs78hmw5KSYvfpQ2Jfqd8j7y8fSZ9m)  
- **TEOS Mint Wallet**: [`AhXBUQmbhv9dNoZCiMYmXF4Gyi1cjQthWHFhTL2CJaSo`](https://solscan.io/token/AhXBUQmbhv9dNoZCiMYmXF4Gyi1cjQthWHFhTL2CJaSo) 
 - **TUTTEOS Mint Wallet**: [`Gvce3ukeWYDprBeVtYrqUVdgMcRGADWSkX5vCKMQG3b5`]
(https://solscan.io/token/Gvce3ukeWYDprBeVtYrqUVdgMcRGADWSkX5vCKMQG3b5) 
- **Locked Pool**: [`Dexlab`](https://app.dexlab.space/pools/842ViJHy1o3omwLxaVoP4J6EaWPjn2R4uwHh1238FxVB/manage-liquidity)  
- **ERT Portal**: [`ert.teosegypt.com`](https://ert.teosegypt.com)

---

## 🛠 Supabase Tables (Suggested)

### `ert_contributions`
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| wallet_address | TEXT | Contributor wallet |
| amount_usdc | NUMERIC | Amount sent |
| timestamp | TIMESTAMP | Contribution time |
| status | TEXT | `pending`, `confirmed`, `minted` |

### `ert_referrals`
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| referrer_wallet | TEXT | Inviter |
| invitee_wallet | TEXT | New contributor |
| bonus_applied | BOOLEAN | ERT bonus status |

### `ert_badges`
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| wallet_address | TEXT | Badge holder |
| badge_type | TEXT | `Genesis`, `Vault Guardian`, etc. |
| minted | BOOLEAN | NFT status |

---

## 📦 UI Modules to Add

- 🔗 Connect Wallet (Phantom/Solflare)
- 💰 Show $ERT Balance
- 🔄 Swap Pi → $ERT
- 🔥 Vault Contribution Tracker
- 🏅 Badge Claim Portal
- 📈 Referral Leaderboard

---

## 📣 Messaging

> “$ERT is Egypt’s civic dollar. Stable, backed, and mythic.”  
> “FPBE now supports $ERT—your gateway to Elmahrosa’s digital economy.”  
> “Every $ERT is backed by real reserves. No speculation. Just civic power.”

---

## 📞 Contact

- 🌐 [teosegypt.com](https://teosegypt.com)  
- 📩 ayman.seif@teosegypt.com  
- 📲 Telegram: [@ElmahrosaPi](https://t.me/ElmahrosaPi)
