/** Session key: server inline PDP script stores Pixel ViewContent `event_id`; client sends CAPI only with same id (dedupe). */
export const META_PDP_EARLY_VC_EID_PREFIX = 'nature_secret_pdp_early_vc_eid_';

/** @param {string} productId */
export function metaPdpEarlyVcSessionKey(productId) {
  return `${META_PDP_EARLY_VC_EID_PREFIX}${String(productId || '')}`;
}

/** @param {object|null|undefined} product */
export function pdpMinVariantPriceCents(product) {
  if (!product || typeof product !== 'object') return 0;
  let cents = Number(product.price) || 0;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length > 0) {
    const vals = variants.map((v) => Number(v?.price)).filter((p) => Number.isFinite(p) && p > 0);
    if (vals.length) cents = Math.min(...vals);
  }
  return cents;
}

/** @param {object|null|undefined} product */
export function metaCatalogContentIdForProduct(product) {
  if (!product || typeof product !== 'object') return '';
  const a = product.advertisingId != null && String(product.advertisingId).trim();
  return (a || String(product.id || '')).trim().slice(0, 128);
}

/**
 * Inline script for PDP HTML: fires standard ViewContent as soon as `fbq` exists (head bootstrap), before React hydrates.
 * @param {object} product — serialized product from RSC
 * @returns {string|null} script inner HTML or null if pixel off / no product
 */
export function buildPdpEarlyViewContentInlineScript(product) {
  const pixelId = String(process.env.NEXT_PUBLIC_META_PIXEL_ID || '').trim();
  if (!pixelId || !product || typeof product !== 'object' || !product.id) return null;
  if ((product.inventory ?? 0) === 0) return null;
  const cents = pdpMinVariantPriceCents(product);
  const value = Math.round((cents / 100) * 100) / 100;
  const catalogId = metaCatalogContentIdForProduct(product);
  const productIdJs = JSON.stringify(String(product.id));
  const catalogIdJs = JSON.stringify(catalogId);
  const valueJs = JSON.stringify(value);
  const prefixJs = JSON.stringify(META_PDP_EARLY_VC_EID_PREFIX);
  return `(function(){
try{
var SK=${prefixJs}+String(${productIdJs});
if(sessionStorage.getItem(SK))return;
var catalogId=${catalogIdJs};
var value=${valueJs};
var cur='PKR';
function payload(){
var o={content_type:'product',value:value,currency:cur,num_items:1};
if(catalogId)o.content_ids=[catalogId];
return o;
}
function go(){
if(!window.fbq)return;
var idPart=String(catalogId||'na').slice(0,64);
var eid=('std_vc_'+idPart+'_'+Date.now()).slice(0,128);
sessionStorage.setItem(SK,eid);
window.fbq('track','ViewContent',payload(),{eventID:eid});
}
go();
}catch(e){}
})();`;
}
