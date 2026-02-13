/**
 * app.js
 * data.json 结构（与 bot.py 写入一致）：
 * {
 *   "codes": ["...", "...", "...", "...", "..."],
 *   "promo": "..."
 * }
 */

const DATA_URL = "data.json";

/**
 * ✅ 热更开关：
 * - 0   : 只在页面首次加载时拉取一次（默认）
 * - > 0 : 每隔 N 毫秒自动刷新（不需要手动刷新页面）
 */
const AUTO_REFRESH_MS = 5000; // 例如 8000 表示每 8 秒刷新一次

function qs(id){ return document.getElementById(id); }

function showToast(text){
  const el = qs("toast");
  if(!el) return;
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("show"), 1200);
}

function safeText(v){
  if (v === null || v === undefined) return "";
  return String(v);
}
function normalizeData(obj){
  const out = {
    codes: ["","","","",""],
    promo: "",
    special: []
  };

  if (obj && typeof obj === "object"){

    if (Array.isArray(obj.codes)){
      const c = obj.codes.slice(0, 5).map(safeText);
      while (c.length < 5) c.push("");
      out.codes = c;
    }

    if (typeof obj.promo === "string"){
      out.promo = obj.promo;
    }

    if (Array.isArray(obj.special)){
      out.special = obj.special.map(s => ({
        enabled: !!s.enabled,
        start: s.start || null,
        end: s.end || null,
        codes: Array.isArray(s.codes) ? s.codes.map(safeText) : []
      }));
    }
  }

  return out;
}

function getActiveSpecial(list){
  if (!Array.isArray(list)) return null;

  const now = new Date();

  for (const sp of list){
    if (!sp.enabled) continue;
    if (!sp.start || !sp.end) continue;

    const start = new Date(sp.start);
    const end = new Date(sp.end);

    if (now >= start && now <= end){
      return sp;
    }
  }

  return null;
}

function renderSpecial(data){
  const stage = document.querySelector(".stage");
  let wrap = document.getElementById("specialWrap");

  if (!wrap){
    wrap = document.createElement("div");
    wrap.id = "specialWrap";
    wrap.className = "specialWrap hidden";
    stage.appendChild(wrap);
  }

  const active = getActiveSpecial(data.special);

  if (!active){
    wrap.classList.add("hidden");
    stage.classList.remove("special-active");
    return;
  }

  stage.classList.add("special-active");
  wrap.classList.remove("hidden");

  wrap.innerHTML = `<div class="specialTitle">🎁 特别奖励代码</div>`;

  active.codes.forEach(code => {
    if (!code) return;

    const row = document.createElement("div");
    row.className = "specialRow";

    const val = document.createElement("div");
    val.className = "value";
    val.textContent = code;

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "Copiar";

    btn.addEventListener("click", async ()=>{
      try{
        await navigator.clipboard.writeText(code);
        showToast("¡Copiado!");
      }catch{
        showToast("No se pudo copiar");
      }
    });

    row.appendChild(val);
    row.appendChild(btn);
    wrap.appendChild(row);
  });
}


function render(data){
  const list = qs("codesList");
  const promoSection = qs("promoSection");
  const promoText = qs("promoText");
  if(!list) return;
renderSpecial(data);

  // codes
  list.innerHTML = "";
  const codes = data.codes || ["","","","",""];
  for(let i=0;i<5;i++){
    const codeVal = safeText(codes[i] ?? "");
    const label = `Código recompensa${i+1}`;

    const row = document.createElement("div");
    row.className = "row";

    const left = document.createElement("div");
    left.className = "left";

    const lab = document.createElement("div");
    lab.className = "label";
    lab.textContent = label;

    const val = document.createElement("div");
    val.className = "value";
    val.textContent = codeVal || "—";

    left.appendChild(lab);
    left.appendChild(val);

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.textContent = "Copiar";
    btn.disabled = !codeVal;

    btn.addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(codeVal);
        showToast("¡Copiado!");
      }catch(e){
        // 兼容部分 WebView/旧浏览器
        try{
          const ta = document.createElement("textarea");
          ta.value = codeVal;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          showToast("¡Copiado!");
        }catch(_){
          showToast("No se pudo copiar");
        }
      }
    });

    row.appendChild(left);
    row.appendChild(btn);
    list.appendChild(row);
  }

  // promo：无文案则完全隐藏
  const promo = safeText(data.promo).trim();
  if (promo){
    promoText.textContent = promo;
    promoSection.hidden = false;
  }else{
    promoText.textContent = "";
    promoSection.hidden = true;
  }
}

async function loadOnce(){
  // cache bust，保证 GitHub Pages/CDN 不返回旧缓存
  const url = `${DATA_URL}?t=${Date.now()}`;

  const r = await fetch(url, { cache: "no-store" });
  if(!r.ok){
    throw new Error(`HTTP ${r.status}`);
  }
  const obj = await r.json();
  return normalizeData(obj);
}

async function boot(){
  try{
    const data = await loadOnce();
    render(data);
  }catch(e){
    // 加载失败时：也别把“失败文案”钉在屏幕上（按你的需求）
    render({ codes: ["","","","",""], promo: "" });
  }
}

boot();

if (AUTO_REFRESH_MS > 0){
  setInterval(boot, AUTO_REFRESH_MS);
}




