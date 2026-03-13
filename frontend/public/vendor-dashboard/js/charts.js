/* =========================================
   charts.js — 신일팜글래스 B2B Intelligence
   Chart Initializations (Chart.js)
   ========================================= */

const CHART_DEFAULTS = {
  color: { primary: '#6366f1', success: '#22c55e', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6', purple: '#a855f7' },
  font: { family: "'Noto Sans KR', sans-serif", size: 11 },
  gridColor: 'rgba(255,255,255,0.06)',
  textColor: '#8892a4'
};

Chart.defaults.color = CHART_DEFAULTS.textColor;
Chart.defaults.font.family = CHART_DEFAULTS.font.family;
Chart.defaults.font.size = 11;

/* ─────────────────────────────────────────
   OVERVIEW CHARTS
───────────────────────────────────────── */
function initHealthTrendChart() {
  const ctx = document.getElementById('healthTrendChart');
  if (!ctx) return;
  const d = DATA.healthTrend;
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: [
        {
          label: '건강', data: d.green,
          borderColor: CHART_DEFAULTS.color.success,
          backgroundColor: 'rgba(34,197,94,0.1)',
          fill: true, tension: 0.4, pointRadius: 4,
          pointBackgroundColor: CHART_DEFAULTS.color.success
        },
        {
          label: '주의', data: d.yellow,
          borderColor: CHART_DEFAULTS.color.warning,
          backgroundColor: 'rgba(245,158,11,0.08)',
          fill: true, tension: 0.4, pointRadius: 4,
          pointBackgroundColor: CHART_DEFAULTS.color.warning
        },
        {
          label: '위험', data: d.red,
          borderColor: CHART_DEFAULTS.color.danger,
          backgroundColor: 'rgba(239,68,68,0.08)',
          fill: true, tension: 0.4, pointRadius: 4,
          pointBackgroundColor: CHART_DEFAULTS.color.danger
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { font: { size: 11 } } },
        y: { grid: { color: CHART_DEFAULTS.gridColor }, min: 0, max: 50, ticks: { stepSize: 10 } }
      }
    }
  });
}

function initHealthDistChart() {
  const ctx = document.getElementById('healthDistChart');
  if (!ctx) return;
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['🟢 건강 (39)', '🟡 주의 (5)', '🔴 위험 (3)'],
      datasets: [{
        data: [39, 5, 3],
        backgroundColor: [
          'rgba(34,197,94,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)'
        ],
        borderColor: ['#22c55e', '#f59e0b', '#ef4444'],
        borderWidth: 2, hoverOffset: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 14, font: { size: 11 }, boxWidth: 12 }
        }
      }
    }
  });
}

/* ─────────────────────────────────────────
   REPUTATION CHARTS
───────────────────────────────────────── */
function initGaugeChart(canvasId, value, color) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const pct = value / 100;
  const remaining = 1 - pct;
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [pct, remaining],
        backgroundColor: [color, 'rgba(255,255,255,0.06)'],
        borderWidth: 0,
        hoverOffset: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '72%',
      rotation: -90, circumference: 180,
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
}

let sentimentChart = null;
function initSentimentTrendChart() {
  const ctx = document.getElementById('sentimentTrendChart');
  if (!ctx) return;
  const d = DATA.sentimentTrend;
  sentimentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: [
        {
          label: '긍정', data: d.positive,
          borderColor: CHART_DEFAULTS.color.success,
          backgroundColor: 'rgba(34,197,94,0.1)',
          fill: true, tension: 0.4, pointRadius: 3
        },
        {
          label: '부정', data: d.negative,
          borderColor: CHART_DEFAULTS.color.danger,
          backgroundColor: 'rgba(239,68,68,0.08)',
          fill: true, tension: 0.4, pointRadius: 3
        },
        {
          label: '중립', data: d.neutral,
          borderColor: CHART_DEFAULTS.color.info,
          backgroundColor: 'rgba(59,130,246,0.06)',
          fill: true, tension: 0.4, pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { padding: 12, font: { size: 11 } } }
      },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.gridColor } },
        y: { grid: { color: CHART_DEFAULTS.gridColor }, min: 0, max: 100, ticks: { callback: v => v + '%' } }
      }
    }
  });
}

let mediaChart = null;
function initMediaTrendChart() {
  const ctx = document.getElementById('sentimentTrendChart');
  if (!ctx) return;
  const d = DATA.mediaTrend;
  if (mediaChart) {
    mediaChart.destroy();
    mediaChart = null;
  }
  mediaChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{
        label: '기사 건수',
        data: d.count,
        backgroundColor: 'rgba(99,102,241,0.5)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.gridColor } },
        y: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { stepSize: 10 } }
      }
    }
  });
  return mediaChart;
}

function initMediaCategoryChart() {
  const ctx = document.getElementById('mediaCategoryChart');
  if (!ctx) return;
  const d = DATA.mediaCategory;
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: d.labels,
      datasets: [{
        data: d.values,
        backgroundColor: [
          'rgba(99,102,241,0.7)', 'rgba(34,197,94,0.7)', 'rgba(59,130,246,0.7)',
          'rgba(245,158,11,0.7)', 'rgba(168,85,247,0.7)', 'rgba(239,68,68,0.7)'
        ],
        borderWidth: 2,
        borderColor: ['#6366f1','#22c55e','#3b82f6','#f59e0b','#a855f7','#ef4444']
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: { padding: 12, font: { size: 11 }, boxWidth: 10 }
        }
      }
    }
  });
}

