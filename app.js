const STORAGE_KEY = "opex5s_baseline_v1";
const AUDITOR_NAME = "Demo Kullanıcı";

const categories1S = [
  "Makine,Tezgah ve Ekipmanlar",
  "Takım,Fikstür,Mastar ve Aparatlar",
  "Malzeme,Ürün,Yarı Ürün,Sarf Malzemesi ve Döküman",
  "Dolaplar,Raflar,Çalışma/Montaj Masaları",
  "5S Eğitimleri ve Bilinç Seviyesi",
];

const state = {
  personnel: [],
  selectedNodeId: null,
  data: loadData(),
};

init();

async function init() {
  bindMenu();
  bindFieldScreen();
  bindSafetyScreen();
  bindAuditScreen();
  await loadPersonnel();
  renderTree();
  refreshAreaSelectors();
  renderAuditTable();
  syncAuditMeta();
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  return {
    nodes: [],
    safety: {},
    audits: [],
    nextId: 1,
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  refreshAreaSelectors();
}

function bindMenu() {
  document.querySelectorAll(".menu-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".menu-item").forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      const screen = btn.dataset.screen;
      document.querySelectorAll(".screen").forEach((x) => x.classList.remove("active"));
      document.getElementById(`screen-${screen}`).classList.add("active");
      if (screen === "audit") syncAuditMeta();
      if (screen === "safety") renderSafetyList();
    });
  });
}

async function loadPersonnel() {
  const res = await fetch("data/personnel.csv");
  const text = await res.text();
  const lines = text.trim().split("\n");
  const records = lines.slice(1).map((line) => {
    const [persNo, name, position] = line.split(",");
    return { persNo: persNo?.trim(), name: name?.trim(), position: position?.trim() };
  });
  state.personnel = records;
  const dl = document.getElementById("personnel-options");
  dl.innerHTML = "";
  records.forEach((p) => {
    const o1 = document.createElement("option");
    o1.value = `${p.persNo} - ${p.name}`;
    dl.appendChild(o1);
    const o2 = document.createElement("option");
    o2.value = p.name;
    dl.appendChild(o2);
  });
}

function bindFieldScreen() {
  document.getElementById("add-division").addEventListener("click", () => {
    const name = prompt("Bölüm adı");
    if (!name) return;
    createNode({ type: "division", name, parentId: null });
  });

  document.getElementById("add-child").addEventListener("click", () => {
    if (!state.selectedNodeId) return;
    const name = prompt("Alt saha adı");
    if (!name) return;
    createNode({ type: "area", name, parentId: state.selectedNodeId });
  });
}

function createNode({ type, name, parentId }) {
  state.data.nodes.push({
    id: state.data.nextId++,
    type,
    name,
    parentId,
    owner: "",
    technicalUnits: "",
    storage: "",
    equipments: [],
  });
  saveData();
  renderTree();
}

function renderTree() {
  const root = document.getElementById("tree");
  root.innerHTML = "";
  const top = state.data.nodes.filter((n) => n.parentId === null);
  top.forEach((node) => root.appendChild(renderNode(node)));
}

function renderNode(node) {
  const li = document.createElement("li");
  if (state.selectedNodeId === node.id) li.classList.add("selected");

  const row = document.createElement("div");
  row.className = "tree-node";

  const name = document.createElement("span");
  name.textContent = `${node.name} (${node.type === "division" ? "Bölüm" : "Alt Saha"})`;
  row.appendChild(name);

  const small = document.createElement("span");
  small.className = "small";
  small.textContent = node.owner ? `Sorumlu: ${node.owner}` : "Sorumlu atanmadı";
  row.appendChild(small);

  li.appendChild(row);
  li.addEventListener("click", (e) => {
    e.stopPropagation();
    state.selectedNodeId = node.id;
    document.getElementById("add-child").disabled = node.type !== "division";
    renderTree();
    renderNodeDetails(node.id);
  });

  const children = state.data.nodes.filter((n) => n.parentId === node.id);
  if (children.length) {
    const ul = document.createElement("ul");
    ul.className = "tree";
    children.forEach((child) => ul.appendChild(renderNode(child)));
    li.appendChild(ul);
  }
  return li;
}

