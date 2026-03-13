/* =========================================
   app.js — 신일팜글래스 B2B Intelligence
   Main Application Logic
   ========================================= */

/* ─────────────────────────────────────────
   SECTION NAVIGATION
───────────────────────────────────────── */
const SECTION_TITLES = {
  overview: '종합 상황판',
  reputation: 'Reputation Monitor',
  customer: 'Customer Health',
  opportunity: 'Opportunity Pipeline'
};

function switchSection(name) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === name);
  });
  // Update sections
  document.querySelectorAll('.section').forEach(s => {
    s.classList.toggle('active', s.id === 'section-' + name);
  });
  // Topbar title
  document.getElementById('topbarTitle').textContent = SECTION_TITLES[name] || name;

  // On mobile, close sidebar
  if (window.innerWidth <= 680) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const mc = document.getElementById('mainContent');
  if (window.innerWidth <= 680) {
    sb.classList.toggle('mobile-open');
  } else {
    sb.classList.toggle('collapsed');
    mc.classList.toggle('expanded');
  }
}

/* ─────────────────────────────────────────
   CUSTOMER TABLE
───────────────────────────────────────── */
let currentFilter = 'all';
let currentSort = 'risk';

function getStatusEmoji(status) {
  return status === 'red' ? '🔴' : status === 'yellow' ? '🟡' : '🟢';
}
function getRiskClass(risk) {
  if (risk >= 60) return 'risk-high';
  if (risk >= 30) return 'risk-medium';
  return 'risk-low';
}
function getScoreClass(score) {
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}
function getTrendHtml(val) {
  if (val > 0) return `<span class="trend-arrow trend-up">▲ +${val}%</span>`;
  if (val < 0) return `<span class="trend-arrow trend-down">▼ ${val}%</span>`;
  return `<span class="trend-arrow trend-flat">━ 0%</span>`;
}

