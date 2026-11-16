'use strict';
const $ = selector => document.querySelector(selector);
const form = $('#editor');
const preview = $('#preview');
const items = $('#items');
const demo = new URLSearchParams(location.search).get('demo') === '1';
const key = demo ? 'vat-invoice-demo-v1' : 'vat-invoice-draft-v1';
const blankLine = vat => ({description:'', quantity:1, price:0, discount:0, vat});
const dateString = date => new Intl.DateTimeFormat('sv-SE').format(date);
const today = () => dateString(new Date());
const blank = () => ({
  heading:'VAT Invoice', seller:'', sellerAddress:'', sellerTax:'', email:'',
  buyer:'', buyerAddress:'', buyerTax:'', buyerEmail:'', reference:'', number:'INV-0001',
  issued:today(), supply:'', due:'', paid:0, paidDate:'', payment:'', vat:23,
  notes:'', logo:'', cover:'', template:'standard', priceMode:'net', accent:'#254fc4', lines:[blankLine(23)], archiveId:null
});
function example() {
  const due = new Date();
  due.setDate(due.getDate() + 30);
  return {
    ...blank(), number:'DEMO-0001', seller:'Harbour Studio', sellerAddress:'18 Sample Quay\nDublin, Ireland',
    sellerTax:'DEMO ONLY', buyer:'West Quay Books', buyerAddress:'4 Sample Lane\nCork, Ireland',
    supply:today(), due:dateString(due), reference:'PO-2048', payment:'Quote the invoice number when paying.',
    notes:'Payment due within 30 days.', lines:[
      {description:'Oak display stand', quantity:2, price:125, discount:10, vat:23},
      {description:'Printed catalogue', quantity:5, price:8, discount:0, vat:0}
    ]
  };
}
function read(suffix, fallback) {
  try { return JSON.parse(localStorage.getItem(key + suffix)) ?? fallback; }
  catch { return fallback; }
}
const start = demo ? example() : blank();
const saved = read('', null);
let draft = saved && Array.isArray(saved.lines) && saved.lines.length ? {...start, ...saved} : start;
let archive = read('-archive', []);
if (!Array.isArray(archive)) archive = [];
const companyFields = ['seller','sellerAddress','sellerTax','email','heading','accent','logo','cover','template','priceMode','vat','payment'];
const fields = Object.keys(blank()).filter(name => !['logo','cover'].includes(name) && form.elements.namedItem(name));
const templateLabels = {
  standard:'VAT Invoice', 'ws-accessories':'Wholesale Accessories Invoice', 'ws-devices':'Wholesale Devices Invoice',
  'rt-accessories':'Retail Accessories Invoice', 'rt-devices':'Retail Devices Invoice'
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const money = new Intl.NumberFormat('en-IE', {style:'currency', currency:'EUR'});
const euros = cents => money.format(cents / 100);
const validLogo = logo => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo);
const status = message => { $('#status').textContent = message; };
$('#demoNotice').hidden = !demo;
$('#demoLink').hidden = demo;

function write(suffix, value) {
  try { localStorage.setItem(key + suffix, JSON.stringify(value)); return true; }
  catch { status('Browser storage is unavailable or full. Save a PDF before leaving.'); return false; }
}
function saveDraft() {
  if (write('', draft)) status('Draft saved in this browser.');
}
function switchStep(step) {
  for (const button of document.querySelectorAll('[data-step]')) button.setAttribute('aria-pressed', button.dataset.step === step);
  for (const panel of form.querySelectorAll('[data-panel]')) panel.hidden = panel.dataset.panel !== step;
}
function goToStep(step) {
  switchStep(step);
  document.querySelector('[data-step="' + step + '"]').focus();
}
for (const button of document.querySelectorAll('[data-step]')) button.onclick = () => switchStep(button.dataset.step);
for (const button of form.querySelectorAll('[data-next]')) button.onclick = () => goToStep(button.dataset.next);

