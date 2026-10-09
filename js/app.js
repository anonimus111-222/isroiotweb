/**
 * SKADUTA SMART AGRICULTURE - FIREBASE REALTIME DB & TELEMETRY CONTROLLER
 * Menggunakan Firebase SDK v8.10.1 Standalone + REST API Fallback
 * Bebas CORS / Module error (Bisa dibuka langsung via file:/// atau localhost).
 */

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyALA4KQ6CnJ40CVOj7b2Q8l91ntp0OF7rs",
  authDomain: "isro-smart-agriculture.firebaseapp.com",
  databaseURL: "https://isro-smart-agriculture-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "isro-smart-agriculture",
  storageBucket: "isro-smart-agriculture.firebasestorage.app",
  messagingSenderId: "791624676115",
  appId: "1:791624676115:web:b56d4a8b51a5e08e3d60e6"
};

const DB_BASE_URL = "https://isro-smart-agriculture-default-rtdb.asia-southeast1.firebasedatabase.app";
const NODE_PATH = "agriculture_iot";

// State Aplikasi
const appState = {
  relays: {
    relay1: false,
    relay2: false,
    relay3: false,
    relay4: false
  },
  sensors: {
    ph: 6.5,
    tds: 1200,
    tempWater: 24.5,
    tempAir: 28.2,
    humidity: 72,
    waterLevel: 78
  },
  autoPilot: false,
  soundEnabled: true,
  firebaseConnected: false,
  history: {
    labels: [],
    phData: [],
    tdsData: []
  }
};

let chartInstance = null;
let phGaugeCanvas = null;
let tdsGaugeCanvas = null;
let fbDatabase = null;
let restPollTimer = null;

// Mulai setelah DOM siap
document.addEventListener('DOMContentLoaded', () => {
  try { initGauges(); } catch (e) { console.error('Gauges error:', e); }
  try { initChart(); } catch (e) { console.error('Chart error:', e); }
  try { initFirebaseConnection(); } catch (e) { console.error('Firebase error:', e); }
  try { init3DScene(); } catch (e) { console.error('3D Scene error:', e); }
  try { initEventListeners(); } catch (e) { console.error('Events error:', e); }
  try { startMetricTicker(); } catch (e) { console.error('Metric ticker error:', e); }
  logActivity('Sistem SKADUTA Smart Agriculture v1.0.0 siap', 'highlight');
});

/* -------------------------------------------------------------
   1. KONEKSI FIREBASE (SDK REALTIME + INSTANT REST DUAL-ENGINE)
   ------------------------------------------------------------- */
function initFirebaseConnection() {
  updateDbStatusUI('Menghubungkan ke Firebase...', 'warning');

  // Tarik data seketika pertama kali via REST (< 200ms)
  fetchQuickInitialData();

  // Aktifkan Firebase SDK jika tersedia di window
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    try {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      fbDatabase = firebase.database();

      const iotRef = fbDatabase.ref(NODE_PATH);
      iotRef.on('value', (snapshot) => {
        appState.firebaseConnected = true;
        updateDbStatusUI('● Terhubung (Firebase Live)', 'connected');

        const data = snapshot.val();
        if (data) {
          handleIncomingFirebaseData(data);
        }
      }, (err) => {
        console.warn('Firebase SDK on error, gunakan polling REST:', err);
        startRestPollingInterval();
      });
      return;
    } catch (e) {
      console.warn('Error inisialisasi Firebase SDK:', e);
    }
  }

  // Backup jika SDK diblokir jaringan
  startRestPollingInterval();
}

function fetchQuickInitialData() {
  fetch(`${DB_BASE_URL}/${NODE_PATH}.json`)
    .then(res => res.json())
    .then(data => {
      if (data) {
        appState.firebaseConnected = true;
        updateDbStatusUI('● Terhubung (Firebase Live)', 'connected');
        handleIncomingFirebaseData(data);
      }
    })
    .catch(err => {
      console.warn('Fetch awal REST:', err);
    });
}

function startRestPollingInterval() {
  if (restPollTimer) return;
  restPollTimer = setInterval(fetchQuickInitialData, 2000);
}

