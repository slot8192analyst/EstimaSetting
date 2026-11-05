/* 機種一覧ページ: data/machines.json を読み込み、リスト表示 + 検索 + タイプ絞り込み */
(function () {
  'use strict';
  const { esc, norm, tokens, highlight, getJSON, fmtDate, thumb } = U;

  const $ = (id) => document.getElementById(id);
  const list = $('mlist'), qEl = $('q'), box = $('searchBox'), chipsEl = $('chips');
  let machines = [], type = 'all';

  const hay = (m) => norm([m.name, m.kana, m.maker, m.type, ...(m.tags || [])].join(' '));
  const hayKw = (m) => (m.keywords || []).map((k) => ({ k, n: norm(k) }));

  function render() {
    const q = qEl.value;
    const ts = tokens(q);
    box.classList.toggle('has', !!q);

    const rows = machines
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => type === 'all' || m.type === type)
      .map(({ m, i }) => {
        const h = hay(m);
        const kws = hayKw(m);
        let ok = true;
        const hits = new Set();
        for (const t of ts) {
          if (h.includes(t)) continue;
          const found = kws.filter((x) => x.n.includes(t));
          if (found.length) found.forEach((x) => hits.add(x.k));
          else { ok = false; break; }
        }
        return ok ? { m, i, hits: [...hits] } : null;
      })
      .filter(Boolean);

    if (!rows.length) {
      list.innerHTML = `<li class="noresult"><b>該当する機種がありません</b>別のキーワードで検索してください</li>`;
    } else {
      list.innerHTML = rows
        .map(({ m, i, hits }) => `
        <li>
          <a class="mi" href="machine.html?id=${encodeURIComponent(m.id)}${hits.length && ts.length ? '&q=' + encodeURIComponent(q) : ''}">
            <div class="mi-img">${thumb(m)}</div>
            <div class="mi-body">
              <div class="mi-top">
                <span>No.${String(i + 1).padStart(2, '0')}</span>
                <span class="badge acc">${esc(m.type)}</span>
              </div>
              <div class="mi-nm">${highlight(m.name, q)}</div>
              <div class="mi-ds">
                <span>${esc(m.maker)}</span>
                <span>${fmtDate(m.intro)} 導入</span>
                <span>機械割 ${esc(m.payout)}</span>
              </div>
              ${hits.length ? `<div class="mi-hit"><span>MATCH</span>${hits.map((k) => highlight(k, q)).join(' / ')}</div>` : ''}
            </div>
            <span class="ar">→</span>
          </a>
        </li>`)
        .join('');
    }
    $('resultCount').textContent = `${rows.length} / ${machines.length} 機種`;
  }

  function renderChips() {
    const types = [...new Set(machines.map((m) => m.type))];
    const count = (t) => machines.filter((m) => t === 'all' || m.type === t).length;
    chipsEl.innerHTML = ['all', ...types]
      .map((t) => `<button type="button" class="chip${t === type ? ' on' : ''}" data-t="${esc(t)}" role="tab">${t === 'all' ? 'すべて' : esc(t)}<span class="c">${count(t)}</span></button>`)
      .join('');
  }

  chipsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    type = b.dataset.t;
    renderChips();
    render();
  });
  qEl.addEventListener('input', render);
  $('clear').addEventListener('click', () => { qEl.value = ''; render(); qEl.focus(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== qEl && !e.metaKey && !e.ctrlKey) {
      e.preventDefault(); qEl.focus();
    }
  });

  getJSON('data/machines.json')
    .then((d) => {
      machines = d.machines || [];
      $('total').textContent = `${machines.length} TITLES`;
      $('updated').textContent = d.updated ? `UPDATED ${fmtDate(d.updated)}` : '';
      renderChips();
      render();
    })
    .catch((err) => {
      list.innerHTML = `<li class="err">データを読み込めませんでした。<br>${esc(err.message)}<br>※ file:// ではなく、Webサーバー経由で開いてください。</li>`;
    });
})();