function renderItems() {
  const numeric = [
    ['quantity','Quantity',0.001,1000000,0.001], ['price',draft.priceMode==='gross'?'Unit price incl. VAT':'Unit price excl. VAT',0,1000000,0.01],
    ['discount','Discount %',0,100,0.01], ['vat','VAT %',0,100,0.01]
  ];
  items.innerHTML = draft.lines.map((line,index) => `<div class="line" data-index="${index}">
    <label>Description<input data-field="description" required maxlength="160" value="${escape(line.description)}"></label>
    <div class="fields">${numeric.map(([name,label,min,max,step])=>`<label>${label}<input data-field="${name}" type="number" required min="${min}" max="${max}" step="${step}" value="${escape(line[name])}"></label>`).join('')}</div>
    <div class="line-actions"><span>Line total <strong class="line-total"></strong></span><button type="button" data-remove ${draft.lines.length===1?'disabled':''}>Remove item</button></div>
  </div>`).join('');
}
const scaled = (value, factor, max) => BigInt(Math.round(Math.max(0, Math.min(max, Number(value) || 0)) * factor));
function lineAmounts(item,mode) {
  const rate = scaled(item.vat,100,100);
  const discount = 10000n - scaled(item.discount,100,100);
  const units = scaled(item.quantity,1000,1000000);
  const price = scaled(item.price,100,1000000);
  const raw=units*price*discount;
  const denominator=mode==='gross'?10000000n+rate*1000n:10000000n;
  const net=(raw+denominator/2n)/denominator;
  const tax=mode==='gross'?(raw+5000000n)/10000000n-net:(net*rate+5000n)/10000n;
  return {net:Number(net), tax:Number(tax), rate:Number(rate)/100};
}
function totals(lines,mode) {
  const byRate = new Map();
  let net = 0, tax = 0;
  const breakdown = lines.map(item => {
    const row = lineAmounts(item,mode);
    const bucket = byRate.get(row.rate) || {net:0,tax:0};
    bucket.net += row.net;
    bucket.tax += row.tax;
    byRate.set(row.rate,bucket);
    net += row.net;
    tax += row.tax;
    return row;
  });
  return {net,tax,byRate,breakdown,gross:net+tax};
}
function displayDate(date) {
  const parsed = new Date(date + 'T12:00:00');
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('en-IE',{dateStyle:'medium'}).format(parsed) : date;
}
function renderPreview() {
  const {net,tax,byRate,breakdown,gross} = totals(draft.lines,draft.priceMode);
  const paid = Number(scaled(draft.paid,100,100000000));
  const e = name => escape(draft[name]);
  const logo = validLogo(draft.logo) ? `<img alt="Company logo" src="${draft.logo}">` :
    `<span class="monogram" aria-hidden="true">${escape(draft.seller.trim().split(/\s+/).slice(0,2).map(word=>word.charAt(0)).join('').toUpperCase() || 'VI')}</span>`;
  const accent = /^#[0-9a-f]{6}$/i.test(draft.accent) ? draft.accent : '#254fc4';
  const rgb = accent.slice(1).match(/../g).map(hex => parseInt(hex,16)/255);
  const [r,g,b] = rgb.map(v => v<=0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4);
  preview.style.setProperty('--accent',accent);
  preview.style.setProperty('--accent-text',0.2126*r+0.7152*g+0.0722*b>0.179 ? '#111' : '#fff');
  const rows = draft.lines.map((line,index) => {
    const row = breakdown[index];
    return `<tr><td>${escape(line.description) || 'Item'}</td><td>${escape(line.quantity)}</td><td>${euros(Number(scaled(line.price,100,1000000)))}</td>
      <td>${escape(line.discount)}%</td><td>${row.rate}%</td><td>${euros(row.net)}</td><td>${euros(row.net+row.tax)}</td></tr>`;
  });
  const details = [['issued','Issued'],['supply','Supplied'],['due','Due'],['reference','PO / reference']];
  if (paid && draft.paidDate) details.push(['paidDate','Payment received']);
  const sample = demo || /^DEMO-/.test(draft.number);
  preview.innerHTML = `${validLogo(draft.cover)?`<img class="invoice-cover" alt="" src="${draft.cover}">`:''}<header class="invoice-head"><div class="invoice-company">${logo}<strong>${e('seller') || 'Your company'}</strong></div>
    <div class="invoice-heading"><h2>${e('heading') || 'VAT Invoice'}</h2><span>${e('number')}</span></div></header>
    ${sample ? '<span class="sample-label">Sample invoice</span>' : ''}
    <div class="dates">${details.filter(([name])=>draft[name]).map(([name,label])=>`<div><strong>${label}</strong>${name==='reference' ? e(name) : escape(displayDate(draft[name]))}</div>`).join('')}</div>
    <div class="parties"><section><strong>Billed from</strong><p>${[draft.sellerAddress,draft.sellerTax && 'VAT '+draft.sellerTax,draft.email].filter(Boolean).map(escape).join('\n')}</p></section>
    <section><strong>Billed to</strong><p>${[draft.buyer,draft.buyerAddress,draft.buyerEmail,draft.buyerTax && 'VAT '+draft.buyerTax].filter(Boolean).map(escape).join('\n') || 'Customer details'}</p></section></div>
    <div class="table-wrap"><table aria-label="Invoice lines"><thead><tr><th>Item</th><th>Qty</th><th>${draft.priceMode==='gross'?'Unit gross':'Unit net'}</th><th>Discount</th><th>VAT rate</th><th>Net</th><th>Total</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
    <div class="summary"><section><h3>VAT breakdown</h3><table aria-label="VAT by rate"><thead><tr><th>Rate</th><th>Net</th><th>VAT</th></tr></thead><tbody>
    ${[...byRate].sort(([a],[b])=>a-b).map(([rate,row])=>`<tr><td>${rate}%</td><td>${euros(row.net)}</td><td>${euros(row.tax)}</td></tr>`).join('')}</tbody></table></section>
    <dl><div><dt>Subtotal</dt><dd>${euros(net)}</dd></div><div><dt>Total VAT</dt><dd>${euros(tax)}</dd></div>
    <div class="total"><dt>Invoice total</dt><dd>${euros(gross)}</dd></div>
    ${paid ? `<div><dt>Amount received</dt><dd>${euros(paid)}</dd></div>` : ''}
    <div class="balance"><dt>${paid>gross?'Credit balance':'Balance due'}</dt><dd>${euros(Math.abs(gross-paid))}</dd></div></dl></div>
    ${draft.payment || draft.notes ? `<section class="terms">${draft.payment ? `<strong>Payment instructions</strong><p>${e('payment')}</p>` : ''}${draft.notes ? `<p>${e('notes')}</p>` : ''}</section>` : ''}`;
  items.querySelectorAll('.line-total').forEach((node,index) => {
    const row = breakdown[index];
    node.textContent = euros(row.net + row.tax);
  });
}
function refresh() {
  for (const name of fields) form.elements[name].value = draft[name] ?? '';
  $('#logo').value = '';
  $('#cover').value = '';
  $('#removeLogo').disabled = !validLogo(draft.logo);
  $('#removeCover').disabled = !validLogo(draft.cover);
  renderItems();
  renderPreview();
  saveDraft();
}
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', event => {
  const input = event.target;
  if(input.name==='template'){
    if(draft.heading===templateLabels[draft.template]) draft.heading=templateLabels[input.value];
    draft.template=input.value;
    refresh();
    return;
  }
  if(input.name==='priceMode'){
    draft.priceMode=input.value;
    renderItems();
  }
  if (fields.includes(input.name)) draft[input.name] = input.value;
  else if (input.dataset.field) draft.lines[Number(input.closest('.line').dataset.index)][input.dataset.field] = input.value;
  else return;
  renderPreview();
  saveDraft();
});
items.addEventListener('click', event => {
  if (!event.target.matches('[data-remove]') || draft.lines.length===1) return;
  const index = Number(event.target.closest('.line').dataset.index);
  draft.lines.splice(index,1);
  refresh();
  (items.children[index]?.querySelector('input') || $('#add')).focus();
});
$('#add').onclick = () => {
  draft.lines.push(blankLine(Number(draft.vat)));
  refresh();
  items.lastElementChild.querySelector('input').focus();
};
function loadBrandImage(event,field) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size>1000000 || !['image/png','image/jpeg','image/webp'].includes(file.type)) {
    status('Choose a PNG, JPEG or WebP logo up to 1 MB.');
    event.target.value = '';
    return;
  }
  const target = draft;
  const reader = new FileReader();
  reader.onload = () => {
    if (target!==draft || event.target.files[0]!==file) return;
    draft[field] = reader.result;
    refresh();
  };
  reader.onerror = () => status('The selected logo could not be read.');
  reader.readAsDataURL(file);
}
$('#logo').onchange = event => loadBrandImage(event,'logo');
$('#cover').onchange = event => loadBrandImage(event,'cover');
$('#removeLogo').onclick = () => { draft.logo=''; refresh(); };
$('#removeCover').onclick = () => { draft.cover=''; refresh(); };
$('#gmail').onclick = () => {
  if(!form.elements.buyerEmail.validity.valid){
    switchStep('details');
    form.elements.buyerEmail.reportValidity();
    return;
  }
  const subject=[draft.heading,draft.number].filter(Boolean).join(' ');
  const body='Hello '+(draft.buyer || '')+',\n\nPlease find your invoice attached.\n\n'+(draft.seller || '');
  const params=new URLSearchParams({view:'cm',fs:'1',to:draft.buyerEmail,su:subject,body});
  window.open('https://mail.google.com/mail/?'+params,'_blank','noopener,noreferrer');
  status('Gmail draft opened. Save the invoice as a PDF and attach it in Gmail before sending.');
};
function companyProfile() {
  return Object.fromEntries(companyFields.map(name=>[name,draft[name]]));
}
$('#company').onclick = () => { if (write('-company',companyProfile())) status('Company details saved for future invoices.'); };
$('#print').onclick = () => {
  const invalid = [...form.elements].find(input=>input.willValidate && !input.validity.valid);
  if (invalid) {
    switchStep(invalid.closest('[data-panel]').dataset.panel);
    invalid.reportValidity();
    return;
  }
  const title = document.title;
  document.title = [draft.number,draft.heading].join(' ').replace(/[<>:"/\\|?*]/g,'-');
  window.addEventListener('afterprint',()=>{document.title=title;},{once:true});
  window.print();
};
function newInvoice(copy = false) {
  const next = draft.number.trim().match(/^(.*?)(\d+)$/);
  archive = read('-archive',archive);
  const prefix = next?.[1] ?? (demo?'DEMO-':'INV-');
  const serial = next?.[2] ?? '0000';
  let offset = BigInt(serial);
  for (const {invoice} of archive) {
    const existing = invoice.number.match(/^(.*?)(\d+)$/);
    if (existing && existing[1].toLowerCase()===prefix.toLowerCase() && BigInt(existing[2])>offset) offset = BigInt(existing[2]);
  }
  const number = prefix + String(offset + 1n).padStart(serial.length,'0');
  const base = copy ? structuredClone(draft) : {...blank(),...companyProfile(),...read('-company',{})};
  draft = {...base, number, issued:today(), due:'', supply:'', paid:0, paidDate:'', archiveId:null};
  if (!copy) draft.lines = [blankLine(Number(draft.vat))];
  switchStep('details');
  refresh();
}
$('#new').onclick = () => {
  if (confirm('Start a new invoice? Use Save invoice first to keep this draft in your history.')) newInvoice();
};
$('#example').onclick = () => {
  if (!confirm('Reset the sample invoice editor? Saved samples stay in history.')) return;
  draft = example();
  switchStep('details');
  refresh();
};
$('#saveInvoice').onclick = () => {
  archive = read('-archive',archive);
  const number = draft.number.trim();
  if (!number) {
    goToStep('details');
    form.elements.number.reportValidity();
    status('Enter an invoice number before saving.');
    return;
  }
  if (archive.some(entry=>entry.id!==draft.archiveId && String(entry.invoice.number).trim().toLowerCase()===number.toLowerCase())) {
    goToStep('details');
    form.elements.number.focus();
    status('That number belongs to another saved invoice.');
    return;
  }
  const id = draft.archiveId || crypto.randomUUID();
  const invoice = structuredClone({...draft,number,archiveId:id});
  const entry = {id,invoice,updated:new Date().toISOString()};
  const updated = [entry,...archive.filter(row=>row.id!==id)];
  if (!write('-archive',updated)) return;
  archive = updated;
  draft = invoice;
  form.elements.number.value = number;
  renderPreview();
  if (write('', draft)) status('Invoice '+draft.number+' saved to history.');
};
const dialog = $('#historyDialog');
function historyTotals(invoice){
  const gross=totals(invoice.lines,invoice.priceMode).gross;
  return {gross,balance:Math.max(0,gross-Number(scaled(invoice.paid,100,100000000)))};
}
function filteredHistory() {
  const filter = $('#historySearch').value.trim().toLowerCase();
  const payment = $('#historyFilter').value;
  return archive.filter(({invoice})=>[invoice.number,invoice.buyer].some(value=>String(value).toLowerCase().includes(filter))
    && (payment==='all' || (historyTotals(invoice).balance>0)===(payment==='open')));
}
function renderHistory() {
  const matches=filteredHistory();
  $('#historyList').innerHTML = matches.map(({invoice,id,updated})=>`<div class="saved-row"><div><strong>${escape(invoice.number)}</strong>
    <small>${escape(invoice.buyer || 'Draft')} · ${euros(historyTotals(invoice).gross)} total · ${euros(historyTotals(invoice).balance)} due · ${escape(displayDate(updated.slice(0,10)))}</small></div>
    <div class="actions"><button data-open="${escape(id)}">Open</button><button data-copy="${escape(id)}">Duplicate</button><button data-delete="${escape(id)}">Delete</button></div></div>`).join('') ||
    (archive.length?'No invoices match your filters.':'Saved invoices will appear here.');
}
$('#history').onclick = () => {
  archive = read('-archive',archive);
  $('#historySearch').value = '';
  $('#historyFilter').value = 'all';
  renderHistory();
  dialog.showModal();
  $('#historySearch').focus();
};
$('#closeHistory').onclick = () => dialog.close();
$('#historySearch').oninput = renderHistory;
$('#historyFilter').onchange = renderHistory;
$('#historyExport').onclick = () => {
  const cell=value=>'"'+String(value??'').replace(/^[\s]*[=+\-@]/,text=>"'"+text).replace(/"/g,'""')+'"';
  const rows=[['Invoice number','Customer','Issue date','Payment due','EUR total','EUR balance']];
  for(const {invoice} of filteredHistory()){
    const {gross,balance}=historyTotals(invoice);
    rows.push([invoice.number,invoice.buyer,invoice.issued,invoice.due,(gross/100).toFixed(2),(balance/100).toFixed(2)]);
  }
  const url=URL.createObjectURL(new Blob(['\ufeff',rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download='invoice-history.csv';
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('#historyList').onclick = event => {
  const {open,copy,delete:remove} = event.target.dataset;
  const entry = archive.find(row=>row.id===(open || copy || remove));
  if (!entry) return;
  if (remove) {
    if (!confirm('Delete '+entry.invoice.number+' from saved invoices?')) return;
    const remaining = read('-archive',archive).filter(row=>row.id!==remove);
    if (!write('-archive',remaining)) { alert('The invoice could not be deleted from browser storage.'); return; }
    archive = remaining;
    if (draft.archiveId===remove) { draft.archiveId=null; saveDraft(); }
    renderHistory();
    return;
  }
  if (!confirm('Replace the current editor? Use Save invoice first to keep changes in your history.')) return;
  draft = {...blank(),...structuredClone(entry.invoice)};
  dialog.close();
  if (copy) newInvoice(true);
  else { switchStep('details'); refresh(); }
};
refresh();
