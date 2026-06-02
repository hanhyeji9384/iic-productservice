// ─── 공통 목 제품 데이터 (iic-productservice 전체 공유) ───
// 오늘 기준: 2026-05-15
// 각 제품은 서비스 시나리오 분기점(1·2·3·8년)을 커버하도록 구매일 설계

var PS_PRODUCTS = [
  {
    name: 'FRIDA 01',
    order: '2501150MNSVGSJKKGZA',
    serialNumber: 'FR010125-00003821',
    store: '젠틀몬스터 온라인 공식몰',
    purchaseDate: '2025-01-15',   // 1년 — 품질·서비스 보증 유효
    subCategory: 'SUNGLASS ACETATE',
    isAi: false,
  },
  {
    name: 'FRIDA 01',
    order: '2501150MNSVGSJKKGZA',
    serialNumber: 'FR010125-00003822',
    store: '젠틀몬스터 온라인 공식몰',
    purchaseDate: '2025-01-15',   // 동일 SKU 복수 구매 — S/N으로 구분
    subCategory: 'SUNGLASS ACETATE',
    isAi: false,
  },
  {
    name: 'MUSTANG 01',
    order: '2401100MNSVGSJKKGZB',
    serialNumber: 'MU010124-00004821',
    store: '젠틀몬스터 온라인 공식몰',
    purchaseDate: '2024-01-10',   // 품질 보증 만료 / 서비스 보증 유효
    subCategory: 'SUNGLASS METAL',
    isAi: false,
  },
  {
    name: 'MATIN 01',
    order: '2302010MNSVGSJKKGZC',
    serialNumber: 'MA010223-00002934',
    store: '젠틀몬스터 청담',
    purchaseDate: '2023-02-01',   // 서비스 보증 만료 / 복원 수리 구간
    subCategory: 'SUNGLASS COMBI',
    isAi: false,
  },
  {
    name: 'HEIZER 01',
    order: '2106200MNSVGSJKKGZD',
    serialNumber: 'HE010621-00005521',
    store: '젠틀몬스터 온라인 공식몰',
    purchaseDate: '2021-06-20',   // 수리 불가 구간
    subCategory: 'SUNGLASS METAL',
    isAi: false,
  },
  {
    name: 'VOGO 01',
    order: '1603100MNSVGSJKKGZE',
    serialNumber: 'VO010316-00001102',
    store: '젠틀몬스터 홍대',
    purchaseDate: '2016-03-10',   // 수리 불가 구간 (7년 초과)
    subCategory: 'SUNGLASS ACETATE',
    isAi: false,
  },
  {
    name: '스마트 브리즈비 01 (BL)',
    order: '2509050MNSVGSJKKGZF',
    serialNumber: 'R4AC9001K85',
    store: '젠틀몬스터 온라인 공식몰',
    purchaseDate: '2025-09-05',   // AI 아이웨어 플로우
    subCategory: 'AI EYEWEAR',
    isAi: true,
  },
];

// ─── 헬퍼 ───

var PS_PRODUCT_SUBCATEGORY_OVERRIDES = {
  'FRIDA 01': 'SUNGLASS ACETATE',
  'FRIDA 02': 'SUNGLASS ACETATE',
  'FRIDA 03': 'SUNGLASS ACETATE',
  'MUSTANG 01': 'SUNGLASS METAL',
  'MATIN 01': 'SUNGLASS COMBI',
  'MATIN 02': 'SUNGLASS COMBI',
  'VOGO 01': 'SUNGLASS ACETATE',
  'JENNIE 01': 'SUNGLASS ACETATE',
  'MONDO 03': 'SUNGLASS ACETATE',
  'TOFINO 01': 'SUNGLASS METAL',
  'PALETTE 02': 'SUNGLASS METAL',
  '스마트 브리즈비 01': 'AI EYEWEAR',
  '스마트 브리즈비 02': 'AI EYEWEAR',
  '스마트 브리즈비 03': 'AI EYEWEAR'
};