function handleIncomingFirebaseData(data) {
  const timeNow = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Update pH
  if (data.ph !== undefined) {
    const ph = parseFloat(data.ph);
    appState.sensors.ph = ph;
    
    const phText = document.getElementById('phText');
    if (phText) phText.innerText = ph.toFixed(2);
    
    drawPhGauge(ph);
    updatePhStatus(ph);
  }

  // Update TDS
  if (data.tds !== undefined) {
    const tds = parseFloat(data.tds);
    appState.sensors.tds = tds;

    const tdsText = document.getElementById('tdsText');
    if (tdsText) tdsText.innerText = `${Math.round(tds)} PPM`;

    drawTdsGauge(tds);
    updateTdsStatus(tds);
  }

  // Update Sakelar Relays
  if (data.relays) {
    for (let i = 1; i <= 4; i++) {
      const relayKey = `relay${i}`;
      if (data.relays[relayKey] !== undefined) {
        const isChecked = Boolean(data.relays[relayKey]);
        syncRelayUI(relayKey, isChecked);
      }
    }
  }

  // Update Waktu
  const lastUpdate = document.getElementById('last-update');
  if (lastUpdate) lastUpdate.innerText = timeNow;

  // Update Line Chart
  if (data.ph !== undefined && data.tds !== undefined) {
    updateChart(timeNow, parseFloat(data.ph), parseFloat(data.tds));
  }

  // Auto-Pilot jika aktif
  if (appState.autoPilot) {
    runAutoPilotRules();
  }
}

/* -------------------------------------------------------------
   2. FUNGSI KONTROL RELAY KE FIREBASE
   ------------------------------------------------------------- */
function toggleRelay(relayId, isChecked) {
  // Update responsif seketika di UI & 3D
  syncRelayUI(relayId, isChecked);
  playSynthBeep(isChecked ? 580 : 340);

  const relayNames = {
    relay1: 'Pompa pH Up',
    relay2: 'Pompa pH Down',
    relay3: 'Pompa Nutrisi A',
    relay4: 'Pompa Nutrisi B'
  };
  const label = relayNames[relayId] || relayId;
  logActivity(`${label} ${isChecked ? 'DIHIDUPKAN' : 'DIMATIKAN'}`, isChecked ? 'highlight' : 'dim');

  // Kirim melalui Firebase SDK jika aktif
  if (fbDatabase) {
    fbDatabase.ref(`${NODE_PATH}/relays/${relayId}`).set(isChecked)
      .then(() => console.log(`[Firebase SDK] Sukses update ${relayId}: ${isChecked}`))
      .catch((err) => {
        console.warn(`[Firebase SDK] Gagal, mencoba kirim via REST PUT:`, err);
        sendRelayViaRest(relayId, isChecked);
      });
  } else {
    // Kirim via REST PUT langsung
    sendRelayViaRest(relayId, isChecked);
  }
}

