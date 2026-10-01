const content = document.getElementById('content');

function el(tag, attrs = {}, text) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function render(cvs) {
  content.textContent = '';
  if (!cvs.length) {
    content.append(el('p', { class: 'empty' }, 'No CVs yet.'));
    return;
  }
  const table = el('table');
  const head = el('tr');
  for (const h of ['Name', 'Public URL', 'Status', 'Last edited', '']) head.append(el('th', {}, h));
  const thead = el('thead');
  thead.append(head);
  table.append(thead);
  const body = el('tbody');
  for (const cv of cvs) {
    const tr = el('tr');
    tr.append(el('td', {}, cv.name));

    const url = el('td', { class: 'url' });
    if (cv.status === 'Draft') url.append(el('span', { class: 'muted', title: 'Not published' }, cv.url));
    else url.append(el('a', { href: cv.url, target: '_blank', rel: 'noopener' }, cv.url));
    tr.append(url);

    const st = el('td');
    st.append(el('span', { class: 'badge ' + cv.status.replace(' ', '-') }, cv.status));
    tr.append(st);

    tr.append(el('td', {}, formatDate(cv.updatedAt)));

    const actions = el('td', { class: 'actions' });
    actions.append(el('a', { class: 'btn primary', href: 'edit?id=' + encodeURIComponent(cv.id) }, 'Edit'));
    if (cv.status !== 'Draft') {
      const copy = el('button', { class: 'btn', type: 'button' }, 'Copy link');
      copy.onclick = async () => {
        try { await navigator.clipboard.writeText(cv.url); copy.textContent = 'Copied ✓'; }
        catch { copy.textContent = 'Copy failed'; }
        setTimeout(() => (copy.textContent = 'Copy link'), 1800);
      };
      actions.append(copy);
    }
    tr.append(actions);
    body.append(tr);
  }
  table.append(body);
  content.append(table);
}

fetch('api/cvs')
  .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
  .then(render)
  .catch((e) => {
    content.textContent = '';
    content.append(el('p', { class: 'err' }, 'Could not load your CVs (' + e.message + '). Reload the page to try again.'));
  });