function psNormalizeProductName(name) {
  return String(name || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function psGetProductSubCategory(productOrName) {
  if (!productOrName) return '';
  if (typeof productOrName === 'object') {
    if (productOrName.productSubCategory) return productOrName.productSubCategory;
    if (productOrName.subCategory) return productOrName.subCategory;
    productOrName = productOrName.name || productOrName.productName || '';
  }

  var normalizedName = psNormalizeProductName(productOrName);
  var found = PS_PRODUCTS.find(function(product) {
    return psNormalizeProductName(product.name) === normalizedName;
  });
  if (found && found.subCategory) return found.subCategory;

  return PS_PRODUCT_SUBCATEGORY_OVERRIDES[normalizedName] || '';
}

function psIsRestorationCategory(subCategory) {
  return /\b(METAL|COMBI)\b/i.test(subCategory || '');
}

function psYearsFromPurchase(purchaseDate) {
  if (!purchaseDate) return 0;
  return (new Date() - new Date(purchaseDate)) / (1000 * 60 * 60 * 24 * 365.25);
}

function psFormatDate(isoDate) {
  if (!isoDate) return '';
  var p = isoDate.split('-');
  return p[0] + '. ' + p[1] + '. ' + p[2];
}

// 품질 보증: 구매일 + 2년
function psQualityWarranty(isoDate) {
  if (!isoDate) return '';
  var d = new Date(isoDate);
  d.setFullYear(d.getFullYear() + 2);
  var expired = d < new Date();
  var s = '~' + d.getFullYear() + '. ' +
    String(d.getMonth() + 1).padStart(2, '0') + '. ' +
    String(d.getDate()).padStart(2, '0');
  return s + (expired ? ' <span style="color:#999;">(만료)</span>' : ' <span style="color:#111;font-weight:500;">(유효)</span>');
}

// 서비스 보증: 구매일 + 3년
function psServiceWarranty(isoDate) {
  if (!isoDate) return '';
  var d = new Date(isoDate);
  d.setFullYear(d.getFullYear() + 3);
  var expired = d < new Date();
  var s = '~' + d.getFullYear() + '. ' +
    String(d.getMonth() + 1).padStart(2, '0') + '. ' +
    String(d.getDate()).padStart(2, '0');
  return s + (expired ? ' <span style="color:#999;">(만료)</span>' : ' <span style="font-size:11px;">(유효)</span>');
}

// step1 제품 목록 렌더링
function psRenderProductList(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var html = '';
  PS_PRODUCTS.forEach(function(p, i) {
    var isLast = i === PS_PRODUCTS.length - 1;
    var bdrBottom = isLast ? '' : 'border-bottom:1px solid var(--gray-200);';
    var bgColor = p.isAi ? '#f0f3ff' : '';
    var thumbBg = p.isAi ? '#e8eaf6' : '#f0f0f0';
    var thumbText = p.isAi ? 'AI' : 'IMG';
    var thumbColor = p.isAi ? 'color:#1428a0;font-weight:600;letter-spacing:0.05em;' : '';
    var checkColor = p.isAi ? '#1428a0' : '#111';

    html += '<div class="product-history-card" id="phc-' + i + '" onclick="selectHistoryProduct(' + i + ')"' +
      ' data-ai="' + (p.isAi ? 'true' : 'false') + '"' +
      ' data-sub-category="' + (p.subCategory || '') + '"' +
      ' style="display:flex;gap:16px;padding:16px;' + bdrBottom + 'cursor:pointer;border-left:2px solid transparent;background:' + bgColor + ';">';

    html += '<div style="width:64px;height:64px;flex-shrink:0;background:' + thumbBg + ';display:flex;align-items:center;justify-content:center;font-size:10px;' + thumbColor + '">' + thumbText + '</div>';

    html += '<div style="flex:1;">';
    html += '<p style="font-size:14px;font-weight:500;margin-bottom:10px;">' + p.name + '</p>';
    html += '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;color:#666;">';
    html += '<span style="color:#999;">주문번호</span><span style="font-family:monospace;letter-spacing:0.03em;">' + p.order + '</span>';
    html += '<span style="color:#999;">시리얼 넘버</span><span style="font-family:monospace;letter-spacing:0.03em;">' + (p.serialNumber || '-') + '</span>';
    html += '<span style="color:#999;">구매처</span><span>' + p.store + '</span>';
    html += '<span style="color:#999;">구매일</span><span>' + psFormatDate(p.purchaseDate) + '</span>';
    html += '<span style="color:#999;">품질 보증</span><span>' + psQualityWarranty(p.purchaseDate) + '</span>';
    html += '<span style="color:#999;">서비스 보증</span><span style="font-weight:500;">' + psServiceWarranty(p.purchaseDate) + '</span>';
    html += '</div>';

    html += '</div>';
    html += '<span id="phc-check-' + i + '" style="color:' + checkColor + ';font-size:18px;align-self:center;visibility:hidden;">✓</span>';
    html += '</div>';
  });

  container.innerHTML = html;
}
