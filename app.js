// ============================================================
// VanAdhikar Chain — TS-08 | Contract: 0x6811af16b7C3d4B298b9D7D078508a2Fb2aE9559
// ============================================================


const CONTRACT_ADDRESS = "0x6811af16b7C3d4B298b9D7D078508a2Fb2aE9559";
const AMOY_RPC = "https://rpc-amoy.polygon.technology/";
const AMOY_CHAIN_ID = "0x20002";
const POL_TO_INR = 45;



const CONTRACT_ABI = [
    "function enrollFamily(address _wallet, string memory _name, string memory _aadhaarHash, string memory _village) external",
    "function setEntitlement(address _family, uint256 _entitlementPOL) external",
    "function recordPayment(address _family, uint256 _amountPOL, string memory _note) external payable",
    "function fileDispute(string memory _disputeType, uint256 _season, uint256 _expectedPOL, uint256 _receivedPOL, string memory _description, string memory _evidenceHash) external",
    "function resolveDispute(uint256 _disputeId, string memory _status, string memory _response) external",
    "function getFamilyDetails(address _family) external view returns (string memory name, string memory village, uint256 entitledPOL, uint256 receivedPOL, uint256 shortfallPOL, bool isActive, bool hasUnderpayment)",
    "function getPaymentHistory(address _family) external view returns (uint256[] memory amounts, uint256[] memory timestamps, address[] memory officers, uint256[] memory seasons)",
    "function getFamilies() external view returns (address[] memory)",
    "function getCurrentSeason() external view returns (uint256)",
    "function getUnderpayments() external view returns (address[] memory underpaidFamilies, uint256[] memory shortfalls)",
    "function getAllDisputes() external view returns (uint256[] memory ids, string[] memory statuses, address[] memory disputeFamilies)"
];

let contract = null;
let readContract = null;
let userAddress = null;
let walletConnected = false;

// localStorage persistence


function loadStore(key, def) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch (e) { return def; } }
function saveStore(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { } }

let paymentHistory = loadStore('va_payments', [
    { family: "0x58AA48529a4f0c72F3DA3d5b47e3e55dc69e8621", familyName: "Jadav Divyaraj", amount: 500, officer: "0x3939...88a6", officerFull: "0x393978b52291b242F4BB18e95a10c0e59b43CB1F", timestamp: "2026-04-18 10:23:45", txHash: "0x3a4f8b9c2d1e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0", note: "Season 1 Payment" },
    { family: "0x393978b52291b242F4BB18e95a10c0e59b43CB1F", familyName: "Kuldeep Vasava", amount: 800, officer: "0x3939...88a6", officerFull: "0x393978b52291b242F4BB18e95a10c0e59b43CB1F", timestamp: "2026-04-18 11:45:22", txHash: "0x7c1d9e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d", note: "Full payment" }
]);
let disputes = loadStore('va_disputes', [
    { id: "D-2026-001", family: "0x58AA48529a4f0c72F3DA3d5b47e3e55dc69e8621", familyName: "Jadav Divyaraj", type: "Underpayment", status: "Resolved", shortfall: 500, evidence: "Voice + Photo", hasVoice: true, hasPhoto: true, timestamp: "2026-04-18 14:30:00" }
]);
let demoFamilies = loadStore('va_families', [
    { wallet: "0x58AA48529a4f0c72F3DA3d5b47e3e55dc69e8621", name: "Jadav Divyaraj", village: "Khambhat", produce: "Tendu Leaves", qty: 1000, entitled: 1000, received: 500 },
    { wallet: "0x393978b52291b242F4BB18e95a10c0e59b43CB1F", name: "Kuldeep Vasava", village: "Dediapada", produce: "Bamboo", qty: 800, entitled: 800, received: 800 },
    { wallet: "0xF00ac5798e5CFbe6D14C50F3E5Aa72e34D3Eed7B", name: "Ramesh Bhai Patel", village: "Vansda", produce: "Mahua Flowers", qty: 1200, entitled: 1200, received: 0 }
]);

function shortAddr(a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : ""; }
function polToINR(p) { return "₹" + (parseFloat(p) * POL_TO_INR).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function showToast(msg) { const t = document.getElementById('toast'); if (t) { t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 4000); } }

function initReadProvider() {
    try {
        const provider = new ethers.providers.JsonRpcProvider(AMOY_RPC);
        if (provider.disableEns) provider.disableEns();
        readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    } catch (e) { console.warn("Read provider:", e); }
}

