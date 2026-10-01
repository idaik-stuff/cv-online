// CV editor, ported from the predecessor single-file editor.
// Stored CVs are clean documents (no scripts, no contenteditable). Editing
// behavior is injected here on load and stripped again before saving.

const id = new URLSearchParams(location.search).get('id');
const frame = document.getElementById('preview');
const $ = (sel) => document.getElementById(sel);
const btn = { save: $('save'), publish: $('publish'), discard: $('discard'), unpublish: $('unpublish'), pdf: $('pdf') };

const INJECT_ID = '__ed';
// Screen only, so printing from the editor keeps the CV's own A4 print layout.
const INJECT_CSS =
  '@media screen{' +
  '[contenteditable]:hover{outline:1px dashed #9fb3d9;outline-offset:1px}' +
  '[contenteditable]:focus{outline:1px solid #2c56a6;outline-offset:1px;background:#fffef4}' +
  'body{padding-top:24px!important}' +
  '}';

let cv = null; // summary from the API
let dirty = false;
let busy = false;
let savedRange = null;
const fdoc = () => frame.contentDocument;

/* ----- Status ----- */
let statusTimer;
function status(msg, keep) {
  const s = $('status');
  s.textContent = msg;
  clearTimeout(statusTimer);
  if (!keep) statusTimer = setTimeout(() => (s.textContent = dirty ? 'Unsaved changes' : ''), 2500);
}
function setDirty(v) {
  dirty = v;
  btn.save.classList.toggle('dirty', v);
  btn.save.textContent = v ? 'Save draft •' : 'Save draft';
  if (v) status('Unsaved changes', true);
  refreshButtons();
}
function refreshButtons() {
  const loaded = cv !== null && !busy;
  btn.save.disabled = !loaded;
  btn.pdf.disabled = !loaded;
  btn.publish.disabled = !loaded || (cv.status === 'Published' && !dirty);
  btn.discard.disabled = !loaded || cv.status === 'Draft' || (cv.status === 'Published' && !dirty);
  btn.unpublish.disabled = !loaded || cv.status === 'Draft';
}
function setCv(summary) {
  cv = summary;
  $('cvName').textContent = cv.name;
  document.title = cv.name + ' – CV editor';
  const badge = $('badge');
  badge.textContent = cv.status;
  badge.className = 'badge ' + cv.status.replace(' ', '-');
  refreshButtons();
}

