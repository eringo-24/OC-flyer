/* OCチラシ作成ツール — app.js
 * 静的サイト（GitHub Pages）上で完結するクライアントサイド実装。
 * サーバーには一切データを送信しません。
 */

const TEMPLATE_SIZES = [6, 8, 10, 12];

const state = {
  prefectures: [],
  templatesMeta: {},
  currentPref: null,
  universities: [],   // [{name, detail}]
  templateSize: null,
};

const el = (id) => document.getElementById(id);
/*
async function init() {
  const [prefs, meta] = await Promise.all([
    fetch('data/prefectures.json').then(r => r.json()),
    fetch('data/templates-meta.json').then(r => r.json()),
  ]);
  state.prefectures = prefs;
  state.templatesMeta = meta;

  const sel = el('prefSelect');
  prefs.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${p.no ? p.no + '. ' : ''}${p.prefFull}${p.pref !== p.prefFull ? '' : ''} (${p.universities.length}校)`;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    el('loadPrefBtn').disabled = sel.value === '';
  });
  el('loadPrefBtn').addEventListener('click', onLoadPref);
  el('addUniBtn').addEventListener('click', () => addUniCard());
  el('backTo1Btn').addEventListener('click', () => goToStep(1));
  el('backTo2Btn').addEventListener('click', () => goToStep(2));
  el('toStep3Btn').addEventListener('click', onGenerate);
  el('regenBtn').addEventListener('click', onGenerate);
}
*/

