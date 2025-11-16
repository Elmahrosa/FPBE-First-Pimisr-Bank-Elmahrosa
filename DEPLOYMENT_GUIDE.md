# FPBE Bank Deployment & Approval Guide

## How to Get Pi Network Approval

### 1. Submit Your App to Pi Network
- Go to: https://develop.pi/
- Create a developer account
- Submit FPBE Bank app for review
- Provide:
  - App name: "First Pimisr Bank Elmahrosa"
  - Description: "Official Pi Network Bank for Egypt - Land acquisition and civic treasury"
  - Category: Finance & Banking
  - Website: Your domain
  - Support email: Your support email

### 2. Required Documentation
- Business registration in Egypt
- Land acquisition proof (110 acres Alexandria deed)
- Treasury audit documentation
- Civic token conversion rules (1 Pi = 5 ERT)
- User flow diagrams
- Privacy policy & terms of service

### 3. Technical Requirements
- Real Pi SDK implementation (not stubs)
- Proper payment callbacks
- Secure user data handling
- Mobile-responsive design
- Fast loading (< 3 seconds)

### 4. Compliance Checklist
- [ ] Pi Network KYC verification required
- [ ] Transparent pricing displayed
- [ ] No fake or placeholder balances
- [ ] Real-time transaction logging
- [ ] Secure wallet connection
- [ ] User consent for payments
- [ ] Clear refund policy

## 200M ERT Transfer Instructions

### Solana Setup
1. Install Phantom wallet: https://phantom.app/
2. Create/import your founder wallet
3. Get your Solana address
4. Deploy ERT as SPL token on Solana

### Deploy ERT Token
\`\`\`bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Create token
spl-token create-token

# Create token account
spl-token create-account <TOKEN_ADDRESS>

# Mint 200M ERT
spl-token mint <TOKEN_ADDRESS> 200000000
\`\`\`

### Transfer to Users
When users connect Phantom wallet:
1. User provides Solana address
2. System verifies Pi payment
3. Transfer ERT to user's Solana wallet:
\`\`\`bash
spl-token transfer <TOKEN_ADDRESS> <AMOUNT> <USER_SOLANA_ADDRESS>
\`\`\`

## Swap Fee Structure
- Pi to ERT: 2% fee
- Pi to TEOS: 2% fee  
- Pi to TUT: 2% fee
- Fees go to treasury for land maintenance

## Testing Before Deployment
1. Test on Pi Sandbox: https://sandbox.minepi.com/
2. Verify all payments work
3. Test Phantom integration
4. Confirm swap calculations
5. Check mobile responsiveness

## Launch Checklist
- [ ] Pi Network approval received
- [ ] ERT token deployed on Solana
- [ ] Phantom wallet integrated
- [ ] Petition signature gate active
- [ ] Real Pi SDK (no stubs)
- [ ] Swap fees configured
- [ ] Transaction logging enabled
- [ ] WhatsApp support active
- [ ] Land products accessible
- [ ] Mobile optimized
- [ ] Fast loading verified

## Support
- WhatsApp: +201006167293
- Telegram: [Add your Telegram group]
- Email: [Add support email]

---

**Ledger Note:**  
> "FPBE Bank Elmahrosa now runs in verified mode: contributors sign the petition, connect their Pi wallet, see real balances, swap into ERT via Phantom, and join land products. Every action is anchored in civic-first transparency."
