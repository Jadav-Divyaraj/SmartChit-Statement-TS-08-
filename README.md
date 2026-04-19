Readme file : # 🌿 VanAdhikar Chain — Forest Rights Ledger

**Track, Verify, and Dispute Forest Rights Benefits on Blockchain**

[![Hackathon](https://img.shields.io/badge/TarkShaastra-2k26-green)](https://github.com)
[![Blockchain](https://img.shields.io/badge/Polygon-Amoy-blue)](https://polygon.technology)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.x-black)](https://soliditylang.org)

---

## 📋 Problem Statement (TS-08)

Under the Forest Rights Act, tribal communities in Gujarat hold legal rights to harvest and benefit from specified forest produce. In practice, benefit-sharing between cooperatives, tribal families, and the forest department is opaque — payments are delayed, amounts disputed, and families have no record of what they are owed.

**Our Solution:** A blockchain-based forest rights ledger where each tribal family's entitlement is recorded on an immutable ledger. Every payment is timestamped with officer signature. Families check their entitlement via QR in Gujarati. Disputes are logged with voice/photo evidence and auto-routed to DTDO — no office visit required.

---

## 🎯 8 Functionalities Achieved

| # | Functionality | Status |
|---|---------------|--------|
| F1 | Immutable entitlement ledger (produce type, quantity, value per season) | ✅ |
| F2 | Payment event recording with timestamp, amount, authorising officer | ✅ |
| F3 | Underpayment auto-detection (entitlement vs payment ledger) | ✅ |
| F4 | QR-linked family interface in Gujarati with voice support | ✅ |
| F5 | Dispute logging with voice/photo evidence — no office visit | ✅ |
| F6 | Structured evidence trail auto-routed to DTDO | ✅ |
| F7 | Dispute resolution workflow with status tracking | ✅ |
| F8 | Cooperative-level payment compliance dashboard | ✅ |

---

## 🏆 Winning Logic

- ✅ Every payment recorded with timestamp, amount, and authorising officer
- ✅ Family can view their own entitlement and payment history without intermediary
- ✅ Dispute logged with structured evidence and routed to DTDO automatically
- ✅ System detects underpayment by comparing entitlement ledger to payment ledger
- ✅ Gujarati interface with voice support for low-literacy users

---

## 🔧 Tech Stack

| Component | Technology |
|-----------|------------|
| **Smart Contract** | Solidity 0.8.x |
| **Blockchain** | Polygon Amoy Testnet |
| **Wallet** | MetaMask |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Web3 Library** | Ethers.js v5.7.2 |
| **QR Code** | QRCode.js |
| **Voice Support** | Web Speech API |

---
📱 How to Use
For Forest Officer
Connect MetaMask (as deployer wallet)

Go to Entitlement Ledger → Enter family wallet address, name, village, POL amount

Click "Record on Blockchain" → Confirm in MetaMask

For Cooperative Manager
Connect MetaMask

Go to Payment Recording → Enter family wallet address and amount

Click "Send POL via MetaMask" → Confirm transaction

For Tribal Family
Scan QR card from cooperative center

View entitlement and payment history in Gujarati

Click "Gujarati Voice" to hear details

If shortfall detected, click "File Dispute" → Record voice/photo → Submit

For DTDO
Go to DTDO Adjudication page

View auto-routed disputes with evidence trail

Click "Resolve" → Status updates to "Resolved"