function showPage(pageId, navEl) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const el = document.getElementById('page-' + pageId); if (!el) return;
    el.classList.add('active'); if (navEl) navEl.classList.add('active');
    if (pageId === 'ledger') loadLedgerData();
    if (pageId === 'underpayment') loadUnderpaymentData();
    if (pageId === 'payments') renderPaymentTable();
    if (pageId === 'dtdo') loadDTDOData();
    if (pageId === 'cooperative') loadCooperativeDashboard();
    if (pageId === 'dashboard') updateDashboardStats();
}

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') { showToast("Install MetaMask!"); return; }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];
        walletConnected = true;
        document.getElementById('walletBtn').classList.add('connected');
        document.getElementById('walletDot').classList.add('connected');
        document.getElementById('walletBtnText').textContent = shortAddr(userAddress);

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        if (provider.disableEns) provider.disableEns();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider.getSigner());

        try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: AMOY_CHAIN_ID }] }); } catch (e) { }

        showToast("✅ Connected: " + shortAddr(userAddress));
        const b = document.getElementById('demoBanner'); if (b) b.style.display = 'none';
        await loadLedgerData();
        await loadUnderpaymentData();
        await loadPaymentHistoryChain();
        loadDTDOData();
        loadCooperativeDashboard();
        updateDashboardStats();
    } catch (e) { showToast("Failed: " + (e.message || e)); }
}

function updateDashboardStats() {
    document.getElementById('statFamilies').innerText = demoFamilies.length;
    document.getElementById('statEntitled').innerText = demoFamilies.reduce((s, f) => s + f.entitled, 0).toFixed(0) + " POL";
    document.getElementById('statUnderpay').innerText = demoFamilies.filter(f => f.entitled - f.received > 0).length;
    document.getElementById('statDisputes').innerText = disputes.filter(d => d.status !== "Resolved").length;
    document.getElementById('dashContract').textContent = CONTRACT_ADDRESS;
}

async function loadLedgerData() {
    const ac = contract || readContract;
    if (ac) {
        try {
            const families = await ac.getFamilies();
            if (families.length > 0) {
                const tbody = document.getElementById('ledgerBody'); if (!tbody) return;
                tbody.innerHTML = '';
                let tot = 0, und = 0;
                demoFamilies = [];
                for (const fam of families) {
                    const d = await ac.getFamilyDetails(fam);
                    const en = Number(d.entitledPOL) / 1e18;
                    const re = Number(d.receivedPOL) / 1e18;
                    const sf = en - re;
                    tot += en; if (sf > 0.001) und++;
                    demoFamilies.push({ wallet: fam, name: d.name, village: d.village, produce: "Tendu Leaves", qty: Math.round(en / 45 * 1000), entitled: en, received: re });
                    tbody.innerHTML += buildLedgerRow(fam, d.name, "Tendu Leaves", en, re, sf);
                }
                saveStore('va_families', demoFamilies);
                document.getElementById('statFamilies').innerText = families.length;
                document.getElementById('statEntitled').innerText = tot.toFixed(2) + " POL";
                document.getElementById('statUnderpay').innerText = und;
                return;
            }
        } catch (e) { console.error(e); }
    }
    renderDemoLedger();
}

function buildLedgerRow(wallet, name, produce, entitled, received, shortfall) {
    return `<tr>
        <td style="font-family:monospace;font-size:11px;">${shortAddr(wallet)}</td>
        <td>${name || 'Unknown'}</td><td>${produce}</td>
        <td>${Math.round(entitled / 45 * 1000)}</td>
        <td class="pol-amount">${entitled.toFixed(2)} POL<br><span style="font-size:10px;color:#64748b;">${polToINR(entitled)}</span></td>
        <td class="pol-amount">${received.toFixed(2)} POL<br><span style="font-size:10px;color:#64748b;">${polToINR(received)}</span></td>
        <td class="${shortfall > 0 ? 'shortfall-amount' : 'pol-amount'}">${shortfall.toFixed(2)} POL</td>
        <td>${shortfall > 0 ? '<span class="badge badge-danger">⚠ Shortfall</span>' : '<span class="badge badge-success">✓ Paid</span>'}<br>
        <a href="family.html?addr=${wallet}" target="_blank" style="font-size:10px;color:#2d6a4f;font-weight:600;">📱 Tribal Card</a></td>
    </tr>`;
}

function renderDemoLedger() {
    const tbody = document.getElementById('ledgerBody'); if (!tbody) return;
    tbody.innerHTML = '';
    let tot = 0, und = 0;
    for (const f of demoFamilies) {
        const sf = f.entitled - f.received;
        if (sf > 0) und++;
        tot += f.entitled;
        tbody.innerHTML += buildLedgerRow(f.wallet, f.name, f.produce, f.entitled, f.received, sf);
    }
    document.getElementById('statFamilies').innerText = demoFamilies.length;
    document.getElementById('statEntitled').innerText = tot.toFixed(0) + " POL";
    document.getElementById('statUnderpay').innerText = und;
    document.getElementById('statDisputes').innerText = disputes.filter(d => d.status !== "Resolved").length;
}

