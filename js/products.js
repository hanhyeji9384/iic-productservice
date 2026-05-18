// ─── 공통 목 제품 데이터 (iic-productservice 전체 공유) ───
// 오늘 기준: 2026-05-15
// 각 제품은 서비스 시나리오 분기점(1·2·3·8년)을 커버하도록 구매일 설계

var PS_PRODUCTS = [
  {
    name: 'FRIDA 01',
    order: 'ORD-20250515-3821',
    store: '온라인',
    purchaseDate: '2025-05-15',   // 1년 — 품질·서비스 보증 유효
    isAi: false,
  },
  {
    name: 'MUSTANG 01',
    order: 'ORD-20240515-4821',
    store: '온라인',
    purchaseDate: '2024-05-15',   // 2년 — 품질 보증 만료 / 서비스 보증 유효
    isAi: false,
  },
  {
    name: 'MATIN 01',
    order: 'ORD-20230515-2934',
    store: '젠틀몬스터 청담',
    purchaseDate: '2023-05-15',   // 3년 — 서비스 보증 만료 / 복원 수리 구간
    isAi: false,
  },
  {
    name: 'VOGO 01',
    order: 'ORD-20180515-1102',
    store: '젠틀몬스터 홍대',
    purchaseDate: '2018-05-15',   // 8년 — 수리 불가 구간 (7년 초과)
    isAi: false,
  },
  {
    name: '스마트 브리즈비 01 (BL)',
    order: 'ORD-20250905-7193',
    store: '젠틀몬스터 온라인',
    purchaseDate: '2025-09-05',   // AI 아이웨어 플로우
    isAi: true,
  },
];

// ─── 헬퍼 ───

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
      ' style="display:flex;gap:16px;padding:16px;' + bdrBottom + 'cursor:pointer;border-left:2px solid transparent;background:' + bgColor + ';">';

    html += '<div style="width:64px;height:64px;flex-shrink:0;background:' + thumbBg + ';display:flex;align-items:center;justify-content:center;font-size:10px;' + thumbColor + '">' + thumbText + '</div>';

    html += '<div style="flex:1;">';
    html += '<p style="font-size:14px;font-weight:500;margin-bottom:10px;">' + p.name + '</p>';
    html += '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;color:#666;">';
    html += '<span style="color:#999;">주문번호</span><span style="font-family:monospace;letter-spacing:0.03em;">' + p.order + '</span>';
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
