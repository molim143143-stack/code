/* ========= 配置 ========= */
const DATA_URL = "./data.json"; // ✅ 机器人只需要更新这个文件
const FALLBACK = {
  codes: [
    { title: "代码 1", desc: "说明文字（可选）", value: "CODE_1_EXAMPLE" },
    { title: "代码 2", desc: "说明文字（可选）", value: "CODE_2_EXAMPLE" },
    { title: "代码 3", desc: "说明文字（可选）", value: "CODE_3_EXAMPLE" },
    { title: "代码 4", desc: "说明文字（可选）", value: "CODE_4_EXAMPLE" },
    { title: "代码 5", desc: "说明文字（可选）", value: "CODE_5_EXAMPLE" },
  ],
  promo: "这里是活动说明。\n支持换行。\n机器人更新 data.json 后网页自动显示最新内容。"
};

/* ========= 工具 ========= */
function $(id){ return document.getElementById(id); }

let toastTimer = null;
function toast(msg){
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove("show"), 1300);
}

async function copyText(text){
  // 首选：Clipboard API
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch(_){}

  // 兜底：选区复制
  try{
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }catch(_){
    return false;
  }
}

/* ========= 渲染 ========= */
function normalizeData(data){
  // 允许 data.json 只给 5 行 code（数组字符串），也允许给对象数组
  // 目标：统一成 { codes:[{title,desc,value} x5], promo:string }
  const out = { ...FALLBACK };

  if (data && typeof data === "object") {
    // promo
    if (typeof data.promo === "string") out.promo = data.promo;

    // codes
    if (Array.isArray(data.codes)) {
      const arr = data.codes.slice(0, 5);
      const normalized = [];

      for (let i = 0; i < 5; i++){
        const item = arr[i];

        if (typeof item === "string") {
          normalized.push({
            title: `代码 ${i+1}`,
            desc: "点击复制按钮即可复制",
            value: item
          });
        } else if (item && typeof item === "object") {
          normalized.push({
            title: (typeof item.title === "string" && item.title.trim()) ? item.title : `代码 ${i+1}`,
            desc: (typeof item.desc === "string") ? item.desc : "点击复制按钮即可复制",
            value: (typeof item.value === "string") ? item.value : ""
          });
        } else {
          normalized.push({
            title: `代码 ${i+1}`,
            desc: "点击复制按钮即可复制",
            value: ""
          });
        }
      }
      out.codes = normalized;
    }
  }

  // 强制保证 5 个
  if (!Array.isArray(out.codes)) out.codes = FALLBACK.codes;
  if (out.codes.length !== 5){
    const fixed = [];
    for (let i=0;i<5;i++){
      fixed.push(out.codes[i] || {
        title: `代码 ${i+1}`,
        desc: "点击复制按钮即可复制",
        value: ""
      });
    }
    out.codes = fixed;
  }

  if (typeof out.promo !== "string") out.promo = FALLBACK.promo;
  return out;
}

function render(data){
  const codesGrid = $("codesGrid");
  const promoBox = $("promoBox");
  if (!codesGrid || !promoBox) return;

  // codes
  codesGrid.innerHTML = "";
  data.codes.forEach((c, idx) => {
    const card = document.createElement("article");
    card.className = "card";

    const top = document.createElement("div");
    top.className = "card__top";

    const left = document.createElement("div");
    const h = document.createElement("h3");
    h.className = "card__title";
    h.textContent = c.title || `代码 ${idx+1}`;

    const p = document.createElement("p");
    p.className = "card__desc";
    p.textContent = (c.desc ?? "点击复制按钮即可复制");

    left.appendChild(h);
    left.appendChild(p);

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.textContent = "复制";
    btn.addEventListener("click", async () => {
      const ok = await copyText(c.value || "");
      toast(ok ? "✅ 已复制" : "❌ 复制失败（浏览器限制）");
    });

    top.appendChild(left);
    top.appendChild(btn);

    const ta = document.createElement("textarea");
    ta.className = "codebox";
    ta.readOnly = true;
    ta.spellcheck = false;
    ta.value = c.value || "";

    card.appendChild(top);
    card.appendChild(ta);
    codesGrid.appendChild(card);
  });

  // promo
  promoBox.textContent = data.promo || "";
}

async function load(){
  // 给 GitHub Pages 加一个 cache bust，防止浏览器缓存旧 data.json
  const bust = `t=${Date.now()}`;
  const url = DATA_URL.includes("?") ? `${DATA_URL}&${bust}` : `${DATA_URL}?${bust}`;

  try{
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const data = normalizeData(json);
    render(data);
  }catch(err){
    console.warn("Load data.json failed, using fallback.", err);
    render(FALLBACK);
    toast("⚠️ 使用默认内容（data.json 未读取到）");
  }
}

document.addEventListener("DOMContentLoaded", load);
