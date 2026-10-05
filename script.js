document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cls = (v) => (v === 'Authentic' ? 'ok' : v === 'Suspicious' ? 'warn' : 'bad');
  const fmt = (iso) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  $('today').textContent = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Sidebar / quick action / bell navigation (scroll to section)
  document.querySelectorAll('[data-go]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = $(el.dataset.go);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (el.classList.contains('sb')) {
        document.querySelectorAll('.sb').forEach((b) => b.classList.remove('active'));
        el.classList.add('active');
      }
    });
  });

  // Backend status
  const statusEl = $('status');
  fetch('/api/health')
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
    .then(() => { statusEl.textContent = '🟢 Backend connected'; statusEl.className = 'pill on'; })
    .catch(() => { statusEl.textContent = '🔴 Backend offline'; statusEl.className = 'pill off'; });

  // Image upload + drag and drop (preview only)
  const fileInput = $('file'), preview = $('preview'), drop = $('drop'), dropText = $('dropText');
  function showFile(f) {
    if (!f || !f.type.startsWith('image/')) return;
    preview.src = URL.createObjectURL(f);
    preview.hidden = false;
    dropText.hidden = true;
  }
  fileInput.addEventListener('change', () => showFile(fileInput.files[0]));
  ['dragenter', 'dragover'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (ev) => { fileInput.files = ev.dataTransfer.files; showFile(ev.dataTransfer.files[0]); });

  // Verify product
  const resultEl = $('result'), verifyBtn = $('verify');
  verifyBtn.addEventListener('click', async () => {
    const brand = $('brand').value.trim();
    const code = $('serial').value.trim();
    resultEl.hidden = false;
    if (!brand || !code) {
      resultEl.className = 'resultBox warn';
      resultEl.innerHTML = '<h3>Missing details</h3><p class="muted">Enter both the brand and the serial code.</p>';
      return;
    }
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      resultEl.className = 'resultBox ' + cls(data.verdict);
      resultEl.innerHTML = `<h3>${esc(data.verdictEmoji)} ${esc(data.verdict)}</h3>
        <p class="muted">Authenticity score: <b>${esc(data.score)}%</b></p>
        <ul>${data.signals.map((s) => `<li>${esc(s.label)} (${esc(s.weight)})</li>`).join('')}</ul>`;
      loadHistory();
    } catch (err) {
      resultEl.className = 'resultBox bad';
      resultEl.innerHTML = `<h3>Could not verify</h3><p class="muted">${esc(err.message)}</p>`;
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify Product';
    }
  });

  // Clear history
  $('clearHistory').addEventListener('click', async () => {
    try { await fetch('/api/history', { method: 'DELETE' }); } catch (e) { /* ignore */ }
    loadHistory();
  });

  // History + stats + chart + alerts
  async function loadHistory() {
    let list = [];
    try {
      const res = await fetch('/api/history');
      if (res.ok) list = await res.json();
    } catch (e) { /* backend offline: show empty state */ }

    const total = list.length;
    const ok = list.filter((s) => s.verdict === 'Authentic').length;
    const warn = list.filter((s) => s.verdict === 'Suspicious').length;
    const bad = total - ok - warn;
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

    $('sTotal').textContent = total;
    $('sOk').textContent = ok;
    $('sBad').textContent = bad;
    $('sRate').textContent = pct(ok) + '%';
    $('pieNum').textContent = pct(ok) + '%';
    $('lgOk').textContent = `${ok} (${pct(ok)}%)`;
    $('lgWarn').textContent = `${warn} (${pct(warn)}%)`;
    $('lgBad').textContent = `${bad} (${pct(bad)}%)`;

    const a = pct(ok), b = a + pct(warn);
    $('pie').style.background = total
      ? `conic-gradient(var(--green) 0 ${a}%, var(--amber) ${a}% ${b}%, var(--pink) ${b}% 100%)`
      : 'conic-gradient(#3a2440 0 100%)';

    $('history').innerHTML = total
      ? list.slice(0, 8).map((s, i) => `<tr>
          <td>${i + 1}</td><td>${esc(s.brand)}</td><td>${esc(s.code)}</td>
          <td><span class="tag2 ${cls(s.verdict)}">${esc(s.verdict)}</span></td>
          <td>${esc(s.score)}%</td><td>${esc(fmt(s.timestamp))}</td></tr>`).join('')
      : '<tr><td colspan="6" class="muted">No scans yet.</td></tr>';

    const flagged = list.filter((s) => s.verdict !== 'Authentic');
    $('bellBadge').textContent = flagged.length;
    $('sideBadge').textContent = flagged.length;
    $('alertList').innerHTML = flagged.length
      ? flagged.slice(0, 4).map((s) => `<li><i class="dot ${s.verdict === 'Suspicious' ? 'a' : 'p'}"></i>
          <div>${s.verdict === 'Suspicious' ? 'Suspicious scan' : 'Counterfeit product detected'}: ${esc(s.brand)} ${esc(s.code)}
          <small>${esc(fmt(s.timestamp))}</small></div></li>`).join('')
      : '<li class="muted">No alerts yet.</li>';
  }
  loadHistory();
});