function renderNodeDetails(id) {
  const node = state.data.nodes.find((n) => n.id === id);
  const wrap = document.getElementById("node-details");
  if (!node) {
    wrap.innerHTML = "Ağaçtan bir düğüm seçin.";
    return;
  }

  wrap.innerHTML = `
    <div class="grid-2">
      <label>
        Sorumlu (Pers. No / Ad Soyad)
        <input id="owner-input" list="personnel-options" value="${escapeHtml(node.owner)}" placeholder="örn. 100245 - Ali Yılmaz" />
      </label>
      <label>
        SAP PM Teknik Birimler
        <input id="tech-input" value="${escapeHtml(node.technicalUnits)}" placeholder="örn. PM-101, PM-116" />
      </label>
    </div>
    <label>
      MM Koltuk Altı Ambarı
      <input id="storage-input" value="${escapeHtml(node.storage)}" placeholder="örn. KA-07" />
    </label>
    <h4>Ekipmanlar</h4>
    <div class="grid-3">
      <input id="eq-name" placeholder="Ekipman Adı" />
      <input id="eq-code" placeholder="Ekipman Kodu" />
      <button id="add-eq">Ekipman Ekle</button>
    </div>
    <table>
      <thead>
        <tr><th>Ad</th><th>Kod</th><th>Sorumlu (Mavi Yaka)</th><th></th></tr>
      </thead>
      <tbody id="equipment-list"></tbody>
    </table>
    <button id="save-node">Kaydet</button>
  `;

  document.getElementById("save-node").addEventListener("click", () => {
    node.owner = document.getElementById("owner-input").value.trim();
    node.technicalUnits = document.getElementById("tech-input").value.trim();
    node.storage = document.getElementById("storage-input").value.trim();
    saveData();
    renderTree();
    alert("Saha detayı kaydedildi.");
  });

  document.getElementById("add-eq").addEventListener("click", () => {
    const eqName = document.getElementById("eq-name").value.trim();
    const eqCode = document.getElementById("eq-code").value.trim();
    if (!eqName || !eqCode) return;
    node.equipments.push({ id: crypto.randomUUID(), name: eqName, code: eqCode, owner: "" });
    saveData();
    renderNodeDetails(node.id);
  });

  renderEquipmentList(node);
}

function renderEquipmentList(node) {
  const tbody = document.getElementById("equipment-list");
  tbody.innerHTML = "";
  node.equipments.forEach((eq) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(eq.name)}</td>
      <td>${escapeHtml(eq.code)}</td>
      <td><input list="personnel-options" data-eq-owner="${eq.id}" value="${escapeHtml(eq.owner)}" placeholder="Personel seçin" /></td>
      <td><button data-eq-del="${eq.id}">Sil</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-eq-owner]").forEach((inp) => {
    inp.addEventListener("change", () => {
      const eq = node.equipments.find((x) => x.id === inp.dataset.eqOwner);
      if (eq) eq.owner = inp.value.trim();
      saveData();
    });
  });

  tbody.querySelectorAll("[data-eq-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      node.equipments = node.equipments.filter((x) => x.id !== btn.dataset.eqDel);
      saveData();
      renderNodeDetails(node.id);
    });
  });
}

function bindSafetyScreen() {
  document.getElementById("save-risk").addEventListener("click", () => {
    const areaId = document.getElementById("safety-area").value;
    if (!areaId) return;
    if (!state.data.safety[areaId]) state.data.safety[areaId] = { risk: "orta", trainings: [] };
    state.data.safety[areaId].risk = document.getElementById("risk-level").value;
    saveData();
    alert("Risk seviyesi kaydedildi.");
  });

  document.getElementById("add-tne").addEventListener("click", () => {
    const areaId = document.getElementById("safety-area").value;
    const code = document.getElementById("tne-code").value.trim();
    const name = document.getElementById("tne-name").value.trim();
    if (!areaId || !code || !name) return;
    if (!state.data.safety[areaId]) state.data.safety[areaId] = { risk: "orta", trainings: [] };
    state.data.safety[areaId].trainings.push({
      code,
      name,
      date: new Date().toLocaleDateString("tr-TR"),
    });
    document.getElementById("tne-code").value = "";
    document.getElementById("tne-name").value = "";
    saveData();
    renderSafetyList();
  });

  document.getElementById("safety-area").addEventListener("change", renderSafetyList);
}

