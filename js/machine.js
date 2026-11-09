/* 機種ページ: machine.html?id=xxx → data/machines/xxx.json を読み込んで描画
   ページ内検索（解析項目の絞り込み）にも対応 */
(function () {
  'use strict';
  const { esc, norm, tokens, getJSON, fmtDate, thumb } = U;

  const params = new URLSearchParams(location.search);
  const id = (params.get('id') || '').replace(/[^a-z0-9_-]/gi, '');
  const main = document.getElementById('main');

  /* **強調** 対応 + 検索語ハイライト */
  const toHira = (s) => s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  function hl(text, q) {
    const src = String(text ?? '');
    const ts = String(q || '').normalize('NFKC').split(/[\s\u3000]+/).filter(Boolean).map((t) => toHira(t.toLowerCase()));
    const hay = toHira(src.normalize('NFKC').toLowerCase());
    if (!ts.length || hay.length !== src.length) return esc(src);
    const f = new Array(src.length).fill(false);
    ts.forEach((n) => { let i = 0; while ((i = hay.indexOf(n, i)) !== -1) { f.fill(true, i, i + n.length); i += n.length; } });
    let o = '', open = false;
    for (let i = 0; i < src.length; i++) {
      if (f[i] && !open) { o += '<mark>'; open = true; }
      if (!f[i] && open) { o += '</mark>'; open = false; }
      o += esc(src[i]);
    }
    return open ? o + '</mark>' : o;
  }
  function rt(s, q) {
    return String(s ?? '').split(/\*\*(.+?)\*\*/g).map((p, i) => (i % 2 ? `<strong>${hl(p, q)}</strong>` : hl(p, q))).join('');
  }
  const plain = (s) => String(s ?? '').replace(/\*\*/g, '');

  /* 各セクションの検索対象テキスト */
  const blockText = (s) => norm(plain([
    s.title, s.tag, ...phases(s).map(plabel), s.lead, s.note,
    ...(s.items || []),
    ...(s.tables || []).flatMap((t) => [t.caption, ...(t.head || []), ...(t.rows || []).flat()])
  ].join(' ')));

  function table(t, q) {
    const isSet = t.head && t.head[0] === '設定';
    const rows = (t.rows || []).map((r) => {
      const hi = isSet ? r[0] === '6' : r.some((c) => /設定6|\*\*設定6/.test(String(c)));
      return `<tr${hi ? ' class="hi"' : ''}>${r.map((c, i) => {
        const cls = isSet && i === 0 ? 's' : (!isSet ? 't' : '');
        return `<td${cls ? ` class="${cls}"` : ''}>${rt(c, q)}</td>`;
      }).join('')}</tr>`;
    }).join('');
    return `${t.caption ? `<div class="cap">${rt(t.caption, q)}</div>` : ''}
      <div class="tbl${isSet ? ' num' : ''}"><table>
        <thead><tr>${(t.head || []).map((h) => `<th>${rt(h, q)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  }

  /* 局面バッジ / 設定差★。phase は文字列 or 配列。AT中の表示名は機種ごとに phaseLabels で差し替え可 */
  let PL = {};
  const phases = (s) => [].concat(s.phase || []);
  const plabel = (p) => PL[p] || p;
  const stars = (n) => `<span class="stars" role="img" aria-label="設定差の大きさ ${n}/5"><span class="stl">設定差</span><span class="stv">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span></span>`;

  function block(s, i, q) {
    const no = String(i + 1).padStart(2, '0');
    return `<section class="blk" id="s${i}" data-i="${i}">
      <div class="wrap">
        <div class="blk-head">
          <span class="no">${no}</span>
          <h2>${rt(s.title, q)}</h2>
        </div>
        <div class="blk-badges">
          ${phases(s).map((p) => `<span class="badge ph ${p === 'AT中' ? 'at' : p === '通常時' ? 'nm' : ''}">${esc(plabel(p))}</span>`).join('')}
          ${s.tag && !s.phase ? `<span class="badge">${esc(s.tag)}</span>` : ''}
          ${typeof s.stars === 'number' && s.stars > 0 ? stars(s.stars) : ''}
        </div>
        ${s.image ? `<div class="blk-img"><img src="${esc(s.image)}" alt="${esc(s.title)}" loading="lazy" onerror="this.closest('.blk-img').remove()"></div>` : ''}
        ${s.lead ? `<p class="ld">${rt(s.lead, q)}</p>` : ''}
        ${(s.tables || []).map((t) => table(t, q)).join('')}
        ${s.items ? `<ul class="it">${s.items.map((x) => `<li>${rt(x, q)}</li>`).join('')}</ul>` : ''}
        ${s.note ? `<p class="nt">${rt(s.note, q)}</p>` : ''}
      </div>
    </section>`;
  }

  /* やることリスト（判別の優先順位の下に表示）。
     todo.items[] = { text, lv?(メイン/補助/示唆), ref?(解析ブロックの title) }。チェック状態は localStorage に保存 */
  const TODO_KEY = `estima:todo:${id}`;
  function todoLoad() {
    try { return JSON.parse(localStorage.getItem(TODO_KEY)) || {}; } catch (e) { return {}; }
  }
  function todoSave(st) {
    try { localStorage.setItem(TODO_KEY, JSON.stringify(st)); } catch (e) { /* 保存不可でも動作は継続 */ }
  }
  function todoBox(t, secs) {
    if (!t || !t.items || !t.items.length) return '';
    const st = todoLoad();
    const lvCls = { 'AT中': 'm', '通常時': 'a', 'すべて': 's' };
    const items = t.items.map((x, i) => {
      const ref = x.ref ? secs.findIndex((s) => s.title === x.ref) : -1;
      const on = !!st[i];
      return `<li class="${on ? 'done' : ''}">
        <label>
          <input type="checkbox" data-k="${i}"${on ? ' checked' : ''}>
          <span class="bx" aria-hidden="true"></span>
          <span class="tx">${x.lv ? `<span class="lv ${lvCls[x.lv] || ''}">${esc(x.lv)}</span>` : ''}${rt(x.text)}</span>
        </label>
        ${ref >= 0 ? `<a class="go" href="#s${ref}" data-i="${ref}" aria-label="解析ブロックを見る">見る</a>` : ''}
      </li>`;
    }).join('');
    const n = t.items.filter((_, i) => st[i]).length;
    return `<div class="todobox" id="todo">
      <div class="todo-h">
        <h2>${esc(t.title || 'やることリスト')}</h2>
        <span class="todo-c" id="todoC">${n}/${t.items.length}</span>
        <button type="button" class="todo-r" id="todoR">リセット</button>
      </div>
      <ul class="todo-l">${items}</ul>
    </div>`;
  }

  function fail(msg) {
    main.innerHTML = `<div class="wrap"><div class="err">${msg}<br><a href="./" style="border-bottom:1px solid var(--line2)">← 機種一覧へ戻る</a></div></div>`;
  }

  if (!id) { fail('機種が指定されていません。'); return; }

  getJSON(`data/machines/${id}.json`).then((m) => {
    document.title = `${m.name} 設定判別 | ESTIMA SETTING`;
    PL = m.phaseLabels || {};
    const secs = m.sections || [];
    let phase = 'all';
    const texts = secs.map(blockText);
    let q = params.get('q') || '';

    main.innerHTML = `
      <section class="mh">
        ${m.image ? `<div class="mh-bg" aria-hidden="true"><img src="${esc(m.image)}" alt="" onerror="this.closest('.mh-bg').remove()"></div>` : ''}
        <div class="wrap">
          <div class="mh-in">
            <div>
              <div class="mh-badges"><span class="badge acc">${esc(m.type)}</span><span class="badge">${esc(m.maker)}</span></div>
              <h1>${esc(m.name)}</h1>
              <div class="meta"><span><b>導入</b>${fmtDate(m.intro)}</span></div>
            </div>
          </div>
          ${m.spec ? `<dl class="spec">${m.spec.map((s) => `<div><dt>${esc(s.k)}</dt><dd>${rt(s.v)}</dd></div>`).join('')}</dl>` : ''}
          ${m.summary ? `<div class="sumbox"><h2>${esc(m.summary.title || 'POINT')}</h2><ol>${m.summary.items.map((x) => `<li><span>${rt(x)}</span></li>`).join('')}</ol></div>` : ''}
          ${todoBox(m.todo, secs)}
        </div>
      </section>

      <div class="stick">
        <div class="pagesearch" id="ps">
          <span class="ico" aria-hidden="true"></span>
          <input id="pq" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder="この機種内を検索（例: 設定6 / CZ / 終了画面）" aria-label="ページ内検索">
          <span class="clear" id="pc" role="button" aria-label="クリア">✕</span>
          <span class="cnt" id="pcnt"></span>
        </div>
        <div class="phasebar" id="phasebar" role="tablist" aria-label="局面で絞り込み">
          ${['all', '通常時', 'AT中'].map((p) => `<button type="button" class="pchip${p === 'all' ? ' on' : ''}" data-p="${p}" role="tab">${p === 'all' ? 'すべて' : esc(plabel(p))}</button>`).join('')}
          <span class="pnote">★ = 設定差の大きさ</span>
        </div>
        <nav class="toc" id="toc" aria-label="目次">
          ${secs.map((s, i) => `<a href="#s${i}" data-i="${i}"><i>${String(i + 1).padStart(2, '0')}</i>${esc(s.title)}</a>`).join('')}
        </nav>
      </div>

      <div id="blocks"></div>

      <div class="srcs"><div class="wrap">
        <h2>SOURCES</h2>
        <ul>${(m.sources || []).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a></li>`).join('')}</ul>
        <p>数値は上記ほか解析サイトの公表・調査値を元に整理したものです。仕様・数値は更新されることがあるため、最新情報は各ソースをご確認ください。</p>
      </div></div>
    `;

    const blocksEl = document.getElementById('blocks');
    const pq = document.getElementById('pq'), ps = document.getElementById('ps'), cnt = document.getElementById('pcnt');
    const toc = document.getElementById('toc');
    pq.value = q;

    function render() {
      q = pq.value;
      ps.classList.toggle('has', !!q);
      const ts = tokens(q);
      const shown = secs.map((s, i) => (phase === 'all' || phases(s).includes(phase)) && ts.every((t) => texts[i].includes(t)));
      blocksEl.innerHTML = secs.map((s, i) => (shown[i] ? block(s, i, q) : '')).join('') ||
        '';
      if ((ts.length || phase !== 'all') && !shown.some(Boolean)) {
        blocksEl.innerHTML = `<div class="wrap"><div class="noresult" style="margin:40px 0;border:1px solid var(--line);padding:56px;text-align:center;color:var(--dim);font-family:var(--mono);font-size:13px"><b style="display:block;color:var(--mute);font-size:14px;margin-bottom:6px">該当する項目がありません</b>別のキーワードで検索してください</div></div>`;
      }
      toc.querySelectorAll('a').forEach((a) => a.classList.toggle('off', !shown[+a.dataset.i]));
      cnt.textContent = (ts.length || phase !== 'all') ? `${shown.filter(Boolean).length}/${secs.length}` : `${secs.length}項目`;
      observe();
    }

    /* スクロール位置に応じて目次をハイライト */
    let io;
    function observe() {
      if (io) io.disconnect();
      if (!('IntersectionObserver' in window)) return;
      io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            toc.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.i === e.target.dataset.i));
            const on = toc.querySelector('a.on');
            if (on) toc.scrollTo({ left: on.offsetLeft - 24, behavior: 'smooth' });
          }
        });
      }, { rootMargin: '-35% 0px -60% 0px' });
      blocksEl.querySelectorAll('.blk').forEach((b) => io.observe(b));
    }

    document.getElementById('phasebar').addEventListener('click', (e) => {
      const b = e.target.closest('.pchip'); if (!b) return;
      phase = b.dataset.p;
      document.querySelectorAll('.pchip').forEach((x) => x.classList.toggle('on', x === b));
      render();
    });
    /* やることリスト: チェック保存 / リセット / 解析ブロックへのジャンプ */
    const todoEl = document.getElementById('todo');
    if (todoEl) {
      const boxes = () => [...todoEl.querySelectorAll('input[type=checkbox]')];
      const sync = () => {
        const st = {};
        boxes().forEach((b) => { b.closest('li').classList.toggle('done', b.checked); if (b.checked) st[b.dataset.k] = 1; });
        todoSave(st);
        document.getElementById('todoC').textContent = `${Object.keys(st).length}/${boxes().length}`;
      };
      todoEl.addEventListener('change', (e) => { if (e.target.matches('input[type=checkbox]')) sync(); });
      document.getElementById('todoR').addEventListener('click', () => {
        if (!boxes().some((b) => b.checked)) return;
        boxes().forEach((b) => { b.checked = false; });
        sync();
      });
      todoEl.addEventListener('click', (e) => {
        const a = e.target.closest('a.go'); if (!a) return;
        e.preventDefault();
        let t = document.getElementById(`s${a.dataset.i}`);
        if (!t) { /* 検索・局面フィルタで非表示なら解除して表示 */
          pq.value = ''; phase = 'all';
          document.querySelectorAll('.pchip').forEach((x) => x.classList.toggle('on', x.dataset.p === 'all'));
          render();
          t = document.getElementById(`s${a.dataset.i}`);
        }
        if (t) { t.scrollIntoView({ behavior: 'smooth' }); history.replaceState(null, '', `#s${a.dataset.i}`); }
      });
    }
    pq.addEventListener('input', render);
    document.getElementById('pc').addEventListener('click', () => { pq.value = ''; render(); pq.focus(); });
    render();
    if (location.hash) {
      const t = document.querySelector(location.hash);
      if (t) t.scrollIntoView();
    }
  }).catch((err) => {
    fail(`機種データを読み込めませんでした。<br>${esc(err.message)}`);
  });
})();
