/* Language / Region modal — injected into all pages */
(function () {
  var COUNTRY_MAP = {
    kr: { currency: 'krw', lang: 'ko' },
    us: { currency: 'usd', lang: 'en' },
    ca: { currency: 'cad', lang: 'en' },
    sg: { currency: 'sgd', lang: 'ko' }
  };

  var COUNTRY_LABEL = {
    kr: 'South Korea',
    us: 'United States',
    ca: 'Canada',
    sg: 'Singapore'
  };

  function getSavedLang() {
    try { return localStorage.getItem('ps-lang'); } catch(e) { return null; }
  }

  function applyCountryToPage(country, lang) {
    var label = COUNTRY_LABEL[country] || country;
    var activeLang = lang || getSavedLang();
    var prefix = (activeLang === 'en') ? 'Country: ' : '국가: ';
    document.querySelectorAll('.site-footer a, footer a').forEach(function(el) {
      var txt = el.textContent.trim();
      if (txt.indexOf('국가:') === 0 || txt.indexOf('Country:') === 0) {
        el.textContent = prefix + label;
      }
    });
  }

  var MODAL_HTML =
    '<div id="lang-modal-overlay" onclick="if(event.target===this)closeLangModal()" ' +
    'style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;justify-content:center;align-items:center;">' +

    '<div style="background:#fff;width:490px;max-width:90vw;max-height:90vh;overflow-y:auto;border-radius:12px;padding:48px 40px 40px;position:relative;">' +

    '<button onclick="closeLangModal()" style="position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:50%;border:1px solid #d0d0d0;background:#fff;cursor:pointer;font-size:16px;color:#333;display:flex;align-items:center;justify-content:center;line-height:1;padding:0;font-family:inherit;">&#x2715;</button>' +

    '<h2 style="font-size:22px;font-weight:500;letter-spacing:-0.01em;margin-bottom:28px;color:#111;">국가 또는 지역 선택</h2>' +

    '<p style="font-size:13px;color:#111;margin-bottom:10px;">국가/지역</p>' +
    '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 16px;margin-bottom:10px;">' +
    '<p style="font-size:11px;color:#aaa;margin-bottom:2px;">국가/지역*</p>' +
    '<div style="display:flex;align-items:center;">' +
    '<select id="modal-country" onchange="onModalCountryChange(this.value)" style="flex:1;-webkit-appearance:none;appearance:none;border:none;font-size:14px;font-family:inherit;background:transparent;cursor:pointer;outline:none;color:#111;padding:0;">' +
    '<option value="kr">Korea, South</option>' +
    '<option value="us">United States</option>' +
    '<option value="ca">Canada</option>' +
    '<option value="sg">Singapore</option>' +
    '</select>' +
    '<span style="pointer-events:none;color:#333;font-size:13px;margin-left:8px;">&#x2228;</span>' +
    '</div></div>' +

    '<p style="font-size:12px;color:#888;line-height:1.6;margin-bottom:24px;">쇼핑 도중에 장소를 변경하시는 경우 쇼핑백에 있는 모든 제품이 삭제되므로 주의하시기 바랍니다.</p>' +

    '<p style="font-size:13px;color:#111;margin-bottom:10px;">통화</p>' +
    '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 16px;margin-bottom:24px;">' +
    '<p style="font-size:11px;color:#aaa;margin-bottom:2px;">통화</p>' +
    '<div style="display:flex;align-items:center;">' +
    '<select id="modal-currency" style="flex:1;-webkit-appearance:none;appearance:none;border:none;font-size:14px;font-family:inherit;background:transparent;cursor:pointer;outline:none;color:#111;padding:0;">' +
    '<option value="krw">Won</option>' +
    '<option value="usd">Dollar</option>' +
    '<option value="cad">Canadian Dollar</option>' +
    '<option value="sgd">Singapore Dollar</option>' +
    '</select>' +
    '<span style="pointer-events:none;color:#333;font-size:13px;margin-left:8px;">&#x2228;</span>' +
    '</div></div>' +

    '<p style="font-size:13px;color:#111;margin-bottom:10px;">언어</p>' +
    '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 16px;margin-bottom:32px;">' +
    '<p style="font-size:11px;color:#aaa;margin-bottom:2px;">언어</p>' +
    '<div style="display:flex;align-items:center;">' +
    '<select id="modal-lang" style="flex:1;-webkit-appearance:none;appearance:none;border:none;font-size:14px;font-family:inherit;background:transparent;cursor:pointer;outline:none;color:#111;padding:0;">' +
    '<option value="ko">한국어</option>' +
    '<option value="en">English</option>' +
    '</select>' +
    '<span style="pointer-events:none;color:#333;font-size:13px;margin-left:8px;">&#x2228;</span>' +
    '</div></div>' +

    '<button onclick="saveLangModal()" style="width:100%;padding:18px;background:#111;color:#fff;border:none;border-radius:6px;font-size:15px;font-family:inherit;cursor:pointer;letter-spacing:0.02em;">저장하기</button>' +

    '</div></div>';

  document.addEventListener('DOMContentLoaded', function () {
    var wrap = document.createElement('div');
    wrap.innerHTML = MODAL_HTML;
    var modalEl = wrap.firstElementChild;
    if (modalEl) document.body.appendChild(modalEl);

    try {
      var saved = getSavedLang();
      var savedCountry;
      try { savedCountry = localStorage.getItem('ps-country'); } catch(e) {}
      var langSel = document.getElementById('modal-lang');
      var countrySel = document.getElementById('modal-country');
      var currSel = document.getElementById('modal-currency');
      if (savedCountry) {
        if (countrySel) countrySel.value = savedCountry;
        var cmap = COUNTRY_MAP[savedCountry];
        if (cmap) {
          if (currSel) currSel.value = cmap.currency;
          if (langSel) langSel.value = cmap.lang;
        }
        applyCountryToPage(savedCountry);
      } else if (saved) {
        if (langSel) langSel.value = saved;
        if (countrySel) countrySel.value = saved === 'en' ? 'us' : 'kr';
        if (currSel) currSel.value = saved === 'en' ? 'usd' : 'krw';
      }
    } catch (e) {}
  });

  window.onModalCountryChange = function (countryVal) {
    var map = COUNTRY_MAP[countryVal];
    if (!map) return;
    var currSel = document.getElementById('modal-currency');
    if (currSel) currSel.value = map.currency;
    var langSel = document.getElementById('modal-lang');
    if (langSel) langSel.value = map.lang;
  };

  window.openLangModal = function () {
    var overlay = document.getElementById('lang-modal-overlay');
    if (!overlay) return;
    try {
      var savedLang = getSavedLang();
      var savedCountry;
      try { savedCountry = localStorage.getItem('ps-country'); } catch(e) {}
      var langSel = document.getElementById('modal-lang');
      var countrySel = document.getElementById('modal-country');
      var currSel = document.getElementById('modal-currency');
      if (savedLang && langSel) langSel.value = savedLang;
      if (savedCountry) {
        if (countrySel) countrySel.value = savedCountry;
        var cmap = COUNTRY_MAP[savedCountry];
        if (cmap && currSel) currSel.value = cmap.currency;
      } else if (savedLang) {
        if (countrySel) countrySel.value = savedLang === 'en' ? 'us' : 'kr';
        if (currSel) currSel.value = savedLang === 'en' ? 'usd' : 'krw';
      }
    } catch (e) {}
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  window.closeLangModal = function () {
    var overlay = document.getElementById('lang-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  };

  window.saveLangModal = function () {
    var sel = document.getElementById('modal-lang');
    var lang = sel ? sel.value : 'ko';
    var countrySel = document.getElementById('modal-country');
    var country = countrySel ? countrySel.value : 'kr';
    try { localStorage.setItem('ps-country', country); } catch(e) {}
    applyCountryToPage(country, lang);
    if (typeof window.setCountry === 'function') window.setCountry(country);
    if (typeof window.setLang === 'function') window.setLang(lang);
    closeLangModal();
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLangModal();
  });
})();

/* Reception localized key inspector — content area only */
(function () {
  var STORAGE_KEY = 'ps-reception-i18n-mode';
  var CONTROL_ATTR = 'data-i18n-auto-control';
  var PLACEHOLDER_CAPTION_ATTR = 'data-i18n-placeholder-caption';
  var MODES = ['text', 'key', 'both'];
  var CONTENT_SCOPE_SELECTOR = 'main, .page-wrapper--hero, .pill-tabs-wrap, #addr-modal-overlay';

  function isInspectorPage() {
    var path = window.location.pathname;
    return !/\/admin\//.test(path) && (/\/reception\//.test(path) || /\/my-service\//.test(path) || /\/(index|store|contact)\.html$/.test(path) || path === '/');
  }

  function readMode() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'key' || stored === 'both' ? stored : 'text';
    } catch(e) {
      return 'text';
    }
  }

  function saveMode(mode) {
    try { localStorage.setItem(STORAGE_KEY, mode); } catch(e) {}
  }

  function toSnake(value) {
    return String(value || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function toKeyPart(value) {
    return toSnake(value).replace(/_+/g, '-');
  }

  function joinKeyParts() {
    return Array.prototype.slice.call(arguments)
      .map(toKeyPart)
      .filter(Boolean)
      .join('-');
  }

  function withPsPrefix(key) {
    var normalized = displayKey(key);
    return normalized.indexOf('ps-') === 0 ? normalized : 'ps-' + normalized;
  }

  function hashText(value) {
    var hash = 5381;
    for (var i = 0; i < value.length; i += 1) {
      hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
  }

  function isDynamicRouteSegment(segment) {
    var normalized = decodeURIComponent(segment || '').trim();
    if (normalized === 'new' || normalized === 'edit' || normalized === 'done') return false;
    if (/^\d+$/.test(normalized)) return true;
    if (/^[a-z]*\d{4,}[a-z0-9-]*$/i.test(normalized)) return true;
    if (/^[A-Z]{1,6}\d+[A-Z0-9-]*$/.test(normalized)) return true;
    if (normalized.length > 16 && /^[a-z0-9-]+$/i.test(normalized)) return true;
    return false;
  }

  function routeNamespace() {
    var path = window.location.pathname;
    if (/\/index\.html$/.test(path) || path === '/') return 'ps';
    var parts = window.location.pathname.split('/').filter(Boolean);
    var receptionIndex = parts.indexOf('reception');
    var routeParts = receptionIndex >= 0 ? parts.slice(receptionIndex) : parts;
    routeParts = routeParts.map(function(segment) {
      var clean = segment.replace(/\.html$/i, '');
      return isDynamicRouteSegment(clean) ? 'detail' : toKeyPart(clean);
    }).filter(Boolean);
    return routeParts.join('-') || 'reception';
  }

  var TEXT_TOKEN_MAP = {
    조회: 'search',
    검색: 'search',
    초기화: 'reset',
    저장: 'save',
    취소: 'cancel',
    삭제: 'delete',
    등록: 'create',
    수정: 'edit',
    추가: 'add',
    다운로드: 'download',
    업로드: 'upload',
    다음: 'next',
    이전: 'previous',
    목록: 'list',
    확인: 'confirm',
    닫기: 'close',
    전송: 'send',
    적용: 'apply',
    전체: 'all',
    뒤로가기: 'go_back',
    '수리 서비스 접수': 'repair_service_request',
    '기본 정보': 'basic_info',
    '서비스 유형': 'service_type',
    '서비스 상세': 'service_details',
    '사진·렌즈': 'photo_lens',
    '배송 정보': 'shipping_info',
    '안내 확인': 'confirmation',
    '제품 수리': 'repair',
    '토탈 케어': 'total_care',
    '상담 & 기타': 'consulting',
    '자택 배송': 'home_delivery',
    '스토어 방문': 'store_visit',
    '무료 택배 픽업': 'free_pickup',
    '직접 발송': 'self_ship'
  };

  var KOREAN_TOKEN_MAP = [
    ['프로덕트 서비스 보증 기간', 'product-service-warranty-period'],
    ['프로덕트 서비스 보증', 'product-service-warranty'],
    ['품질 보증 기간', 'quality-warranty-period'],
    ['품질보증기간', 'quality-warranty-period'],
    ['서비스 진단 결과', 'service-diagnosis-result'],
    ['프로덕트 서비스', 'product-service'],
    ['자주 묻는 질문', 'faq'],
    ['수리 서비스 내역', 'repair-service-history'],
    ['수리 서비스 접수', 'repair-service-request'],
    ['가까운 스토어', 'nearest-store'],
    ['하우스 노웨어', 'haus-nowhere'],
    ['주문 추적하기', 'track-order'],
    ['시리얼 넘버', 'serial-number'],
    ['교체 전 일련번호', 'previous-serial-number'],
    ['교체 후 일련번호', 'new-serial-number'],
    ['택배 픽업 예정일', 'courier-pickup-date'],
    ['출고 희망일', 'preferred-ship-out-date'],
    ['출고 예정일', 'estimated-ship-out-date'],
    ['예상 수리 비용', 'estimated-repair-cost'],
    ['예상 수리 방식', 'estimated-repair-method'],
    ['접수 정보 수정', 'edit-request'],
    ['새 수리 접수하기', 'submit-new-repair-request'],
    ['이전 정보로 다시 접수하기', 'restart-with-previous-info'],
    ['내역으로 돌아가기', 'back-to-list'],
    ['제품 교체', 'product-replacement'],
    ['제품 정보', 'product-information'],
    ['제품명', 'product-name'],
    ['제품 관리', 'product-care'],
    ['제품 보관', 'product-storage'],
    ['제품 착용', 'product-wearing'],
    ['제품 파손', 'product-damage'],
    ['제품 결함', 'product-defect'],
    ['제품 이동 중', 'product-in-transit'],
    ['제품 발송', 'product-shipping'],
    ['제품 본체', 'product-body'],
    ['제품 상태', 'product-condition'],
    ['제품 전체', 'whole-product'],
    ['제품', 'product'],
    ['렌즈 유형', 'lens-type'],
    ['렌즈 분리', 'lens-removal'],
    ['렌즈 삽입', 'lens-insertion'],
    ['렌즈 기능', 'lens-function'],
    ['렌즈 스크래치', 'lens-scratch'],
    ['렌즈', 'lens'],
    ['별도로 제작한', 'custom-made'],
    ['별도 제작', 'custom-made'],
    ['코받침', 'nose-pad'],
    ['나사', 'screw'],
    ['부속품', 'accessory'],
    ['부품', 'part'],
    ['프론트', 'front'],
    ['브릿지', 'bridge'],
    ['템플', 'temple'],
    ['장식', 'decoration'],
    ['경첩', 'hinge'],
    ['피팅', 'fitting'],
    ['폴리싱', 'polishing'],
    ['클리닝', 'cleaning'],
    ['세척', 'cleaning'],
    ['닦', 'cleaning'],
    ['토탈 케어', 'total-care'],
    ['기본 피팅', 'basic-fitting'],
    ['스토어 방문', 'store-visit'],
    ['스토어 찾기', 'find-store'],
    ['스토어', 'store'],
    ['매장 픽업', 'store-pickup'],
    ['픽업 매장', 'pickup-store'],
    ['픽업 일정', 'pickup-schedule'],
    ['픽업 주소', 'pickup-address'],
    ['자택 배송', 'home-delivery'],
    ['자택 픽업', 'home-pickup'],
    ['배송 정보', 'delivery-information'],
    ['배송 진행', 'delivery-progress'],
    ['배송 완료', 'delivered'],
    ['배송 시작', 'shipped'],
    ['배송 기간', 'shipping-period'],
    ['발송 방법', 'shipping-method'],
    ['직접 발송', 'self-ship'],
    ['운송장 번호', 'tracking-number'],
    ['수령 주소', 'return-address'],
    ['수령 방법', 'return-method'],
    ['수령 매장', 'return-store'],
    ['수령지', 'return-destination'],
    ['고객 정보', 'customer-information'],
    ['고객 첨부 이미지', 'customer-image'],
    ['구매 증빙 이미지', 'purchase-proof-image'],
    ['구매 증빙', 'purchase-proof'],
    ['구매한 제품', 'purchased-products'],
    ['구매일자', 'purchase-date'],
    ['구매 내역', 'purchase-history'],
    ['결제 수단', 'payment-method'],
    ['결제 대기 중', 'payment-required'],
    ['결제 완료', 'payment-complete'],
    ['결제 일시', 'payment-date'],
    ['결제하기', 'pay-now'],
    ['영수증 보기', 'view-receipt'],
    ['영수증', 'receipt'],
    ['무료 피팅', 'free-fitting'],
    ['무료 택배 픽업', 'free-courier-pickup'],
    ['서비스 요청 사항', 'service-request-details'],
    ['서비스 유형', 'service-type'],
    ['서비스 접수', 'service-request'],
    ['서비스 완료', 'service-complete'],
    ['서비스 종료', 'service-complete'],
    ['서비스 결과', 'service-result'],
    ['서비스 판정 완료', 'diagnosis-complete'],
    ['상담원 연결', 'contact-agent'],
    ['문의 유형', 'inquiry-type'],
    ['문제 부위', 'problem-part'],
    ['문제 현상', 'problem-symptom'],
    ['문제 증상', 'problem-symptom'],
    ['요청 사항', 'request-details'],
    ['요청 내용', 'request-details'],
    ['수리 진행상황', 'repair-progress'],
    ['수리 여부', 'repairability'],
    ['수리 비용', 'repair-cost'],
    ['수리 내용', 'repair-details'],
    ['수리 완료', 'repair-complete'],
    ['수리 진행 중', 'repair-in-progress'],
    ['수리 접수', 'repair-request'],
    ['접수 완료', 'submitted'],
    ['접수 취소', 'cancel-request'],
    ['접수', 'submitted'],
    ['이동', 'transit'],
    ['판정', 'diagnosis'],
    ['수리', 'repair'],
    ['완료', 'complete'],
    ['상태', 'status'],
    ['현상', 'issue'],
    ['이메일', 'email'],
    ['연락처', 'phone'],
    ['전화번호', 'phone'],
    ['주소 찾기', 'find-address'],
    ['주소', 'address'],
    ['우편번호', 'zip-code'],
    ['상세주소', 'address-detail'],
    ['이름', 'first-name'],
    ['성', 'last-name'],
    ['위시리스트', 'wishlist'],
    ['프로필', 'profile'],
    ['로그아웃', 'logout'],
    ['계정', 'account'],
    ['비밀번호', 'password'],
    ['회원 정보', 'member-info'],
    ['회원 탈퇴', 'delete-account'],
    ['정품 여부', 'authenticity'],
    ['단종된 제품', 'discontinued-product'],
    ['반품 및 교환', 'return-exchange'],
    ['반품', 'return'],
    ['교환', 'exchange'],
    ['기업 문의', 'business-inquiry'],
    ['해외', 'international'],
    ['안경원', 'optical-store'],
    ['얼굴', 'face'],
    ['불편', 'discomfort'],
    ['티켓 번호', 'ticket-number'],
    ['일련번호', 'serial-number']
  ].sort(function(a, b) { return b[0].length - a[0].length; });

  function semanticToken(text) {
    var source = String(text || '')
      .replace(/[+›↗←*□☑☐「」[\]()]/g, ' ')
      .replace(/[·/.,:;!?]/g, ' ');
    var tokens = [];
    KOREAN_TOKEN_MAP.forEach(function(pair) {
      if (tokens.length >= 10) return;
      if (source.indexOf(pair[0]) >= 0 && tokens.indexOf(pair[1]) < 0) tokens.push(pair[1]);
    });
    return tokens.join('-');
  }

  function displayKey(key) {
    return String(key || '').replace(/::/g, '-').replace(/[._]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  }

  function lokaliseKey(key) {
    return displayKey(key);
  }

  function keyTitle(key) {
    var devKey = displayKey(key);
    var lokalise = lokaliseKey(key);
    return devKey === lokalise ? devKey : devKey + '\nLokalise: ' + lokalise;
  }

  function cleanedText(element) {
    var clone = element.cloneNode(true);
    clone.querySelectorAll('[' + PLACEHOLDER_CAPTION_ATTR + '], [' + CONTROL_ATTR + '], [data-i18n-managed]').forEach(function(node) {
      node.remove();
    });
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function isDataLikeText(text) {
    if (!text) return true;
    if (/^[\d\s.,:/~()_#-]+$/.test(text)) return true;
    if (/^\d{4}[.-]\d{1,2}[.-]\d{1,2}/.test(text)) return true;
    if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(text)) return true;
    if (/^\+?\d[\d\s().-]{6,}$/.test(text)) return true;
    if (/^[A-Z0-9]{8,}(-[A-Z0-9]{4,})?$/i.test(text)) return true;
    if (/^₩?[\d,]+원?$/.test(text)) return true;
    if (/^\d+(\.\d+)?\s?(m|km)$/.test(text)) return true;
    if (/^(CJ|FedEx|DHL|UPS|USPS)\s*[·-]?\s*\d{6,}$/.test(text)) return true;
    if (/^(PS|SN|S\/N)\s*[-:]?\s*[A-Z0-9-]{6,}$/i.test(text)) return true;
    if (/^[A-Z0-9]{6,}[-]?[A-Z0-9]{4,}$/.test(text)) return true;
    if (/^[A-Z][A-Z0-9\s-]{1,32}\d{1,3}(\s?\([A-Z0-9]+\))?$/.test(text)) return true;
    if (/^(서울|경기|경기도|인천|부산|대구|광주|대전|울산|세종|제주|강원|충북|충남|전북|전남|경북|경남).*(시|군|구|동|로|길|층|호)/.test(text)) return true;
    if (/(United States|Singapore|Los Angeles|New York|Costa Mesa|Santa Clara|Broadway|Wooster|Ave\.?|Street|Plaza)/i.test(text)) return true;
    if (/^(홍길동|한혜지|이준혁)$/.test(text)) return true;
    if (/^(젠틀몬스터|디렉토|아이옵틱|비전옵티컬|아이마켓|롯데|신세계|현대|갤러리아|인천공항|신라)/.test(text)) return true;
    if (/^(오픈|영업 중|영업 종료|배송 완료|결제 완료|수리 진행 중|취소)$/.test(text)) return true;
    return false;
  }

  var DATA_ANCESTOR_SELECTOR = [
    '#locked-product-card',
    '.product-card',
    '#pickup-addr-list',
    '#addr-list-view',
    '#drop-store-dropdown',
    '#recv-store-dropdown',
    '#drop-store-list',
    '#recv-store-list',
    '#drop-store-selected',
    '#recv-store-selected',
    '#sp-store-list',
    '#sp-tooltip',
    '.store-list-item',
    '[data-product-index]',
    '[data-addr-index]',
    '[data-pickup-addr-index]',
    '[data-drop-store-index]',
    '[data-recv-store-index]'
  ].join(',');

  function isWarrantyLabelText(text) {
    return /^(품질 보증 기간|프로덕트 서비스 보증 기간|부품\s?보유\s?기간)\s*:?\s*$/.test(text || '');
  }

  function isStaticStatusElement(element) {
    var id = element.id || '';
    return element.classList && element.classList.contains('ticket-status') && !/^val-/.test(id);
  }

  function isDataElement(element) {
    var id = element.id || '';
    if (id === 'val-urgent-fee') return false;
    if (id === 'val-receipt') return false;
    if (isStaticStatusElement(element)) return false;
    if (isWarrantyLabelText(cleanedText(element))) return false;
    if (element.classList && element.classList.contains('summary-val')) return true;
    if (element.closest(DATA_ANCESTOR_SELECTOR)) return true;
    if (/^(val-|lpc-|dss-|rss-|sp-tt-|cal-|dispatch-selected-label$|selected-product-(name|meta)$)/.test(id)) return true;
    if (/(^|[-_])(name|addr|address|dist|distance|status|serial|date|price|cost|amount|order|ticket|tracking|number|no|id|meta|value)([-_]|$)/i.test(id)) {
      if (!/^(txt|lbl|key|title|desc|section|btn)-/i.test(id)) return true;
    }
    return false;
  }

  function isStaticInlineCandidate(element) {
    var tag = element.tagName.toLowerCase();
    if (element.hasAttribute('data-ko') || element.hasAttribute('data-en')) return true;
    if (tag === 'text') return true;
    if (tag !== 'p' && tag !== 'span' && tag !== 'strong') return true;
    var id = element.id || '';
    var cls = element.className || '';
    if (isWarrantyLabelText(cleanedText(element))) return true;
    if (isStaticStatusElement(element)) return true;
    if (/^(txt|lbl|key|title|desc|section|pg|btn|card|step|ai|lens|pkg|consult|acc|photo|schedule|dispatch|ie-pairing|terms|notice|val-urgent-fee|service-request)-/i.test(id)) return true;
    if (/(hero-title|hero-sub-link|page-eyebrow|page-title|page-desc|section-label|form-label|check-item-title|check-item-desc|option-card-title|option-card-desc|service-notice|notice|helper|summary|tag|badge|required-mark|step-num|step-label|guide-card-num|guide-card-title|guide-card-copy|terms-title|terms-section-title|terms-copy|agreement-check|selected-product-label|status-node-label|detail-key)/.test(cls)) return true;
    if (element.closest('.notice-box, .service-notice, .terms-card, .terms-panel, .terms-section, .agreement-list, .shipping-schedule, .summary-card, .info-box, .guide-panel, .guide-grid, #sp-filter-wrap')) return true;
    return false;
  }

  function elementToken(element, text) {
    var explicit = element.getAttribute('data-i18n-key');
    if (explicit) return toKeyPart(explicit);

    if (element.id && !/^g?pin-|^r?pin-|^fpin-|^rfpin-/.test(element.id)) {
      return toKeyPart(element.id
        .replace(/^(txt|lbl|btn|pg|title|desc|section|card)-/i, '')
        .replace(/-(title|text|label|desc|copy)$/i, ''));
    }

    var normalized = text.replace(/\s+/g, ' ').trim();
    if (TEXT_TOKEN_MAP[normalized]) return toKeyPart(TEXT_TOKEN_MAP[normalized]);
    var ascii = toKeyPart(normalized);
    if (ascii && /[a-z]/.test(ascii) && ascii.length <= 42) return ascii;
    return semanticToken(normalized) || 'content';
  }

  function keyKind(element) {
    var tag = element.tagName.toLowerCase();
    if (tag === 'text') return 'svg-text';
    if (element.closest('th')) return 'column';
    if (tag === 'strong') return 'section';
    if (tag === 'summary') return 'section';
    if (tag === 'button' || element.classList.contains('btn')) return 'button';
    if (tag === 'a') return 'link';
    if (tag === 'label') return 'label';
    if (tag === 'legend') return 'legend';
    if (tag === 'caption') return 'caption';
    if (tag === 'h1') return 'title';
    if (/^h[2-6]$/.test(tag)) return 'section';
    if (tag === 'p') return 'copy';
    if (tag === 'li') return 'item';
    if (element.getAttribute('role') === 'tab') return 'tab';
    return tag;
  }

  function autoKey(element, text) {
    return withPsPrefix(joinKeyParts(routeNamespace(), keyKind(element), elementToken(element, text)));
  }

  function autoKind(element) {
    var tag = element.tagName.toLowerCase();
    if (tag === 'text') return 'svg';
    if (tag === 'button' || tag === 'a' || tag === 'th' || element.classList.contains('btn') || element.getAttribute('role') === 'tab') return 'tooltip';
    return 'badge';
  }

  function hasBlockChildren(element) {
    return Array.prototype.some.call(element.children, function(child) {
      return /^(DIV|SECTION|ARTICLE|MAIN|HEADER|FOOTER|NAV|UL|OL|TABLE|FORM|FIELDSET|ASIDE)$/.test(child.tagName);
    });
  }

  function sourceText(element) {
    if (element.tagName.toLowerCase() === 'text' && element.dataset.i18nOriginalText) {
      return element.dataset.i18nOriginalText;
    }
    return cleanedText(element);
  }

  function isAutoTarget(element) {
    if (!element || !element.closest) return false;
    if (!element.closest(CONTENT_SCOPE_SELECTOR)) return false;
    var tag = element.tagName.toLowerCase();
    if (element.closest('header, footer, .gnb, .site-footer, #lang-modal-overlay, .ps-i18n-toggle, [data-i18n-skip], [data-i18n-managed], input, textarea, select, script, style')) return false;
    if (tag !== 'text' && element.closest('svg')) return false;
    if (element.closest('tbody td')) return false;
    if (element.hasAttribute(CONTROL_ATTR)) return false;
    if (isDataElement(element)) return false;
    if (!isStaticInlineCandidate(element)) return false;
    if (hasBlockChildren(element)) return false;
    if (element.children.length > 5 && !['BUTTON', 'A', 'LABEL'].includes(element.tagName)) return false;
    var text = sourceText(element);
    if (!isStaticStatusElement(element) && isDataLikeText(text)) return false;
    return text.length > 0 && text.length <= 180;
  }

  function candidateElements() {
    return Array.prototype.slice.call(document.querySelectorAll(
      'main h1, main h2, main h3, main h4, main h5, main h6, main p, main span, main strong, main label, main button, main a, main th, main legend, main caption, main li, main [role="tab"], .page-wrapper--hero p, .page-wrapper--hero a, .pill-tabs-wrap a, #addr-modal-overlay h1, #addr-modal-overlay h2, #addr-modal-overlay h3, #addr-modal-overlay h4, #addr-modal-overlay h5, #addr-modal-overlay h6, #addr-modal-overlay p, #addr-modal-overlay span, #addr-modal-overlay strong, #addr-modal-overlay label, #addr-modal-overlay button, #addr-modal-overlay a'
        + ', main summary, main svg text'
    ));
  }

  function syncSvgTextElement(element, mode, key, text) {
    if (element.tagName.toLowerCase() !== 'text') return;
    if (!element.dataset.i18nOriginalText) element.dataset.i18nOriginalText = text;
    if (mode === 'text') {
      element.textContent = element.dataset.i18nOriginalText || text;
      element.removeAttribute('data-i18n-svg-key-active');
      return;
    }
    element.textContent = displayKey(key);
    element.setAttribute('data-i18n-svg-key-active', 'true');
  }

  function restoreSvgTextElement(element) {
    if (element.tagName.toLowerCase() !== 'text') return;
    if (element.dataset.i18nOriginalText) {
      element.textContent = element.dataset.i18nOriginalText;
      delete element.dataset.i18nOriginalText;
    }
    element.removeAttribute('data-i18n-svg-key-active');
  }

  function removePlaceholderCaptions(root) {
    (root || document).querySelectorAll('[' + PLACEHOLDER_CAPTION_ATTR + ']').forEach(function(node) {
      node.remove();
    });
  }

  function restorePlaceholder(element) {
    var original = element.dataset.i18nOriginalPlaceholder;
    if (original !== undefined) {
      element.placeholder = original;
      delete element.dataset.i18nOriginalPlaceholder;
    }
    element.removeAttribute('data-i18n-placeholder-key');
  }

  function applyInspector(mode) {
    document.body.dataset.i18nMode = mode;

    candidateElements().forEach(function(element) {
      if (!isAutoTarget(element)) return;
      var text = sourceText(element);
      var key = autoKey(element, text);
      element.dataset.i18nAutoKey = key;
      element.dataset.i18nAutoKind = autoKind(element);
      if (!element.dataset.i18nOriginalTitle && element.title) element.dataset.i18nOriginalTitle = element.title;
      element.title = mode === 'text' ? (element.dataset.i18nOriginalTitle || '') : keyTitle(key);
      syncSvgTextElement(element, mode, key, text);
    });

    document.querySelectorAll('[data-i18n-auto-key]').forEach(function(element) {
      if (!isAutoTarget(element)) {
        delete element.dataset.i18nAutoKey;
        delete element.dataset.i18nAutoKind;
        if (element.dataset.i18nOriginalTitle !== undefined) {
          element.title = element.dataset.i18nOriginalTitle;
          delete element.dataset.i18nOriginalTitle;
        } else {
          element.removeAttribute('title');
        }
        restoreSvgTextElement(element);
      }
    });

    if (mode !== 'both') removePlaceholderCaptions();

    var placeholders = Array.prototype.slice.call(document.querySelectorAll('main input[placeholder], main textarea[placeholder]'));
    placeholders.forEach(function(element) {
      if (element.closest('[data-i18n-skip], [data-i18n-managed], #lang-modal-overlay')) return;
      var original = element.dataset.i18nOriginalPlaceholder || element.placeholder;
      if (!element.dataset.i18nOriginalPlaceholder) element.dataset.i18nOriginalPlaceholder = original;
      var key = withPsPrefix(joinKeyParts(routeNamespace(), 'placeholder', elementToken(element, original)));
      element.dataset.i18nPlaceholderKey = key;
      element.title = mode === 'text' ? '' : keyTitle(key);
      element.placeholder = mode === 'key' ? displayKey(key) : original;

      if (mode === 'both') {
        var existing = element.nextElementSibling;
        var text = displayKey(key);
        if (existing && existing.hasAttribute(PLACEHOLDER_CAPTION_ATTR)) {
          if (existing.textContent !== text) existing.textContent = text;
        } else {
          var caption = document.createElement('p');
          caption.setAttribute(PLACEHOLDER_CAPTION_ATTR, 'true');
          caption.setAttribute(CONTROL_ATTR, 'true');
          caption.className = 'ps-i18n-placeholder-caption';
          caption.textContent = text;
          element.insertAdjacentElement('afterend', caption);
        }
      }
    });

    if (mode === 'text') {
      placeholders.forEach(restorePlaceholder);
      removePlaceholderCaptions();
    }
  }

  function setMode(mode) {
    if (MODES.indexOf(mode) < 0) mode = 'text';
    saveMode(mode);
    applyInspector(mode);
    var root = document.querySelector('.ps-i18n-toggle');
    if (!root) return;
    root.querySelectorAll('[data-i18n-mode-option]').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-i18n-mode-option') === mode);
    });
  }

  function createToggle() {
    if (document.querySelector('.ps-i18n-toggle')) return;
    var wrap = document.createElement('div');
    wrap.className = 'ps-i18n-toggle';
    wrap.setAttribute(CONTROL_ATTR, 'true');
    wrap.setAttribute('data-i18n-skip', 'true');
    wrap.title = '로컬라이즈 점검 모드';
    wrap.innerHTML =
      '<button type="button" data-i18n-mode-option="text">문구</button>' +
      '<button type="button" data-i18n-mode-option="key">Key</button>' +
      '<button type="button" data-i18n-mode-option="both">둘 다</button>';
    wrap.querySelectorAll('button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        setMode(btn.getAttribute('data-i18n-mode-option'));
      });
    });
    document.body.appendChild(wrap);
  }

  if (!isInspectorPage()) return;

  document.addEventListener('DOMContentLoaded', function() {
    createToggle();
    setMode(readMode());

    var scanTimer = null;
    var observer = new MutationObserver(function() {
      if (scanTimer) clearTimeout(scanTimer);
      scanTimer = setTimeout(function() { applyInspector(readMode()); }, 60);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