function renderSafetyList() {
  const areaId = document.getElementById("safety-area").value;
  const data = state.data.safety[areaId] || { risk: "düşük", trainings: [] };
  document.getElementById("risk-level").value = data.risk;

  const tbody = document.getElementById("tne-list");
  tbody.innerHTML = "";
  data.trainings.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(t.code)}</td><td>${escapeHtml(t.name)}</td><td>${t.date}</td>`;
    tbody.appendChild(tr);
  });
}

function bindAuditScreen() {
  document.getElementById("auditor").value = AUDITOR_NAME;
  document.getElementById("audit-date").textContent = `Denetim Tarihi: ${new Date().toLocaleDateString("tr-TR")}`;

  document.getElementById("audit-area").addEventListener("change", syncAuditMeta);
  document.getElementById("save-audit").addEventListener("click", () => {
    const areaId = document.getElementById("audit-area").value;
    if (!areaId) return;
    const payload = categories1S.map((cat, idx) => ({
      category: cat,
      score: Number(document.getElementById(`score-${idx}`).value || 0),
      nonConformity: document.getElementById(`nc-${idx}`).value.trim(),
    }));
    const total = payload.reduce((sum, x) => sum + x.score, 0);
    state.data.audits.push({
      id: crypto.randomUUID(),
      areaId,
      auditor: AUDITOR_NAME,
      date: new Date().toISOString(),
      targetS: document.getElementById("target-s").value,
      items: payload,
      total,
      passed: total >= 19,
    });
    const areaNode = state.data.nodes.find((n) => String(n.id) === String(areaId));
    if (areaNode) areaNode.currentS = total >= 19 ? "1S" : areaNode.currentS || "0S";
    saveData();
    syncAuditMeta();
    alert("Denetim kaydedildi.");
  });
}

function renderAuditTable() {
  const tbody = document.getElementById("audit-categories");
  tbody.innerHTML = "";
  categories1S.forEach((cat, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cat}</td>
      <td>
        <select id="score-${idx}">
          <option value="0">0</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </td>
      <td><textarea id="nc-${idx}" rows="2" placeholder="Uygunsuzluk detayı"></textarea></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("select").forEach((s) => s.addEventListener("change", computeTotal));
  computeTotal();
}

function computeTotal() {
  const total = categories1S.reduce((sum, _, idx) => sum + Number(document.getElementById(`score-${idx}`)?.value || 0), 0);
  document.getElementById("audit-total").textContent = String(total);
  const status = document.getElementById("audit-status");
  status.textContent = total >= 19 ? "S Seviyesi Kazanıldı" : "S Seviyesi Kazanımı İçin En Az 19 Gerekli";
  status.className = total >= 19 ? "ok" : "warn";
}

function refreshAreaSelectors() {
  const areas = state.data.nodes.filter((n) => n.type === "area");
  ["safety-area", "audit-area"].forEach((id) => {
    const sel = document.getElementById(id);
    const current = sel.value;
    sel.innerHTML = `<option value="">Saha seçin</option>`;
    areas.forEach((a) => {
      const parent = state.data.nodes.find((n) => n.id === a.parentId);
      const opt = document.createElement("option");
      opt.value = String(a.id);
      opt.textContent = `${parent ? parent.name : "Bölüm"} - ${a.name}`;
      sel.appendChild(opt);
    });
    sel.value = current || "";
  });
  renderSafetyList();
  syncAuditMeta();
}

function syncAuditMeta() {
  const areaId = document.getElementById("audit-area").value;
  const node = state.data.nodes.find((n) => String(n.id) === String(areaId));
  document.getElementById("current-s").value = node?.currentS || "0S";
  document.getElementById("audit-area-name").textContent = `Saha: ${node?.name || "-"}`;
  document.getElementById("audit-owner").textContent = `Saha Sorumlusu: ${node?.owner || "-"}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