/* ─────────────────────────────────────────
   CUSTOMER HEALTH CHARTS
───────────────────────────────────────── */
function initRadarChart() {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;
  return new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['발주 감소', '담당자 교체', '경쟁사 접촉', '클레임 발생', '소통 단절', '입찰 불참'],
      datasets: [
        {
          label: '한미약품', data: [90, 85, 80, 60, 55, 70],
          borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)',
          pointBackgroundColor: '#ef4444', borderWidth: 2
        },
        {
          label: '동아ST', data: [65, 40, 50, 75, 30, 85],
          borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)',
          pointBackgroundColor: '#f59e0b', borderWidth: 2
        },
        {
          label: '일동제약', data: [55, 30, 35, 20, 80, 40],
          borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.1)',
          pointBackgroundColor: '#a855f7', borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, boxWidth: 10 } }
      },
      scales: {
        r: {
          min: 0, max: 100,
          grid: { color: 'rgba(255,255,255,0.08)' },
          angleLines: { color: 'rgba(255,255,255,0.08)' },
          pointLabels: { color: CHART_DEFAULTS.textColor, font: { size: 11 } },
          ticks: { display: false }
        }
      }
    }
  });
}

function initOrderChangeChart() {
  const ctx = document.getElementById('orderChangeChart');
  if (!ctx) return;
  const d = DATA.orderChange;
  const colors = d.changes.map(v => v >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)');
  const borders = d.changes.map(v => v >= 0 ? '#22c55e' : '#ef4444');
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: d.companies,
      datasets: [{
        label: '발주량 변동 (%)',
        data: d.changes,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: CHART_DEFAULTS.gridColor },
          ticks: { callback: v => v + '%' }
        },
        y: { grid: { color: 'transparent' } }
      }
    }
  });
}

/* ─────────────────────────────────────────
   OPPORTUNITY CHARTS
───────────────────────────────────────── */
function initOppSourceChart() {
  const ctx = document.getElementById('oppSourceChart');
  if (!ctx) return;
  const d = DATA.oppSource;
  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: d.labels,
      datasets: [{
        data: d.values,
        backgroundColor: [
          'rgba(99,102,241,0.7)', 'rgba(34,197,94,0.7)', 'rgba(59,130,246,0.7)',
          'rgba(245,158,11,0.7)', 'rgba(168,85,247,0.7)', 'rgba(239,68,68,0.7)'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { padding: 10, font: { size: 11 }, boxWidth: 10 }
        }
      }
    }
  });
}

function initOppRevenueChart() {
  const ctx = document.getElementById('oppRevenueChart');
  if (!ctx) return;
  const d = DATA.oppRevenue;
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{
        label: '예상 연간 매출 (억원)',
        data: d.values,
        backgroundColor: [
          'rgba(99,102,241,0.7)', 'rgba(34,197,94,0.7)', 'rgba(245,158,11,0.7)',
          'rgba(239,68,68,0.7)', 'rgba(59,130,246,0.7)'
        ],
        borderColor: ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6'],
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.gridColor } },
        y: {
          grid: { color: CHART_DEFAULTS.gridColor },
          ticks: { callback: v => v + '억' }
        }
      }
    }
  });
}

/* ─────────────────────────────────────────
   SWITCH TAB (Reputation)
───────────────────────────────────────── */
let currentRepTab = 'sentiment';
function switchRepTab(tab, btn) {
  currentRepTab = tab;
  document.querySelectorAll('.chart-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const ctx = document.getElementById('sentimentTrendChart');
  if (!ctx) return;

  if (tab === 'sentiment') {
    if (mediaChart) { mediaChart.destroy(); mediaChart = null; }
    if (sentimentChart) { sentimentChart.destroy(); sentimentChart = null; }
    initSentimentTrendChart();
  } else {
    if (sentimentChart) { sentimentChart.destroy(); sentimentChart = null; }
    initMediaTrendChart();
  }
}

/* ─────────────────────────────────────────
   WORDCLOUD
───────────────────────────────────────── */
let currentWCType = 'positive';
function switchWordCloud(type, btn) {
  currentWCType = type;
  document.querySelectorAll('.tab-filter .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderWordCloud(type);
}

function renderWordCloud(type) {
  const container = document.getElementById('wordcloudContainer');
  if (!container) return;
  const words = DATA.wordcloud[type] || DATA.wordcloud.positive;
  container.innerHTML = '';
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  shuffled.forEach(w => {
    const el = document.createElement('span');
    el.className = 'word-item';
    el.textContent = w.text;
    el.style.fontSize = w.size + 'px';
    el.style.color = w.color;
    el.style.background = w.color + '18';
    el.style.border = '1px solid ' + w.color + '30';
    container.appendChild(el);
  });
}

/* ─────────────────────────────────────────
   INIT ALL CHARTS
───────────────────────────────────────── */
function initAllCharts() {
  // Overview
  initHealthTrendChart();
  initHealthDistChart();

  // Reputation
  initGaugeChart('gaugeMedia', 82, '#22c55e');
  initGaugeChart('gaugeFinance', 71, '#f59e0b');
  initGaugeChart('gaugeInternal', 84, '#6366f1');
  initGaugeChart('gaugeTotal', 78, '#818cf8');
  initSentimentTrendChart();
  initMediaCategoryChart();
  renderWordCloud('positive');

  // Customer
  initRadarChart();
  initOrderChangeChart();

  // Opportunity
  initOppSourceChart();
  initOppRevenueChart();
}
