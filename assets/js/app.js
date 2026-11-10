/* Maks Print — vetrina statica.
   Dati: window.MAKS_CATALOG (scripts/sync-catalog.mjs).
   Ordine: lista locale -> WhatsApp / email, oppure carrello reale su maksprint.it. */
(() => {
  "use strict";

  const C = window.MAKS_CATALOG || { products: [], categories: [], base: "https://maksprint.it" };
  const BASE = C.base || "https://maksprint.it";
  const WA = "393288981569";
  const MAIL = "infomaksprint@gmail.com";
  const FEATURED = [391, 576, 118, 164, 196, 483]; // collezione autunno–inverno in home
  const CART_KEY = "maks.cart.v1";
  const NAME_KEY = "maks.name.v1";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
  const money = (n) => eur.format(n || 0);
  const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;

  /* ───────── Colori ───────── */
  const HEX = {
    bianco: "#ffffff", "bianco vintage": "#f1ebdc", nero: "#141414", ebano: "#3a2e29",
    grigio: "#9b9da1", "grigio perla": "#cfcfca", "grigio antracite": "#3d4046",
    blu: "#203a8f", "blu navy": "#1b2846", "blu royal": "#1f4fd6", royal: "#1f4fd6",
    celeste: "#86c9ea", turchese: "#17b2ad", "azzurro dusty": "#8fb2c8", "calm blue": "#6f92b6",
    rosso: "#d3242f", "pale red": "#d87a72", granata: "#7a1d2b", bordeaux: "#6b1a29",
    rosa: "#f3a6bf", fucsia: "#df1f86", porpora: "#6c2c5d", mora: "#4a2444", lavanda: "#b8a6da", lilla: "#c7a1c9",
    verde: "#1e8a4b", "verde lime": "#9bd22d", "verde militare": "#4b5320", "verde mist": "#b5cab3", "green smoke": "#7c8971",
    giallo: "#ffd000", "giallo fluo": "#e4ff2a", arancione: "#f6861d", "arancio fluo": "#ff6712", sabbia: "#d8c6a1",
  };
  const one = (n) => HEX[n.trim().toLowerCase()];
  function colorsOf(name) {
    const n = name.trim().toLowerCase();
    if (HEX[n]) return [HEX[n]];
    const dash = n.split("-").map((s) => s.trim()).filter(Boolean);
    if (dash.length > 1 && dash.every(one)) return dash.slice(0, 2).map(one);
    const sp = n.split(/\s+/);
    if (sp.length === 2 && sp.every(one)) return sp.map(one);
    return [one(dash[0]) || one(sp[0]) || "#c8c8c8"];
  }
  const swStyle = (name) => {
    const [a, b] = colorsOf(name);
    return b ? `--c1:${a};--c2:${b}` : `--c1:${a}`;
  };

  /* ───────── Taglie ───────── */
  const SIZE_ORDER = ["3/4 anni", "4 anni", "5/6 anni", "6 anni", "7/8 anni", "8 anni", "9/10 anni", "10 anni", "11/12 anni", "12 anni", "14 anni", "16 anni", "3XS-2XS", "XS", "XS-S", "S", "M", "M-L", "L", "XL", "XL-XXL", "XXL", "XXXL"];
  const sizeRank = (s) => { const i = SIZE_ORDER.indexOf(s.name); return i < 0 ? 999 : i; };
  const isKid = (s) => /anni/i.test(s.name);

  /* ───────── Prodotti ───────── */
  const catName = Object.fromEntries(C.categories.map((c) => [c.slug, c.name]));
  // ricerca: senza maiuscole né accenti, e con le parole che la gente scrive davvero
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/\p{M}+/gu, "");
  const ALSO = { "t-shirt": "maglietta magliette maglia maglie tshirt", felpe: "felpa", giacche: "giacca giubbotto giubbino", pantaloni: "pantalone", "tute-sportive": "tuta tute" };
  const products = C.products.map((p, i) => ({
    ...p,
    order: FEATURED.includes(p.id) ? FEATURED.indexOf(p.id) : 100 + i,
    sizes: [...p.sizes].sort((a, b) => sizeRank(a) - sizeRank(b)),
    hay: norm([p.name, p.short, ...p.cats.map((c) => `${catName[c]} ${ALSO[c] || ""}`), ...p.colors.map((c) => c.name), p.sizes.some(isKid) ? "bambino bambini bimbo bimbi ragazzo ragazzi junior" : ""].join(" ")),
  }));
  const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));

  const priceLabel = (p) => (p.range && p.range.min !== p.range.max ? `<small>da</small>${money(p.range.min)}` : money(p.price));

  // Varianti: [id, colore, taglia, inStock, prezzo]; "" = qualsiasi.
  const matches = (v, color, size) => (!v[1] || !color || v[1] === color) && (!v[2] || !size || v[2] === size);
  function findVariation(p, color, size) {
    if (!p.variations.length) return null;
    return p.variations.find((v) => v[3] && (v[1] === "" || v[1] === color) && (v[2] === "" || v[2] === size)) || null;
  }
  function sizeAvailable(p, color, size) {
    if (!p.variations.length) return true;
    return p.variations.some((v) => v[3] && matches(v, color, size));
  }
  function addToCartURL(p, item) {
    const u = new URL("/cart/", BASE);
    u.searchParams.set("add-to-cart", p.id);
    if (item.variationId) u.searchParams.set("variation_id", item.variationId);
    if (item.color) u.searchParams.set("attribute_pa_colore", item.color.slug);
    if (item.size) u.searchParams.set("attribute_pa_taglia", item.size.slug);
    u.searchParams.set("quantity", item.qty);
    return u.toString();
  }

  /* ───────── Statistiche hero ───────── */
  const allColors = new Set(products.flatMap((p) => p.colors.map((c) => c.name.toLowerCase())));
  const st = (k, v) => { const el = $(`[data-stat="${k}"]`); if (el) el.textContent = v; };
  st("products", products.length);
  st("colors", allColors.size > 10 ? `${Math.floor(allColors.size / 10) * 10}+` : allColors.size);

  /* ───────── Catalogo ───────── */
  const state = { cat: "all", q: "", sort: "featured" };
  const grid = $("#grid");

  function renderChips() {
    const all = [{ slug: "all", name: "Tutto", count: products.length }, ...C.categories];
    $("#cat-chips").innerHTML = all
      .map((c) => `<button class="chip" type="button" data-cat="${c.slug}" aria-pressed="${state.cat === c.slug}">${esc(c.name)} <small>${c.count}</small></button>`)
      .join("");
  }

  function filtered() {
    const words = norm(state.q).split(/\s+/).filter(Boolean);
    let list = products.filter((p) => (state.cat === "all" || p.cats.includes(state.cat)) && words.every((w) => p.hay.includes(w)));
    const s = {
      featured: (a, b) => a.order - b.order,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name, "it"),
    }[state.sort];
    return list.sort(s);
  }

  function cardHTML(p, i) {
    const [a, b] = p.images;
    const sizes = "(max-width: 640px) 50vw, 300px";
    const img = (im, cls) => (im ? `<img class="${cls}" src="${esc(im.thumb || im.src)}" srcset="${esc(im.srcset)}" sizes="${sizes}" alt="${cls === "main" ? esc(p.name) : ""}" loading="lazy" decoding="async" />` : "");
    const shown = p.colors.slice(0, 7);
    const more = p.colors.length - shown.length;
    return `
      <article class="card" style="animation-delay:${Math.min(i, 12) * 40}ms" data-slug="${p.slug}">
        <div class="card__media">
          <span class="card__cat">${esc(catName[p.cats[0]] || "")}</span>
          ${img(a, b ? "main" : "main solo")}${img(b, "alt")}
          <span class="card__quick" aria-hidden="true">${icon("arrow")}</span>
        </div>
        <div class="card__body">
          <h3 class="card__name"><a href="#p/${p.slug}" data-open="${p.slug}">${esc(p.name)}</a></h3>
          <p class="card__desc">${esc(p.short)}</p>
          <div class="card__foot">
            ${shown.length ? `<div class="swatches">${shown.map((c) => `<button type="button" class="sw" tabindex="-1" style="${swStyle(c.name)}" data-open="${p.slug}" data-color="${c.slug}" title="${esc(c.name)}" aria-label="${esc(p.name)} — ${esc(c.name)}"></button>`).join("")}${more > 0 ? `<span class="more">+${more}</span>` : ""}</div>` : "<span></span>"}
            <span class="price">${priceLabel(p)}</span>
          </div>
        </div>
      </article>`;
  }

  function renderGrid() {
    const list = filtered();
    grid.innerHTML = list.map(cardHTML).join("");
    $("#empty").hidden = list.length > 0;
    const catTxt = state.cat === "all" ? "" : ` · ${catName[state.cat]}`;
    $("#result-count").textContent = `${list.length} ${list.length === 1 ? "prodotto" : "prodotti"}${catTxt}${state.q ? ` · “${state.q}”` : ""}`;
    $$(".chip").forEach((c) => c.setAttribute("aria-pressed", c.dataset.cat === state.cat));
  }

  // anteprima colore al passaggio sullo swatch
  grid.addEventListener("pointerover", (e) => {
    const sw = e.target.closest(".sw");
    if (!sw) return;
    const p = bySlug[sw.dataset.open];
    const c = p.colors.find((x) => x.slug === sw.dataset.color);
    const main = sw.closest(".card").querySelector("img.main");
    const alt = sw.closest(".card").querySelector("img.alt");
    if (c && c.img && main) {
      main.removeAttribute("srcset");
      main.src = c.img;
      main.classList.add("solo");
      if (alt) alt.dataset.off = "1";
      sw.closest(".card").dataset.color = c.slug;
    }
  });

  grid.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open]") || e.target.closest(".card");
    if (!t || e.ctrlKey || e.metaKey || e.shiftKey) return; // Ctrl+clic sul nome: il link si apre in un'altra scheda del browser
    e.preventDefault();
    const slug = t.dataset.open || t.dataset.slug;
    // la scheda si apre nel colore che la card sta mostrando
    openProduct(slug, { color: t.dataset.color || t.closest(".card").dataset.color });
  });

  $("#cat-chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.cat = b.dataset.cat;
    renderGrid();
  });
  let qt;
  $("#q").addEventListener("input", (e) => {
    clearTimeout(qt);
    qt = setTimeout(() => { state.q = e.target.value; renderGrid(); }, 120);
  });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });

  /* ───────── Scheda prodotto ───────── */
  const pd = $("#pd");
  const pdBody = $("#pd-body");
  const pdLive = $("#pd-live"); // annunci per i lettori di schermo
  let cur = null; // { p, color, size, qty, custom, text, tech, img }

  function openProduct(slug, opts = {}) {
    const p = bySlug[slug];
    if (!p) return;
    const defColor = (p.colors.find((c) => c.slug === opts.color) || p.colors.find((c) => c.def) || (p.colors.length === 1 ? p.colors[0] : null))?.slug;
    cur = { p, color: defColor || null, size: p.sizes.length === 1 ? p.sizes[0].slug : null, qty: 1, custom: false, text: "", tech: "Da decidere", img: null, added: "" };
    const col = p.colors.find((c) => c.slug === cur.color);
    cur.img = (col && col.img) || p.images[0]?.src;
    delete pdBody.dataset.slug;
    pdLive.textContent = "";
    renderPD();
    if (!pd.open) pd.showModal();
    document.body.classList.add("modal-open");
    // link diretto alla scheda: sotto resta il catalogo, così "Indietro" chiude la scheda
    if (location.hash.startsWith("#p/") && !history.state?.layer) history.replaceState(null, "", "#catalogo");
    layerOpened(`#p/${p.slug}`);
  }

  // focusSel: cosa rimettere a fuoco dopo il ridisegno (serve a chi usa la tastiera)
  function renderPD(focusSel) {
    const { p } = cur;
    const col = p.colors.find((c) => c.slug === cur.color);
    const size = p.sizes.find((s) => s.slug === cur.size);
    const kids = p.sizes.filter(isKid);
    const adults = p.sizes.filter((s) => !isKid(s));
    // stesso prodotto: restano lo scroll e la descrizione aperta
    const keep = pdBody.dataset.slug === p.slug && {
      body: pdBody.scrollTop,
      info: $(".pd__info", pdBody).scrollTop,
      thumbs: $(".pd__thumbs", pdBody)?.scrollLeft || 0,
      desc: !!$(".pd__desc", pdBody)?.open,
    };
    // un solo tab-stop per gruppo: le altre scelte si raggiungono con le frecce
    const tabColor = cur.color || p.colors[0]?.slug;
    const tabSize = cur.size || p.sizes.find((s) => sizeAvailable(p, cur.color, s.slug))?.slug;
    const ask = [`Ciao Maks Print! Vorrei informazioni su: ${p.name}`, col && col.name, size && `taglia ${size.name}`].filter(Boolean).join(", ");
    const sizeBtns = (arr) =>
      arr.map((s) => {
        const ok = sizeAvailable(p, cur.color, s.slug);
        return `<button type="button" class="size" role="radio" data-size="${s.slug}" aria-checked="${cur.size === s.slug}" tabindex="${tabSize === s.slug ? 0 : -1}" ${ok ? "" : "disabled"}>${esc(s.name)}</button>`;
      }).join("");
    const thumbs = p.images.length > 1
      ? `<div class="pd__thumbs" role="list">${p.images.map((im) => `<button type="button" role="listitem" data-img="${esc(im.src)}" aria-current="${cur.img === im.src}" aria-label="Mostra immagine"><img src="${esc(im.thumb || im.src)}" alt="" loading="lazy" /></button>`).join("")}</div>`
      : "";

    pdBody.innerHTML = `
      <button class="icon-btn pd__close" type="button" data-action="close-pd" aria-label="Chiudi">${icon("x")}</button>
      <div class="pd__media">
        <div class="pd__main"><img src="${esc(cur.img)}" alt="${esc(p.name)}${col ? " — " + esc(col.name) : ""}" /></div>
        ${thumbs}
      </div>
      <div class="pd__info">
        <div>
          <p class="pd__cat">${esc(p.cats.map((c) => catName[c]).join(" · "))}${p.sku ? ` · cod. ${esc(p.sku)}` : ""}</p>
          <h2 class="pd__title" id="pd-title">${esc(p.name)}</h2>
          <p class="pd__price">${priceLabel(p)}<small>prezzo del capo neutro · personalizzazione su preventivo</small></p>
        </div>
        ${p.short ? `<p class="pd__short">${esc(p.short)}</p>` : ""}

        ${p.colors.length ? `
        <div>
          <p class="opt-label" id="lbl-col">Colore <output>${col ? esc(col.name) : "scegli"}</output></p>
          <div class="swatches" role="radiogroup" aria-labelledby="lbl-col">
            ${p.colors.map((c) => `<button type="button" class="sw" role="radio" style="${swStyle(c.name)}" data-color="${c.slug}" aria-checked="${cur.color === c.slug}" tabindex="${tabColor === c.slug ? 0 : -1}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join("")}
          </div>
        </div>` : ""}

        ${p.sizes.length ? `
        <div>
          <p class="opt-label" id="lbl-size">Taglia <output>${size ? esc(size.name) : "scegli"}</output></p>
          <div class="sizes" role="radiogroup" aria-labelledby="lbl-size">
            ${kids.length && adults.length ? `<span class="size-group">Bambino</span>${sizeBtns(kids)}<span class="size-group">Adulto</span>${sizeBtns(adults)}` : sizeBtns(p.sizes)}
          </div>
        </div>` : ""}

        <div class="custom">
          <label class="custom__toggle">
            <input type="checkbox" data-custom ${cur.custom ? "checked" : ""} />
            <span>Personalizza questo capo<small>Logo, nome, numero — ricamo o stampa</small></span>
          </label>
          <div class="custom__fields" ${cur.custom ? "" : "hidden"}>
            <div class="seg" role="radiogroup" aria-label="Tecnica">
              ${["Da decidere", "Ricamo", "Stampa"].map((t) => `<label><input type="radio" name="tech" value="${t}" ${cur.tech === t ? "checked" : ""}/><span>${t}</span></label>`).join("")}
            </div>
            <textarea data-custom-text placeholder="Es. logo sul petto a sinistra, nome “ROSSI” e numero 10 sulla schiena">${esc(cur.text)}</textarea>
          </div>
        </div>

        <div class="pd__cta">
          ${cur.added ? `
          <div class="pd__added">
            <p>${icon("check")}<span><b>Aggiunto:</b> ${esc(cur.added)}${p.sizes.length > 1 ? `<small>Altre taglie? Sceglile e aggiungi ancora.</small>` : ""}</span></p>
            <button class="btn btn--ink btn--sm" type="button" data-action="view-order">Vedi ordine</button>
          </div>` : ""}
          <div class="pd__buy">
            <div class="qty" role="group" aria-label="Quantità">
              <button type="button" data-qty="-1" aria-label="Meno">${icon("minus")}</button>
              <input type="number" min="1" max="999" value="${cur.qty}" data-qty-input aria-label="Quantità" />
              <button type="button" data-qty="1" aria-label="Più">${icon("plus")}</button>
            </div>
            <button class="btn btn--blue btn--block" type="button" data-action="add">${icon("bag")} Aggiungi all'ordine</button>
          </div>
          <p class="pd__hint" id="pd-hint" aria-live="polite"></p>
        </div>

        <div class="pd__alt">
          <a href="#" data-buy-now target="maksprint-shop" rel="noopener">${icon("ext")} Compra subito su maksprint.it</a>
          <a href="https://wa.me/${WA}?text=${encodeURIComponent(ask + "\n" + p.url)}" target="_blank" rel="noopener">${icon("wa")} Chiedi info su WhatsApp</a>
          <a href="#p/${p.slug}" data-share>${icon("link")} Condividi</a>
        </div>

        ${p.desc && p.desc !== p.short ? `<details class="pd__desc"><summary>Descrizione</summary><p>${esc(p.desc)}</p></details>` : ""}
      </div>`;
    pdBody.dataset.slug = p.slug;
    if (keep) {
      const d = $(".pd__desc", pdBody);
      if (d) d.open = keep.desc;
      const th = $(".pd__thumbs", pdBody);
      if (th) th.scrollLeft = keep.thumbs;
      $(".pd__info", pdBody).scrollTop = keep.info;
      pdBody.scrollTop = keep.body;
    } else {
      pdBody.scrollTop = 0;
    }
    updateBuyNow();
    if (focusSel) $(focusSel, pdBody)?.focus({ preventScroll: true });
  }

  // scelte obbligatorie non ancora fatte: "col", "size"
  const missing = () => [cur.p.colors.length && !cur.color && "col", cur.p.sizes.length && !cur.size && "size"].filter(Boolean);
  function showError() {
    const h = $("#pd-hint", pdBody);
    h.textContent = selectionError();
    h.classList.add("warn");
    // segna le scelte che mancano e porta in vista la prima
    const lbls = missing().map((k) => $(`#lbl-${k}`, pdBody)).filter(Boolean);
    lbls.forEach((l) => l.classList.add("need"));
    lbls[0]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  function selectionError() {
    const { p } = cur;
    const miss = missing().map((k) => ({ col: "il colore", size: "la taglia" }[k]));
    if (miss.length) return `Scegli ${miss.join(" e ")}.`;
    if (p.variations.length && !findVariation(p, cur.color, cur.size)) return "Combinazione non disponibile.";
    return "";
  }

  function currentItem() {
    const { p } = cur;
    const v = findVariation(p, cur.color, cur.size);
    const col = p.colors.find((c) => c.slug === cur.color);
    return {
      id: p.id, slug: p.slug, name: p.name,
      img: (col && col.img) || p.images[0]?.thumb || p.images[0]?.src,
      color: col ? { name: col.name, slug: col.slug } : null,
      size: p.sizes.find((s) => s.slug === cur.size) || null,
      qty: cur.qty,
      price: v && v[4] ? v[4] : p.price,
      variationId: v ? v[0] : null,
      custom: cur.custom ? { tech: cur.tech, text: cur.text.trim() } : null,
    };
  }

  function updateBuyNow() {
    const a = $("[data-buy-now]", pdBody);
    const hint = $("#pd-hint", pdBody);
    if (!a) return;
    const err = selectionError();
    if (err) {
      a.setAttribute("aria-disabled", "true");
      a.href = "#";
    } else {
      a.removeAttribute("aria-disabled");
      a.href = addToCartURL(cur.p, currentItem());
    }
    hint.classList.remove("warn");
    hint.textContent = cur.custom ? "Con la personalizzazione ti consigliamo di inviare l'ordine su WhatsApp o email: così ci alleghi il logo." : "";
  }

  pdBody.addEventListener("click", (e) => {
    const t = e.target;
    const sw = t.closest(".sw[data-color]");
    if (sw) {
      cur.color = sw.dataset.color;
      const col = cur.p.colors.find((c) => c.slug === cur.color);
      if (col && col.img) cur.img = col.img;
      if (cur.size && !sizeAvailable(cur.p, cur.color, cur.size)) cur.size = null;
      return renderPD(`.sw[data-color="${CSS.escape(cur.color)}"]`);
    }
    const sz = t.closest(".size");
    if (sz) { cur.size = sz.dataset.size; return renderPD(`.size[data-size="${CSS.escape(cur.size)}"]`); }
    const th = t.closest("[data-img]");
    if (th) {
      cur.img = th.dataset.img;
      $(".pd__main img", pdBody).src = cur.img;
      $$("[data-img]", pdBody).forEach((b) => b.setAttribute("aria-current", b === th));
      return;
    }
    const q = t.closest("[data-qty]");
    if (q) {
      cur.qty = Math.max(1, Math.min(999, cur.qty + +q.dataset.qty));
      $("[data-qty-input]", pdBody).value = cur.qty;
      return updateBuyNow();
    }
    if (t.closest("[data-action=add]")) {
      if (selectionError()) return showError();
      const it = currentItem();
      addToCart(it);
      // la scheda resta aperta: una squadra aggiunge più taglie di fila
      cur.added = `${[it.color?.name, it.size?.name].filter(Boolean).join(" · ") || it.name} × ${it.qty}`;
      if (cur.p.sizes.length > 1) cur.size = null;
      cur.qty = 1;
      renderPD("[data-action=add]");
      pdLive.textContent = "";
      setTimeout(() => (pdLive.textContent = `Aggiunto all'ordine: ${cur.added}`), 60);
      return;
    }
    if (t.closest("[data-action=view-order]")) return openCart();
    const sh = t.closest("[data-share]");
    if (sh) {
      e.preventDefault();
      const url = `${location.href.split("#")[0]}#p/${cur.p.slug}${cur.color ? "/" + cur.color : ""}`;
      const say = (s) => { sh.lastChild.textContent = ` ${s}`; };
      if (navigator.share && matchMedia("(pointer: coarse)").matches) navigator.share({ title: `${cur.p.name} — Maks Print`, url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => say("Link copiato"), () => say(url));
      else say(url);
      return;
    }
    const bn = t.closest("[data-buy-now]");
    if (bn && bn.getAttribute("aria-disabled") === "true") {
      e.preventDefault();
      showError();
      return;
    }
    if (t.closest("[data-action=close-pd]")) closePD();
  });
  pdBody.addEventListener("input", (e) => {
    if (e.target.matches("[data-custom-text]")) cur.text = e.target.value;
    if (e.target.matches("[data-qty-input]")) { cur.qty = Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1)); updateBuyNow(); }
  });
  pdBody.addEventListener("change", (e) => {
    if (e.target.matches("[data-custom]")) {
      cur.custom = e.target.checked;
      const f = $(".custom__fields", pdBody);
      f.hidden = !cur.custom;
      if (cur.custom) $("textarea", f).focus();
      updateBuyNow();
    }
    if (e.target.name === "tech") cur.tech = e.target.value;
  });
  // colori e taglie: le frecce spostano e scelgono, come in un gruppo di radio
  pdBody.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    const r = step && e.target.closest("[role=radio]");
    if (!r) return;
    e.preventDefault();
    const all = $$("[role=radio]:not([disabled])", r.closest("[role=radiogroup]"));
    all[(all.indexOf(r) + step + all.length) % all.length].click();
  });
  pd.addEventListener("click", (e) => { if (e.target === pd) closePD(); });
  // l'evento "close" arriva solo al frame successivo (ed è l'unico con Esc):
  // chi chiude da codice sistema subito pagina e cronologia
  const pdClosed = () => { document.body.classList.toggle("modal-open", lb.open); layerClosed(); };
  pd.addEventListener("close", pdClosed);
  function closePD() { if (pd.open) { pd.close(); pdClosed(); } }

  /* ───────── Ordine (carrello locale) ───────── */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { cart = []; }
  // lista salvata giorni fa: prezzi e varianti si riallineano al catalogo di oggi
  cart = (Array.isArray(cart) ? cart : []).filter((it) => it && it.slug && it.qty > 0).map((it) => {
    const p = bySlug[it.slug];
    if (!p) return it;
    const v = findVariation(p, it.color?.slug || "", it.size?.slug || "");
    if (v) return { ...it, price: v[4] || p.price, variationId: v[0] };
    return p.variations.length ? it : { ...it, price: p.price };
  });
  const save = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} };
  const keyOf = (it) => [it.id, it.color?.slug, it.size?.slug, it.custom ? it.custom.tech + "|" + it.custom.text : ""].join("~");
  const count = () => cart.reduce((n, it) => n + it.qty, 0);
  const total = () => cart.reduce((n, it) => n + it.qty * it.price, 0);

  function addToCart(item) {
    const k = keyOf(item);
    const ex = cart.find((it) => keyOf(it) === k);
    if (ex) ex.qty = Math.min(999, ex.qty + item.qty);
    else cart.push(item);
    save();
    renderCart();
    const b = $(".cart-btn");
    b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
  }

  const drawer = $("#drawer");
  const scrim = $("#scrim");
  const cartBody = $("#cart-body");
  const cartFt = $("#cart-ft");
  let mode = "list"; // list | online
  const done = new Set();

  function itemLine(it, i) {
    const meta = [it.color && `<b>${esc(it.color.name)}</b>`, it.size && `Taglia <b>${esc(it.size.name)}</b>`].filter(Boolean).join(" · ");
    return `
      <div class="line-item">
        <img src="${esc(it.img)}" alt="" loading="lazy" />
        <div>
          <h3>${esc(it.name)}</h3>
          <p class="meta">${meta}</p>
          ${it.custom ? `<p class="custom-note">✦ ${esc(it.custom.tech)}${it.custom.text ? ": " + esc(it.custom.text) : ""}</p>` : ""}
          <div class="row">
            <div class="qty qty--sm">
              <button type="button" data-line-qty="-1" data-i="${i}" aria-label="Meno">${icon("minus")}</button>
              <input type="number" min="1" value="${it.qty}" data-line-input="${i}" aria-label="Quantità" />
              <button type="button" data-line-qty="1" data-i="${i}" aria-label="Più">${icon("plus")}</button>
            </div>
          </div>
        </div>
        <div>
          <p class="lp">${money(it.price * it.qty)}</p>
          <button class="icon-btn rm" type="button" data-rm="${i}" aria-label="Rimuovi ${esc(it.name)}">${icon("trash")}</button>
        </div>
      </div>`;
  }

  function renderCart() {
    const n = count();
    $$("[data-cart-count]").forEach((el) => { el.textContent = n; el.hidden = n === 0; });
    $("[data-cart-count-inline]").textContent = n ? `(${n})` : "";

    if (!cart.length) {
      mode = "list";
      cartBody.innerHTML = `<div class="cart-empty"><span class="big">Vuoto</span><p>Aggiungi capi dal catalogo: poi ci mandi l'ordine in un tocco.</p><button class="btn btn--ink" type="button" data-action="go-catalog">Vai al catalogo</button></div>`;
      cartFt.hidden = true;
      return;
    }
    cartFt.hidden = false;

    if (mode === "online") {
      cartBody.innerHTML = `
        <div class="online">
          <button class="back-link" type="button" data-action="back-list">← Torna all'ordine</button>
          <p><b>Paga online su maksprint.it.</b> Ogni tasto apre il negozio nella stessa scheda e aggiunge il capo al carrello. Poi vai alla cassa.</p>
          <ol>
            ${cart.map((it, i) => {
              const p = bySlug[it.slug];
              const href = p ? addToCartURL(p, it) : BASE;
              return `<li class="${done.has(i) ? "done" : ""}"><span>${it.qty}× ${esc(it.name)}${it.color ? " · " + esc(it.color.name) : ""}${it.size ? " · " + esc(it.size.name) : ""}</span>
                <a class="btn btn--sm ${done.has(i) ? "btn--line" : "btn--ink"}" href="${esc(href)}" target="maksprint-shop" rel="noopener" data-done="${i}">${done.has(i) ? icon("check") + " Aggiunto" : "Aggiungi"}</a></li>`;
            }).join("")}
          </ol>
          ${cart.some((it) => it.custom) ? `<p class="drawer__note">Le richieste di personalizzazione scrivile nelle note dell'ordine alla cassa.</p>` : ""}
        </div>`;
      cartFt.innerHTML = `
        <a class="btn btn--blue btn--block" href="${BASE}/checkout/" target="maksprint-shop" rel="noopener">Vai alla cassa ${icon("arrow")}</a>
        <p class="drawer__note">Il pagamento avviene sul sito ufficiale maksprint.it.</p>`;
      return;
    }

    cartBody.innerHTML = cart.map(itemLine).join("");
    const nm = localStorage.getItem(NAME_KEY) || "";
    cartFt.innerHTML = `
      <div class="totals"><span>Totale capi (personalizzazione esclusa)</span><b>${money(total())}</b></div>
      <div class="who"><label for="cart-name">Il tuo nome (facoltativo)</label><input id="cart-name" value="${esc(nm)}" autocomplete="name" /></div>
      <a class="btn btn--wa btn--block" href="#" data-send="wa">${icon("wa")} Invia ordine su WhatsApp</a>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <a class="btn btn--line btn--sm" href="#" data-send="mail">${icon("mail")} Email</a>
        <button class="btn btn--line btn--sm" type="button" data-action="online">${icon("ext")} Paga online</button>
      </div>
      <p class="drawer__note">Ti rispondiamo per confermare disponibilità, personalizzazione e tempi.</p>
      <button class="back-link drawer__clear" type="button" data-action="clear">Svuota ordine</button>`;
  }

  function orderText() {
    const nm = (localStorage.getItem(NAME_KEY) || "").trim();
    const lines = cart.map((it, i) => {
      const opts = [it.color?.name, it.size && `taglia ${it.size.name}`].filter(Boolean).join(", ");
      let s = `${i + 1}) ${it.name}${opts ? ` — ${opts}` : ""} × ${it.qty} = ${money(it.price * it.qty)}`;
      if (it.custom) s += `\n   ✦ Personalizzazione (${it.custom.tech})${it.custom.text ? ": " + it.custom.text : ""}`;
      return s;
    });
    return [
      "Ciao Maks Print! Vorrei ordinare:",
      "",
      ...lines,
      "",
      `Totale capi: ${money(total())} (personalizzazione esclusa)`,
      nm ? `Nome: ${nm}` : "",
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n").trim();
  }

  const behind = $$(".skip, .topbar, .hdr, main, .ftr, .fab-wa"); // la pagina dietro: niente focus mentre l'ordine è aperto
  function openCart() {
    closePD();
    renderCart();
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add("is-on"));
    drawer.classList.add("is-open");
    drawer.removeAttribute("inert");
    drawer.setAttribute("aria-hidden", "false");
    behind.forEach((el) => (el.inert = true));
    document.body.style.overflow = "hidden";
    setTimeout(() => $("[data-action=close-cart]").focus(), 50);
    layerOpened();
  }
  function closeCart() {
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("inert", "");
    drawer.setAttribute("aria-hidden", "true");
    behind.forEach((el) => (el.inert = false));
    scrim.classList.remove("is-on");
    setTimeout(() => { if (!drawer.classList.contains("is-open")) scrim.hidden = true; }, 300);
    document.body.style.overflow = "";
    $(".cart-btn").focus({ preventScroll: true });
    layerClosed();
  }

  drawer.addEventListener("click", (e) => {
    const t = e.target;
    const q = t.closest("[data-line-qty]");
    if (q) {
      const it = cart[+q.dataset.i];
      it.qty = Math.max(1, Math.min(999, it.qty + +q.dataset.lineQty));
      save(); renderCart();
      // il fuoco resta sul tasto appena premuto
      return $(`[data-line-qty="${q.dataset.lineQty}"][data-i="${q.dataset.i}"]`, drawer)?.focus();
    }
    const rm = t.closest("[data-rm]");
    if (rm) {
      cart.splice(+rm.dataset.rm, 1); done.clear(); save(); renderCart();
      return ($(`[data-rm="${Math.min(+rm.dataset.rm, cart.length - 1)}"]`, drawer) || $("[data-action=close-cart]")).focus();
    }
    const send = t.closest("[data-send]");
    if (send) {
      e.preventDefault();
      const txt = orderText();
      if (send.dataset.send === "wa") window.open(`https://wa.me/${WA}?text=${encodeURIComponent(txt)}`, "_blank", "noopener");
      else location.href = `mailto:${MAIL}?subject=${encodeURIComponent("Ordine dal sito" + (localStorage.getItem(NAME_KEY) ? " — " + localStorage.getItem(NAME_KEY) : ""))}&body=${encodeURIComponent(txt)}`;
      return;
    }
    const d = t.closest("[data-done]");
    if (d) { done.add(+d.dataset.done); setTimeout(renderCart, 300); return; }
    const a = t.closest("[data-action]");
    if (!a) return;
    if (a.dataset.action === "online") { mode = "online"; renderCart(); }
    if (a.dataset.action === "back-list") { mode = "list"; renderCart(); }
    if (a.dataset.action === "go-catalog") { afterLayer(() => $("#catalogo").scrollIntoView({ behavior: "smooth" })); closeCart(); }
    if (a.dataset.action === "clear") {
      // due tocchi: il primo chiede conferma
      if (a.dataset.sure) { cart = []; done.clear(); save(); renderCart(); return $("[data-action=close-cart]").focus(); }
      a.dataset.sure = "1";
      a.textContent = "Tocca di nuovo per svuotare";
      setTimeout(() => { if (a.isConnected) { delete a.dataset.sure; a.textContent = "Svuota ordine"; } }, 3500);
    }
  });
  drawer.addEventListener("change", (e) => {
    const i = e.target.dataset.lineInput;
    if (i != null) { cart[+i].qty = Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1)); save(); renderCart(); }
  });
  drawer.addEventListener("input", (e) => {
    if (e.target.id === "cart-name") { try { localStorage.setItem(NAME_KEY, e.target.value); } catch {} }
  });
  scrim.addEventListener("click", closeCart);

  /* ───────── Lavori + lightbox ───────── */
  const U = "https://maksprint.it/wp-content/uploads/2026/09/";
  const works = [
    { t: "img", src: U + "IMG_1628.jpeg" },
    { t: "video", src: U + "0001-0104.mp4", label: "Forniture sportive" },
    { t: "img", src: U + "IMG_1543.jpeg" },
    { t: "img", src: U + "IMG_1491.jpeg" },
    { t: "img", src: U + "IMG_0839.jpeg" },
    { t: "img", src: U + "IMG_0769.jpeg" },
    { t: "video", src: U + "0001-0135.mp4", label: "In laboratorio" },
    { t: "img", src: U + "IMG_1632.jpeg" },
    { t: "img", src: U + "IMG_1645.jpeg" },
    { t: "img", src: U + "IMG_0843.jpeg" },
    { t: "img", src: U + "IMG_0845.jpeg" },
  ];
  const thumbOf = (src) => src.replace(/\.jpeg$/, "-225x300.jpeg");
  $("#works").innerHTML = works.map((w, i) =>
    w.t === "img"
      ? `<button class="work" type="button" data-lb="${i}" aria-label="Apri foto lavoro ${i + 1}"><img src="${thumbOf(w.src)}" srcset="${thumbOf(w.src)} 225w, ${w.src.replace(/\.jpeg$/, "-768x1024.jpeg")} 768w" sizes="(max-width:640px) 50vw, 300px" width="225" height="300" alt="Capo personalizzato da Maks Print" loading="lazy" decoding="async" /></button>`
      : `<button class="work work--video" type="button" data-lb="${i}" aria-label="Apri video: ${esc(w.label)}"><video src="${w.src}" muted loop playsinline preload="metadata" width="576" height="1024"></video><span class="work__label">▶ ${esc(w.label)}</span></button>`
  ).join("");

  // i video partono solo quando visibili
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { const v = en.target; en.isIntersecting ? v.play().catch(() => {}) : v.pause(); }), { threshold: 0.3 });
    $$("#works video").forEach((v) => io.observe(v));
  }
  // se una foto grande non esiste, resta la miniatura
  $$("#works img").forEach((im) => im.addEventListener("error", () => { im.removeAttribute("srcset"); }, { once: true }));

  const lb = $("#lb");
  const lbFig = $("#lb-fig");
  let lbI = 0;
  function showLB(i) {
    lbI = (i + works.length) % works.length;
    const w = works[lbI];
    lbFig.innerHTML = w.t === "img"
      ? `<img src="${w.src}" alt="Capo personalizzato da Maks Print" onerror="this.src='${thumbOf(w.src)}'" />`
      : `<video src="${w.src}" controls autoplay playsinline loop></video>`;
    if (!lb.open) { lb.showModal(); document.body.classList.add("modal-open"); layerOpened(); }
  }
  $("#works").addEventListener("click", (e) => { const b = e.target.closest("[data-lb]"); if (b) showLB(+b.dataset.lb); });
  lb.addEventListener("click", (e) => {
    if (e.target === lb) return closeLB();
    const a = e.target.closest("[data-action]");
    if (!a) return;
    if (a.dataset.action === "close-lb") closeLB();
    if (a.dataset.action === "lb-prev") showLB(lbI - 1);
    if (a.dataset.action === "lb-next") showLB(lbI + 1);
  });
  const lbClosed = () => { lbFig.innerHTML = ""; document.body.classList.toggle("modal-open", pd.open); layerClosed(); };
  lb.addEventListener("close", lbClosed);
  function closeLB() { if (lb.open) { lb.close(); lbClosed(); } }
  // sul telefono le foto si sfogliano col dito
  let swipeX = null;
  lb.addEventListener("pointerdown", (e) => { swipeX = e.pointerType === "touch" && !e.target.closest("video, button") ? e.clientX : null; });
  lb.addEventListener("pointerup", (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 50) showLB(lbI + (dx < 0 ? 1 : -1));
  });

  /* ───────── "Indietro" chiude la finestra aperta ───────── */
  // Scheda, ordine e foto aggiungono un passo di cronologia: sul telefono il tasto Indietro
  // chiude la finestra invece di uscire dal sito.
  const anyOpen = () => pd.open || lb.open || drawer.classList.contains("is-open");
  function layerOpened(hash) {
    const url = hash || (location.hash.startsWith("#p/") ? "#catalogo" : location.href);
    if (history.state?.layer) history.replaceState({ layer: 1 }, "", url);
    else history.pushState({ layer: 1 }, "", url);
  }
  let goingBack = false; // history.back() è asincrono: mai chiederlo due volte per la stessa finestra
  function layerClosed() {
    // un attimo dopo: se intanto se n'è aperta un'altra (scheda → ordine) il passo resta
    setTimeout(() => {
      if (anyOpen() || goingBack || !history.state?.layer) return;
      goingBack = true;
      history.back();
    }, 0);
  }
  // per le azioni che scorrono la pagina: prima il browser torna indietro, poi si scorre
  function afterLayer(fn) {
    if (!history.state?.layer) return fn();
    window.addEventListener("popstate", () => setTimeout(fn, 60), { once: true });
  }
  window.addEventListener("popstate", () => {
    goingBack = false;
    if (history.state?.layer) return openFromHash();
    closePD();
    closeLB();
    closeCart();
  });

  /* ───────── Preventivo ───────── */
  const form = $("#quote-form");
  $("#qf-name").addEventListener("input", (e) => {
    if (e.target.value.trim()) { e.target.removeAttribute("aria-invalid"); $("#qf-error").hidden = true; }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const via = e.submitter?.dataset.via || "wa";
    const fd = new FormData(form);
    const name = (fd.get("name") || "").trim();
    const nameEl = $("#qf-name");
    if (!name) {
      nameEl.setAttribute("aria-invalid", "true");
      $("#qf-error").hidden = false;
      nameEl.focus();
      return;
    }
    nameEl.removeAttribute("aria-invalid");
    $("#qf-error").hidden = true;
    const items = fd.getAll("items");
    const txt = [
      "Ciao Maks Print! Vorrei un preventivo.",
      "",
      `Nome: ${name}`,
      fd.get("org") ? `Squadra/azienda: ${fd.get("org")}` : null,
      items.length ? `Capi: ${items.join(", ")}` : null,
      `Quantità: ${fd.get("qty")}`,
      `Tecnica: ${fd.get("tech")}`,
      fd.get("msg") ? `\nDettagli: ${fd.get("msg")}` : null,
    ].filter((l) => l !== null).join("\n");
    if (via === "wa") window.open(`https://wa.me/${WA}?text=${encodeURIComponent(txt)}`, "_blank", "noopener");
    else location.href = `mailto:${MAIL}?subject=${encodeURIComponent("Richiesta preventivo — " + name)}&body=${encodeURIComponent(txt)}`;
  });

  /* ───────── Header, menu, azioni globali ───────── */
  const hdr = $(".hdr");
  const onScroll = () => hdr.classList.toggle("is-stuck", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const nav = $("#nav");
  const menuBtn = $(".menu-btn");
  const setMenu = (on) => { nav.classList.toggle("is-open", on); menuBtn.setAttribute("aria-expanded", on); };
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });

  // voce di menu attiva
  if ("IntersectionObserver" in window) {
    const links = Object.fromEntries($$(".nav a").map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) { $$(".nav a").forEach((a) => a.classList.remove("is-active")); links[en.target.id]?.classList.add("is-active"); }
    }), { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(links).forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-action]");
    if (!a || drawer.contains(a) || pdBody.contains(a) || lb.contains(a)) return;
    const act = a.dataset.action;
    if (act === "menu") setMenu(!nav.classList.contains("is-open"));
    if (act === "open-cart") openCart();
    if (act === "close-cart") closeCart();
    if (act === "search") {
      setMenu(false);
      $("#catalogo").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => $("#q").focus({ preventScroll: true }), 450);
    }
    if (act === "reset-filters") { state.cat = "all"; state.q = ""; $("#q").value = ""; renderGrid(); }
  });
  $("[data-action=close-cart]").addEventListener("click", closeCart);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) closeCart();
    if (e.key === "Escape" && nav.classList.contains("is-open")) setMenu(false);
    if (lb.open && e.key === "ArrowRight") showLB(lbI + 1);
    if (lb.open && e.key === "ArrowLeft") showLB(lbI - 1);
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName) && !anyOpen()) { e.preventDefault(); $("#q").focus(); $("#catalogo").scrollIntoView({ behavior: "smooth" }); }
  });

  /* ───────── Avvio ───────── */
  $("#year").textContent = new Date().getFullYear();
  renderChips();
  renderGrid();
  renderCart();
  // #p/<prodotto> oppure #p/<prodotto>/<colore>
  function openFromHash() {
    const m = location.hash.match(/^#p\/([\w-]+)(?:\/([\w-]+))?/);
    if (!m || !bySlug[m[1]] || (pd.open && cur.p.slug === m[1])) return;
    if (!pd.open) $("#catalogo").scrollIntoView({ behavior: "instant" });
    openProduct(m[1], { color: m[2] });
  }
  window.addEventListener("hashchange", openFromHash);
  // pagina ricaricata con l'ordine o una foto aperti: quel passo di cronologia non serve più
  if (history.state?.layer && !location.hash.startsWith("#p/")) history.replaceState(null, "", location.href);
  openFromHash();
})();
