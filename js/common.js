/* 共通ヘルパー */
(function (w) {
  'use strict';

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* **強調** のみ許可する簡易マークアップ（先にエスケープするので安全） */
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  /* 検索用の正規化: 全角半角統一・小文字化・カタカナ→ひらがな・空白除去 */
  const norm = (s) =>
    String(s ?? '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s\u3000・\-－ー_]/g, '');

  const tokens = (q) =>
    String(q ?? '')
      .normalize('NFKC')
      .split(/[\s\u3000]+/)
      .map(norm)
      .filter(Boolean);

  /* 元の文字列中で検索語に一致する部分を <mark> で囲む（正規化が長さを変えない範囲で） */
  const highlight = (text, q) => {
    const src = String(text ?? '');
    const ts = String(q ?? '').normalize('NFKC').split(/[\s\u3000]+/).filter(Boolean);
    if (!ts.length) return esc(src);
    const toHira = (s) => s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
    const hay = toHira(src.normalize('NFKC').toLowerCase());
    if (hay.length !== src.length) return esc(src);
    const flags = new Array(src.length).fill(false);
    ts.forEach((t) => {
      const n = toHira(t.toLowerCase());
      if (!n) return;
      let i = 0;
      while ((i = hay.indexOf(n, i)) !== -1) {
        for (let k = i; k < i + n.length; k++) flags[k] = true;
        i += n.length;
      }
    });
    let out = '', open = false;
    for (let i = 0; i < src.length; i++) {
      if (flags[i] && !open) { out += '<mark>'; open = true; }
      if (!flags[i] && open) { out += '</mark>'; open = false; }
      out += esc(src[i]);
    }
    return open ? out + '</mark>' : out;
  };

  const getJSON = async (url) => {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(url + ' (' + r.status + ')');
    return r.json();
  };

  const fmtDate = (s) => (s ? String(s).replace(/-/g, '.') : '');

  /* 画像 or プレースホルダー（頭文字の縁取り文字）*/
  const thumb = (m) => {
    const ph = esc((m.name || '?').replace(/^[A-Za-zＬ]\s+/, '').trim().charAt(0));
    if (m.image) {
      return `<img src="${esc(m.image)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:'${ph}'}))">`;
    }
    return `<span class="ph">${ph}</span>`;
  };

  w.U = { esc, rich, norm, tokens, highlight, getJSON, fmtDate, thumb };
})(window);