function sendRelayViaRest(relayId, isChecked) {
  fetch(`${DB_BASE_URL}/${NODE_PATH}/relays/${relayId}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(isChecked)
  })
  .then(() => console.log(`[Firebase REST] Sukses update ${relayId}: ${isChecked}`))
  .catch(err => {
    console.error(`[Firebase REST] Error update ${relayId}:`, err);
    logActivity(`Gagal kirim ${relayId}: ${err.message}`, 'alarm');
  });
}

function syncRelayUI(relayId, isChecked) {
  appState.relays[relayId] = isChecked;

  // Checkbox input
  const rToggle = document.getElementById(relayId);
  if (rToggle && rToggle.checked !== isChecked) {
    rToggle.checked = isChecked;
  }

  // Card class
  const card = document.getElementById(`card-${relayId}`);
  if (card) {
    if (isChecked) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  }

  // Teks status
  const statusEl = document.getElementById(`status-${relayId}`);
  if (statusEl) {
    statusEl.textContent = isChecked ? 'AKTIF' : 'MATI';
  }

  // Sinkronisasi dengan 3D Digital Twin (Perputaran pompa & selang fluida)
  if (window.hydroScene) {
    window.hydroScene.setRelayState(relayId, isChecked);
  }
}

function pulseRelay(relayId, durationSeconds = 3) {
  if (appState.relays[relayId]) return;
  toggleRelay(relayId, true);
  logActivity(`Injeksi Dosis 10ml dimulai pada ${relayId}...`, 'warn');

  setTimeout(() => {
    toggleRelay(relayId, false);
    logActivity(`Injeksi Dosis 10ml selesai.`, 'highlight');
  }, durationSeconds * 1000);
}

function emergencyStopAll() {
  ['relay1', 'relay2', 'relay3', 'relay4'].forEach(r => {
    toggleRelay(r, false);
  });
  logActivity('🚨 EMERGENCY STOP: Seluruh pompa dimatikan di Firebase!', 'alarm');
}

// Buka akses ke global window untuk tag onclick & onchange di HTML
window.toggleRelay = toggleRelay;
window.pulseRelay = pulseRelay;
window.emergencyStopAll = emergencyStopAll;

/* -------------------------------------------------------------
   3. GAUGES VEKTOR RADIAL RESOLUSI TINGGI
   ------------------------------------------------------------- */
function initGauges() {
  phGaugeCanvas = document.getElementById('phGauge');
  tdsGaugeCanvas = document.getElementById('tdsGauge');
  drawPhGauge(appState.sensors.ph);
  drawTdsGauge(appState.sensors.tds);
}

function drawPhGauge(value) {
  if (!phGaugeCanvas) return;
  const ctx = phGaugeCanvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = 140;
  const height = 110;
  
  phGaugeCanvas.width = width * dpr;
  phGaugeCanvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const cx = width / 2;
  const cy = height - 12;
  const radius = 50;
  const startAngle = Math.PI * 0.85;
  const endAngle = Math.PI * 2.15;

  // Background Track
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Value Arc (0 - 14)
  const normVal = Math.min(Math.max(value / 14, 0), 1);
  const currentAngle = startAngle + normVal * (endAngle - startAngle);

  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(0.5, '#00f5d4');
  grad.addColorStop(1, '#f43f5e');

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, currentAngle);
  ctx.lineWidth = 10;
  ctx.strokeStyle = grad;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Needle tip
  const tipX = cx + Math.cos(currentAngle) * radius;
  const tipY = cy + Math.sin(currentAngle) * radius;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#00f5d4';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawTdsGauge(value) {
  if (!tdsGaugeCanvas) return;
  const ctx = tdsGaugeCanvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = 140;
  const height = 110;

  tdsGaugeCanvas.width = width * dpr;
  tdsGaugeCanvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const cx = width / 2;
  const cy = height - 12;
  const radius = 50;
  const startAngle = Math.PI * 0.85;
  const endAngle = Math.PI * 2.15;

  // Background Track
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Value Arc (0 - 2000 PPM)
  const normVal = Math.min(Math.max(value / 2000, 0), 1);
  const currentAngle = startAngle + normVal * (endAngle - startAngle);

  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, '#10b981');
  grad.addColorStop(0.6, '#f59e0b');
  grad.addColorStop(1, '#ef4444');

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, currentAngle);
  ctx.lineWidth = 10;
  ctx.strokeStyle = grad;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Needle tip
  const tipX = cx + Math.cos(currentAngle) * radius;
  const tipY = cy + Math.sin(currentAngle) * radius;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function updatePhStatus(ph) {
  const phStatus = document.getElementById('ph-status');
  if (!phStatus) return;
  if (ph >= 5.5 && ph <= 6.5) {
    phStatus.textContent = 'Optimal (5.5 - 6.5)';
    phStatus.style.color = 'var(--emerald)';
  } else if (ph < 5.5) {
    phStatus.textContent = 'Terlalu Asam (pH Rendah)';
    phStatus.style.color = 'var(--crimson)';
  } else {
    phStatus.textContent = 'Terlalu Basa (pH Tinggi)';
    phStatus.style.color = 'var(--amber)';
  }
}

function updateTdsStatus(tds) {
  const tdsStatus = document.getElementById('tds-status');
  if (!tdsStatus) return;
  if (tds >= 800 && tds <= 1200) {
    tdsStatus.textContent = 'Optimal (800-1200)';
    tdsStatus.style.color = 'var(--emerald)';
  } else if (tds < 800) {
    tdsStatus.textContent = 'Kurang Nutrisi (< 800)';
    tdsStatus.style.color = 'var(--amber)';
  } else {
    tdsStatus.textContent = 'Nutrisi Pekat (> 1200)';
    tdsStatus.style.color = 'var(--crimson)';
  }
}

/* -------------------------------------------------------------
   4. CHART.JS REAL-TIME TELEMETRY GRAPH
   ------------------------------------------------------------- */
function initChart() {
  const ctx = document.getElementById('sensorGraph');
  if (!ctx) return;

  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 4000);
    const timeStr = t.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    appState.history.labels.push(timeStr);
    appState.history.phData.push(appState.sensors.ph);
    appState.history.tdsData.push(appState.sensors.tds);
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: appState.history.labels,
      datasets: [
        {
          label: 'pH Air',
          data: appState.history.phData,
          borderColor: '#00c4b4',
          backgroundColor: 'rgba(0, 196, 180, 0.08)',
          borderWidth: 2.5,
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#00c4b4',
          fill: true,
          yAxisID: 'yPh'
        },
        {
          label: 'TDS (PPM)',
          data: appState.history.tdsData,
          borderColor: '#f39c12',
          backgroundColor: 'rgba(243, 156, 18, 0.05)',
          borderWidth: 2,
          borderDash: [4, 4],
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: '#f39c12',
          fill: true,
          yAxisID: 'yTds'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#8b9da8',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(16, 24, 32, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(0, 245, 212, 0.3)',
          borderWidth: 1,
          padding: 10
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { size: 10 } }
        },
        yPh: {
          type: 'linear',
          position: 'left',
          min: 4,
          max: 9,
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#00c4b4', font: { size: 10 } }
        },
        yTds: {
          type: 'linear',
          position: 'right',
          min: 400,
          max: 2000,
          grid: { display: false },
          ticks: { color: '#f39c12', font: { size: 10 } }
        }
      }
    }
  });
}

function updateChart(timeStr, phVal, tdsVal) {
  if (!chartInstance) return;

  appState.history.labels.push(timeStr);
  appState.history.phData.push(phVal);
  appState.history.tdsData.push(tdsVal);

  if (appState.history.labels.length > 15) {
    appState.history.labels.shift();
    appState.history.phData.shift();
    appState.history.tdsData.shift();
  }

  chartInstance.update('none');
}

/* -------------------------------------------------------------
   5. AUTO-PILOT & AMBIENT TICKER
   ------------------------------------------------------------- */
function runAutoPilotRules() {
  if (appState.sensors.ph < 5.6 && !appState.relays.relay1) {
    logActivity(`[Auto-Pilot] pH Rendah (${appState.sensors.ph}). Mengaktifkan Pompa pH Up!`, 'warn');
    toggleRelay('relay1', true);
    setTimeout(() => toggleRelay('relay1', false), 3000);
  } else if (appState.sensors.ph > 6.7 && !appState.relays.relay2) {
    logActivity(`[Auto-Pilot] pH Tinggi (${appState.sensors.ph}). Mengaktifkan Pompa pH Down!`, 'warn');
    toggleRelay('relay2', true);
    setTimeout(() => toggleRelay('relay2', false), 3000);
  }

  if (appState.sensors.tds < 880 && !appState.relays.relay3) {
    logActivity(`[Auto-Pilot] TDS Rendah (${appState.sensors.tds} PPM). Mengaktifkan Nutrisi A & B!`, 'warn');
    toggleRelay('relay3', true);
    toggleRelay('relay4', true);
    setTimeout(() => {
      toggleRelay('relay3', false);
      toggleRelay('relay4', false);
    }, 3500);
  }
}

function startMetricTicker() {
  setInterval(() => {
    const tempWaterEl = document.getElementById('metric-temp-water');
    if (tempWaterEl) {
      const val = (24.3 + (Math.random() - 0.5) * 0.2).toFixed(1);
      tempWaterEl.textContent = `${val}°C`;
    }
  }, 4000);
}

/* -------------------------------------------------------------
   6. 3D SCENE & AUDIO FEEDBACK
   ------------------------------------------------------------- */
function init3DScene() {
  if (window.HydroponicScene) {
    window.hydroScene = new window.HydroponicScene('three-canvas-container');
  }
}

function playSynthBeep(freq = 440) {
  if (!appState.soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
}

/* -------------------------------------------------------------
   7. ACTIVITY LOGGER TERMINAL & UI STATUS
   ------------------------------------------------------------- */
function logActivity(message, level = 'normal') {
  const terminal = document.getElementById('log-terminal');
  if (!terminal) return;

  const time = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg ${level}">${message}</span>`;

  terminal.appendChild(entry);
  terminal.scrollTop = terminal.scrollHeight;
}

function updateDbStatusUI(text, status) {
  const badge = document.getElementById('db-status');
  if (!badge) return;

  badge.className = `connection-badge ${status === 'connected' ? 'connected' : ''}`;
  badge.innerHTML = `<span class="status-indicator-dot"></span><span>${text}</span>`;
  if (status === 'connected') {
    badge.style.color = '#00c4b4';
    badge.style.borderColor = 'rgba(0, 196, 180, 0.4)';
  } else if (status === 'danger') {
    badge.style.color = '#ef4444';
  } else {
    badge.style.color = '#f39c12';
  }
}

/* -------------------------------------------------------------
   8. EVENT LISTENERS & HUD
   ------------------------------------------------------------- */
function initEventListeners() {
  // Preset Kamera 3D
  const camBtns = document.querySelectorAll('.camera-btn');
  camBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      camBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = btn.dataset.preset;
      if (window.hydroScene) window.hydroScene.setCameraPreset(preset);
      logActivity(`Kamera beralih ke: [${preset.toUpperCase()}]`, 'dim');
    });
  });

  // Mode Cahaya Grow Light
  const lightBtn = document.getElementById('btn-light-mode');
  if (lightBtn) {
    const modes = ['grow', 'day', 'night'];
    let modeIdx = 0;
    lightBtn.addEventListener('click', () => {
      modeIdx = (modeIdx + 1) % modes.length;
      const m = modes[modeIdx];
      if (window.hydroScene) window.hydroScene.setLightMode(m);
      lightBtn.textContent = `💡 Spektrum: ${m.toUpperCase()}`;
      logActivity(`Mode Cahaya diubah ke: ${m.toUpperCase()}`, 'dim');
    });
  }

  // Rotasi Otomatis 3D
  const rotateBtn = document.getElementById('btn-auto-rotate');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      if (window.hydroScene) {
        const isRotating = window.hydroScene.toggleAutoRotate();
        rotateBtn.classList.toggle('active', isRotating);
        logActivity(`3D Orbit Auto-Rotate: ${isRotating ? 'ON' : 'OFF'}`, 'dim');
      }
    });
  }

  // Auto-Pilot Toggle
  const autoPilotBtn = document.getElementById('btn-autopilot');
  if (autoPilotBtn) {
    autoPilotBtn.addEventListener('click', () => {
      appState.autoPilot = !appState.autoPilot;
      autoPilotBtn.classList.toggle('primary', appState.autoPilot);
      autoPilotBtn.textContent = appState.autoPilot ? '🤖 Auto-Pilot: AKTIF' : '🤖 Auto-Pilot: NONAKTIF';
      logActivity(`Sistem Auto-Pilot Dosing: ${appState.autoPilot ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}`, appState.autoPilot ? 'highlight' : 'warn');
    });
  }

  // Audio Toggle
  const soundBtn = document.getElementById('btn-sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      appState.soundEnabled = !appState.soundEnabled;
      soundBtn.textContent = appState.soundEnabled ? '🔊 Audio ON' : '🔇 Audio OFF';
    });
  }

  // Emergency Stop
  const stopBtn = document.getElementById('btn-emergency-stop');
  if (stopBtn) {
    stopBtn.addEventListener('click', emergencyStopAll);
  }
}