/* ----- API ----- */
async function call(path, method = 'GET', body) {
  const res = await fetch('/admin/api/cvs/' + encodeURIComponent(id) + path, {
    method,
    body,
    headers: body ? { 'Content-Type': 'text/html; charset=utf-8' } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
  return data;
}
async function guarded(label, fn) {
  if (busy) return;
  busy = true;
  refreshButtons();
  status(label + '…', true);
  try {
    await fn();
  } catch (e) {
    status('Error: ' + e.message + ' Your edits are still on this page.', true);
    busy = false;
    refreshButtons();
    return false;
  }
  busy = false;
  refreshButtons();
  return true;
}

/* ----- Document load / serialize ----- */
function render(html) {
  frame.onload = () => {
    const d = fdoc();
    const style = d.createElement('style');
    style.id = INJECT_ID;
    style.textContent = INJECT_CSS;
    d.head.append(style);
    const root = d.getElementById('cv') || d.body;
    root.setAttribute('contenteditable', 'true');
    root.setAttribute('spellcheck', 'true');
    root.setAttribute('data-ed', '');
    // Images (such as the photo) are not editable text.
    root.querySelectorAll('img').forEach((img) => {
      const box = img.parentElement === root ? img : img.parentElement;
      box.setAttribute('contenteditable', 'false');
      box.setAttribute('data-ed', '');
    });
    try { d.execCommand('styleWithCSS', false, true); } catch {}
    d.addEventListener('input', () => { if (!dirty) setDirty(true); });
    d.addEventListener('selectionchange', () => {
      const s = d.getSelection();
      if (s.rangeCount && root.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange();
    });
    d.addEventListener('keydown', onKey);
    // Paste as plain text, so pasted content cannot break the design.
    root.addEventListener('paste', (e) => {
      e.preventDefault();
      d.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
    });
    // Drag and drop: moves inside the CV stay native; anything dropped from
    // outside enters as plain text at the drop point.
    let draggingInside = false;
    root.addEventListener('dragstart', () => { draggingInside = true; });
    root.addEventListener('dragend', () => { draggingInside = false; });
    root.addEventListener('drop', (e) => {
      if (draggingInside) return;
      e.preventDefault();
      const text = e.dataTransfer?.getData('text/plain');
      if (!text) return;
      const range = d.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (range) {
        const s = d.getSelection();
        s.removeAllRanges();
        s.addRange(range);
      }
      d.execCommand('insertText', false, text);
    });
  };
  frame.srcdoc = html;
}

function currentHtml() {
  const clone = fdoc().documentElement.cloneNode(true);
  clone.querySelector('#' + INJECT_ID)?.remove();
  clone.querySelectorAll('[data-ed]').forEach((e) => {
    e.removeAttribute('contenteditable');
    e.removeAttribute('spellcheck');
    e.removeAttribute('data-ed');
  });
  return '<!DOCTYPE html>\n' + clone.outerHTML;
}

/* ----- Actions ----- */
async function save() {
  return guarded('Saving', async () => {
    setCv(await call('/draft', 'PUT', currentHtml()));
    setDirty(false);
    status('Draft saved ✓');
  });
}
async function publish() {
  if (dirty && !(await save())) return;
  await guarded('Publishing', async () => {
    setCv(await call('/publish', 'POST'));
    status('Published ✓ ' + cv.url);
  });
}
async function discard() {
  if (!confirm('Discard all draft changes and return to the published version?')) return;
  await guarded('Discarding', async () => {
    setCv(await call('/discard', 'POST'));
    const full = await call('');
    render(full.html);
    setDirty(false);
    status('Changes discarded');
  });
}
async function unpublish() {
  if (!confirm('Remove the public page? Anyone with the link will see "not found". The CV and its draft are kept.')) return;
  await guarded('Unpublishing', async () => {
    setCv(await call('/unpublish', 'POST'));
    status('Unpublished');
  });
}
function printPdf() {
  // The CV name becomes the suggested PDF file name. Both titles are restored,
  // so the CV document's own <title> is never saved or published changed.
  const d = fdoc();
  const oldPage = document.title;
  const oldCv = d.title;
  document.title = cv.name;
  d.title = cv.name;
  // Drop the caret so no editing highlight can reach the printout.
  d.activeElement?.blur();
  frame.contentWindow.print();
  d.title = oldCv;
  document.title = oldPage;
}
function onKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (!btn.save.disabled) save();
  }
}

/* ----- Formatting ----- */
function restore() {
  frame.contentWindow.focus();
  if (savedRange) {
    const s = fdoc().getSelection();
    s.removeAllRanges();
    s.addRange(savedRange);
  }
}
function run(cmd, val) {
  restore();
  const d = fdoc();
  d.execCommand('styleWithCSS', false, cmd === 'foreColor');
  d.execCommand(cmd, false, val ?? null);
  setDirty(true);
}
document.querySelectorAll('#fmt button').forEach((b) => {
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('click', () => {
    if (b.dataset.cmd) run(b.dataset.cmd);
    else if (b.dataset.color) run('foreColor', b.dataset.color);
  });
});
$('colorPick').addEventListener('input', (e) => run('foreColor', e.target.value));
$('size').addEventListener('change', (e) => {
  const px = e.target.value;
  if (!px) return;
  restore();
  const d = fdoc();
  if (d.getSelection().isCollapsed) { status('Select some text first'); e.target.value = ''; return; }
  d.execCommand('styleWithCSS', false, false);
  d.execCommand('fontSize', false, '7');
  d.querySelectorAll('font[size="7"]').forEach((f) => {
    const s = d.createElement('span');
    s.style.fontSize = px + 'px';
    s.innerHTML = f.innerHTML;
    f.replaceWith(s);
  });
  e.target.value = '';
  setDirty(true);
});

/* ----- Wiring ----- */
btn.save.onclick = save;
btn.publish.onclick = publish;
btn.discard.onclick = discard;
btn.unpublish.onclick = unpublish;
btn.pdf.onclick = printPdf;
document.addEventListener('keydown', onKey);
window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

if (!id) {
  status('No CV selected. Go back to the list.', true);
} else {
  call('')
    .then((full) => {
      const { html, ...summary } = full;
      setCv(summary);
      render(html);
    })
    .catch((e) => status('Could not load this CV: ' + e.message, true));
}
