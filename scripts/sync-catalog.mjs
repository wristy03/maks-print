// Scarica il catalogo reale da maksprint.it (WooCommerce Store API) e lo salva
// in assets/js/catalog.js. Nessuna dipendenza: serve Node 18+.
//   node scripts/sync-catalog.mjs
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE = "https://maksprint.it";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "js", "catalog.js");

const getJSON = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": "maksprint-catalog-sync" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const decode = (s = "") =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

const htmlToText = (html = "") =>
  decode(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

// Le varianti (id + immagine per colore) stanno solo nell'HTML della pagina prodotto.
async function variationsFor(permalink) {
  const html = await (await fetch(permalink)).text();
  const m = html.match(/data-product_variations="([^"]*)"/);
  if (!m) return [];
  try {
    return JSON.parse(decode(m[1]));
  } catch {
    return [];
  }
}

const [products, categories] = await Promise.all([
  getJSON(`${BASE}/wp-json/wc/store/v1/products?per_page=100`),
  getJSON(`${BASE}/wp-json/wc/store/v1/products/categories?per_page=100`),
]);

const out = [];
for (const p of products) {
  const vars = p.type === "variable" ? await variationsFor(p.permalink) : [];
  const colAttr = p.attributes.find((a) => a.taxonomy === "pa_colore");
  const sizeAttr = p.attributes.find((a) => a.taxonomy === "pa_taglia");
  const colorImg = {};
  for (const v of vars) {
    const c = v.attributes?.attribute_pa_colore;
    if (c && v.image?.full_src && !colorImg[c]) colorImg[c] = v.image.full_src;
  }
  const minor = p.prices.currency_minor_unit ?? 2;
  const money = (v) => (v == null ? null : +v / 10 ** minor);
  out.push({
    id: p.id,
    name: decode(p.name),
    slug: p.slug,
    url: p.permalink,
    sku: p.sku || "",
    price: money(p.prices.price),
    regular: money(p.prices.regular_price),
    range: p.prices.price_range
      ? { min: money(p.prices.price_range.min_amount), max: money(p.prices.price_range.max_amount) }
      : null,
    cats: p.categories.map((c) => c.slug),
    short: htmlToText(p.short_description),
    desc: htmlToText(p.description),
    images: p.images.map((i) => ({ src: i.src, thumb: i.thumbnail, srcset: i.srcset || "", alt: decode(i.alt || "") })),
    colors: colAttr
      ? colAttr.terms.map((t) => ({ name: decode(t.name), slug: t.slug, img: colorImg[t.slug] || null, def: !!t.default }))
      : [],
    sizes: sizeAttr ? sizeAttr.terms.map((t) => ({ name: decode(t.name), slug: t.slug })) : [],
    // [variation_id, colore, taglia] — stringa vuota = "qualsiasi"
    variations: vars.map((v) => [v.variation_id, v.attributes?.attribute_pa_colore ?? "", v.attributes?.attribute_pa_taglia ?? "", v.is_in_stock !== false ? 1 : 0, v.display_price]),
    inStock: p.is_in_stock,
  });
}

const cats = categories
  .filter((c) => c.count > 0)
  .map((c) => ({ id: c.id, name: decode(c.name), slug: c.slug, count: c.count, img: c.image?.src || null }));

const payload = { syncedAt: new Date().toISOString(), base: BASE, categories: cats, products: out };
await writeFile(OUT, `// Generato da scripts/sync-catalog.mjs — non modificare a mano.\nwindow.MAKS_CATALOG = ${JSON.stringify(payload, null, 1)};\n`);
console.log(`OK: ${out.length} prodotti, ${cats.length} categorie -> ${OUT}`);
