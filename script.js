// ═══════════════════════════════════════════════════════════
//  REALISTIC SLOT MACHINE – 8‑second spin duration
//  Animation matches "Spinning-slotmachine.mp3" exactly.
// ═══════════════════════════════════════════════════════════

(() => {
    'use strict';

    // ─── SYMBOLS & PAYOUTS ──────────────────────────────
    const SYMBOLS = ['7️⃣', 'BAR', '🍒', '🍋', '🍊', '🍇', '🍉', '🍓', '🍑', '🍎'];
    const SYMBOL_WEIGHTS = [1, 2, 6, 6, 6, 5, 5, 5, 4, 4];
    const PAYOUTS = {
        '7️⃣': 50,
        'BAR': 40,
        '🍒': 5,
        '🍋': 5,
        '🍊': 5,
        '🍇': 8,
        '🍉': 8,
        '🍓': 10,
        '🍑': 10,
        '🍎': 12
    };

    // ─── PRESET BET OPTIONS ──────────────────────────────
    const BET_OPTIONS = [10, 50, 100, 200, 500, 1000, 2000, 5000,10000, 20000, 50000, 100000];
    let betIndex = 0;
    let isCustomBet = false;

    // ─── DATABASE ────────────────────────────────────────
    const DEFAULT_DB = {
        balance: 1000,
        totalWins: 0,
        totalLosses: 0,
        history: [],
        settings: {
            minBet: 10,
            maxBet: 5000,
            defaultBet: 10
        }
    };

    let db = null;
    let currentBet = 10;
    let isSpinning = false;
    let currentWinAmount = 0;
    const reelStripLength = 20;

    // DOM refs
    const reelContainers = [
        document.getElementById('reel0'),
        document.getElementById('reel1'),
        document.getElementById('reel2')
    ];
    const reelStrips = [
        document.getElementById('strip0'),
        document.getElementById('strip1'),
        document.getElementById('strip2')
    ];
    const balanceDisplay = document.getElementById('balanceDisplay');
    const winDisplay = document.getElementById('winDisplay');
    const betDisplay = document.getElementById('betDisplay');
    const messageDisplay = document.getElementById('messageDisplay');
    const historyList = document.getElementById('historyList');
    const spinBtn = document.getElementById('spinBtn');
    const betUp = document.getElementById('betUp');
    const betDown = document.getElementById('betDown');
    const maxBetBtn = document.getElementById('maxBetBtn');
    const topUpBtn = document.getElementById('topUpBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const resetBtn = document.getElementById('resetBtn');
    const fileInput = document.getElementById('fileInput');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // ─── AUDIO ELEMENTS ──────────────────────────────────
    const bgAudio = document.getElementById('bgMusic');
    const spinAudio = document.getElementById('spinningSound');
    const jackpotAudio = document.getElementById('jackpotSound');
    let isMuted = false;

    // ─── HELPERS ──────────────────────────────────────────
    function pickSymbol() {
        const total = SYMBOL_WEIGHTS.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < SYMBOL_WEIGHTS.length; i++) {
            r -= SYMBOL_WEIGHTS[i];
            if (r <= 0) return SYMBOLS[i];
        }
        return SYMBOLS[0];
    }

    function formatCurrency(n) {
        return Math.floor(n).toLocaleString();
    }

    // ─── REEL STRIP GENERATION ──────────────────────────
    function buildStrip(targetSymbol) {
        const strip = [];
        for (let i = 0; i < reelStripLength; i++) {
            strip.push(pickSymbol());
        }
        strip[10] = targetSymbol;
        return strip;
    }

    function renderStrip(stripEl, symbols) {
        stripEl.innerHTML = symbols.map(s => {
            if (s === 'BAR') {
                return `<div class="symbol bar-symbol">${s}</div>`;
            }
            return `<div class="symbol">${s}</div>`;
        }).join('');
    }

    function getTargetOffset(targetIndex, symbolHeight = 66) {
        return -(targetIndex - 1) * symbolHeight;
    }

    // ─── SPIN ANIMATION (with specified duration) ──────
    function spinReel(reelIndex, targetSymbol, delay, duration) {
        return new Promise((resolve) => {
            const stripEl = reelStrips[reelIndex];
            const reelEl = reelContainers[reelIndex];

            const symbols = buildStrip(targetSymbol);
            renderStrip(stripEl, symbols);

            const targetIndex = 10;
            const symbolHeight = 66;
            const targetOffset = getTargetOffset(targetIndex, symbolHeight);

            let startIndex = Math.floor(Math.random() * (reelStripLength - 3));
            while (Math.abs(startIndex - targetIndex) < 3) {
                startIndex = Math.floor(Math.random() * (reelStripLength - 3));
            }
            const startOffset = getTargetOffset(startIndex, symbolHeight);

            stripEl.style.transition = 'none';
            stripEl.style.transform = `translateY(${startOffset}px)`;
            stripEl.style.filter = 'blur(2px)';
            stripEl.offsetHeight;

            reelEl.classList.add('spinning');

            setTimeout(() => {
                // ★★★ 8‑SECOND DURATION APPLIED HERE ★★★
                stripEl.style.transition = `transform ${duration}ms cubic-bezier(0.08, 0.75, 0.15, 1)`;
                stripEl.style.transform = `translateY(${targetOffset}px)`;
                stripEl.style.filter = 'blur(0px)';

                const onFinish = () => {
                    stripEl.removeEventListener('transitionend', onFinish);
                    reelEl.classList.remove('spinning');
                    resolve();
                };
                stripEl.addEventListener('transitionend', onFinish);
            }, delay);
        });
    }

    // ─── DATABASE OPERATIONS ────────────────────────────
    function loadDB() {
        try {
            const raw = localStorage.getItem('slotMachineDB');
            if (raw) {
                const parsed = JSON.parse(raw);
                db = { ...DEFAULT_DB, ...parsed };
                db.settings = { ...DEFAULT_DB.settings, ...(parsed.settings || {}) };
                if (db.settings.maxBet < BET_OPTIONS[BET_OPTIONS.length - 1]) {
                    db.settings.maxBet = BET_OPTIONS[BET_OPTIONS.length - 1];
                }
                if (!Array.isArray(db.history)) db.history = [];
                if (db.history.length > 100) db.history = db.history.slice(-100);
                return;
            }
        } catch (_) {}
        db = JSON.parse(JSON.stringify(DEFAULT_DB));
        saveDB();
    }

    function saveDB() {
        try {
            localStorage.setItem('slotMachineDB', JSON.stringify(db));
        } catch (_) {}
        updateUI();
    }

    function resetDB() {
        if (!confirm('Reset all data?')) return;
        db = JSON.parse(JSON.stringify(DEFAULT_DB));
        saveDB();
        resetReelsToDefault();
        let defaultBet = db.settings.defaultBet || 10;
        let idx = BET_OPTIONS.indexOf(defaultBet);
        if (idx === -1) idx = 0;
        betIndex = idx;
        isCustomBet = false;
        currentBet = BET_OPTIONS[betIndex];
        betDisplay.textContent = currentBet;
        setMessage('🔄 Database reset', 'info');
        updateUI();
    }

    function resetReelsToDefault() {
        const defaultSymbols = ['🍒', '🍋', '🍊'];
        reelStrips.forEach((strip, i) => {
            const sym = defaultSymbols[i % defaultSymbols.length];
            const symbols = buildStrip(sym);
            renderStrip(strip, symbols);
            const targetIndex = 10;
            const offset = getTargetOffset(targetIndex, 66);
            strip.style.transition = 'none';
            strip.style.transform = `translateY(${offset}px)`;
            strip.style.filter = 'blur(0px)';
            reelContainers[i].classList.remove('winning', 'spinning');
        });
    }

    function exportDB() {
        const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `slot_db_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function importDB(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (typeof data.balance !== 'number' || !Array.isArray(data.history)) {
                    throw new Error('Invalid format');
                }
                db = { ...DEFAULT_DB, ...data };
                db.settings = { ...DEFAULT_DB.settings, ...(data.settings || {}) };
                if (db.settings.maxBet < BET_OPTIONS[BET_OPTIONS.length - 1]) {
                    db.settings.maxBet = BET_OPTIONS[BET_OPTIONS.length - 1];
                }
                if (!Array.isArray(db.history)) db.history = [];
                if (db.history.length > 100) db.history = db.history.slice(-100);
                saveDB();
                resetReelsToDefault();
                let defaultBet = db.settings.defaultBet || 10;
                let idx = BET_OPTIONS.indexOf(defaultBet);
                if (idx === -1) idx = 0;
                betIndex = idx;
                isCustomBet = false;
                currentBet = BET_OPTIONS[betIndex];
                betDisplay.textContent = currentBet;
                setMessage('✅ Database imported!', 'win');
                updateUI();
            } catch (err) {
                setMessage('❌ Invalid JSON file', 'lose');
            }
        };
        reader.readAsText(file);
    }

    // ─── TOP UP ──────────────────────────────────────────
    function topUp() {
        if (isSpinning) return;
        const input = prompt('Enter amount to add to your balance:', '100');
        if (input === null) return;
        const amount = parseInt(input, 10);
        if (isNaN(amount) || amount <= 0) {
            setMessage('❌ Please enter a valid positive number.', 'lose');
            return;
        }
        db.balance += amount;
        saveDB();
        setMessage(`✅ Added $${formatCurrency(amount)}. New balance: $${formatCurrency(db.balance)}`, 'win');
        updateUI();
        if (currentBet > db.balance) {
            let newIdx = BET_OPTIONS.findIndex(b => b > db.balance);
            if (newIdx === -1) newIdx = BET_OPTIONS.length - 1;
            else if (newIdx > 0) newIdx--;
            betIndex = newIdx;
            isCustomBet = false;
            currentBet = BET_OPTIONS[betIndex];
            betDisplay.textContent = currentBet;
            updateSpinButton();
        }
    }

    // ─── UI UPDATE ────────────────────────────────────────
    function updateUI() {
        if (!db) return;
        balanceDisplay.textContent = formatCurrency(db.balance);
        winDisplay.textContent = formatCurrency(currentWinAmount);
        betDisplay.textContent = currentBet;
        renderHistory();
        updateSpinButton();
    }

    function renderHistory() {
        if (!db || db.history.length === 0) {
            historyList.innerHTML = '<li class="empty">No spins yet</li>';
            return;
        }
        let html = '';
        const items = db.history.slice(-15).reverse();
        for (const entry of items) {
            const resultClass = entry.result === 'win' ? 'win' : 'lose';
            const sign = entry.result === 'win' ? '+' : '-';
            const amount = entry.result === 'win' ? entry.amount : entry.bet;
            const symStr = entry.symbols ? entry.symbols.join(' ') : '';
            html += `
                <li>
                    <span class="h-result ${resultClass}">${sign}$${amount}</span>
                    <span class="h-symbols">${symStr}</span>
                </li>
            `;
        }
        historyList.innerHTML = html;
    }

    function updateSpinButton() {
        spinBtn.disabled = isSpinning || (db && db.balance < currentBet);
        if (db && db.balance < currentBet) {
            spinBtn.textContent = '💰 INSUFFICIENT';
        } else if (isSpinning) {
            spinBtn.textContent = '🌀 SPINNING…';
        } else {
            spinBtn.textContent = '🎰 SPIN';
        }
    }

    function clearWinHighlights() {
        reelContainers.forEach(el => el.classList.remove('winning'));
    }

    function setMessage(text, type = 'info') {
        messageDisplay.textContent = text;
        messageDisplay.className = 'message ' + type;
    }
clearHistoryBtn.addEventListener('click', () => {
    if (!db || db.history.length === 0) return;
    if (!confirm('Clear history?')) return;
    db.history = [];
    saveDB();
    renderHistory();
    setMessage('🗑️ History cleared', 'info');
});
    // ─── BET CONTROLS ────────────────────────────────────
    function adjustBet(direction) {
        if (isSpinning) return;
        const minBet = db?.settings?.minBet || 10;

        let idx = betIndex;
        if (isCustomBet) {
            if (direction === 1) {
                idx = BET_OPTIONS.findIndex(b => b > currentBet);
                if (idx === -1) idx = BET_OPTIONS.length - 1;
            } else {
                let found = -1;
                for (let i = 0; i < BET_OPTIONS.length; i++) {
                    if (BET_OPTIONS[i] < currentBet) found = i;
                }
                idx = found;
                if (idx === -1) idx = 0;
            }
            isCustomBet = false;
        } else {
            idx = betIndex + direction;
            if (idx < 0) idx = 0;
            if (idx >= BET_OPTIONS.length) idx = BET_OPTIONS.length - 1;
        }

        let newBet = BET_OPTIONS[idx];
        if (newBet < minBet) newBet = minBet;
        let actualIdx = BET_OPTIONS.indexOf(newBet);
        if (actualIdx === -1) {
            let best = 0;
            for (let i = 0; i < BET_OPTIONS.length; i++) {
                if (BET_OPTIONS[i] <= newBet) best = i;
            }
            actualIdx = best;
            newBet = BET_OPTIONS[actualIdx];
        }
        betIndex = actualIdx;
        isCustomBet = false;
        currentBet = newBet;
        betDisplay.textContent = currentBet;
        updateSpinButton();
    }

    function setMaxBet() {
        if (isSpinning) return;
        if (!db) return;
        const maxPossible = Math.floor(db.balance);
        if (maxPossible < (db.settings?.minBet || 10)) {
            setMessage('❌ Balance too low for minimum bet.', 'lose');
            return;
        }
        currentBet = maxPossible;
        isCustomBet = true;
        betIndex = -1;
        betDisplay.textContent = currentBet;
        updateSpinButton();
        setMessage(`💰 Bet set to MAX: $${formatCurrency(currentBet)}`, 'info');
    }

    // ─── GAME CORE ────────────────────────────────────────
    async function spin() {
        if (isSpinning) return;
        if (!db) return;
        if (db.balance < currentBet) {
            setMessage('❌ Insufficient balance!', 'lose');
            return;
        }

        db.balance -= currentBet;
        isSpinning = true;
        currentWinAmount = 0;
        winDisplay.textContent = '0';
        updateSpinButton();
        clearWinHighlights();
        setMessage('🌀 Spinning…', 'info');

        // ▶️ Start spinning sound (loops)
        spinAudio.currentTime = 0;
        spinAudio.play().catch(() => {});

        const resultSymbols = [pickSymbol(), pickSymbol(), pickSymbol()];
        const delays = [0, 150, 300];

        // ★★★ 8‑SECOND SPIN DURATIONS ★★★
        // Reel 0: starts at 0ms, duration 8000ms → stops at 8000ms
        // Reel 1: starts at 150ms, duration 7850ms → stops at 8000ms
        // Reel 2: starts at 300ms, duration 7700ms → stops at 8000ms
        const durations = [8000, 7850, 7700];

        const spinPromises = resultSymbols.map((sym, i) => {
            return spinReel(i, sym, delays[i], durations[i]);
        });

        await Promise.all(spinPromises);
        evaluateSpin(resultSymbols);
    }

    function evaluateSpin(resultSymbols) {
        const allSame = resultSymbols.every(s => s === resultSymbols[0]);
        let winAmount = 0;
        let winType = 'lose';

        if (allSame) {
            const multiplier = PAYOUTS[resultSymbols[0]] || 0;
            winAmount = currentBet * multiplier;
            winType = 'win';
            reelContainers.forEach(el => el.classList.add('winning'));

            // 🎰 JACKPOT! – play special sound for 7️⃣
            if (resultSymbols[0] === '7️⃣') {
                jackpotAudio.currentTime = 0;
                jackpotAudio.play().catch(() => {});
                setMessage(`🎰 JACKPOT! $${winAmount}! (${resultSymbols.join(' ')})`, 'win');
            }
        } else {
            const counts = {};
            for (const s of resultSymbols) {
                counts[s] = (counts[s] || 0) + 1;
            }
            let hasPair = false;
            let pairSymbol = null;
            for (const [sym, count] of Object.entries(counts)) {
                if (count >= 2) {
                    hasPair = true;
                    pairSymbol = sym;
                    break;
                }
            }
            if (hasPair) {
                winAmount = currentBet * 2;
                winType = 'win';
                reelContainers.forEach((el, i) => {
                    if (resultSymbols[i] === pairSymbol) {
                        el.classList.add('winning');
                    }
                });
            }
        }

        if (winType === 'win') {
            db.balance += winAmount;
            currentWinAmount = winAmount;
            if (!(resultSymbols[0] === '7️⃣' && allSame)) {
                setMessage(`🎉 WIN $${winAmount}! (${resultSymbols.join(' ')})`, 'win');
            }
        } else {
            currentWinAmount = 0;
            setMessage(`😞 No luck… (${resultSymbols.join(' ')})`, 'lose');
        }

        // ⏹️ Stop spinning sound
        spinAudio.pause();
        spinAudio.currentTime = 0;

        db.history.push({
            bet: currentBet,
            result: winType,
            amount: winAmount,
            symbols: resultSymbols,
            timestamp: new Date().toISOString()
        });
        if (db.history.length > 100) db.history = db.history.slice(-100);

        if (winType === 'win') db.totalWins += winAmount;
        else db.totalLosses += currentBet;

        saveDB();
        isSpinning = false;
        updateSpinButton();
        winDisplay.textContent = formatCurrency(currentWinAmount);

        setTimeout(() => clearWinHighlights(), 4000);
    }

    // ─── BACKGROUND MUSIC & AUDIO INIT ──────────────────
    function enableAudio() {
        if (bgAudio.paused) {
            bgAudio.play().catch(() => {});
        }
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('keydown', enableAudio);
    }
    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);

    const muteBtn = document.getElementById('muteBtn');
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        bgAudio.muted = isMuted;
        spinAudio.muted = isMuted;
        jackpotAudio.muted = isMuted;
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });

    spinBtn.addEventListener('click', () => {
        if (bgAudio.paused) {
            bgAudio.play().catch(() => {});
        }
    });

    // ─── INIT ─────────────────────────────────────────────
    function init() {
        loadDB();

        let defaultBet = db.settings?.defaultBet || 10;
        let idx = BET_OPTIONS.indexOf(defaultBet);
        if (idx === -1) idx = 0;
        betIndex = idx;
        isCustomBet = false;
        currentBet = BET_OPTIONS[betIndex];
        betDisplay.textContent = currentBet;

        resetReelsToDefault();
        updateUI();
        setMessage('🎰 Ready to spin!', 'info');

        // ─── EVENT LISTENERS ──────────────────────────────
        spinBtn.addEventListener('click', spin);
        betUp.addEventListener('click', () => adjustBet(1));
        betDown.addEventListener('click', () => adjustBet(-1));
        maxBetBtn.addEventListener('click', setMaxBet);
        topUpBtn.addEventListener('click', topUp);
        exportBtn.addEventListener('click', exportDB);
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importDB(e.target.files[0]);
                fileInput.value = '';
            }
        });
        resetBtn.addEventListener('click', resetDB);
        clearHistoryBtn.addEventListener('click', () => {
            if (!db || db.history.length === 0) return;
            if (!confirm('Clear history?')) return;
            db.history = [];
            saveDB();
            renderHistory();
            setMessage('🗑️ History cleared', 'info');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && !e.repeat) {
                e.preventDefault();
                if (!isSpinning) spin();
            }
        });
        window.addEventListener('storage', (e) => {
            if (e.key === 'slotMachineDB') {
                loadDB();
                updateUI();
                updateSpinButton();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();