async function init() {
  const sel = el('prefSelect');

  // イベントリスナーは常に最初に登録しておく（データ読み込みの成否に関わらず）
  sel.addEventListener('change', () => {
    el('loadPrefBtn').disabled = sel.value === '';
  });
  el('loadPrefBtn').addEventListener('click', onLoadPref);
  el('addUniBtn').addEventListener('click', () => addUniCard());
  el('backTo1Btn').addEventListener('click', () => goToStep(1));
  el('backTo2Btn').addEventListener('click', () => goToStep(2));
  el('toStep3Btn').addEventListener('click', onGenerate);
  el('regenBtn').addEventListener('click', onGenerate);

  try {
    const [prefs, meta] = await Promise.all([
      fetch('data/prefectures.json').then(r => {
        if (!r.ok) throw new Error(`prefectures.json 読み込み失敗 (HTTP ${r.status})`);
        return r.json();
      }),
      fetch('data/templates-meta.json').then(r => {
        if (!r.ok) throw new Error(`templates-meta.json 読み込み失敗 (HTTP ${r.status})`);
        return r.json();
      }),
    ]);
    state.prefectures = prefs;
    state.templatesMeta = meta;

    prefs.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${p.no ? p.no + '. ' : ''}${p.prefFull} (${p.universities.length}校)`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
    el('prefHint').innerHTML =
      `<span style="color:#a4432a;font-weight:700;">データの読み込みに失敗しました：${e.message}<br>
      </span>`;
  }
}

function goToStep(n) {
  [1, 2, 3].forEach(i => {
    el(`panel-${i}`).classList.toggle('hidden', i !== n);
    const dot = document.querySelector(`.step-dot[data-step="${i}"]`);
    dot.classList.toggle('active', i === n);
    dot.classList.toggle('done', i < n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function pickTemplateSize(count) {
  for (const size of TEMPLATE_SIZES) {
    if (count <= size) return { size, exact: count === size, overflow: 0 };
  }
  const max = TEMPLATE_SIZES[TEMPLATE_SIZES.length - 1];
  return { size: max, exact: false, overflow: count - max };
}

function onLoadPref() {
  const idx = el('prefSelect').value;
  if (idx === '') return;
  const pref = state.prefectures[Number(idx)];
  state.currentPref = pref;
  state.universities = pref.universities.map(name => ({ name, detail: '' }));

  renderTemplateBanner();
  renderUniList();
  goToStep(2);
}

function renderTemplateBanner() {
  const count = state.universities.length;
  const pick = pickTemplateSize(count);
  state.templateSize = pick.size;
  const banner = el('templateBanner');
  banner.classList.remove('warn');

  let msg = `${state.currentPref.prefFull} ／ 掲載大学 ${count}校 → ${pick.size}大学用フォーマットを使用`;
  if (pick.overflow > 0) {
    banner.classList.add('warn');
    msg = `${state.currentPref.prefFull} ／ 掲載大学 ${count}校 → 対応テンプレートが無いため12大学用フォーマットを使用します（${pick.overflow}校分が収まりません。大学を減らすか、テンプレートを追加してください）`;
  } else if (!pick.exact) {
    msg += `（空き ${pick.size - count} 枠は空欄になります。手動で調整してください）`;
  }
  banner.textContent = msg;
}

function renderUniList() {
  const list = el('uniList');
  list.innerHTML = '';
  state.universities.forEach((u, i) => list.appendChild(buildUniCard(u, i)));
}

function buildUniCard(uni, index) {
  const card = document.createElement('div');
  card.className = 'uni-card';
  card.dataset.index = index;

  const idxEl = document.createElement('div');
  idxEl.className = 'uni-index';
  idxEl.textContent = String(index + 1).padStart(2, '0');

  const fields = document.createElement('div');
  fields.className = 'uni-fields';

  const nameLabel = document.createElement('label');
  nameLabel.textContent = '大学名';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = uni.name;
  nameInput.placeholder = '例）○○大学';
  nameInput.addEventListener('input', () => { state.universities[index].name = nameInput.value; });

  const detailLabel = document.createElement('label');
  const meta = state.templatesMeta[String(state.templateSize)];
  const lineCap = meta ? meta.lineCounts[index] : 2;
  detailLabel.textContent = `日程・学部情報（推奨 ${lineCap || 1}行、改行で分けて入力／優先順位：日程＞学部＞キャンパス＞対面orオンライン）`;
  const detailArea = document.createElement('textarea');
  detailArea.value = uni.detail;
  detailArea.placeholder = '例）\n8/2, 8/3　法、経済、医、工など全学部\nオンラインで実施';
  detailArea.rows = Math.max(2, lineCap || 2);
  detailArea.addEventListener('input', () => { state.universities[index].detail = detailArea.value; });

  const rowActions = document.createElement('div');
  rowActions.className = 'uni-row-actions';
  const upBtn = mkBtn('↑ 上へ', () => moveUni(index, -1));
  const downBtn = mkBtn('↓ 下へ', () => moveUni(index, 1));
  const delBtn = mkBtn('削除', () => removeUni(index));
  rowActions.append(upBtn, downBtn, delBtn);

  fields.append(nameLabel, nameInput, detailLabel, detailArea, rowActions);
  card.append(idxEl, fields);
  return card;
}

function mkBtn(text, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

function moveUni(index, dir) {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= state.universities.length) return;
  const arr = state.universities;
  [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
  renderTemplateBanner();
  renderUniList();
}

function removeUni(index) {
  state.universities.splice(index, 1);
  renderTemplateBanner();
  renderUniList();
}

function addUniCard() {
  state.universities.push({ name: '', detail: '' });
  renderTemplateBanner();
  renderUniList();
}

/* ---------------- Word generation ---------------- */

async function onGenerate() {
  goToStep(3);
  const status = el('genStatus');
  status.innerHTML = 'Wordファイルを生成しています...';

  try {
    const pick = pickTemplateSize(state.universities.length);
    const templatePath = `templates/template_${pick.size}.docx`;
    const resp = await fetch(templatePath);
    if (!resp.ok) throw new Error(`テンプレート読み込み失敗: ${templatePath}`);
    const arrayBuffer = await resp.arrayBuffer();

    const zip = new PizZip(arrayBuffer);
    const doc = new window.docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });

    const data = { prefFull: state.currentPref ? state.currentPref.prefFull : '' };
    const meta = state.templatesMeta[String(pick.size)];
    for (let i = 0; i < pick.size; i++) {
      const uni = state.universities[i] || { name: '', detail: '' };
      data[`uni${i + 1}_name`] = uni.name || '';
      const cap = meta ? (meta.lineCounts[i] || 1) : 1;
      const lines = (uni.detail || '').split('\n').map(s => s.trim()).filter(s => s !== '');
      for (let j = 0; j < cap; j++) {
        data[`uni${i + 1}_d${j + 1}`] = '';
      }
      if (lines.length <= cap) {
        lines.forEach((line, j) => { data[`uni${i + 1}_d${j + 1}`] = line; });
      } else {
        // 行数が枠を超えた場合は最後の枠にまとめる
        for (let j = 0; j < cap - 1; j++) data[`uni${i + 1}_d${j + 1}`] = lines[j];
        data[`uni${i + 1}_d${cap}`] = lines.slice(cap - 1).join('　');
      }
    }

    doc.render(data);
    const out = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const prefName = state.currentPref ? state.currentPref.prefFull : 'チラシ';
    const filename = `OCチラシ_${prefName}_${pick.size}大学.docx`;
    const url = URL.createObjectURL(out);

    status.innerHTML = `生成が完了しました。<br><a class="download-link" href="${url}" download="${filename}">↓ ${filename} をダウンロード</a>`;
  } catch (e) {
    console.error(e);
    status.innerHTML = `<span class="error">エラーが発生しました: ${e.message}</span><br>テンプレートファイルのパスや内容を確認してください。`;
  }
}

init();