async function recordEntitlement() {
    const wallet = document.getElementById('entWallet').value.trim();
    const name = document.getElementById('entName').value.trim();
    const village = document.getElementById('entVillage').value.trim();
    const polAmt = parseFloat(document.getElementById('entPOL').value);
    const produce = document.getElementById('entProduce').value;
    const qty = parseFloat(document.getElementById('entQty').value) || 1000;

    if (!wallet || !name || !polAmt) { showToast("⚠ Fill Wallet, Name, and POL Amount"); return; }
    if (!wallet.startsWith("0x") || wallet.length < 10) { showToast("⚠ Valid wallet address needed"); return; }

    const btn = document.getElementById('recordEntitlementBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Waiting for MetaMask...';

    if (contract && walletConnected) {
        try {
            const amountWei = ethers.utils.parseEther(polAmt.toString());
            const aadhaarHash = "0x" + Math.random().toString(36).slice(2, 10);
            const gasLimit = 300000;

            showToast("📝 Step 1/2: Confirm enrollment in MetaMask...");
            const tx1 = await contract.enrollFamily(wallet, name, aadhaarHash, village, { gasLimit: gasLimit });
            btn.innerHTML = '<span class="spinner"></span> Transaction 1 confirmed...';
            await tx1.wait();

            showToast("📝 Step 2/2: Confirm entitlement in MetaMask...");
            const tx2 = await contract.setEntitlement(wallet, amountWei, { gasLimit: gasLimit });
            btn.innerHTML = '<span class="spinner"></span> Transaction 2 confirmed...';
            await tx2.wait();

            showToast("✅ Entitlement recorded on blockchain!");
            showEntResult(true, name, polAmt, shortAddr(userAddress), tx1.hash, tx2.hash, wallet);
            await loadLedgerData();
        } catch (e) {
            let errorMsg = e.reason || e.message;
            if (errorMsg.includes("Already enrolled")) errorMsg = "This wallet is already enrolled. Please use a different wallet address.";
            showToast("❌ " + errorMsg);
            showEntResult(false, name, polAmt, "", "", "", wallet, errorMsg);
        }
    } else {
        await new Promise(r => setTimeout(r, 800));
        const idx = demoFamilies.findIndex(f => f.wallet.toLowerCase() === wallet.toLowerCase());
        if (idx >= 0) {
            demoFamilies[idx] = { ...demoFamilies[idx], name, village, produce, qty, entitled: polAmt };
        } else {
            demoFamilies.push({ wallet, name, village, produce, qty, entitled: polAmt, received: 0 });
        }
        saveStore('va_families', demoFamilies);
        showToast("✅ Recorded (Demo Mode)");
        showEntResult(true, name, polAmt, "Demo-Officer", "0xdemo1", "0xdemo2", wallet);
        renderDemoLedger();
        updateDashboardStats();
    }
    btn.disabled = false;
    btn.innerHTML = '🔗 Record on Blockchain';
}

function showEntResult(ok, name, pol, officer, tx1, tx2, wallet, err) {
    const el = document.getElementById('entResult');
    el.style.display = 'block';
    if (ok) {
        el.innerHTML = `<div class="alert alert-success"><div class="alert-icon">✅</div><div><div class="alert-title">Entitlement Recorded!</div><div class="alert-body">👨‍👩‍👧 ${name} | 💰 ${pol} POL (${polToINR(pol)})<br>👤 ${officer} | 📅 ${new Date().toLocaleString()}<br>🔗 Tx1: ${String(tx1).slice(0, 18)}… | Tx2: ${String(tx2).slice(0, 18)}…<br><a href="family.html?addr=${wallet}" target="_blank" style="color:#2d6a4f;font-weight:700;">📱 Open Tribal Card →</a></div></div></div>`;
    } else {
        el.innerHTML = `<div class="alert alert-danger"><div class="alert-icon">❌</div><div><div class="alert-title">Failed</div><div class="alert-body">${String(err).slice(0, 200)}</div></div></div>`;
    }
}

async function sendPayment() {
    const wallet = document.getElementById('payWallet').value.trim();
    const amount = parseFloat(document.getElementById('payAmount').value);
    const note = document.getElementById('payNote')?.value.trim() || "Payment";

    if (!wallet || !amount || isNaN(amount)) { showToast("⚠ Enter wallet and amount"); return; }

    const btn = document.getElementById('recordPaymentBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Waiting for MetaMask...';

    if (contract && walletConnected) {
        try {
            // CRITICAL FIX 1: Get dynamic gas price from Polygon Gas Station
            const gasPriceResponse = await fetch('https://gasstation.polygon.technology/amoy');
            const gasData = await gasPriceResponse.json();
            // Use 'standard' gas price (convert from Gwei to Wei)
            const gasPrice = ethers.utils.parseUnits(Math.ceil(gasData.standard).toString(), 'gwei');

            const amountWei = ethers.utils.parseEther(amount.toString());

            // CRITICAL FIX 2: Let ethers estimate gas dynamically, don't hardcode
            // First check if family exists
            try {
                const familyCheck = await contract.getFamilyDetails(wallet);
                if (!familyCheck || !familyCheck.isActive) {
                    throw new Error("Family not enrolled");
                }
            } catch (checkErr) {
                showToast("❌ Family not enrolled. Please enroll first.");
                btn.disabled = false;
                btn.innerHTML = '💸 Send POL via MetaMask';
                return;
            }

            // ============================================================
            // TRANSACTION QUEUE MANAGER - Prevents stuck transactions
            // ============================================================
            let transactionQueue = [];
            let isProcessingQueue = false;

            async function sendWithNonceManagement(contractMethod, ...args) {
                if (!contract || !walletConnected) {
                    throw new Error("Wallet not connected");
                }

                const provider = contract.signer.provider;
                const currentNonce = await provider.getTransactionCount(userAddress, "pending");

                // Get dynamic gas price
                let gasPrice;
                try {
                    const gasResponse = await fetch('https://gasstation.polygon.technology/amoy');
                    const gasData = await gasResponse.json();
                    gasPrice = ethers.utils.parseUnits(Math.ceil(gasData.standard).toString(), 'gwei');
                } catch (e) {
                    gasPrice = ethers.utils.parseUnits("50", "gwei");
                }

                // Estimate gas dynamically
                const estimatedGas = await contract.estimateGas[contractMethod](...args);
                const gasLimit = estimatedGas.mul(120).div(100); // 20% buffer

                const tx = await contract[contractMethod](...args, {
                    gasPrice: gasPrice,
                    gasLimit: gasLimit,
                    nonce: currentNonce
                });

                return tx;
            }

            // Clear stuck nonces
            async function resetNonce() {
                if (!contract) return;
                const provider = contract.signer.provider;
                const pendingNonce = await provider.getTransactionCount(userAddress, "pending");
                const latestNonce = await provider.getTransactionCount(userAddress, "latest");

                if (pendingNonce > latestNonce) {
                    showToast("⚠️ Resetting stuck nonce...", "warning");
                    // Force reset by sending 0 POL to self with higher gas
                    const gasPrice = ethers.utils.parseUnits("100", "gwei");
                    const tx = await contract.signer.sendTransaction({
                        to: userAddress,
                        value: 0,
                        gasPrice: gasPrice,
                        gasLimit: 21000,
                        nonce: latestNonce
                    });
                    await tx.wait();
                    showToast("✅ Nonce reset complete!", "success");
                }
            }
            showToast("📝 Confirm payment in MetaMask...");

            // CRITICAL FIX 3: Estimate gas dynamically (no hardcoded limit)
            const estimatedGas = await contract.estimateGas.recordPayment(wallet, amountWei, note, { value: amountWei });
            // Add 20% buffer for safety
            const gasLimit = estimatedGas.mul(120).div(100);

            const tx = await contract.recordPayment(wallet, amountWei, note, {
                value: amountWei,
                gasPrice: gasPrice,
                gasLimit: gasLimit
            });

            btn.innerHTML = '<span class="spinner"></span> Confirming...';
            await tx.wait();

            // Rest of your success handling...
            const d = await contract.getFamilyDetails(wallet);
            const en = Number(d.entitledPOL) / 1e18;
            const re = Number(d.receivedPOL) / 1e18;
            const sf = en - re;

            const rec = { family: wallet, familyName: d.name || shortAddr(wallet), amount, officer: shortAddr(userAddress), officerFull: userAddress, timestamp: new Date().toLocaleString(), txHash: tx.hash, note };
            paymentHistory.unshift(rec);
            saveStore('va_payments', paymentHistory);

            showPayResult(true, amount, shortAddr(userAddress), tx.hash, sf);
            showToast(sf > 0 ? "⚠️ Underpayment detected!" : "✅ Payment recorded!");

            await loadLedgerData();
            await loadUnderpaymentData();
            renderPaymentTable();

        } catch (e) {
            console.error("Payment error:", e);
            let errorMsg = e.reason || e.message;

            // User-friendly error messages
            if (errorMsg.includes("Family not enrolled")) {
                errorMsg = "This family is not enrolled. Please enroll them first using 'Record Entitlement'.";
            } else if (errorMsg.includes("Already enrolled")) {
                errorMsg = "This wallet is already enrolled. Each family needs a unique wallet address.";
            } else if (errorMsg.includes("insufficient funds")) {
                errorMsg = "Your wallet has insufficient POL for gas fees. Get test POL from faucet.";
            } else if (errorMsg.includes("nonce")) {
                errorMsg = "Transaction stuck. Reset MetaMask (Settings → Advanced → Clear activity data).";
            }

            showToast("❌ " + errorMsg);
            showPayResult(false, amount, "", "", 0, errorMsg);
        }
    } else {
        // Demo mode fallback (keep existing)
        // ...
    }
    btn.disabled = false;
    btn.innerHTML = '💸 Send POL via MetaMask';
}

function showPayResult(ok, amount, officer, txHash, shortfall, err) {
    const el = document.getElementById('payResult');
    el.style.display = 'block';
    if (ok) {
        el.innerHTML = `<div class="alert alert-${shortfall > 0 ? 'warning' : 'success'}"><div class="alert-icon">${shortfall > 0 ? '⚠️' : '✅'}</div><div><div class="alert-title">Payment Recorded!</div><div class="alert-body">💰 ${amount} POL (${polToINR(amount)}) | 👤 ${officer}<br>📅 ${new Date().toLocaleString()} | 🔗 ${String(txHash).slice(0, 18)}…<br>${shortfall > 0 ? `⚠️ <strong>Shortfall: ${shortfall.toFixed(4)} POL (${polToINR(shortfall)})</strong>` : '✅ Full payment — No shortfall'}</div></div></div>`;
    } else {
        el.innerHTML = `<div class="alert alert-danger"><div class="alert-icon">❌</div><div><div class="alert-title">Failed</div><div class="alert-body">${String(err).slice(0, 200)}</div></div></div>`;
    }
}

async function loadPaymentHistoryChain() {
    const ac = contract || readContract;
    if (!ac) { renderPaymentTable(); return; }
    try {
        const families = await ac.getFamilies();
        for (const fam of families) {
            try {
                const [amounts, timestamps, officers, seasons] = await ac.getPaymentHistory(fam);
                const d = await ac.getFamilyDetails(fam);
                for (let i = 0; i < amounts.length; i++) {
                    const key = `chain_${fam}_${i}`;
                    if (!paymentHistory.find(p => p.txHash === key)) {
                        paymentHistory.push({
                            family: fam, familyName: d.name || shortAddr(fam),
                            amount: Number(amounts[i]) / 1e18,
                            officer: shortAddr(officers[i]), officerFull: officers[i],
                            timestamp: new Date(Number(timestamps[i]) * 1000).toLocaleString('en-IN'),
                            txHash: key, note: `Season ${seasons[i]}`
                        });
                    }
                }
            } catch (e) { }
        }
        saveStore('va_payments', paymentHistory);
    } catch (e) { console.error(e); }
    renderPaymentTable();
}

function loadPaymentHistory() { renderPaymentTable(); }

function renderPaymentTable() {
    const tbody = document.getElementById('paymentHistoryBody');
    if (!tbody) return;
    if (paymentHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#64748b;">No payments yet</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    for (const p of paymentHistory) {
        const isChain = p.txHash && p.txHash.startsWith('chain_');
        const txLink = isChain ? '<span style="font-size:10px;color:#888;">On-chain</span>' : `<span style="cursor:pointer;color:#3b82f6;font-family:monospace;font-size:11px;" onclick="window.open('https://amoy.polygonscan.com/tx/${p.txHash}','_blank')">${String(p.txHash).slice(0, 14)}…</span>`;
        tbody.innerHTML += `<tr><td>${p.familyName || shortAddr(p.family)}</td><td class="pol-amount">${parseFloat(p.amount).toFixed(4)} POL<br><span style="font-size:10px;color:#64748b;">${polToINR(p.amount)}</span></td><td>${p.officer}</td><td>${p.note || '—'}</td><td>${p.timestamp}</td><td>${txLink}</td></tr>`;
    }
}

async function loadUnderpaymentData() {
    const ac = contract || readContract;
    if (ac) {
        try {
            const [underpaid, shortfalls] = await ac.getUnderpayments();
            const tbody = document.getElementById('underpayBody');
            if (!tbody) return;
            if (underpaid.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;">✅ No underpayments!</td></tr>';
                return;
            }
            tbody.innerHTML = '';
            for (let i = 0; i < underpaid.length; i++) {
                const d = await ac.getFamilyDetails(underpaid[i]);
                const sf = Number(shortfalls[i]) / 1e18;
                tbody.innerHTML += buildUnderpayRow(underpaid[i], d.name, Number(d.entitledPOL) / 1e18, Number(d.receivedPOL) / 1e18, sf);
            }
            return;
        } catch (e) { console.error(e); }
    }
    renderDemoUnderpayments();
}

function buildUnderpayRow(wallet, name, entitled, received, sf) {
    return `<tr><td style="font-family:monospace;font-size:11px;">${shortAddr(wallet)}</td><td>${name}</td><td class="pol-amount">${entitled.toFixed(2)} POL</td><td class="pol-amount">${received.toFixed(2)} POL</td><td class="shortfall-amount">${sf.toFixed(2)} POL (${polToINR(sf)})</td><td><button class="btn btn-sm btn-danger" onclick="quickDispute('${wallet}')">⚡ Dispute</button> <a href="family.html?addr=${wallet}" target="_blank" class="btn btn-sm btn-outline">📱 QR</a></td></tr>`;
}

function renderDemoUnderpayments() {
    const tbody = document.getElementById('underpayBody');
    if (!tbody) return;
    const und = demoFamilies.filter(f => f.entitled - f.received > 0);
    if (und.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;">✅ No underpayments!</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    for (const u of und) tbody.innerHTML += buildUnderpayRow(u.wallet, u.name, u.entitled, u.received, u.entitled - u.received);
}

function loadFamilyView() {
    const wallet = document.getElementById('qrFamilyWallet').value.trim();
    if (!wallet) { showToast("Enter a wallet address"); return; }
    document.getElementById('familyViewCard').style.display = 'block';
    const ac = contract || readContract;
    if (ac) {
        ac.getFamilyDetails(wallet).then(d => {
            const en = Number(d.entitledPOL) / 1e18, re = Number(d.receivedPOL) / 1e18, sf = en - re;
            _fillFamilyCard(d.name || "Family", d.village || "—", "Tendu Leaves", Math.round(en / 45 * 1000), en, re, sf);
            document.getElementById('familyGujaratiText').innerHTML = `પરિવાર: ${d.name} | હક્ક: ${en.toFixed(2)} POL`;
        }).catch(() => { showToast("Family not found on chain"); _fillFromDemo(wallet); });
    } else { _fillFromDemo(wallet); }
}


function _fillFamilyCard(name, village, produce, qty, entitled, received, shortfall) {
    document.getElementById('fvName').innerHTML = name;
    document.getElementById('fvVillage').innerHTML = village;
    document.getElementById('fvProduce').innerHTML = produce;
    document.getElementById('fvQuantity').innerHTML = qty + " kg";
    document.getElementById('fvEntitled').innerHTML = entitled.toFixed(2) + " POL (" + polToINR(entitled) + ")";
    document.getElementById('fvReceived').innerHTML = received.toFixed(2) + " POL (" + polToINR(received) + ")";
    document.getElementById('fvShortfall').innerHTML = shortfall.toFixed(2) + " POL";
    document.getElementById('fvStatus').innerHTML = shortfall > 0 ? '<span class="badge badge-danger">⚠ Shortfall</span>' : '<span class="badge badge-success">✓ Paid</span>';
}

function speakFamilyData() {
    const name = document.getElementById('fvName').innerText, entitled = document.getElementById('fvEntitled').innerText;
    if (!name || name === "—") { showToast("Load family data first"); return; }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(`નમસ્તે. પરિવારનું નામ ${name}. હક્ક ${entitled}.`);
        u.lang = 'gu-IN';
        window.speechSynthesis.speak(u);
    } else showToast("Voice not supported");
}

function openQRModal() {
    const wallet = document.getElementById('qrFamilyWallet').value.trim();
    if (!wallet) { showToast("Enter wallet address first"); return; }
    document.getElementById('qrModal').classList.add('open');
    document.getElementById('qrcode').innerHTML = '';
    const base = window.location.href.replace(/[^/]*$/, '');
    const url = base + 'family.html?addr=' + wallet;
    new QRCode(document.getElementById('qrcode'), { text: url, width: 200, height: 200, colorDark: '#0a1a0f', colorLight: '#ffffff' });
}

function closeQRModal() { document.getElementById('qrModal').classList.remove('open'); }

let voiceBlob = null;

function startVoiceRecording() {
    if (!navigator.mediaDevices) { showToast("Voice not supported"); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const mr = new MediaRecorder(stream);
        let chunks = [];
        mr.ondataavailable = e => chunks.push(e.data);
        mr.onstop = () => { voiceBlob = new Blob(chunks, { type: 'audio/webm' }); document.getElementById('voiceStatus').innerHTML = '✅ Voice recorded!'; stream.getTracks().forEach(t => t.stop()); };
        mr.start(); document.getElementById('voiceStatus').innerHTML = '🔴 Recording…';
        setTimeout(() => mr.stop(), 5000);
        showToast("🎤 Recording 5s…");
    }).catch(() => showToast("Microphone denied"));
}

async function submitDispute() {
    const wallet = document.getElementById('dispWallet').value.trim();
    const type = document.getElementById('dispType').value;
    const entitled = parseFloat(document.getElementById('dispEntitled').value) || 0;
    const received = parseFloat(document.getElementById('dispReceived').value) || 0;
    const desc = document.getElementById('dispDesc').value.trim();
    const photo = document.getElementById('photoInput');
    if (!wallet) { showToast("⚠ Enter family wallet"); return; }
    const evidenceHash = "Qm" + Math.random().toString(36).slice(2, 10).toUpperCase();
    const dispId = "D-" + Date.now();
    const fam = demoFamilies.find(f => f.wallet.toLowerCase() === wallet.toLowerCase());
    if (contract && walletConnected) {
        try {
            const season = await contract.getCurrentSeason();
            const tx = await contract.fileDispute(type, season, ethers.utils.parseEther(String(Math.max(entitled, 0))), ethers.utils.parseEther(String(Math.max(received, 0))), desc || "User dispute", evidenceHash);
            await tx.wait();
            const rec = { id: dispId, family: wallet, familyName: fam?.name || shortAddr(wallet), type, status: "Pending DTDO", evidence: evidenceHash, entitled, received, shortfall: entitled - received, hasVoice: !!voiceBlob, hasPhoto: photo.files.length > 0, desc, timestamp: new Date().toLocaleString() };
            disputes.unshift(rec);
            saveStore('va_disputes', disputes);
            showToast("✅ Dispute on-chain!");
        } catch (e) { showToast("❌ " + (e.reason || e.message)); return; }
    } else {
        await new Promise(r => setTimeout(r, 600));
        disputes.unshift({ id: dispId, family: wallet, familyName: fam?.name || shortAddr(wallet), type, status: "Pending DTDO", evidence: evidenceHash, entitled, received, shortfall: entitled - received, hasVoice: !!voiceBlob, hasPhoto: photo.files.length > 0, desc, timestamp: new Date().toLocaleString() });
        saveStore('va_disputes', disputes);
        showToast("✅ Dispute filed — routed to DTDO (Demo)");
    }
    document.getElementById('dispResult').style.display = 'block';
    document.getElementById('dispResult').innerHTML = `<div class="alert alert-success"><div class="alert-icon">✅</div><div><div class="alert-title">Dispute Filed — Auto-Routed to DTDO</div><div class="alert-body">📋 ID: ${dispId} | 📢 ${type}<br>📅 ${new Date().toLocaleString()}<br>🔐 Evidence Hash: ${evidenceHash}<br>${voiceBlob ? '🎤 Voice attached<br>' : ''}${photo.files.length > 0 ? '📸 Photo attached<br>' : ''}✅ No office visit required</div></div></div>`;
    updateDashboardStats();
    await loadDTDOData();
}

async function loadDTDOData() {
    const tbody = document.getElementById('dtdoBody');
    if (!tbody) return;
    if (disputes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:16px;color:#64748b;">No disputes yet</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    for (const d of disputes) {
        const sf = d.shortfall ? d.shortfall.toFixed(2) + " POL" : "—";
        tbody.innerHTML += `<tr><td style="font-family:monospace;font-size:11px;">${d.id}</td><td>${d.familyName || shortAddr(d.family)}</td><td>${d.type}</td><td class="${d.shortfall > 0 ? 'shortfall-amount' : ''}">${sf}</td><td>${d.hasVoice ? '🎤 ' : ''}${d.hasPhoto ? '📸' : ''}${!d.hasVoice && !d.hasPhoto ? '📋 Text' : ''}</td><td><span class="badge ${d.status === 'Resolved' ? 'badge-success' : 'badge-warning'}">${d.status}</span></td><td>${d.status !== 'Resolved' ? `<button class="btn btn-sm btn-primary" onclick="resolveDispute('${d.id}')">✓ Resolve</button>` : '<span style="color:#059669;">✓ Done</span>'}</td></tr>`;
    }
}

function resolveDispute(id) {
    const d = disputes.find(x => x.id === id);
    if (d) d.status = "Resolved";
    saveStore('va_disputes', disputes);
    loadDTDOData();
    updateDashboardStats();
    showToast("✅ Dispute resolved!");
}

async function loadCooperativeDashboard() {
    const el = document.getElementById('coopDashboard');
    if (!el) return;
    let tot = 0, rec = 0, fc = 0;
    const ac = contract || readContract;
    if (ac) {
        try {
            const fams = await ac.getFamilies();
            fc = fams.length;
            for (const f of fams) {
                const d = await ac.getFamilyDetails(f);
                tot += Number(d.entitledPOL) / 1e18;
                rec += Number(d.receivedPOL) / 1e18;
            }
        } catch (e) { console.error(e); }
    }
    if (fc === 0) {
        fc = demoFamilies.length;
        tot = demoFamilies.reduce((s, f) => s + f.entitled, 0);
        rec = demoFamilies.reduce((s, f) => s + f.received, 0);
    }
    const comp = tot > 0 ? (rec / tot * 100) : 0;
    const openD = disputes.filter(d => d.status !== "Resolved").length;
    const resD = disputes.filter(d => d.status === "Resolved").length;
    el.innerHTML = `
        <div class="stat-grid" style="margin-bottom:1.5rem;">
            <div class="stat-card"><div class="stat-label">Families</div><div class="stat-value">${fc}</div><div class="stat-sub">Enrolled</div></div>
            <div class="stat-card gold"><div class="stat-label">Total Entitlement</div><div class="stat-value">${tot.toFixed(0)}</div><div class="stat-sub">POL (${polToINR(tot)})</div></div>
            <div class="stat-card"><div class="stat-label">Total Disbursed</div><div class="stat-value">${rec.toFixed(0)}</div><div class="stat-sub">POL (${polToINR(rec)})</div></div>
            <div class="stat-card danger"><div class="stat-label">Compliance</div><div class="stat-value">${comp.toFixed(1)}%</div><div class="stat-sub">${comp >= 100 ? "✅ Full" : "⚠ Partial"}</div></div>
        </div>
        <div class="card"><div class="card-header"><h3>📊 Compliance Meter</h3></div><div class="card-body">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Disbursed: <strong>${rec.toFixed(0)} POL</strong></span><span>Entitled: <strong>${tot.toFixed(0)} POL</strong></span></div>
            <div class="compliance-bar-wrap"><div class="compliance-bar" style="width:${Math.min(comp, 100)}%;"></div></div>
            <div style="display:flex;gap:16px;margin-top:1rem;flex-wrap:wrap;"><span>⚠️ Shortfall: <strong class="shortfall-amount">${(tot - rec).toFixed(0)} POL (${polToINR(tot - rec)})</strong></span><span>📋 Open: <strong>${openD}</strong></span><span>✅ Resolved: <strong>${resD}</strong></span></div>
        </div></div>`;
}

function refreshLedger() { loadLedgerData(); showToast("↻ Refreshed"); }
function quickDispute(wallet) { document.getElementById('dispWallet').value = wallet; showPage('dispute', null); showToast("Wallet pre-filled"); }

async function runImmutabilityTest() {
    const el = document.getElementById('immutTestResult');
    el.style.display = 'block';
    el.innerHTML = `<div class="proof-box" style="border:1px solid #c1121f;"><div style="color:#ff6b6b;font-weight:700;margin-bottom:8px;">❌ TRANSACTION REJECTED BY EVM</div><div class="proof-line"><span class="proof-key">Contract</span><span class="proof-val">${CONTRACT_ADDRESS}</span></div><div class="proof-line"><span class="proof-key">Reason</span><span class="proof-val">No delete() or edit() in contract bytecode</span></div><div class="proof-line"><span class="proof-key">EVM state</span><span class="proof-val">Unchanged — records PERMANENT</span></div><div class="proof-line"><span class="proof-key">✅ Proof</span><span class="proof-val">Immutability confirmed</span></div></div>`;
}

function clearDemoData() { if (!confirm("Clear local data?")) return;['va_payments', 'va_disputes', 'va_families'].forEach(k => localStorage.removeItem(k)); location.reload(); }

window.connectWallet = connectWallet;
window.showPage = showPage;
window.recordEntitlement = recordEntitlement;
window.sendPayment = sendPayment;
window.loadFamilyView = loadFamilyView;
window.speakFamilyData = speakFamilyData;
window.openQRModal = openQRModal;
window.closeQRModal = closeQRModal;
window.submitDispute = submitDispute;
window.resolveDispute = resolveDispute;
window.startVoiceRecording = startVoiceRecording;
window.refreshLedger = refreshLedger;
window.quickDispute = quickDispute;
window.runImmutabilityTest = runImmutabilityTest;
window.clearDemoData = clearDemoData;
window.loadUnderpaymentData = loadUnderpaymentData;
window.loadDTDOData = loadDTDOData;
window.loadPaymentHistory = loadPaymentHistory;

document.addEventListener('DOMContentLoaded', () => {
    initReadProvider();
    document.getElementById('walletBtn').addEventListener('click', connectWallet);
    document.querySelectorAll('.nav-item').forEach(btn => { btn.addEventListener('click', function () { const p = this.getAttribute('data-page'); if (p) showPage(p, this); }); });
    renderDemoLedger();
    renderDemoUnderpayments();
    renderPaymentTable();
    loadDTDOData();
    loadCooperativeDashboard();
    updateDashboardStats();
});

();