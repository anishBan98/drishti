/* global document, chrome, confirm */
// Drishti Capture (docs/11 §7, compact): reads the page the person is looking at, only when they open this popup,
// and posts it to Drishti with their capture token. It never opens or visits pages by itself.

const $ = (id) => document.getElementById(id);
const say = (text, cls = '') => {
  $('msg').textContent = text;
  $('msg').className = cls;
};

/** Runs in the page: price, MRP, rating, reviews and stock from JSON-LD, falling back to common page elements. */
function readPage() {
  const num = (s) => {
    const m = String(s ?? '')
      .replace(/,/g, '')
      .match(/\d+(\.\d+)?/);
    return m ? Number(m[0]) : undefined;
  };
  const out = { title: document.title };
  for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(el.textContent);
      const nodes = (Array.isArray(data) ? data : [data]).flatMap((d) => d?.['@graph'] ?? [d]);
      const p = nodes.find((n) => String(n?.['@type'] ?? '').includes('Product'));
      if (!p) continue;
      const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
      out.title = p.name ?? out.title;
      out.price_inr = num(offer?.price ?? offer?.lowPrice);
      out.rating = num(p.aggregateRating?.ratingValue);
      out.review_count = num(p.aggregateRating?.reviewCount);
      if (offer?.availability) out.in_stock = /InStock/i.test(offer.availability);
      break;
    } catch {
      /* not JSON */
    }
  }
  if (out.price_inr === undefined) {
    const price = document.querySelector('.a-price .a-offscreen, [itemprop="price"], ._30jeq3, .css-1jczs19');
    out.price_inr = num(price?.getAttribute('content') ?? price?.textContent);
  }
  if (out.mrp_inr === undefined) {
    const mrp = document.querySelector('.a-price.a-text-price .a-offscreen, ._3I9_wc, .css-u05rr');
    out.mrp_inr = num(mrp?.textContent);
  }
  if (out.rating === undefined) {
    const r = document.querySelector('[data-hook="rating-out-of-text"], #acrPopover, ._3LWZlK');
    out.rating = num(r?.getAttribute('title') ?? r?.textContent);
  }
  if (out.review_count === undefined)
    out.review_count = num(document.querySelector('#acrCustomerReviewText')?.textContent);
  if (out.in_stock === undefined)
    out.in_stock = !/out of stock|currently unavailable|sold out/i.test(document.body.innerText.slice(0, 20000));
  return out;
}

async function load() {
  const { server, token } = await chrome.storage.local.get(['server', 'token']);
  if (server) $('server').value = server;
  if (!token) return;
  $('setup').hidden = true;
  $('capture').hidden = false;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readPage });
  const f = result ?? {};
  $('fields').innerHTML = '';
  for (const [k, v] of [
    ['Product', f.title],
    ['Price', f.price_inr ? `₹${f.price_inr}` : 'not found'],
    ['MRP', f.mrp_inr ? `₹${f.mrp_inr}` : '—'],
    ['Rating', f.rating ?? '—'],
    ['Reviews', f.review_count ?? '—'],
    ['In stock', f.in_stock === undefined ? '—' : f.in_stock ? 'yes' : 'no'],
  ]) {
    const row = document.createElement('div');
    row.textContent = `${k}: ${v}`;
    $('fields').append(row);
  }
  $('send').disabled = !f.price_inr;
  $('send').onclick = async () => {
    $('send').disabled = true;
    const post = (unlisted) =>
      fetch(`${$('server').value.replace(/\/$/, '')}/api/capture`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ url: tab.url, fields: f, unlisted, extension_version: '1.0.0' }),
      });
    let res = await post(false);
    if (res.status === 422 && confirm('This page is not on your watchlist. Capture it anyway?')) res = await post(true);
    const body = await res.json().catch(() => ({}));
    if (res.ok) say('Captured. It will be in the next sync.', 'ok');
    else say(body?.error?.message ?? `Failed (${res.status})`, 'err');
    $('send').disabled = false;
  };
}

$('save').onclick = async () => {
  await chrome.storage.local.set({ server: $('server').value.trim(), token: $('token').value.trim() });
  await load();
};
$('reset').onclick = async () => {
  await chrome.storage.local.remove('token');
  $('setup').hidden = false;
  $('capture').hidden = true;
};
load().catch((e) => say(String(e?.message ?? e), 'err'));
