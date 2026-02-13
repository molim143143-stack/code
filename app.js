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
const AUTO_REFRESH_MS = 0; // 例如 8000 表示每 8 秒刷新一次

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
  const out = { codes: ["","","","",""], promo: "" };

  if (obj && typeof obj === "object"){
    if (Array.isArray(obj.codes)){
      const c = obj.codes.slice(0, 5).map(safeText);
      while (c.length < 5) c.push("");
      out.codes = c;
    }
    if (typeof obj.promo === "string"){
      out.promo = obj.promo;
    }
  }

  return out;
}

function render(data){
  const list = qs("codesList");
  const promoSection = qs("promoSection");
  const promoText = qs("promoText");
  if(!list) return;

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
    btn.textContent = "复制";
    btn.disabled = !codeVal;

    btn.addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(codeVal);
        showToast("已复制");
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
          showToast("已复制");
        }catch(_){
          showToast("复制失败");
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