function renderCustomerTable(customers) {
  const tbody = document.getElementById('customerTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  customers.forEach(c => {
    const scoreClass = getScoreClass(c.healthScore);
    const riskClass = getRiskClass(c.riskPct);
    const signalHtml = c.signals.map(s => `<span class="signal-tag">${s}</span>`).join('');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${getStatusEmoji(c.status)}</td>
      <td>
        <div class="customer-name">${c.name}</div>
        <div class="customer-type">${c.revenue}</div>
      </td>
      <td><span class="customer-type">${c.type}</span></td>
      <td>
        <div class="score-bar-wrap">
          <div class="score-bar">
            <div class="score-bar-fill ${scoreClass}" style="width:${c.healthScore}%"></div>
          </div>
          <span class="score-num" style="color:${scoreClass==='high'?'#4ade80':scoreClass==='medium'?'#fcd34d':'#f87171'}">${c.healthScore}</span>
        </div>
      </td>
      <td><span class="risk-badge ${riskClass}">${c.riskPct}%</span></td>
      <td>${getTrendHtml(c.orderTrend)}</td>
      <td><div class="signal-tags">${signalHtml}</div></td>
      <td><span style="font-size:11px;color:#8892a4">${c.lastContact}</span></td>
      <td><button class="detail-btn" onclick="openCustomerModal(${c.id})">건강 진단서</button></td>
    `;
    tbody.appendChild(row);
  });
}

function getFilteredSortedCustomers() {
  const search = (document.getElementById('customerSearch')?.value || '').toLowerCase();
  let list = [...DATA.customers];

  // Filter by status
  if (currentFilter !== 'all') {
    list = list.filter(c => c.status === currentFilter);
  }
  // Filter by search
  if (search) {
    list = list.filter(c => c.name.toLowerCase().includes(search) || c.type.includes(search));
  }
  // Sort
  if (currentSort === 'risk') list.sort((a, b) => b.riskPct - a.riskPct);
  else if (currentSort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (currentSort === 'score') list.sort((a, b) => a.healthScore - b.healthScore);
  else if (currentSort === 'revenue') list.sort((a, b) => parseInt(b.revenue) - parseInt(a.revenue));

  return list;
}

function filterCustomers() {
  renderCustomerTable(getFilteredSortedCustomers());
}

function filterByStatus(status, btn) {
  currentFilter = status;
  document.querySelectorAll('.filter-btns .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filterCustomers();
}

function sortCustomers(val) {
  currentSort = val;
  filterCustomers();
}

/* ─────────────────────────────────────────
   CUSTOMER MODAL
───────────────────────────────────────── */
function openCustomerModal(customerId) {
  const c = DATA.customers.find(x => x.id === customerId);
  if (!c) return;

  const severityColor = { red: '#f87171', yellow: '#fcd34d', green: '#4ade80' };
  const riskFactorsHtml = c.details.riskFactors.map(f => `
    <div class="modal-signal-item">
      <span class="sig-icon">${f.icon}</span>
      <div>
        <div style="font-size:12px;font-weight:600;">${f.label}</div>
        <div style="font-size:11px;color:#8892a4;">${f.value}</div>
      </div>
      <span style="margin-left:auto;font-size:11px;padding:2px 8px;border-radius:12px;background:${severityColor[f.severity]}18;color:${severityColor[f.severity]}">${f.severity === 'red' ? '위험' : f.severity === 'yellow' ? '주의' : '기회'}</span>
    </div>
  `).join('');

  const actionsHtml = c.details.actions.map(a => `<li>${a}</li>`).join('');

  const statusColor = c.status === 'red' ? '#ef4444' : c.status === 'yellow' ? '#f59e0b' : '#22c55e';
  const statusLabel = c.status === 'red' ? '이탈 위험' : c.status === 'yellow' ? '주의 관찰' : '건강';
  const riskColor = c.riskPct >= 60 ? 'red' : c.riskPct >= 30 ? 'yellow' : 'green';
  const scoreColor = c.healthScore >= 70 ? 'green' : c.healthScore >= 50 ? 'yellow' : 'red';

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-head">
      <div class="modal-head-top">
        <span class="modal-status">${getStatusEmoji(c.status)}</span>
        <div>
          <div class="modal-company-name">${c.name}</div>
          <div class="modal-industry">${c.type} · 연간 거래액 ${c.revenue} · 업력 ${c.details.founded}</div>
        </div>
        <span style="margin-left:auto;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${statusColor}22;color:${statusColor}">${statusLabel}</span>
      </div>
    </div>

    <div class="modal-score-row">
      <div class="modal-metric">
        <div class="modal-metric-label">건강도 점수</div>
        <div class="modal-metric-value ${scoreColor}">${c.healthScore}<span style="font-size:14px;color:#8892a4">/100</span></div>
      </div>
      <div class="modal-metric">
        <div class="modal-metric-label">이탈 위험도</div>
        <div class="modal-metric-value ${riskColor}">${c.riskPct}%</div>
      </div>
      <div class="modal-metric">
        <div class="modal-metric-label">발주 추이</div>
        <div class="modal-metric-value ${c.orderTrend >= 0 ? 'green' : 'red'}">${c.orderTrend >= 0 ? '+' : ''}${c.orderTrend}%</div>
      </div>
    </div>

    <!-- 발주량 미니 스파크라인 -->
    <div class="modal-section-title">📊 발주량 추이 (6개월)</div>
    <div style="height:100px;margin-bottom:14px;">
      <canvas id="modalSparkline"></canvas>
    </div>

    <!-- 위험 신호 -->
    <div class="modal-section-title">🚨 감지된 이탈 신호 (${c.details.riskFactors.length}건)</div>
    <div class="modal-signal-list">${riskFactorsHtml || '<div style="font-size:12px;color:#8892a4;padding:8px;">감지된 위험 신호 없음 — 건강한 상태입니다</div>'}</div>

    <!-- 권장 대응 -->
    <div class="modal-action-box">
      <div class="modal-action-title"><i class="fas fa-lightbulb"></i> AI 권장 대응 전략</div>
      <ul class="modal-action-list">${actionsHtml}</ul>
    </div>
  `;

  document.getElementById('modalOverlay').classList.add('open');

  // Render sparkline after DOM is ready
  requestAnimationFrame(() => {
    const sparkCtx = document.getElementById('modalSparkline');
    if (!sparkCtx) return;
    new Chart(sparkCtx, {
      type: 'line',
      data: {
        labels: ['12월', '1월', '2월', '3월', '4월', '5월'],
        datasets: [{
          data: c.details.orderHistory,
          borderColor: c.status === 'red' ? '#ef4444' : c.status === 'yellow' ? '#f59e0b' : '#22c55e',
          backgroundColor: c.status === 'red' ? 'rgba(239,68,68,0.1)' : c.status === 'yellow' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
          fill: true, tension: 0.4, pointRadius: 4,
          pointBackgroundColor: c.status === 'red' ? '#ef4444' : c.status === 'yellow' ? '#f59e0b' : '#22c55e',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { font: { size: 10 } } }
        }
      }
    });
  });
}

function closeModal(event) {
  if (event.target === document.getElementById('modalOverlay')) {
    closeModalDirect();
  }
}
function closeModalDirect() {
  document.getElementById('modalOverlay').classList.remove('open');
}

/* ─────────────────────────────────────────
   OPPORTUNITY PIPELINE
───────────────────────────────────────── */
function renderPipeline() {
  const board = document.getElementById('pipelineBoard');
  if (!board) return;

  const cols = { urgent: [], high: [], medium: [] };
  DATA.opportunities.forEach(o => { if (cols[o.priority]) cols[o.priority].push(o); });

  const colOrder = ['urgent', 'high', 'medium'];
  const colInfo = {
    urgent: { class: 'urgent', label: '긴급' },
    high:   { class: 'high',   label: '높음' },
    medium: { class: 'medium', label: '보통' }
  };

  board.innerHTML = '';
  colOrder.forEach(priority => {
    const colDiv = document.createElement('div');
    colDiv.className = 'pipeline-col';

    cols[priority].forEach(o => {
      const card = document.createElement('div');
      card.className = `opp-card ${colInfo[priority].class}`;
      card.innerHTML = `
        <div class="opp-card-header">
          <div class="opp-company">${o.company}</div>
          <div class="opp-amount">${o.amount}</div>
        </div>
        <div class="opp-trigger"><i class="fas fa-bolt"></i> ${o.trigger}</div>
        <div class="opp-desc">${o.desc}</div>
        <div class="opp-footer">
          <div class="opp-source"><i class="fas fa-database"></i> ${o.source}</div>
          <div class="opp-date">${o.date}</div>
        </div>
        <button class="opp-action-btn" onclick="showOppAlert('${o.company}', '${o.action}')">
          <i class="fas fa-paper-plane"></i> ${o.action}
        </button>
      `;
      colDiv.appendChild(card);
    });

    board.appendChild(colDiv);
  });
}

function showOppAlert(company, action) {
  showToast(`${company}: ${action}`, 'info');
}

/* ─────────────────────────────────────────
   TOAST NOTIFICATION
───────────────────────────────────────── */
function showToast(msg, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  const colors = { info: '#6366f1', success: '#22c55e', warning: '#f59e0b', danger: '#ef4444' };
  const icons = { info: 'fas fa-info-circle', success: 'fas fa-check-circle', warning: 'fas fa-exclamation-triangle', danger: 'fas fa-times-circle' };
  toast.innerHTML = `
    <i class="${icons[type] || icons.info}" style="color:${colors[type]};flex-shrink:0;"></i>
    <span>${msg}</span>
  `;
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:#1e2340; border:1px solid ${colors[type]}40;
    border-left:3px solid ${colors[type]};
    padding:12px 18px; border-radius:10px;
    display:flex; align-items:center; gap:10px;
    font-size:13px; color:#e8ecf4; font-family:'Noto Sans KR',sans-serif;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    animation: slideInRight 0.3s ease;
    max-width: 340px;
  `;
  const style = document.createElement('style');
  style.textContent = '@keyframes slideInRight { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }';
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'slideInRight 0.3s ease reverse'; setTimeout(() => toast.remove(), 300); }, 3500);
}

/* ─────────────────────────────────────────
   DATE / TIME
───────────────────────────────────────── */
function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const el = document.getElementById('currentDate');
  if (el) el.textContent = dateStr;
  const lu = document.getElementById('lastUpdate');
  if (lu) lu.textContent = timeStr;
}

/* ─────────────────────────────────────────
   INIT APP
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Set datetime
  updateDateTime();
  setInterval(updateDateTime, 60000);

  // Init customer counts
  const red = DATA.customers.filter(c => c.status === 'red').length;
  const yellow = DATA.customers.filter(c => c.status === 'yellow').length;
  const green = DATA.customers.filter(c => c.status === 'green').length;
  const total = DATA.customers.length;

  const cntAll = document.getElementById('cnt-all');
  const cntRed = document.getElementById('cnt-red');
  const cntYellow = document.getElementById('cnt-yellow');
  const cntGreen = document.getElementById('cnt-green');
  if (cntAll) cntAll.textContent = total;
  if (cntRed) cntRed.textContent = red;
  if (cntYellow) cntYellow.textContent = yellow;
  if (cntGreen) cntGreen.textContent = green;

  // Render tables / pipeline
  renderCustomerTable(getFilteredSortedCustomers());
  renderPipeline();

  // Init charts
  initAllCharts();

  // Keyboard ESC closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModalDirect();
  });

  // Show welcome toast
  setTimeout(() => {
    showToast('B2B Intelligence 대시보드가 로드되었습니다', 'success');
  }, 800);
});
