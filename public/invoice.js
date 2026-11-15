'use strict';
const form = document.querySelector('#editor');
const preview = document.querySelector('#preview');
const items = document.querySelector('#items');
const key = 'vat-invoice-draft-v1';
const today = new Intl.DateTimeFormat('sv-SE').format(new Date());
const blankLine = vat => ({ description: '', quantity: 1, price: 0, discount: 0, vat });
const blank = () => ({ heading: 'VAT Invoice', seller: '', sellerAddress: '', sellerTax: '', email: '', buyer: '', buyerAddress: '', buyerTax: '', number: 'INV-0001', issued: today, supply: '', due: '', vat: 23, notes: '', logo: '', lines: [blankLine(23)] });
let draft = blank();
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved && Array.isArray(saved.lines) && saved.lines.length) draft = { ...draft, ...saved };
} catch { /* Recover with a blank invoice. */ }
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const euros = cents => money.format(cents / 100);
const fieldNames = Object.keys(blank()).filter(name => name !== 'lines' && name !== 'logo');

function save() {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    document.querySelector('#status').textContent = 'Draft saved in this browser. Amounts in EUR.';
  } catch {
    document.querySelector('#status').textContent = 'Browser storage is full. Save a PDF before closing this page.';
  }
}

function renderItems() {
  const fields = [
    ['quantity', 'Quantity', 0.001, 1000000, 0.001], ['price', 'Unit price excl. VAT', 0, 1000000, 0.01],
    ['discount', 'Discount %', 0, 100, 0.01], ['vat', 'VAT %', 0, 100, 0.01]
  ];
  items.innerHTML = draft.lines.map((line, index) => `<div class="line" data-index="${index}">
    <label>Description<input data-field="description" required value="${escape(line.description)}"></label>
    <div class="fields">${fields.map(([name, label, min, max, step]) => `<label>${label}<input data-field="${name}" type="number" required min="${min}" max="${max}" step="${step}" value="${escape(line[name])}"></label>`).join('')}</div>
    <button type="button" data-remove="${index}" ${draft.lines.length === 1 ? 'disabled' : ''}>Remove item</button></div>`).join('');
}

function renderPreview() {
  const breakdown = new Map();
  let net = 0;
  let tax = 0;
  const rows = draft.lines.map(line => {
    const original = Math.round((Number(line.price) || 0) * (Number(line.quantity) || 0) * 100);
    const amount = Math.round(original * (100 - Number(line.discount)) / 100);
    const rate = Number(line.vat) || 0;
    const vat = Math.round(amount * rate / 100);
    const bucket = breakdown.get(rate) || { net: 0, vat: 0 };
    bucket.net += amount;
    bucket.vat += vat;
    breakdown.set(rate, bucket);
    net += amount;
    tax += vat;
    return `<tr><td>${escape(line.description) || 'Item'}</td><td>${escape(line.quantity)}</td><td>${euros(Math.round(line.price * 100))}</td><td>${escape(line.discount)}%</td><td>${rate}%</td><td>${euros(amount)}</td><td>${euros(vat)}</td></tr>`;
  });
  const e = name => escape(draft[name]);
  const logo = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(draft.logo) ? `<img alt="Business logo" src="${draft.logo}">` : '';
  preview.innerHTML = `<header class="invoice-head"><div><h2>${e('heading')}</h2><span>${e('number')}</span></div>${logo}</header>
    <div class="parties"><section><strong>From</strong><p>${e('seller')}\n${e('sellerAddress')}${draft.sellerTax ? '\nVAT ' + e('sellerTax') : ''}${draft.email ? '\n' + e('email') : ''}</p></section>
    <section><strong>Bill to</strong><p>${e('buyer')}\n${e('buyerAddress')}${draft.buyerTax ? '\nVAT ' + e('buyerTax') : ''}</p></section></div>
    <div class="dates">${[['issued','Issued'],['supply','Supplied'],['due','Due']].filter(([name]) => draft[name]).map(([name,label])=>`<span><strong>${label}</strong> ${e(name)}</span>`).join('')}</div>
    <div class="table-wrap"><table aria-label="Invoice lines"><thead><tr><th>Item</th><th>Qty</th><th>Unit net</th><th>Discount</th><th>VAT rate</th><th>Net</th><th>VAT</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
    <section class="totals"><table aria-label="VAT by rate"><thead><tr><th>VAT rate</th><th>Net amount</th><th>VAT</th></tr></thead><tbody>
    ${[...breakdown].sort(([a],[b])=>a-b).map(([rate,sum])=>`<tr><td>${rate}%</td><td>${euros(sum.net)}</td><td>${euros(sum.vat)}</td></tr>`).join('')}
    <tr><td>Subtotal</td><td colspan="2">${euros(net)}</td></tr><tr><td>Total VAT</td><td colspan="2">${euros(tax)}</td></tr>
    <tr class="total"><td>Total due</td><td colspan="2">${euros(net + tax)}</td></tr></tbody></table></section>
    ${draft.notes ? `<p class="notes">${e('notes')}</p>` : ''}`;
}

function refresh() {
  for (const name of fieldNames) form.elements[name].value = draft[name];
  form.querySelector('#logo').value = '';
  renderItems();
  renderPreview();
  save();
}

form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', event => {
  const input = event.target;
  if (fieldNames.includes(input.name)) draft[input.name] = input.value;
  if (input.dataset.field) draft.lines[Number(input.closest('.line').dataset.index)][input.dataset.field] = input.value;
  renderPreview();
  save();
});
items.addEventListener('click', event => {
  if (event.target.dataset.remove === undefined || draft.lines.length === 1) return;
  draft.lines.splice(Number(event.target.dataset.remove), 1);
  refresh();
});
document.querySelector('#add').onclick = () => {
  draft.lines.push(blankLine(Number(draft.vat)));
  refresh();
  items.lastElementChild.querySelector('input').focus();
};
document.querySelector('#logo').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 1000000 || !['image/png','image/jpeg','image/webp'].includes(file.type)) {
    alert('Choose a PNG, JPEG or WebP logo up to 1 MB.');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => { draft.logo = reader.result; renderPreview(); save(); };
  reader.readAsDataURL(file);
};
document.querySelector('#removeLogo').onclick = () => { draft.logo = ''; refresh(); };
document.querySelector('#print').onclick = () => { if (form.reportValidity()) window.print(); };
document.querySelector('#example').onclick = () => {
  if (!confirm('Replace the current draft with a fictional invoice?')) return;
  draft = { ...blank(), seller: 'Harbour Studio', sellerAddress: 'Sample address\nDublin, Ireland', sellerTax: 'DEMO ONLY', buyer: 'West Quay Books', buyerAddress: 'Sample address\nCork, Ireland', supply: today, notes: 'Fictional example. Payment due within 30 days.', lines: [{ description: 'Display stand', quantity: 2, price: 125, discount: 10, vat: 23 }, { description: 'Printed catalogue', quantity: 5, price: 8, discount: 0, vat: 0 }] };
  refresh();
};
document.querySelector('#new').onclick = () => {
  if (!confirm('Start a new invoice? Save the current one as a PDF first.')) return;
  const { heading, seller, sellerAddress, sellerTax, email, logo, number, vat } = draft;
  const next = number.replace(/\d+$/, s => String(Number(s) + 1).padStart(s.length, '0'));
  draft = { ...blank(), heading, seller, sellerAddress, sellerTax, email, logo, vat, number: next, lines: [blankLine(Number(vat))] };
  refresh();
};
refresh();
