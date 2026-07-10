const route = document.body.dataset.route || 'products';
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const resetButton = document.getElementById('reset-button');
const screenStatus = document.getElementById('screen-status');
const productSelectionList = document.querySelector('.product-selection-list');
const manualEntryPrompt = document.querySelector('.manual-entry-prompt');
const manualEntryPanel = document.querySelector('.manual-entry-panel');
const manualEntryOpenButton = document.getElementById('manual-entry-open');
const manualEntryCloseButton = document.getElementById('manual-entry-close');
const manualProofUpload = document.getElementById('manual-proof-upload');
const manualProofUploadButton = document.getElementById('manual-proof-upload-button');
const manualProofUploadList = document.getElementById('manual-proof-upload-list');
const manualProductNameInput = document.getElementById('manual-product-name');
const manualPurchaseStoreInput = document.getElementById('manual-purchase-store');
const manualSerialNumberInput = document.getElementById('manual-serial-number');
const manualDateInput = document.querySelector('.manual-date-input');
const termsProductImage = document.getElementById('terms-product-image');
const termsProductName = document.getElementById('terms-product-name');
const termsProductTag = document.getElementById('terms-product-tag');
const termsProductPurchase = document.getElementById('terms-product-purchase');
const termsProductStore = document.getElementById('terms-product-store');
const termsProductWarranty = document.getElementById('terms-product-warranty');
const termsProductWarrantySecondary = document.getElementById('terms-product-warranty-secondary');
const termsProductSerial = document.getElementById('terms-product-serial');
const serviceProductImage = document.getElementById('service-product-image');
const serviceProductName = document.getElementById('service-product-name');
const serviceProductTag = document.getElementById('service-product-tag');
const serviceProductPurchase = document.getElementById('service-product-purchase');
const serviceProductStore = document.getElementById('service-product-store');
const serviceProductWarranty = document.getElementById('service-product-warranty');
const serviceProductWarrantySecondary = document.getElementById('service-product-warranty-secondary');
const serviceProductSerial = document.getElementById('service-product-serial');
const totalCareDetailPanel = document.getElementById('total-care-detail-panel');
const repairDetailPanel = document.getElementById('repair-detail-panel');
const serviceRequestTextarea = document.getElementById('service-request-textarea');
const repairRequestTextarea = document.getElementById('repair-request-textarea');
const consultingRequestTextarea = document.getElementById('consulting-request-textarea');
const expiredWarrantyConsent = document.getElementById('expired-warranty-consent');
const expiryConsentCheck = document.getElementById('expiry-consent-check');
const repairGuidanceEmpty = document.getElementById('repair-guidance-empty');
const repairGuideDamageStandard = document.getElementById('repair-guide-damage-standard');
const repairGuideTotalCare = document.getElementById('repair-guide-total-care');
const repairGuideRestoration = document.getElementById('repair-guide-restoration');
const repairGuideExpired = document.getElementById('repair-guide-expired');
const repairGuideExpiredTotalCare = document.getElementById('repair-guide-expired-total-care');
const repairGuideUnavailable = document.getElementById('repair-guide-unavailable');
const restorationConsentCheck = document.getElementById('restoration-consent-check');
const repairExpiredConsentCheck = document.getElementById('repair-expired-consent-check');
const consultingDetailPanel = document.getElementById('consulting-detail-panel');
const consultingPartGroup = document.getElementById('consulting-part-group');
const consultingDefectExpired = document.getElementById('consulting-defect-expired');
const consultingAccessoryGroup = document.getElementById('consulting-accessory-group');
const consultingAgentPanel = document.getElementById('consulting-agent-panel');
const consultingRequestField = document.querySelector('.consulting-request-field');
const consultingImageUpload = document.getElementById('consulting-image-upload');
const consultingImageUploadButton = document.getElementById('consulting-image-upload-button');
const consultingImageUploadList = document.getElementById('consulting-image-upload-list');
const consultingLiveChatOpen = document.getElementById('consulting-live-chat-open');
const consultingLiveChat = document.getElementById('consulting-live-chat');
const conditionPhotoUpload = document.getElementById('condition-photo-upload');
const conditionPhotoUploadButton = document.getElementById('condition-photo-upload-button');
const conditionPhotoUploadList = document.getElementById('condition-photo-upload-list');
const shippingTitle = document.getElementById('shipping-title');
const shippingCollectionSection = document.getElementById('shipping-collection-section');
const shippingCollectionAlert = document.getElementById('shipping-collection-alert');
const shippingAddressSection = document.getElementById('shipping-address-section');
const shippingStoreSection = document.getElementById('shipping-store-section');
const shippingStoreIntro = document.getElementById('shipping-store-intro');
const shippingStoreCityButton = document.getElementById('shipping-store-city-button');
const shippingStoreCityOptions = document.getElementById('shipping-store-city-options');
const shippingStoreCityChange = document.getElementById('shipping-store-city-change');
const shippingStoreList = document.getElementById('shipping-store-list');
const shippingStoreSelectionLabel = document.getElementById('shipping-store-selection-label');
const shippingStoreResults = document.getElementById('shipping-store-results');
const shippingPartnerResults = document.getElementById('shipping-partner-results');
const returnAddressSection = document.getElementById('return-address-section');
const returnStoreSection = document.getElementById('return-store-section');
const returnStoreIntro = document.getElementById('return-store-intro');
const returnStoreCityButton = document.getElementById('return-store-city-button');
const returnStoreCityOptions = document.getElementById('return-store-city-options');
const returnStoreCityChange = document.getElementById('return-store-city-change');
const returnStoreList = document.getElementById('return-store-list');
const shippingPackageConsent = document.getElementById('shipping-package-consent');
const shippingPackageConsentCheck = document.getElementById('shipping-package-consent-check');
const customLensPickupNotice = document.getElementById('custom-lens-pickup-notice');
const customLensConsentCheck = document.getElementById('custom-lens-consent-check');
const customLensStoreGuide = document.getElementById('custom-lens-store-guide');
const totalCareScheduleSection = document.getElementById('total-care-schedule-section');
const shippingDatePanel = document.getElementById('shipping-date-panel');
const shippingDateList = document.getElementById('shipping-date-list');
const termsTitle = document.getElementById('terms-title');
const termsBody = document.getElementById('terms-body');
const agreementList = document.getElementById('agreement-list');
const agreementError = document.getElementById('agreement-error');
const reviewProductName = document.getElementById('review-product-name');
const reviewSummaryList = document.getElementById('review-summary-list');
const reviewProcessSection = document.getElementById('review-process-section');
const reviewProcessList = document.getElementById('review-process-list');
const reviewMainNotice = document.getElementById('review-main-notice');
const reviewPriceRow = document.getElementById('review-price-row');
const reviewPriceEstimate = document.getElementById('review-price-estimate');
const reviewShippingNotice = document.getElementById('review-shipping-notice');
const reviewPhotoSection = document.getElementById('review-photo-section');
const reviewPhotoGrid = document.getElementById('review-photo-grid');

const routeMap = {
  products: {
    prev: './start.html',
    next: './request-terms.html',
    status: 'PRODUCT CONFIRMED'
  },
  terms: {
    prev: './request.html',
    next: './request-service.html',
    status: 'TERMS AGREED'
  },
  service: {
    prev: './request-terms.html',
    next: null,
    status: 'SERVICE SELECTED'
  },
  'total-care': {
    prev: './request-service.html',
    next: './request-shipping.html',
    status: 'TOTAL CARE DETAIL'
  },
  repair: {
    prev: './request-service.html',
    next: './request-shipping.html',
    status: 'REPAIR DETAIL'
  },
  consulting: {
    prev: './request-service.html',
    next: './request-shipping.html',
    status: 'CONSULTING DETAIL'
  },
  condition: {
    prev: null,
    next: './request-shipping.html',
    status: 'PRODUCT CONDITION'
  },
  detail: {
    prev: './request-service.html',
    next: './request-shipping.html',
    status: 'DETAIL COMPLETED'
  },
  shipping: {
    prev: null,
    next: './request-return.html',
    status: 'SHIPPING CONFIRMED'
  },
  return: {
    prev: './request-shipping.html',
    next: './request-review.html',
    status: 'RETURN METHOD CONFIRMED'
  },
  review: {
    prev: './request-return.html',
    next: './request-complete.html',
    status: 'READY TO SUBMIT'
  }
};

const serviceDetailRoutes = {
  'total-care': './request-total-care.html',
  repair: './request-repair.html',
  consulting: './request-consulting.html'
};

let manualProofFiles = [];
let consultingImageFiles = [];
let conditionPhotoFiles = [];

const manualSerialPlaceholders = {
  'Smart Breezeby 01': 'ex) R4AC9001K85'
};

const fallbackProduct = {
  image: './assets/product-gelati.png',
  name: 'Gelati 01',
  purchaseText: 'Purchased on June 12, 2024',
  storeText: 'at Haus Dosan',
  warrantyText: 'Limited warranty, expires June 30, 2026',
  warrantyTexts: ['Limited warranty, expires June 30, 2026', 'Product service warranty, expires June 30, 2027'],
  serialNumber: 'GE240612-00003821',
  tag: '',
  line: 'organic'
};

const termsContent = {
  organic: {
    title: '수리 신청 전, 꼭 확인해 주세요.',
    sections: [
      {
        title: '제품을 보내실 때',
        copy: '케이스·보증 카드는 분실 위험이 있으니 동봉하지 말아 주세요.\n동봉된 경우, 분실 방지를 위해 함께 반송될 수 있습니다.\n별도 제작 렌즈는 빼고 보내주세요. 수리 중 손상될 수 있으며, 동봉된 렌즈의 파손에 대해서는 보상이 제공되지 않습니다.'
      },
      {
        title: '제품 보관 및 폐기 안내',
        copy: '프로덕트 서비스팀은 제품 판정일로부터 30일간 보관합니다.\n30일 이내 결제 확인 또는 회신이 없으면, 제품은 반송되거나 관련 법령에 따라 폐기될 수 있습니다.\n폐기 후에는 보상·반환이 불가합니다.'
      }
    ],
    fullTerms: '제1조 [목적]\n본 약관은 젠틀몬스터 제품의 수리 서비스 이용과 관련하여 고객과 젠틀몬스터 간의 권리, 의무 및 기타 필요한 사항을 규정함을 목적으로 합니다.\n\n제2조 [보증 기준]\n회사는 젠틀몬스터 정품 제품에 한하여 기준에 따라 보증 서비스를 제공합니다.\n품질 보증 기간 내 제조상 결함으로 인한 제품 이상은 무상 수리를 제공합니다.\n\n제3조 [수리 서비스 이용 및 절차]\n고객은 수리 접수 시 회사가 지정한 절차에 따라 제품을 발송해야 합니다.\n케이스 및 보증 카드는 분실 위험이 있으므로 동봉하지 않습니다.\n외부 제작 렌즈는 수리 중 손상될 우려가 있어 미삽입 상태로 발송해야 합니다.\n\n제4조 [수리 기간 및 비용]\n수리 기간은 서비스 유형 및 협력업체 여부에 따라 상이합니다.\n유상 수리의 경우 비용은 제품 상태에 따라 산정됩니다.\n\n제5조 [제품 보관 및 처리]\n회사는 서비스 판정일 기준 30일간 제품을 보관합니다.\n보관 기간 내 결제 확인 또는 고객 회신이 없을 경우 제품은 반송되거나 관련 법령에 따라 폐기될 수 있습니다.',
    checks: [
      { id: 'terms', text: '수리 서비스 약관 전체 내용에 동의합니다. (필수)' }
    ]
  },
  ie: {
    title: '스마트 아이웨어 접수 전, 꼭 확인해 주세요.',
    sections: [
      {
        title: '데이터 안내',
        copy: '페어링을 해제하면 기기에 저장된 데이터가 초기화될 수 있습니다.\n개인정보와 설정값을 미리 백업하신 후 제품을 발송해 주세요.'
      },
      {
        title: '제품을 보내실 때',
        copy: '제품 본체 또는 충전 케이스만 보내주세요.\n안경닦이 등 부속품은 분실 우려가 있어 함께 보내지 말아 주세요.'
      },
      {
        title: '제품 보관 및 폐기 안내',
        copy: '프로덕트 서비스팀은 제품 판정일로부터 30일간 보관합니다.\n30일 이내 결제 확인 또는 회신이 없으면, 제품은 반송되거나 관련 법령에 따라 폐기될 수 있습니다.\n폐기 후에는 보상·반환이 불가합니다.'
      }
    ],
    fullTerms: '스마트 아이웨어 수리 서비스 약관은 추후 연결 예정입니다.',
    checks: [
      { id: 'data', text: '위 내용을 확인했으며, 데이터 초기화 가능성에 동의합니다. (필수)' },
      { id: 'terms', text: '수리 서비스 약관 전체 내용에 동의합니다. (필수)' }
    ]
  }
};

function readState() {
  try {
    return JSON.parse(window.localStorage.getItem('ps-state') || '{}');
  } catch (error) {
    return {};
  }
}

function writeState(nextState) {
  try {
    window.localStorage.setItem('ps-state', JSON.stringify(nextState));
  } catch (error) {
    // Local file previews may block storage.
  }
}

function mergeState(partial) {
  const nextState = { ...readState(), ...partial };
  writeState(nextState);
  return nextState;
}

function navigateTo(url) {
  if (!url) return;
  window.location.href = url;
}

function serviceDetailUrl(serviceType = readState().serviceType) {
  return serviceDetailRoutes[serviceType] || serviceDetailRoutes['total-care'];
}

function previousDetailUrl() {
  return serviceDetailUrl(readState().serviceType);
}

function isDetailRoute() {
  return ['detail', 'total-care', 'repair', 'consulting'].includes(route);
}

function needsConditionStep(state = readState()) {
  return (
    state.serviceType === 'total-care' ||
    state.serviceType === 'repair' ||
    (state.serviceType === 'consulting' && state.consultingType === 'defect')
  );
}

function isAccessoryOnlyRequest(state = readState()) {
  return state.serviceType === 'consulting' && state.consultingType === 'parts-request';
}

function isTotalCareRequest(state = readState()) {
  return state.serviceType === 'total-care';
}

function nextAfterDetailUrl(state = readState()) {
  if (needsConditionStep(state)) return './request-condition.html';
  if (isAccessoryOnlyRequest(state)) return './request-return.html';
  return './request-shipping.html';
}

function returnStepTitle(state = readState()) {
  if (isAccessoryOnlyRequest(state)) return '3 Receiving';
  return needsConditionStep(state) ? '5 Receiving' : '4 Receiving';
}

function updateManualSerialPlaceholder(productName) {
  if (!manualSerialNumberInput) return;
  manualSerialNumberInput.placeholder = manualSerialPlaceholders[productName] || 'ex) GE240612-00003821';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isAiProduct(productName = '', serialNumber = '', image = '') {
  const value = `${productName} ${serialNumber} ${image}`.toLowerCase();
  return value.includes('smart') || value.includes('breezeby') || value.includes('jinju') || value.includes('r4a') || value.includes('product-smart');
}

function isSmartProductName(productName = '') {
  return isAiProduct(productName);
}

function dateFromPurchaseText(purchaseText = '') {
  const normalized = String(purchaseText).replace(/^Purchased on\s+/i, '').trim();
  const date = new Date(`${normalized} 00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isOverThreeYearsFromPurchase(purchaseText = '') {
  const purchaseDate = dateFromPurchaseText(purchaseText);
  if (!purchaseDate) return false;

  const threshold = new Date(purchaseDate);
  threshold.setFullYear(threshold.getFullYear() + 3);
  return Date.now() > threshold.getTime();
}

function isOverTwoYearsFromPurchase(purchaseText = '') {
  const purchaseDate = dateFromPurchaseText(purchaseText);
  if (!purchaseDate) return false;

  const threshold = new Date(purchaseDate);
  threshold.setFullYear(threshold.getFullYear() + 2);
  return Date.now() > threshold.getTime();
}

function isDefectInquiryExpired(product = productDataFromState()) {
  return isOverTwoYearsFromPurchase(product.purchaseText);
}

function requiresExpiredWarrantyConsent(product = productDataFromState()) {
  const warrantyValues = [product.warrantyText, ...(product.warrantyTexts || [])].join(' ').toLowerCase();
  return warrantyValues.includes('expired') || isOverThreeYearsFromPurchase(product.purchaseText);
}

function productWarrantyAge(product = productDataFromState()) {
  const purchaseDate = dateFromPurchaseText(product.purchaseText);
  if (!purchaseDate) return requiresExpiredWarrantyConsent(product) ? 'three-to-seven' : 'under-three';

  const threeYearLimit = new Date(purchaseDate);
  threeYearLimit.setFullYear(threeYearLimit.getFullYear() + 3);

  const sevenYearLimit = new Date(purchaseDate);
  sevenYearLimit.setFullYear(sevenYearLimit.getFullYear() + 7);

  const now = new Date();
  if (now > sevenYearLimit) return 'over-seven';
  if (now > threeYearLimit) return 'three-to-seven';
  return 'under-three';
}

function selectedProductCard() {
  return document.querySelector('.product-selectable.selected');
}

function productDataFromCard(card) {
  const image = card?.querySelector('.product-history-visual img')?.getAttribute('src') || fallbackProduct.image;
  const name = card?.querySelector('.product-history-info strong')?.textContent.trim() || fallbackProduct.name;
  const copyItems = Array.from(card?.querySelectorAll('.product-history-copy > span') || []);
  const purchaseText = copyItems[0]?.textContent.trim() || fallbackProduct.purchaseText;
  const storeText = copyItems[1]?.textContent.trim() || fallbackProduct.storeText;
  const warrantyTexts = copyItems
    .filter((item) => item.classList.contains('muted'))
    .map((item) => item.textContent.trim())
    .filter(Boolean);
  const warrantyText = warrantyTexts[0] || fallbackProduct.warrantyText;
  const serialNumber = card?.querySelector('.product-history-copy small')?.textContent.replace(/^Serial No\.\s*/, '').trim() || fallbackProduct.serialNumber;
  const tag = card?.querySelector('.product-history-tag')?.textContent.trim() || '';
  const line = isAiProduct(name, serialNumber, image) ? 'ie' : 'organic';

  return { image, name, purchaseText, storeText, warrantyText, warrantyTexts, serialNumber, tag, line };
}

function formatManualDate(value) {
  if (!value) return 'Purchase date pending';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return `Purchased on ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}

function manualProductImage(productName, line) {
  if (line === 'ie') return './assets/product-smart.png';
  if (productName.toLowerCase().includes('hypeob')) return './assets/product-hypeob.png';
  return './assets/product-gelati.png';
}

function manualProductData() {
  const name = manualProductNameInput?.value.trim() || '직접 입력 제품';
  const serialNumber = manualSerialNumberInput?.value.trim() || manualSerialNumberInput?.placeholder.replace(/^ex\)\s*/, '') || '';
  const line = isAiProduct(name, serialNumber) ? 'ie' : 'organic';
  const store = manualPurchaseStoreInput?.value.trim();

  const warrantyText = line === 'ie' ? 'Smart eyewear service coverage will be verified after product inspection' : 'Warranty will be verified after product inspection';

  return {
    image: manualProductImage(name, line),
    name,
    purchaseText: formatManualDate(manualDateInput?.value),
    storeText: store ? `at ${store}` : 'Store pending',
    warrantyText,
    warrantyTexts: [warrantyText],
    serialNumber,
    tag: '',
    line
  };
}

function productDataFromState() {
  const state = readState();
  const name = state.productName || fallbackProduct.name;
  const serialNumber = state.serialNumber || fallbackProduct.serialNumber;
  const image = state.productImage || fallbackProduct.image;
  const line = state.productLine || (isAiProduct(name, serialNumber, image) ? 'ie' : 'organic');
  const warrantyTexts = Array.isArray(state.warrantyTexts) && state.warrantyTexts.length
    ? state.warrantyTexts
    : [state.warrantyText || fallbackProduct.warrantyText];

  return {
    image,
    name,
    purchaseText: state.purchaseText || state.purchaseDate || fallbackProduct.purchaseText,
    storeText: state.storeText || state.purchaseStore || fallbackProduct.storeText,
    warrantyText: warrantyTexts[0] || fallbackProduct.warrantyText,
    warrantyTexts,
    serialNumber,
    tag: state.productTag || '',
    line
  };
}

function isManualEntryOpen() {
  return Boolean(manualEntryPanel && !manualEntryPanel.classList.contains('hidden'));
}

function currentProductData() {
  if (route === 'products') {
    return isManualEntryOpen() ? manualProductData() : productDataFromCard(selectedProductCard());
  }

  return productDataFromState();
}

function hasSelectedProduct() {
  return Boolean(document.querySelector('.product-selectable.selected'));
}

function isManualEntryComplete() {
  return Boolean(
    manualProductNameInput?.value.trim() &&
    manualDateInput?.value &&
    manualPurchaseStoreInput?.value.trim() &&
    manualProofFiles.length > 0
  );
}

function saveProductForRouting() {
  const product = currentProductData();
  mergeState({
    productImage: product.image,
    productName: product.name,
    purchaseText: product.purchaseText,
    storeText: product.storeText,
    warrantyText: product.warrantyText,
    warrantyTexts: product.warrantyTexts,
    serialNumber: product.serialNumber,
    productTag: product.tag,
    productLine: product.line,
    isAi: product.line === 'ie',
    aiProduct: product.line === 'ie',
    serviceGuideAgreed: false,
    termsAgreeYn: 'N',
    ieDataResetConsent: false
  });
}

function bindAgreementInputs() {
  document.querySelectorAll('[data-agreement]').forEach((input) => {
    input.addEventListener('change', () => {
      if (agreementError) agreementError.style.display = 'none';
      updateContinueState();
    });
  });
}

function renderTermsScreen() {
  const product = currentProductData();
  const data = termsContent[product.line] || termsContent.organic;

  if (termsProductImage) termsProductImage.src = product.image;
  if (termsProductName) termsProductName.textContent = product.name;
  if (termsProductTag) {
    termsProductTag.textContent = product.tag;
    termsProductTag.classList.toggle('hidden', !product.tag);
  }
  if (termsProductPurchase) termsProductPurchase.textContent = product.purchaseText;
  if (termsProductStore) termsProductStore.textContent = product.storeText;
  if (termsProductWarranty) termsProductWarranty.textContent = product.warrantyText;
  if (termsProductWarrantySecondary) {
    const secondaryWarranty = product.warrantyTexts?.[1] || '';
    termsProductWarrantySecondary.textContent = secondaryWarranty;
    termsProductWarrantySecondary.classList.toggle('hidden', !secondaryWarranty);
  }
  if (termsProductSerial) {
    termsProductSerial.textContent = product.serialNumber ? `Serial No. ${product.serialNumber}` : '';
    termsProductSerial.classList.toggle('hidden', !product.serialNumber);
  }
  if (termsTitle) termsTitle.textContent = data.title;
  if (agreementError) agreementError.style.display = 'none';

  if (termsBody) {
    const sections = data.sections.map((section) => (
      `<section class="terms-section">`
      + `<h3>${escapeHtml(section.title)}</h3>`
      + `<p>${escapeHtml(section.copy)}</p>`
      + `</section>`
    )).join('');

    termsBody.innerHTML = sections
      + `<details class="terms-toggle">`
      + `<summary>수리 서비스 약관 보기</summary>`
      + `<div class="terms-toggle-body">${escapeHtml(data.fullTerms)}</div>`
      + `</details>`;
  }

  if (agreementList) {
    agreementList.innerHTML = data.checks.map((check) => (
      `<label class="agreement-check">`
      + `<input type="checkbox" id="agree-${check.id}" data-agreement="${check.id}">`
      + `<span>${escapeHtml(check.text)}</span>`
      + `</label>`
    )).join('');
    bindAgreementInputs();
  }
}

function renderProductSummary(product = productDataFromState()) {
  if (serviceProductImage) serviceProductImage.src = product.image;
  if (serviceProductName) serviceProductName.textContent = product.name;
  if (serviceProductTag) {
    serviceProductTag.textContent = product.tag;
    serviceProductTag.classList.toggle('hidden', !product.tag);
  }
  if (serviceProductPurchase) serviceProductPurchase.textContent = product.purchaseText;
  if (serviceProductStore) serviceProductStore.textContent = product.storeText;
  if (serviceProductWarranty) serviceProductWarranty.textContent = product.warrantyText;
  if (serviceProductWarrantySecondary) {
    const secondaryWarranty = product.warrantyTexts?.[1] || '';
    serviceProductWarrantySecondary.textContent = secondaryWarranty;
    serviceProductWarrantySecondary.classList.toggle('hidden', !secondaryWarranty);
  }
  if (serviceProductSerial) {
    serviceProductSerial.textContent = product.serialNumber ? `Serial No. ${product.serialNumber}` : '';
    serviceProductSerial.classList.toggle('hidden', !product.serialNumber);
  }
}

function renderServiceScreen() {
  renderProductSummary();

  document.querySelectorAll('.service-option').forEach((button) => {
    button.classList.remove('selected');
    button.setAttribute('aria-pressed', 'false');
  });
}

function isTotalCareSelected() {
  if (route === 'total-care') return true;
  if (route === 'repair' || route === 'consulting') return false;
  const state = readState();
  const serviceTypes = Array.isArray(state.serviceTypes) ? state.serviceTypes : [];
  return !state.serviceType || state.serviceType === 'total-care' || serviceTypes.includes('total-care');
}

function isRepairSelected() {
  if (route === 'repair') return true;
  if (route === 'total-care' || route === 'consulting') return false;
  const state = readState();
  const serviceTypes = Array.isArray(state.serviceTypes) ? state.serviceTypes : [];
  return state.serviceType === 'repair' || serviceTypes.includes('repair');
}

function isConsultingSelected() {
  if (route === 'consulting') return true;
  if (route === 'total-care' || route === 'repair') return false;
  const state = readState();
  const serviceTypes = Array.isArray(state.serviceTypes) ? state.serviceTypes : [];
  return state.serviceType === 'consulting' || serviceTypes.includes('consulting');
}

function syncFittingOptions() {
  document.querySelectorAll('input[name="fitting-option"]').forEach((input) => {
    const label = input.closest('.fitting-option');
    if (label) label.classList.toggle('selected', input.checked);
  });
}

function syncLensOptions() {
  document.querySelectorAll('input[name="lens-status"]').forEach((input) => {
    const label = input.closest('.fitting-option');
    if (label) label.classList.toggle('selected', input.checked);
  });
}

function selectedLensStatus() {
  return document.querySelector('input[name="lens-status"]:checked')?.value || '';
}

function hasConditionPhotos() {
  return conditionPhotoFiles.length > 0;
}

function selectedShippingValue(group) {
  return document.querySelector(`.shipping-option.selected[data-shipping-group="${group}"]`)?.dataset.shippingValue || '';
}

function setShippingValue(group, value) {
  document.querySelectorAll(`.shipping-option[data-shipping-group="${group}"]`).forEach((button) => {
    const selected = button.dataset.shippingValue === value;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function selectedScheduleMode() {
  if (document.querySelector('.shipping-option.selected[data-schedule-mode="urgent"]')) return 'urgent';
  return selectedScheduleDate() ? 'standard' : '';
}

function setScheduleMode(mode = '') {
  document.querySelectorAll('.shipping-option[data-schedule-mode]').forEach((button) => {
    const selected = button.dataset.scheduleMode === mode;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function selectedScheduleDate() {
  return document.querySelector('.shipping-date-option.selected')?.dataset.scheduleDate || '';
}

function addBusinessDays(startDate, businessDays) {
  const date = new Date(startDate);
  let added = 0;

  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }

  return date;
}

function formatScheduleDate(date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatScheduleWeekday(date, baseDate = new Date()) {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target - start) / 86400000);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays <= 7 && target.getDay() !== 0) return `Next ${weekday}`;
  return weekday;
}

function renderShippingDates(selectedDate = readState().shippingScheduleDate || '') {
  if (!shippingDateList) return;
  shippingDateList.innerHTML = '';

  const today = new Date();
  const dates = [15, 16, 17, 18, 19, 20].map((offset, index) => ({
    date: addBusinessDays(today, offset),
    disabled: index === 3
  }));

  dates.forEach(({ date, disabled }) => {
    const value = date.toISOString().slice(0, 10);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shipping-date-option';
    button.dataset.scheduleDate = value;
    button.disabled = disabled;
    button.innerHTML = `<strong>${formatScheduleWeekday(date, today)}</strong><span>${formatScheduleDate(date)}</span>${disabled ? '<em>마감</em>' : ''}`;

    if (!disabled && selectedDate === value) {
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.setAttribute('aria-pressed', 'false');
    }

    button.addEventListener('click', () => {
      document.querySelectorAll('.shipping-date-option').forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      setScheduleMode('');
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      updateContinueState();
    });

    shippingDateList.append(button);
  });
}

function selectedRepairParts() {
  return Array.from(document.querySelectorAll('#repair-detail-panel .repair-part-option.selected'))
    .map((button) => button.dataset.repairPart)
    .filter(Boolean);
}

function selectedRepairIssue() {
  return document.querySelector('.repair-issue-option[data-repair-issue].selected')?.dataset.repairIssue || '';
}

function selectedConsultingType() {
  return document.querySelector('.consulting-option.selected')?.dataset.consultingType || '';
}

function selectedConsultingContactMethod() {
  return document.querySelector('.consulting-contact-option.selected')?.dataset.contactMethod || '';
}

function setConsultingContactMethod(method = '') {
  document.querySelectorAll('.consulting-contact-option').forEach((button) => {
    const selected = button.dataset.contactMethod === method;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function selectedConsultingParts() {
  return Array.from(document.querySelectorAll('.consulting-part-option.selected'))
    .map((button) => button.dataset.repairPart)
    .filter(Boolean);
}

function selectedAccessoryRequests() {
  return Array.from(document.querySelectorAll('[data-accessory-key]:checked')).map((input) => {
    const key = input.dataset.accessoryKey;
    const item = input.closest('.consulting-accessory-item');
    const quantity = document.querySelector(`[data-accessory-quantity="${key}"]`)?.value || '1';
    const label = item?.querySelector('strong')?.textContent.trim() || key;
    return { key, label, quantity };
  });
}

function syncAccessoryItems() {
  document.querySelectorAll('.consulting-accessory-item').forEach((item) => {
    const input = item.querySelector('[data-accessory-key]');
    const select = item.querySelector('[data-accessory-quantity]');
    const selected = Boolean(input?.checked);
    item.classList.toggle('selected', selected);
    if (select) select.disabled = !selected;
  });
}

function syncConsultingContactPanels() {
  const contactMethod = selectedConsultingContactMethod();
  document.querySelectorAll('[data-contact-card]').forEach((card) => {
    card.classList.toggle('selected', card.dataset.contactCard === contactMethod);
  });
  document.querySelectorAll('[data-contact-detail]').forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.contactDetail !== contactMethod);
  });
  if (contactMethod !== 'chat') {
    consultingLiveChat?.classList.add('hidden');
  }
}

function syncConsultingPanels() {
  const consultingType = selectedConsultingType();
  const defectExpired = consultingType === 'defect' && isDefectInquiryExpired();
  const showParts = consultingType === 'defect' && !defectExpired;
  const showAccessories = consultingType === 'parts-request';
  const showAgent = consultingType === 'agent';
  const showRequestField = showParts || showAccessories;

  if (consultingPartGroup) consultingPartGroup.classList.toggle('hidden', !showParts);
  if (consultingDefectExpired) consultingDefectExpired.classList.toggle('hidden', !defectExpired);
  if (consultingAccessoryGroup) consultingAccessoryGroup.classList.toggle('hidden', !showAccessories);
  if (consultingAgentPanel) consultingAgentPanel.classList.toggle('hidden', !showAgent);
  if (consultingRequestField) consultingRequestField.classList.toggle('hidden', !showRequestField);

  if (!showParts) {
    document.querySelectorAll('.consulting-part-option').forEach((button) => {
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
  }

  if (!showAccessories) {
    document.querySelectorAll('[data-accessory-key]').forEach((input) => {
      input.checked = false;
    });
  }

  if (!showAgent) {
    setConsultingContactMethod('');
  }

  syncAccessoryItems();
  syncConsultingContactPanels();
}

function repairGuidanceType(product = productDataFromState()) {
  const issue = selectedRepairIssue();
  if (!issue) return 'empty';

  const age = productWarrantyAge(product);
  if (age === 'over-seven' && ['damage', 'ornament'].includes(issue)) return 'unavailable';
  if (issue === 'damage') return age === 'under-three' ? 'damage-standard' : 'restoration';
  if (issue === 'ornament' || issue === 'parts') return age === 'under-three' ? 'total-care' : 'expired';
  return 'empty';
}

function toggleRepairGuide(activeGuide) {
  const guides = {
    empty: null,
    'damage-standard': repairGuideDamageStandard,
    'total-care': repairGuideTotalCare,
    restoration: repairGuideRestoration,
    expired: repairGuideExpired,
    unavailable: repairGuideUnavailable
  };

  if (repairGuidanceEmpty) repairGuidanceEmpty.classList.add('hidden');

  Object.entries(guides).forEach(([guide, element]) => {
    if (element) element.classList.toggle('hidden', guide !== activeGuide);
  });

  if (repairGuideExpiredTotalCare) {
    repairGuideExpiredTotalCare.classList.toggle('hidden', activeGuide !== 'expired');
  }
}

function updateRepairGuidance() {
  toggleRepairGuide(repairGuidanceType());
  updateContinueState();
}

function setRepairIssue(issue) {
  document.querySelectorAll('.repair-issue-option').forEach((button) => {
    const selected = button.dataset.repairIssue === issue;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function renderRepairDetail(state, product) {
  const repairParts = Array.isArray(state.repairParts) ? state.repairParts : [];
  document.querySelectorAll('#repair-detail-panel .repair-part-option').forEach((button) => {
    const selected = repairParts.includes(button.dataset.repairPart);
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  setRepairIssue(state.repairIssue || '');
  if (repairRequestTextarea) repairRequestTextarea.value = state.repairRequest || '';
  if (restorationConsentCheck) restorationConsentCheck.checked = Boolean(state.restorationConsent);
  if (repairExpiredConsentCheck) repairExpiredConsentCheck.checked = Boolean(state.repairExpiredConsent);
  toggleRepairGuide(repairGuidanceType(product));
}

function renderConsultingDetail(state) {
  document.querySelectorAll('.consulting-option').forEach((button) => {
    const selected = button.dataset.consultingType === state.consultingType;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  const consultingParts = Array.isArray(state.consultingParts) ? state.consultingParts : [];
  document.querySelectorAll('.consulting-part-option').forEach((button) => {
    const selected = state.consultingType === 'defect' && consultingParts.includes(button.dataset.repairPart);
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const accessoryRequests = Array.isArray(state.accessoryRequests) ? state.accessoryRequests : [];
  document.querySelectorAll('[data-accessory-key]').forEach((input) => {
    const saved = accessoryRequests.find((item) => item.key === input.dataset.accessoryKey);
    input.checked = state.consultingType === 'parts-request' && Boolean(saved);
    const select = document.querySelector(`[data-accessory-quantity="${input.dataset.accessoryKey}"]`);
      if (select && saved?.quantity) select.value = saved.quantity;
  });
  setConsultingContactMethod(state.consultingType === 'agent' ? state.consultingContactMethod || '' : '');
  syncConsultingPanels();

  if (consultingRequestTextarea) consultingRequestTextarea.value = state.consultingRequest || '';
}

function switchToTotalCare() {
  mergeState({
    serviceType: 'total-care',
    serviceTypes: ['total-care'],
    serviceLabel: '토탈케어',
    serviceLabels: ['토탈케어'],
    serviceDescription: '클리닝 · 폴리싱 · 피팅 — 제품 전체를 케어해 드립니다.',
    serviceDescriptions: ['클리닝 · 폴리싱 · 피팅 — 제품 전체를 케어해 드립니다.']
  });
  navigateTo(serviceDetailRoutes['total-care']);
  updateContinueState();
}

function renderDetailScreen() {
  const state = readState();
  const product = productDataFromState();
  const totalCare = isTotalCareSelected();
  const repair = isRepairSelected();
  const consulting = isConsultingSelected();
  const needsExpiryConsent = totalCare && requiresExpiredWarrantyConsent(product);

  renderProductSummary(product);
  if (totalCareDetailPanel) totalCareDetailPanel.classList.toggle('hidden', !totalCare);
  if (repairDetailPanel) repairDetailPanel.classList.toggle('hidden', !repair);
  if (consultingDetailPanel) consultingDetailPanel.classList.toggle('hidden', !consulting);
  if (expiredWarrantyConsent) expiredWarrantyConsent.classList.toggle('hidden', !needsExpiryConsent);
  if (expiryConsentCheck) expiryConsentCheck.checked = needsExpiryConsent ? Boolean(state.expiredWarrantyConsent) : false;

  const fittingOption = state.fittingOption === 'basic' ? 'restore' : (state.fittingOption || 'restore');
  const fittingInput = document.querySelector(`input[name="fitting-option"][value="${fittingOption}"]`);
  if (fittingInput) fittingInput.checked = true;
  syncFittingOptions();

  if (serviceRequestTextarea) serviceRequestTextarea.value = '';
  if (repair) renderRepairDetail(state, product);
  if (consulting) renderConsultingDetail(state);
}

function areTermsAgreed() {
  const inputs = Array.from(document.querySelectorAll('#agreement-list [data-agreement]'));
  return inputs.length > 0 && inputs.every((input) => input.checked);
}

function saveTermsAgreement() {
  if (!areTermsAgreed()) {
    if (agreementError) agreementError.style.display = 'block';
    return false;
  }

  const product = currentProductData();
  const dataAgree = document.getElementById('agree-data');

  mergeState({
    serviceGuideAgreed: true,
    termsAgreeYn: 'Y',
    productLine: product.line,
    isAi: product.line === 'ie',
    aiProduct: product.line === 'ie',
    ieDataResetConsent: product.line === 'ie' ? Boolean(dataAgree?.checked) : false
  });

  return true;
}

function selectedServiceOptions() {
  return Array.from(document.querySelectorAll('.service-option.selected'));
}

function saveServiceSelection() {
  const options = selectedServiceOptions();
  if (!options.length) return '';
  const serviceTypes = options.map((option) => option.dataset.service || '');
  const serviceLabels = options.map((option) => option.querySelector('strong')?.textContent.trim() || option.textContent.trim());
  const serviceDescriptions = options.map((option) => option.querySelector('span')?.textContent.trim() || '');

  mergeState({
    serviceType: serviceTypes[0],
    serviceTypes,
    serviceLabel: serviceLabels[0],
    serviceLabels,
    serviceDescription: serviceDescriptions[0],
    serviceDescriptions,
    fittingOption: 'restore',
    serviceRequest: '',
    expiredWarrantyConsent: false,
    repairParts: [],
    repairIssue: '',
    repairGuide: '',
    repairRequest: '',
    restorationConsent: false,
    repairExpiredConsent: false,
    consultingType: '',
    consultingParts: [],
    accessoryRequests: [],
    consultingContactMethod: '',
    consultingRequest: '',
    conditionPhotoNames: [],
    lensStatus: '',
    collectionMethod: '',
    storeCity: '',
    storeName: '',
    returnMethod: '',
    returnAddressName: '',
    returnStoreCity: '',
    returnStoreName: '',
    shippingPackageConsent: false,
    customLensConsent: false,
    serviceScheduleMode: '',
    shippingScheduleDate: '',
    shippingTouched: false,
    returnTouched: false
  });

  return serviceTypes[0];
}

function saveRepairDetail() {
  if (isTotalCareSelected()) {
    const selectedFitting = document.querySelector('input[name="fitting-option"]:checked');
    mergeState({
      serviceType: 'total-care',
      fittingOption: selectedFitting?.value || 'restore',
      serviceRequest: serviceRequestTextarea?.value.trim() || '',
      expiredWarrantyConsent: Boolean(expiryConsentCheck?.checked)
    });
    return;
  }

  if (isRepairSelected()) {
    mergeState({
      serviceType: 'repair',
      repairParts: selectedRepairParts(),
      repairIssue: selectedRepairIssue(),
      repairGuide: repairGuidanceType(),
      repairRequest: repairRequestTextarea?.value.trim() || '',
      restorationConsent: Boolean(restorationConsentCheck?.checked),
      repairExpiredConsent: Boolean(repairExpiredConsentCheck?.checked)
    });
    return;
  }

  if (isConsultingSelected()) {
    const consultingType = selectedConsultingType();
    mergeState({
      serviceType: 'consulting',
      consultingType,
      consultingParts: consultingType === 'defect' ? selectedConsultingParts() : [],
      accessoryRequests: consultingType === 'parts-request' ? selectedAccessoryRequests() : [],
      consultingContactMethod: consultingType === 'agent' ? selectedConsultingContactMethod() : '',
      consultingRequest: consultingRequestTextarea?.value.trim() || ''
    });
  }
}

function saveConditionDetail() {
  const state = readState();
  mergeState({
    conditionPhotoNames: conditionPhotoFiles.length
      ? conditionPhotoFiles.map((file) => file.name)
      : (Array.isArray(state.conditionPhotoNames) ? state.conditionPhotoNames : []),
    lensStatus: selectedLensStatus()
  });
}

function renderConditionScreen() {
  const state = readState();
  const product = productDataFromState();
  renderProductSummary(product);

  const lensInput = document.querySelector(`input[name="lens-status"][value="${state.lensStatus || ''}"]`);
  if (lensInput) lensInput.checked = true;
  syncLensOptions();
}

function shippingCollectionCopy(method) {
  if (method === 'store') {
    return [
      '접수 후 5일 이내에 선택하신 매장으로 제품을 맡겨 주세요.',
      '기한 내 방문하지 않으면 접수가 자동 취소됩니다.'
    ];
  }

  return [
    '접수 완료 후 영업일 3일 이내 방문합니다.',
    '방문 전 기사님이 미리 연락드리며, 기한 내 픽업되지 않으면 접수가 자동 취소됩니다.'
  ];
}

function selectedStoreCity() {
  return shippingStoreCityButton?.dataset.city || '';
}

function setStoreCity(city = '') {
  if (!shippingStoreCityButton) return;
  shippingStoreCityButton.dataset.city = city;
  shippingStoreCityButton.setAttribute('aria-expanded', 'false');
  if (shippingStoreCityOptions) shippingStoreCityOptions.classList.add('hidden');
}

function selectedShippingStoreName() {
  return document.querySelector('#shipping-store-list .shipping-store-card.selected, #shipping-store-list .shipping-partner-card.selected')?.dataset.storeName || '';
}

function setShippingStoreName(name = '') {
  document.querySelectorAll('#shipping-store-list .shipping-store-card, #shipping-store-list .shipping-partner-card').forEach((card) => {
    const selected = Boolean(name) && card.dataset.storeName === name;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  });
}

function selectedReturnAddressName() {
  return document.querySelector('#return-address-section .return-address-card.selected')?.dataset.returnAddressName || '';
}

function setReturnAddressName(name = '') {
  document.querySelectorAll('#return-address-section .return-address-card').forEach((card) => {
    const selected = Boolean(name) && card.dataset.returnAddressName === name;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  });
}

function selectedReturnStoreCity() {
  return returnStoreCityButton?.dataset.city || '';
}

function setReturnStoreCity(city = '') {
  if (!returnStoreCityButton) return;
  returnStoreCityButton.dataset.city = city;
  returnStoreCityButton.setAttribute('aria-expanded', 'false');
  if (returnStoreCityOptions) returnStoreCityOptions.classList.add('hidden');
}

function selectedReturnStoreName() {
  return document.querySelector('#return-store-list .return-store-card.selected')?.dataset.storeName || '';
}

function setReturnStoreName(name = '') {
  document.querySelectorAll('#return-store-list .return-store-card').forEach((card) => {
    const selected = Boolean(name) && card.dataset.storeName === name;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  });
}

function syncShippingStoreCity() {
  const hasCity = Boolean(selectedStoreCity());
  const state = readState();
  const showPartners = state.lensStatus === 'custom' && selectedShippingValue('collection') === 'store';
  if (shippingStoreIntro) {
    shippingStoreIntro.classList.toggle('hidden', hasCity);
    shippingStoreIntro.textContent = "We'll check the nearest stores you can pick your order.";
  }
  if (shippingStoreCityButton) shippingStoreCityButton.classList.toggle('hidden', hasCity);
  if (shippingStoreCityOptions) shippingStoreCityOptions.classList.add('hidden');
  if (shippingStoreList) shippingStoreList.classList.toggle('hidden', !hasCity);
  if (shippingStoreSelectionLabel) {
    shippingStoreSelectionLabel.textContent = showPartners ? 'Select an optical partner in' : 'Select your pick up store in';
  }
  if (shippingStoreResults) shippingStoreResults.classList.toggle('hidden', !hasCity || showPartners);
  if (shippingPartnerResults) shippingPartnerResults.classList.toggle('hidden', !hasCity || !showPartners);
}

function syncShippingPanels() {
  const state = readState();
  const accessoryOnly = isAccessoryOnlyRequest(state);
  const totalCare = isTotalCareRequest(state);
  const collectionMethod = accessoryOnly ? '' : selectedShippingValue('collection');
  const hasCustomLens = state.lensStatus === 'custom';

  if (shippingCollectionSection) shippingCollectionSection.classList.toggle('hidden', accessoryOnly);
  if (shippingPackageConsent) shippingPackageConsent.classList.toggle('hidden', accessoryOnly);
  if (totalCareScheduleSection) totalCareScheduleSection.classList.toggle('hidden', !totalCare);
  if (shippingDatePanel) shippingDatePanel.classList.toggle('hidden', !totalCare);

  if (shippingCollectionAlert && !accessoryOnly) {
    const showCollectionAlert = Boolean(collectionMethod);
    shippingCollectionAlert.classList.toggle('hidden', !showCollectionAlert);
    shippingCollectionAlert.innerHTML = showCollectionAlert
      ? shippingCollectionCopy(collectionMethod).map((copy) => `<p>${escapeHtml(copy)}</p>`).join('')
      : '';
  }

  if (shippingAddressSection) shippingAddressSection.classList.toggle('hidden', accessoryOnly || collectionMethod !== 'pickup');
  if (shippingStoreSection) shippingStoreSection.classList.toggle('hidden', accessoryOnly || collectionMethod !== 'store');
  syncShippingStoreCity();
  if (customLensPickupNotice) customLensPickupNotice.classList.toggle('hidden', accessoryOnly || !hasCustomLens || collectionMethod !== 'pickup');
  if (customLensStoreGuide) customLensStoreGuide.classList.toggle('hidden', accessoryOnly || !hasCustomLens || collectionMethod !== 'store');
}

function renderShippingScreen() {
  const state = readState();
  const product = productDataFromState();
  const shouldRestoreShipping = false;
  renderProductSummary(product);

  if (shippingTitle) shippingTitle.textContent = needsConditionStep(state) ? '4 Shipping' : '3 Shipping';

  setShippingValue('collection', shouldRestoreShipping ? state.collectionMethod || '' : '');
  setStoreCity(shouldRestoreShipping ? state.storeCity || '' : '');
  setShippingStoreName(shouldRestoreShipping ? state.storeName || '' : '');
  setScheduleMode(shouldRestoreShipping ? state.serviceScheduleMode || '' : '');
  renderShippingDates(shouldRestoreShipping && state.serviceScheduleMode === 'standard' ? state.shippingScheduleDate || '' : '');

  if (shippingPackageConsentCheck) shippingPackageConsentCheck.checked = shouldRestoreShipping && Boolean(state.shippingPackageConsent);
  if (customLensConsentCheck) customLensConsentCheck.checked = shouldRestoreShipping && Boolean(state.customLensConsent);

  syncShippingPanels();
}

function saveShippingDetail() {
  const collectionMethod = isAccessoryOnlyRequest() ? '' : selectedShippingValue('collection');
  mergeState({
    collectionMethod,
    storeCity: collectionMethod === 'store' ? selectedStoreCity() : '',
    storeName: collectionMethod === 'store' ? selectedShippingStoreName() : '',
    shippingPackageConsent: Boolean(shippingPackageConsentCheck?.checked),
    customLensConsent: Boolean(customLensConsentCheck?.checked),
    serviceScheduleMode: selectedScheduleMode(),
    shippingScheduleDate: selectedScheduleMode() === 'standard' ? selectedScheduleDate() : '',
    shippingTouched: true
  });
}

function canContinueShipping() {
  const state = readState();
  const accessoryOnly = isAccessoryOnlyRequest(state);
  const collectionMethod = selectedShippingValue('collection');

  if (accessoryOnly) return true;
  if (!collectionMethod || !shippingPackageConsentCheck?.checked) return false;
  if (collectionMethod === 'store' && (!selectedStoreCity() || !selectedShippingStoreName())) return false;

  if (isTotalCareRequest(state)) {
    const scheduleMode = selectedScheduleMode();
    if (!scheduleMode) return false;
    if (scheduleMode === 'standard' && !selectedScheduleDate()) return false;
  }

  if (state.lensStatus === 'custom' && collectionMethod === 'pickup') {
    return Boolean(customLensConsentCheck?.checked);
  }

  return true;
}

function syncReturnPanels() {
  const accessoryOnly = isAccessoryOnlyRequest();
  const returnMethod = selectedShippingValue('return');
  const hasStoreCity = Boolean(selectedReturnStoreCity());

  document.querySelectorAll('.shipping-option[data-shipping-group="return"]').forEach((button) => {
    const hidden = accessoryOnly && button.dataset.shippingValue !== 'home';
    button.classList.toggle('hidden', hidden);
  });

  if (returnAddressSection) returnAddressSection.classList.toggle('hidden', returnMethod !== 'home');
  if (returnStoreSection) returnStoreSection.classList.toggle('hidden', accessoryOnly || returnMethod !== 'store');
  if (returnStoreIntro) returnStoreIntro.classList.toggle('hidden', hasStoreCity);
  if (returnStoreCityButton) returnStoreCityButton.classList.toggle('hidden', hasStoreCity);
  if (returnStoreCityOptions) returnStoreCityOptions.classList.add('hidden');
  if (returnStoreList) returnStoreList.classList.toggle('hidden', !hasStoreCity);
}

function renderReturnScreen() {
  const state = readState();
  const shouldRestoreReturn = Boolean(state.returnTouched);
  renderProductSummary(productDataFromState());

  if (shippingTitle) shippingTitle.textContent = returnStepTitle(state);
  setShippingValue('return', shouldRestoreReturn ? state.returnMethod || '' : '');
  setReturnAddressName(shouldRestoreReturn ? state.returnAddressName || 'SUYEOL YANG' : 'SUYEOL YANG');
  setReturnStoreCity(shouldRestoreReturn ? state.returnStoreCity || '' : '');
  setReturnStoreName(shouldRestoreReturn ? state.returnStoreName || '' : '');
  syncReturnPanels();
}

function saveReturnDetail() {
  const returnMethod = selectedShippingValue('return');
  mergeState({
    returnMethod,
    returnAddressName: returnMethod === 'home' ? selectedReturnAddressName() : '',
    returnStoreCity: returnMethod === 'store' ? selectedReturnStoreCity() : '',
    returnStoreName: returnMethod === 'store' ? selectedReturnStoreName() : '',
    returnTouched: true
  });
}

function canContinueReturn() {
  const returnMethod = selectedShippingValue('return');
  if (!returnMethod) return false;
  if (returnMethod === 'home') return Boolean(selectedReturnAddressName());
  if (isAccessoryOnlyRequest()) return false;
  if (returnMethod === 'store') return Boolean(selectedReturnStoreCity() && selectedReturnStoreName());
  return false;
}

const reviewPartLabels = {
  front: '프론트',
  'left-temple': '좌템플',
  bridge: '브릿지',
  'right-temple': '우템플',
  'left-lens': '좌렌즈',
  'right-lens': '우렌즈'
};

function reviewLensLabel(value) {
  if (value === 'original') return '제품 기존 렌즈';
  if (value === 'custom') return '별도 제작 렌즈';
  return '미삽입';
}

function reviewFittingLabel(value) {
  if (value === 'keep') return '기존 피팅 유지';
  return '기본 피팅';
}

function reviewPartList(parts = []) {
  const labels = parts.map((part) => reviewPartLabels[part] || part).filter(Boolean);
  return labels.length ? labels.join(', ') : '선택한 부위';
}

function reviewAccessoryList(requests = []) {
  if (!requests.length) return '선택한 부속품';
  return requests.map((item) => `${item.label} ${item.quantity || '1쌍'}`).join('\n');
}

function reviewDateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function appendReviewRequestRow(rows, value) {
  const copy = String(value || '').trim();
  if (copy) rows.push({ title: '서비스 요청사항', value: copy });
}

function appendProgressiveRequestRow(rows, value) {
  const copy = String(value || '').trim();
  if (copy) rows.push({ title: '서비스 요청사항', value: copy });
}

function reviewShippingNoticeLines(state) {
  if (state.collectionMethod === 'store') {
    return [
      '접수 후 5일 이내에 선택하신 매장으로 제품을 맡겨 주세요.',
      '기한 내 방문하지 않으면 접수가 자동 취소됩니다.'
    ];
  }
  if (state.collectionMethod === 'pickup') {
    return [
      '접수 완료 후 영업일 3일 이내 방문합니다.',
      '방문 전 기사님이 미리 연락드리며, 기한 내 픽업되지 않으면 접수가 자동 취소됩니다.'
    ];
  }
  if (state.returnMethod === 'store') {
    return ['수리 완료 후 선택한 매장에서 수령합니다.'];
  }
  if (state.returnMethod === 'home') {
    return ['수리 완료 후 자택으로 배송해 드립니다.'];
  }
  return [];
}

function reviewServiceLabel(state) {
  if (state.serviceType === 'total-care') return '토탈 케어';
  if (state.serviceType === 'repair') {
    if (state.repairIssue === 'damage') return '제품 수리 : 파손·손상';
    if (state.repairIssue === 'ornament') return '제품 수리 : 장식 문제';
    if (state.repairIssue === 'parts') return '제품 수리 : 부속품 문제';
    return '제품 수리';
  }
  if (state.serviceType === 'consulting') {
    if (state.consultingType === 'defect') return '제품 결함 & 이상 문의';
    if (state.consultingType === 'parts-request') return '부속품 요청';
    if (state.consultingType === 'agent') return '상담원 연결';
    return '상담 & 기타';
  }
  return '토탈 케어';
}

function reviewIssueLabel(state) {
  if (state.serviceType === 'total-care' || !state.serviceType) return '토탈 케어';
  if (state.serviceType === 'repair') {
    if (state.repairIssue === 'damage') return '제품 파손·변형';
    if (state.repairIssue === 'ornament') return '장식 문제';
    if (state.repairIssue === 'parts') return '부속품 문제';
    return '제품 수리';
  }
  if (state.serviceType === 'consulting') {
    if (state.consultingType === 'defect') return '제품 결함·이상';
    if (state.consultingType === 'parts-request') return '부속품 요청';
    if (state.consultingType === 'agent') return '상담원 연결';
    return '상담 & 기타';
  }
  return reviewServiceLabel(state);
}

function reviewMethodAndCost(state, product) {
  if (product.line === 'ie' || isSmartProductName(product.name)) {
    return product.tag
      ? { method: '하드웨어 문제 확인 시 제품 교체', cost: '0원 또는 플랜 적용 후 안내', leadtime: '입고 후 7~10 영업일' }
      : { method: '진단 후 안내', cost: '점검 결과에 따라 안내', leadtime: '입고 후 안내' };
  }

  if (state.serviceType === 'total-care' || !state.serviceType) {
    return {
      method: '클리닝·폴리싱·피팅',
      cost: state.serviceScheduleMode === 'urgent' ? '무상 + 긴급 서비스 n원' : '무상',
      leadtime: state.serviceScheduleMode === 'urgent' ? '입고 후 5영업일 이내 출고' : '입고 후 10~15 영업일'
    };
  }

  if (state.serviceType === 'repair') {
    if (state.repairIssue === 'damage') {
      return state.repairGuide === 'restoration'
        ? { method: '복원 수리', cost: '30,000원', leadtime: '입고 후 10~15 영업일' }
        : { method: '부품 교체', cost: '소비자가의 20%', leadtime: '입고 후 10~15 영업일' };
    }
    if (state.repairIssue === 'ornament') {
      return { method: '장식 수리', cost: '무상', leadtime: '입고 후 10~15 영업일' };
    }
    return { method: '부속품 교체', cost: '무상', leadtime: '입고 후 3~5 영업일' };
  }

  if (state.serviceType === 'consulting' && state.consultingType === 'defect') {
    return { method: '정밀 점검 후 안내', cost: '점검 결과에 따라 안내드립니다', leadtime: '입고 후 안내' };
  }

  if (state.serviceType === 'consulting' && state.consultingType === 'parts-request') {
    return { method: '부속품 발송', cost: '', leadtime: '발송 후 3~5 영업일' };
  }

  return { method: '요청 사항 확인 후 안내', cost: '점검 결과에 따라 안내', leadtime: '입고 후 안내' };
}

function reviewCollectionLabel(state) {
  if (state.collectionMethod === 'store') return `DROP-OFF AT STORE${state.storeName ? `\n${state.storeName}` : ''}`;
  if (state.collectionMethod === 'pickup') return 'PICK UP AT HOME';
  return 'PICK UP AT HOME';
}

function reviewReturnLabel(state) {
  if (state.returnMethod === 'store') return `PICK UP AT STORE${state.returnStoreName ? `\n${state.returnStoreName}` : ''}`;
  if (state.returnMethod === 'home') return `SHIP TO ADDRESS${state.returnAddressName ? `\n${state.returnAddressName}` : ''}`;
  return 'SHIP TO ADDRESS';
}

function reviewDataForState(state, product) {
  const rows = [];
  const processRows = [];
  const estimate = reviewMethodAndCost(state, product);
  let price = estimate.cost || '점검 결과에 따라 안내';
  let showPrice = true;
  let showPhotos = state.serviceType !== 'consulting' || state.consultingType !== 'parts-request';
  let notice = '실물 확인 후 최종 진행 내용이 결정되며, 비용과 소요 기간은 달라질 수 있습니다.';
  const smartProduct = product.line === 'ie' || isSmartProductName(product.name);

  rows.push({ title: '렌즈 유형', value: reviewLensLabel(state.lensStatus || 'original') });
  rows.push({ title: '문제 증상', value: reviewIssueLabel(state) });

  if (smartProduct) {
    processRows.push({ title: '수리 대상', value: '본품' });
    processRows.push({ title: '예상 수리 방식', value: estimate.method });
    processRows.push({ title: '예상 리드타임', value: estimate.leadtime });
    processRows.push({ title: '예상 수리 비용', value: price });
    notice = 'Protection Plan 적용 여부와 최종 수리 방식은 실물 점검 후 확정됩니다.';
    return { rows, processRows, price, showPrice: false, showPhotos, notice };
  }

  if (state.serviceType === 'total-care') {
    rows.push({ title: '피팅 옵션', value: reviewFittingLabel(state.fittingOption) });
    appendReviewRequestRow(rows, state.serviceRequest);
    if (state.serviceScheduleMode === 'standard' && state.shippingScheduleDate) {
      rows.push({ title: '예상 출고일', value: reviewDateLabel(state.shippingScheduleDate) });
    }
    processRows.push({ title: '진행 내용', value: estimate.method });
    return { rows, processRows, price, showPrice, showPhotos, notice };
  }

  if (state.serviceType === 'repair') {
    const partText = reviewPartList(state.repairParts || []);
    if (state.repairIssue === 'damage') {
      rows.push({ title: '문제 부위', value: partText });
    } else if (state.repairIssue === 'ornament') {
      rows.push({ title: '문제 부위', value: partText });
    } else {
      rows.push({ title: '부속품 문제 부위', value: partText });
    }
    appendReviewRequestRow(rows, state.repairRequest);
    processRows.push({ title: '진행 내용', value: estimate.method });
    return { rows, processRows, price, showPrice, showPhotos, notice };
  }

  if (state.serviceType === 'consulting' && state.consultingType === 'defect') {
    rows.push({ title: '문제 부위', value: reviewPartList(state.consultingParts || []) });
    appendReviewRequestRow(rows, state.consultingRequest);
    processRows.push({ title: '진행 내용', value: estimate.method });
    return { rows, processRows, price, showPrice, showPhotos, notice };
  }

  if (state.serviceType === 'consulting' && state.consultingType === 'parts-request') {
    rows.push({ title: '부속품 요청', value: reviewAccessoryList(state.accessoryRequests || []) });
    appendReviewRequestRow(rows, state.consultingRequest);
    showPrice = false;
    showPhotos = false;
    notice = '요청하신 부속품은 접수 내용 확인 후 발송됩니다.';
    return { rows, processRows, price, showPrice, showPhotos, notice };
  }

  rows.push({ title: '피팅 옵션', value: reviewFittingLabel(state.fittingOption) });
  processRows.push({ title: '진행 내용', value: estimate.method });
  return { rows, processRows, price, showPrice, showPhotos, notice };
}

function renderReview() {
  const state = readState();
  const product = productDataFromState();
  const reviewData = reviewDataForState(state, product);
  renderProductSummary(product);

  if (reviewProductName) reviewProductName.textContent = product.name;

  const renderRows = (rows = []) => rows.map((row) => (
    `<div class="review-summary-item">`
      + `<h3>${escapeHtml(row.title)}</h3>`
      + `<p>${escapeHtml(row.value)}</p>`
    + `</div>`
  )).join('');

  if (reviewSummaryList) {
    reviewSummaryList.innerHTML = renderRows(reviewData.rows);
  }

  if (reviewProcessList) {
    reviewProcessList.innerHTML = renderRows(reviewData.processRows);
  }

  if (reviewMainNotice) reviewMainNotice.textContent = reviewData.notice;
  if (reviewProcessSection) {
    const shouldShowProcess = (reviewData.processRows || []).length > 0 || reviewData.showPrice || Boolean(reviewData.notice);
    reviewProcessSection.classList.toggle('hidden', !shouldShowProcess);
  }
  if (reviewPriceRow) reviewPriceRow.classList.toggle('hidden', !reviewData.showPrice);
  if (reviewPriceEstimate) reviewPriceEstimate.textContent = reviewData.price;

  const shippingNotice = reviewShippingNoticeLines(state);
  if (reviewShippingNotice) {
    reviewShippingNotice.classList.toggle('hidden', shippingNotice.length === 0);
    reviewShippingNotice.innerHTML = shippingNotice.map((copy) => `<p>${escapeHtml(copy)}</p>`).join('');
  }

  if (reviewPhotoSection) reviewPhotoSection.classList.toggle('hidden', !reviewData.showPhotos);
  if (reviewPhotoGrid) {
    reviewPhotoGrid.innerHTML = '';
    if (reviewData.showPhotos) {
      const photos = Array.from({ length: 3 }, () => product.image);
      photos.forEach((src) => {
        const image = document.createElement('img');
        image.src = src;
        image.alt = '';
        reviewPhotoGrid.appendChild(image);
      });
    }
  }
}

const progressivePanelSources = {
  'total-care': { url: './request-total-care.html', selector: '#total-care-detail-panel' },
  repair: { url: './request-repair.html', selector: '#repair-detail-panel' },
  consulting: { url: './request-consulting.html', selector: '#consulting-detail-panel' },
  condition: { url: './request-condition.html', selector: '#condition-detail-panel' },
  shipping: { url: './request-shipping.html', selector: '#shipping-detail-panel' },
  return: { url: './request-return.html', selector: '#shipping-detail-panel' }
};

let progressiveActiveStep = 'service';
let progressiveActiveSection = null;
let progressiveStack = [];

function isProgressiveFlow() {
  return route === 'service';
}

function initProgressiveFlow() {
  if (!isProgressiveFlow()) return;
  progressiveActiveStep = 'service';
  progressiveActiveSection = document.querySelector('.service-request-section');
  progressiveStack = [];
}

function progressiveRowsHtml(rows = []) {
  return rows
    .filter((row) => row && String(row.value || '').trim() !== '')
    .map((row) => (
      `<div class="progressive-summary-item">`
        + `<h3>${escapeHtml(row.title)}</h3>`
        + `<p>${escapeHtml(row.value)}</p>`
      + `</div>`
    ))
    .join('');
}

function progressiveSummaryTitle(step, state = readState()) {
  const titles = {
    service: '1 SERVICE REQUEST',
    'total-care': '2 Total care',
    repair: '2 Product repair',
    consulting: '2 Consultation & other',
    condition: '3 Product condition',
    shipping: needsConditionStep(state) ? '4 Shipping' : '3 Shipping',
    return: returnStepTitle(state)
  };
  return titles[step] || '';
}

function createProgressiveSummary(step, rows = []) {
  const summary = document.createElement('section');
  summary.className = 'progressive-summary-section';
  summary.dataset.progressiveStep = step;
  summary.innerHTML = `
    <div class="progressive-summary-header">
      <h2>${escapeHtml(progressiveSummaryTitle(step))}</h2>
      <button type="button" data-progressive-edit>EDIT</button>
    </div>
    <div class="progressive-summary-list">${progressiveRowsHtml(rows)}</div>
  `;
  if (step === 'condition' && conditionPhotoFiles.length) {
    const photoSection = document.createElement('div');
    photoSection.className = 'progressive-photo-section';
    photoSection.innerHTML = '<h3>Attached photos</h3><div class="progressive-photo-grid"></div>';
    const grid = photoSection.querySelector('.progressive-photo-grid');
    conditionPhotoFiles.forEach((file) => {
      const image = document.createElement('img');
      image.src = URL.createObjectURL(file);
      image.alt = '';
      grid.append(image);
    });
    summary.append(photoSection);
  }
  summary.querySelector('[data-progressive-edit]')?.addEventListener('click', () => editProgressiveSummary(summary));
  return summary;
}

async function loadProgressivePanel(step) {
  const source = progressivePanelSources[step];
  if (!source) return null;
  const response = await fetch(source.url);
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  const panel = doc.querySelector(source.selector);
  if (!panel) return null;
  const clone = panel.cloneNode(true);
  clone.classList.add('progressive-input-section');
  clone.dataset.progressiveStep = step;
  return clone;
}

function progressiveRepairParts(panel) {
  return Array.from(panel?.querySelectorAll('.repair-part-option.selected') || [])
    .map((button) => button.dataset.repairPart)
    .filter(Boolean);
}

function progressiveRepairIssue(panel) {
  return panel?.querySelector('.repair-issue-option[data-repair-issue].selected')?.dataset.repairIssue || '';
}

function progressiveRepairGuidanceType(panel, product = productDataFromState()) {
  const issue = progressiveRepairIssue(panel);
  if (!issue) return 'empty';
  const age = productWarrantyAge(product);
  if (age === 'over-seven' && ['damage', 'ornament'].includes(issue)) return 'unavailable';
  if (issue === 'damage') return age === 'under-three' ? 'damage-standard' : 'restoration';
  if (issue === 'ornament' || issue === 'parts') return age === 'under-three' ? 'total-care' : 'expired';
  return 'empty';
}

function updateProgressiveRepairGuidance(panel) {
  const activeGuide = progressiveRepairGuidanceType(panel);
  const guideMap = {
    'damage-standard': '#repair-guide-damage-standard',
    'total-care': '#repair-guide-total-care',
    restoration: '#repair-guide-restoration',
    expired: '#repair-guide-expired',
    unavailable: '#repair-guide-unavailable'
  };
  Object.values(guideMap).forEach((selector) => panel.querySelector(selector)?.classList.add('hidden'));
  panel.querySelector(guideMap[activeGuide] || '.never-match')?.classList.remove('hidden');
  panel.querySelector('#repair-guide-expired-total-care')?.classList.toggle('hidden', activeGuide !== 'expired');
  updateContinueState();
}

function progressiveConsultingType(panel) {
  return panel?.querySelector('.consulting-option.selected')?.dataset.consultingType || '';
}

function progressiveConsultingParts(panel) {
  return Array.from(panel?.querySelectorAll('.consulting-part-option.selected') || [])
    .map((button) => button.dataset.repairPart)
    .filter(Boolean);
}

function progressiveAccessoryRequests(panel) {
  return Array.from(panel?.querySelectorAll('[data-accessory-key]:checked') || []).map((input) => {
    const key = input.dataset.accessoryKey;
    const item = input.closest('.consulting-accessory-item');
    const quantity = panel.querySelector(`[data-accessory-quantity="${key}"]`)?.value || '1';
    const label = item?.querySelector('strong')?.textContent.trim() || key;
    return { key, label, quantity };
  });
}

function progressiveContactMethod(panel) {
  return panel?.querySelector('.consulting-contact-option.selected')?.dataset.contactMethod || '';
}

function syncProgressiveAccessoryItems(panel) {
  panel.querySelectorAll('.consulting-accessory-item').forEach((item) => {
    const input = item.querySelector('[data-accessory-key]');
    const select = item.querySelector('[data-accessory-quantity]');
    const selected = Boolean(input?.checked);
    item.classList.toggle('selected', selected);
    if (select) select.disabled = !selected;
  });
}

function syncProgressiveConsulting(panel) {
  const consultingType = progressiveConsultingType(panel);
  const defectExpired = consultingType === 'defect' && isDefectInquiryExpired();
  const showParts = consultingType === 'defect' && !defectExpired;
  const showAccessories = consultingType === 'parts-request';
  const showAgent = consultingType === 'agent';
  panel.querySelector('#consulting-part-group')?.classList.toggle('hidden', !showParts);
  panel.querySelector('#consulting-defect-expired')?.classList.toggle('hidden', !defectExpired);
  panel.querySelector('#consulting-accessory-group')?.classList.toggle('hidden', !showAccessories);
  panel.querySelector('#consulting-agent-panel')?.classList.toggle('hidden', !showAgent);
  panel.querySelector('.consulting-request-field')?.classList.toggle('hidden', !(showParts || showAccessories));
  if (!showParts) {
    panel.querySelectorAll('.consulting-part-option').forEach((button) => {
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
  }
  if (!showAccessories) {
    panel.querySelectorAll('[data-accessory-key]').forEach((input) => {
      input.checked = false;
    });
  }
  if (!showAgent) {
    panel.querySelectorAll('.consulting-contact-option').forEach((button) => {
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
    panel.querySelectorAll('[data-contact-detail]').forEach((detail) => detail.classList.add('hidden'));
  }
  syncProgressiveAccessoryItems(panel);
  updateContinueState();
}

function progressiveShippingValue(panel, group) {
  return panel?.querySelector(`.shipping-option.selected[data-shipping-group="${group}"]`)?.dataset.shippingValue || '';
}

function setProgressiveShippingValue(panel, group, value = '') {
  panel.querySelectorAll(`.shipping-option[data-shipping-group="${group}"]`).forEach((button) => {
    const selected = button.dataset.shippingValue === value;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function progressiveScheduleDate(panel) {
  return panel?.querySelector('.shipping-date-option.selected')?.dataset.scheduleDate || '';
}

function progressiveScheduleMode(panel) {
  if (panel?.querySelector('.shipping-option.selected[data-schedule-mode="urgent"]')) return 'urgent';
  return progressiveScheduleDate(panel) ? 'standard' : '';
}

function renderProgressiveShippingDates(panel) {
  const list = panel.querySelector('#shipping-date-list');
  if (!list) return;
  list.innerHTML = '';
  const today = new Date();
  [15, 16, 17, 18, 19, 20].forEach((offset, index) => {
    const date = addBusinessDays(today, offset);
    const disabled = index === 3;
    const value = date.toISOString().slice(0, 10);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shipping-date-option';
    button.dataset.scheduleDate = value;
    button.disabled = disabled;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<strong>${formatScheduleWeekday(date, today)}</strong><span>${formatScheduleDate(date)}</span>${disabled ? '<em>마감</em>' : ''}`;
    button.addEventListener('click', () => {
      panel.querySelectorAll('.shipping-date-option, .shipping-option[data-schedule-mode]').forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      updateContinueState();
    });
    list.append(button);
  });
}

function selectedProgressiveStoreName(panel, mode = 'shipping') {
  const listId = mode === 'return' ? '#return-store-list' : '#shipping-store-list';
  return panel.querySelector(`${listId} .shipping-store-card.selected, ${listId} .shipping-partner-card.selected`)?.dataset.storeName || '';
}

function selectedProgressiveAddressName(panel, mode = 'shipping') {
  const selector = mode === 'return' ? '.return-address-card.selected' : '.shipping-address-card.selected:not(.shipping-address-add)';
  return panel.querySelector(selector)?.querySelector('strong')?.textContent.trim() || '';
}

function syncProgressiveStoreCity(panel, mode = 'shipping') {
  const prefix = mode === 'return' ? 'return' : 'shipping';
  const cityButton = panel.querySelector(`#${prefix}-store-city-button`);
  const hasCity = Boolean(cityButton?.dataset.city);
  const showPartners = prefix === 'shipping' && readState().lensStatus === 'custom' && progressiveShippingValue(panel, 'collection') === 'store';
  panel.querySelector(`#${prefix}-store-intro`)?.classList.toggle('hidden', hasCity);
  cityButton?.classList.toggle('hidden', hasCity);
  panel.querySelector(`#${prefix}-store-city-options`)?.classList.add('hidden');
  panel.querySelector(`#${prefix}-store-list`)?.classList.toggle('hidden', !hasCity);
  if (prefix === 'shipping') {
    const selectionLabel = panel.querySelector('#shipping-store-selection-label');
    if (selectionLabel) selectionLabel.textContent = showPartners ? 'Select an optical partner in' : 'Select your pick up store in';
    panel.querySelector('#shipping-store-results')?.classList.toggle('hidden', !hasCity || showPartners);
    panel.querySelector('#shipping-partner-results')?.classList.toggle('hidden', !hasCity || !showPartners);
  }
}

function syncProgressiveShipping(panel) {
  const state = readState();
  const collectionMethod = progressiveShippingValue(panel, 'collection');
  const alert = panel.querySelector('#shipping-collection-alert');
  if (alert) {
    alert.classList.toggle('hidden', !collectionMethod);
    alert.innerHTML = collectionMethod
      ? shippingCollectionCopy(collectionMethod).map((copy) => `<p>${escapeHtml(copy)}</p>`).join('')
      : '';
  }
  panel.querySelector('#shipping-address-section')?.classList.toggle('hidden', collectionMethod !== 'pickup');
  panel.querySelector('#shipping-store-section')?.classList.toggle('hidden', collectionMethod !== 'store');
  panel.querySelector('#custom-lens-pickup-notice')?.classList.toggle('hidden', state.lensStatus !== 'custom' || collectionMethod !== 'pickup');
  panel.querySelector('#custom-lens-store-guide')?.classList.toggle('hidden', state.lensStatus !== 'custom' || collectionMethod !== 'store');
  panel.querySelector('#total-care-schedule-section')?.classList.toggle('hidden', !isTotalCareRequest(state));
  syncProgressiveStoreCity(panel, 'shipping');
}

function syncProgressiveReturn(panel) {
  const method = progressiveShippingValue(panel, 'return');
  const accessoryOnly = isAccessoryOnlyRequest();
  panel.querySelectorAll('.shipping-option[data-shipping-group="return"]').forEach((button) => {
    button.classList.toggle('hidden', accessoryOnly && button.dataset.shippingValue !== 'home');
  });
  panel.querySelector('#return-address-section')?.classList.toggle('hidden', method !== 'home');
  panel.querySelector('#return-store-section')?.classList.toggle('hidden', accessoryOnly || method !== 'store');
  syncProgressiveStoreCity(panel, 'return');
}

function bindProgressivePanel(step, panel) {
  if (step === 'total-care') {
    panel.querySelector('#expired-warranty-consent')?.classList.toggle('hidden', !requiresExpiredWarrantyConsent());
    panel.querySelectorAll('input[name="fitting-option"]').forEach((input) => {
      input.addEventListener('change', () => {
        panel.querySelectorAll('.fitting-option').forEach((label) => {
          label.classList.toggle('selected', Boolean(label.querySelector('input')?.checked));
        });
        updateContinueState();
      });
    });
    panel.querySelector('#expiry-consent-check')?.addEventListener('change', updateContinueState);
  }

  if (step === 'repair') {
    panel.querySelectorAll('.repair-part-option').forEach((button) => {
      button.addEventListener('click', () => {
        button.classList.toggle('selected');
        button.setAttribute('aria-pressed', String(button.classList.contains('selected')));
        updateProgressiveRepairGuidance(panel);
      });
    });
    panel.querySelectorAll('.repair-issue-option[data-repair-issue]').forEach((button) => {
      button.addEventListener('click', () => {
        panel.querySelectorAll('.repair-issue-option[data-repair-issue]').forEach((item) => {
          item.classList.remove('selected');
          item.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
        updateProgressiveRepairGuidance(panel);
      });
    });
    panel.querySelector('#restoration-consent-check')?.addEventListener('change', updateContinueState);
    panel.querySelector('#repair-expired-consent-check')?.addEventListener('change', updateContinueState);
  }

  if (step === 'consulting') {
    panel.querySelectorAll('.consulting-option').forEach((button) => {
      button.addEventListener('click', () => {
        panel.querySelectorAll('.consulting-option').forEach((item) => {
          item.classList.remove('selected');
          item.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
        syncProgressiveConsulting(panel);
      });
    });
    panel.querySelectorAll('.consulting-part-option').forEach((button) => {
      button.addEventListener('click', () => {
        button.classList.toggle('selected');
        button.setAttribute('aria-pressed', String(button.classList.contains('selected')));
        updateContinueState();
      });
    });
    panel.querySelectorAll('[data-accessory-key]').forEach((input) => {
      input.addEventListener('change', () => {
        syncProgressiveAccessoryItems(panel);
        updateContinueState();
      });
    });
    panel.querySelectorAll('[data-accessory-quantity]').forEach((select) => {
      select.disabled = true;
      select.addEventListener('change', updateContinueState);
    });
    panel.querySelectorAll('.consulting-contact-option').forEach((button) => {
      button.addEventListener('click', () => {
        panel.querySelectorAll('.consulting-contact-option').forEach((item) => {
          item.classList.remove('selected');
          item.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
        panel.querySelectorAll('[data-contact-detail]').forEach((detail) => {
          detail.classList.toggle('hidden', detail.dataset.contactDetail !== button.dataset.contactMethod);
        });
      });
    });
  }

  if (step === 'condition') {
    const upload = panel.querySelector('#condition-photo-upload');
    const uploadButton = panel.querySelector('#condition-photo-upload-button');
    const list = panel.querySelector('#condition-photo-upload-list');
    const renderFiles = () => {
      if (!list) return;
      list.innerHTML = '';
      conditionPhotoFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'manual-upload-item';
        item.innerHTML = `<img alt=""><span>${escapeHtml(file.name)}</span><button type="button">Remove</button>`;
        item.querySelector('img').src = URL.createObjectURL(file);
        item.querySelector('button').addEventListener('click', () => {
          conditionPhotoFiles = conditionPhotoFiles.filter((_, fileIndex) => fileIndex !== index);
          renderFiles();
          updateContinueState();
        });
        list.append(item);
      });
    };
    uploadButton?.addEventListener('click', () => upload?.click());
    upload?.addEventListener('change', () => {
      conditionPhotoFiles = [...conditionPhotoFiles, ...Array.from(upload.files || [])].slice(0, 3);
      upload.value = '';
      renderFiles();
      updateContinueState();
    });
    panel.querySelectorAll('input[name="lens-status"]').forEach((input) => {
      input.addEventListener('change', () => {
        panel.querySelectorAll('.fitting-option').forEach((label) => {
          label.classList.toggle('selected', Boolean(label.querySelector('input')?.checked));
        });
        updateContinueState();
      });
    });
  }

  if (step === 'shipping') {
    renderProgressiveShippingDates(panel);
    panel.querySelectorAll('.shipping-option[data-shipping-group="collection"]').forEach((button) => {
      button.addEventListener('click', () => {
        setProgressiveShippingValue(panel, 'collection', button.dataset.shippingValue);
        const cityButton = panel.querySelector('#shipping-store-city-button');
        if (cityButton) cityButton.dataset.city = '';
        panel.querySelectorAll('#shipping-store-list .shipping-store-card, #shipping-store-list .shipping-partner-card').forEach((card) => {
          card.classList.remove('selected');
          card.setAttribute('aria-pressed', 'false');
        });
        syncProgressiveShipping(panel);
        updateContinueState();
      });
    });
    panel.querySelectorAll('.shipping-option[data-schedule-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        panel.querySelectorAll('.shipping-option[data-schedule-mode], .shipping-date-option').forEach((item) => {
          item.classList.remove('selected');
          item.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
        updateContinueState();
      });
    });
    const cityButton = panel.querySelector('#shipping-store-city-button');
    const cityOptions = panel.querySelector('#shipping-store-city-options');
    cityButton?.addEventListener('click', () => {
      const expanded = cityButton.getAttribute('aria-expanded') === 'true';
      cityButton.setAttribute('aria-expanded', String(!expanded));
      cityOptions?.classList.toggle('hidden', expanded);
    });
    panel.querySelectorAll('.shipping-city-option').forEach((button) => {
      button.addEventListener('click', () => {
        if (cityButton) cityButton.dataset.city = button.dataset.city || '';
        syncProgressiveShipping(panel);
        updateContinueState();
      });
    });
    panel.querySelector('#shipping-store-city-change')?.addEventListener('click', () => {
      if (cityButton) cityButton.dataset.city = '';
      syncProgressiveShipping(panel);
      cityOptions?.classList.remove('hidden');
      updateContinueState();
    });
    panel.querySelectorAll('.shipping-address-card:not(.shipping-address-add), .shipping-store-card, .shipping-partner-card').forEach((card) => {
      card.addEventListener('click', () => {
        const selector = card.classList.contains('shipping-address-card') ? '.shipping-address-card:not(.shipping-address-add)' : '.shipping-store-card, .shipping-partner-card';
        panel.querySelectorAll(selector).forEach((item) => {
          item.classList.remove('selected');
          item.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
        updateContinueState();
      });
    });
    panel.querySelector('#shipping-package-consent-check')?.addEventListener('change', updateContinueState);
    panel.querySelector('#custom-lens-consent-check')?.addEventListener('change', updateContinueState);
    syncProgressiveShipping(panel);
  }

  if (step === 'return') {
    panel.querySelectorAll('.shipping-option[data-shipping-group="return"]').forEach((button) => {
      button.addEventListener('click', () => {
        setProgressiveShippingValue(panel, 'return', button.dataset.shippingValue);
        syncProgressiveReturn(panel);
        updateContinueState();
      });
    });
    const cityButton = panel.querySelector('#return-store-city-button');
    const cityOptions = panel.querySelector('#return-store-city-options');
    cityButton?.addEventListener('click', () => {
      const expanded = cityButton.getAttribute('aria-expanded') === 'true';
      cityButton.setAttribute('aria-expanded', String(!expanded));
      cityOptions?.classList.toggle('hidden', expanded);
    });
    panel.querySelectorAll('.return-city-option').forEach((button) => {
      button.addEventListener('click', () => {
        if (cityButton) cityButton.dataset.city = button.dataset.city || '';
        syncProgressiveReturn(panel);
        updateContinueState();
      });
    });
    panel.querySelector('#return-store-city-change')?.addEventListener('click', () => {
      if (cityButton) cityButton.dataset.city = '';
      syncProgressiveReturn(panel);
      cityOptions?.classList.remove('hidden');
      updateContinueState();
    });
    panel.querySelectorAll('.return-address-card, .return-store-card').forEach((card) => {
      card.addEventListener('click', () => {
        const selector = card.classList.contains('return-address-card') ? '.return-address-card' : '.return-store-card';
        panel.querySelectorAll(selector).forEach((item) => {
          item.classList.remove('selected');
          item.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
        updateContinueState();
      });
    });
    syncProgressiveReturn(panel);
  }
}

function saveProgressiveStep(step, panel) {
  if (step === 'service') {
    saveServiceSelection();
    conditionPhotoFiles = [];
    return [{ title: '선택한 서비스', value: readState().serviceLabel }];
  }
  if (step === 'total-care') {
    const fittingOption = panel.querySelector('input[name="fitting-option"]:checked')?.value || 'restore';
    const request = panel.querySelector('#service-request-textarea')?.value.trim() || '';
    mergeState({
      serviceType: 'total-care',
      fittingOption,
      serviceRequest: request,
      expiredWarrantyConsent: Boolean(panel.querySelector('#expiry-consent-check')?.checked)
    });
    const rows = [
      { title: '피팅 옵션', value: reviewFittingLabel(fittingOption) }
    ];
    appendProgressiveRequestRow(rows, request);
    return rows;
  }
  if (step === 'repair') {
    const repairParts = progressiveRepairParts(panel);
    const repairIssue = progressiveRepairIssue(panel);
    const request = panel.querySelector('#repair-request-textarea')?.value.trim() || '';
    mergeState({
      serviceType: 'repair',
      repairParts,
      repairIssue,
      repairGuide: progressiveRepairGuidanceType(panel),
      repairRequest: request,
      restorationConsent: Boolean(panel.querySelector('#restoration-consent-check')?.checked),
      repairExpiredConsent: Boolean(panel.querySelector('#repair-expired-consent-check')?.checked)
    });
    const rows = [
      { title: '문제 부위', value: reviewPartList(repairParts) },
      { title: '문제 증상', value: reviewIssueLabel(readState()) }
    ];
    appendReviewRequestRow(rows, request);
    return rows;
  }
  if (step === 'consulting') {
    const consultingType = progressiveConsultingType(panel);
    const consultingParts = consultingType === 'defect' ? progressiveConsultingParts(panel) : [];
    const accessoryRequests = consultingType === 'parts-request' ? progressiveAccessoryRequests(panel) : [];
    const request = panel.querySelector('#consulting-request-textarea')?.value.trim() || '';
    mergeState({
      serviceType: 'consulting',
      consultingType,
      consultingParts,
      accessoryRequests,
      consultingContactMethod: consultingType === 'agent' ? progressiveContactMethod(panel) : '',
      consultingRequest: request
    });
    const labels = { defect: '제품 결함 & 이상 문의', 'parts-request': '부속품 요청', agent: '상담원 연결' };
    const rows = [{ title: '문의 유형', value: labels[consultingType] || '' }];
    if (consultingType === 'defect') rows.push({ title: '문제 부위', value: reviewPartList(consultingParts) });
    if (consultingType === 'parts-request') rows.push({ title: '부속품', value: reviewAccessoryList(accessoryRequests) });
    appendReviewRequestRow(rows, request);
    return rows;
  }
  if (step === 'condition') {
    const lensStatus = panel.querySelector('input[name="lens-status"]:checked')?.value || '';
    mergeState({
      conditionPhotoNames: conditionPhotoFiles.map((file) => file.name),
      lensStatus
    });
    return [{ title: '렌즈 유형', value: reviewLensLabel(lensStatus) }];
  }
  if (step === 'shipping') {
    const collectionMethod = progressiveShippingValue(panel, 'collection');
    const storeCity = collectionMethod === 'store' ? panel.querySelector('#shipping-store-city-button')?.dataset.city || '' : '';
    const storeName = collectionMethod === 'store' ? selectedProgressiveStoreName(panel, 'shipping') : '';
    const addressName = collectionMethod === 'pickup' ? selectedProgressiveAddressName(panel, 'shipping') : '';
    const scheduleMode = progressiveScheduleMode(panel);
    const scheduleDate = scheduleMode === 'standard' ? progressiveScheduleDate(panel) : '';
    mergeState({
      collectionMethod,
      storeCity,
      storeName,
      shippingPackageConsent: Boolean(panel.querySelector('#shipping-package-consent-check')?.checked),
      customLensConsent: Boolean(panel.querySelector('#custom-lens-consent-check')?.checked),
      serviceScheduleMode: scheduleMode,
      shippingScheduleDate: scheduleDate,
      shippingTouched: true
    });
    const rows = [{ title: '발송 방법', value: collectionMethod === 'store' ? '스토어 방문' : '무료 택배 픽업' }];
    if (addressName) rows.push({ title: '픽업 주소', value: addressName });
    if (storeName) rows.push({ title: '방문 매장', value: storeName });
    if (scheduleMode) rows.push({ title: '서비스 일정', value: scheduleMode === 'urgent' ? '긴급 서비스' : reviewDateLabel(scheduleDate) });
    return rows;
  }
  if (step === 'return') {
    const returnMethod = progressiveShippingValue(panel, 'return');
    const returnAddressName = returnMethod === 'home' ? selectedProgressiveAddressName(panel, 'return') : '';
    const returnStoreCity = returnMethod === 'store' ? panel.querySelector('#return-store-city-button')?.dataset.city || '' : '';
    const returnStoreName = returnMethod === 'store' ? selectedProgressiveStoreName(panel, 'return') : '';
    mergeState({
      returnMethod,
      returnAddressName,
      returnStoreCity,
      returnStoreName,
      returnTouched: true
    });
    return [
      { title: '수령 방법', value: returnMethod === 'store' ? '매장 픽업' : '자택 배송' },
      { title: returnMethod === 'store' ? '수령 매장' : '수령 주소', value: returnStoreName || returnAddressName }
    ];
  }
  return [];
}

function nextProgressiveStepAfter(step) {
  const state = readState();
  if (step === 'service') return state.serviceType || '';
  if (step === 'total-care' || step === 'repair' || step === 'consulting') {
    if (needsConditionStep(state)) return 'condition';
    if (isAccessoryOnlyRequest(state)) return 'return';
    return 'shipping';
  }
  if (step === 'condition') return 'shipping';
  if (step === 'shipping') return 'return';
  if (step === 'return') return 'review';
  return '';
}

function canContinueProgressive() {
  const panel = progressiveActiveSection;
  const step = progressiveActiveStep;
  if (!panel) return false;
  if (step === 'service') return selectedServiceOptions().length > 0;
  if (step === 'total-care') {
    const needsExpiry = !panel.querySelector('#expired-warranty-consent')?.classList.contains('hidden');
    return !needsExpiry || Boolean(panel.querySelector('#expiry-consent-check')?.checked);
  }
  if (step === 'repair') {
    const guide = progressiveRepairGuidanceType(panel);
    if (!progressiveRepairParts(panel).length || !progressiveRepairIssue(panel)) return false;
    if (guide === 'restoration') return Boolean(panel.querySelector('#restoration-consent-check')?.checked);
    if (guide === 'expired') return Boolean(panel.querySelector('#repair-expired-consent-check')?.checked);
    return guide !== 'empty' && guide !== 'unavailable';
  }
  if (step === 'consulting') {
    const type = progressiveConsultingType(panel);
    if (!type) return false;
    if (type === 'defect') {
      if (isDefectInquiryExpired()) return false;
      return progressiveConsultingParts(panel).length > 0;
    }
    if (type === 'parts-request') return progressiveAccessoryRequests(panel).length > 0;
    return false;
  }
  if (step === 'condition') return conditionPhotoFiles.length > 0 && Boolean(panel.querySelector('input[name="lens-status"]:checked'));
  if (step === 'shipping') {
    const state = readState();
    const method = progressiveShippingValue(panel, 'collection');
    if (!method || !panel.querySelector('#shipping-package-consent-check')?.checked) return false;
    if (method === 'store' && (!panel.querySelector('#shipping-store-city-button')?.dataset.city || !selectedProgressiveStoreName(panel, 'shipping'))) return false;
    if (isTotalCareRequest(state)) {
      const scheduleMode = progressiveScheduleMode(panel);
      if (!scheduleMode) return false;
      if (scheduleMode === 'standard' && !progressiveScheduleDate(panel)) return false;
    }
    if (state.lensStatus === 'custom' && method === 'pickup') return Boolean(panel.querySelector('#custom-lens-consent-check')?.checked);
    return true;
  }
  if (step === 'return') {
    const method = progressiveShippingValue(panel, 'return');
    if (!method) return false;
    if (method === 'home') return Boolean(selectedProgressiveAddressName(panel, 'return'));
    if (method === 'store') return Boolean(panel.querySelector('#return-store-city-button')?.dataset.city && selectedProgressiveStoreName(panel, 'return'));
    return false;
  }
  return false;
}

async function handleProgressiveNext() {
  if (!canContinueProgressive()) return;

  const currentSection = progressiveActiveSection;
  const rows = saveProgressiveStep(progressiveActiveStep, currentSection);
  const nextStep = nextProgressiveStepAfter(progressiveActiveStep);

  if (nextStep === 'review') {
    navigateTo('./request-review.html');
    return;
  }

  const summary = createProgressiveSummary(progressiveActiveStep, rows);
  currentSection.classList.add('hidden');
  currentSection.after(summary);
  progressiveStack.push({ step: progressiveActiveStep, section: currentSection, summary });

  const nextPanel = await loadProgressivePanel(nextStep);
  if (!nextPanel) {
    navigateTo(nextAfterDetailUrl(readState()));
    return;
  }

  summary.after(nextPanel);
  progressiveActiveStep = nextStep;
  progressiveActiveSection = nextPanel;
  bindProgressivePanel(nextStep, nextPanel);
  updateContinueState();
  nextPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleProgressivePrevious() {
  navigateTo(routeMap.service.prev);
}

function editProgressiveSummary(summary) {
  const targetIndex = progressiveStack.findIndex((entry) => entry.summary === summary);
  if (targetIndex < 0) return;

  const target = progressiveStack[targetIndex];

  if (progressiveActiveSection && progressiveActiveSection !== target.section && progressiveActiveSection.dataset.progressiveStep !== 'service') {
    progressiveActiveSection.remove();
  }

  progressiveStack.slice(targetIndex + 1).forEach((entry) => {
    entry.summary.remove();
    if (entry.section.dataset.progressiveStep !== 'service') entry.section.remove();
  });

  target.summary.remove();
  target.section.classList.remove('hidden');
  progressiveStack = progressiveStack.slice(0, targetIndex);
  progressiveActiveStep = target.step;
  progressiveActiveSection = target.section;
  updateContinueState();
  target.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function canContinue() {
  if (route === 'products') return isManualEntryOpen() ? isManualEntryComplete() : hasSelectedProduct();
  if (route === 'terms') return areTermsAgreed();
  if (isProgressiveFlow()) return canContinueProgressive();
  if (route === 'service') return selectedServiceOptions().length > 0;
  if (route === 'condition') return hasConditionPhotos() && Boolean(selectedLensStatus());
  if (route === 'shipping') return canContinueShipping();
  if (route === 'return') return canContinueReturn();
  if (isDetailRoute() && isTotalCareSelected() && requiresExpiredWarrantyConsent()) {
    return Boolean(expiryConsentCheck?.checked);
  }
  if (isDetailRoute() && isRepairSelected()) {
    const guide = repairGuidanceType();
    if (!selectedRepairParts().length || !selectedRepairIssue()) return false;
    if (guide === 'restoration') return Boolean(restorationConsentCheck?.checked);
    if (guide === 'expired') return Boolean(repairExpiredConsentCheck?.checked);
    if (guide === 'unavailable') return false;
    return guide !== 'empty';
  }
  if (isDetailRoute() && isConsultingSelected()) {
    const consultingType = selectedConsultingType();
    if (!consultingType) return false;
    if (consultingType === 'defect') {
      if (isDefectInquiryExpired()) return false;
      return selectedConsultingParts().length > 0;
    }
    if (consultingType === 'parts-request') return selectedAccessoryRequests().length > 0;
    if (consultingType === 'agent') return false;
    return true;
  }
  return true;
}

function updateContinueState() {
  if (!nextButton) return;
  nextButton.disabled = !canContinue();
}

function setManualEntry(open) {
  if (productSelectionList) productSelectionList.classList.toggle('hidden', open);
  if (manualEntryPrompt) manualEntryPrompt.classList.toggle('hidden', open);
  if (manualEntryPanel) manualEntryPanel.classList.toggle('hidden', !open);
  updateContinueState();
}

function renderManualProofFiles(files = manualProofFiles) {
  if (!manualProofUploadList) return;
  manualProofUploadList.innerHTML = '';

  const selectedFiles = Array.from(files).slice(0, 3);
  manualProofFiles = selectedFiles;

  selectedFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'manual-upload-item';

    const preview = document.createElement('img');
    preview.alt = '';
    preview.src = URL.createObjectURL(file);

    const name = document.createElement('span');
    name.textContent = file.name;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      renderManualProofFiles(manualProofFiles.filter((_, fileIndex) => fileIndex !== index));
      updateContinueState();
    });

    item.append(preview, name, removeButton);
    manualProofUploadList.append(item);
  });

  updateContinueState();
}

function renderConsultingImageFiles(files = consultingImageFiles) {
  if (!consultingImageUploadList) return;
  consultingImageUploadList.innerHTML = '';

  const selectedFiles = Array.from(files).slice(0, 3);
  consultingImageFiles = selectedFiles;

  selectedFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'manual-upload-item';

    const preview = document.createElement('img');
    preview.alt = '';
    preview.src = URL.createObjectURL(file);

    const name = document.createElement('span');
    name.textContent = file.name;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      renderConsultingImageFiles(consultingImageFiles.filter((_, fileIndex) => fileIndex !== index));
    });

    item.append(preview, name, removeButton);
    consultingImageUploadList.append(item);
  });
}

function renderConditionPhotoFiles(files = conditionPhotoFiles) {
  if (!conditionPhotoUploadList) return;
  conditionPhotoUploadList.innerHTML = '';

  const selectedFiles = Array.from(files).slice(0, 3);
  conditionPhotoFiles = selectedFiles;

  selectedFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'manual-upload-item';

    const preview = document.createElement('img');
    preview.alt = '';
    preview.src = URL.createObjectURL(file);

    const name = document.createElement('span');
    name.textContent = file.name;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      renderConditionPhotoFiles(conditionPhotoFiles.filter((_, fileIndex) => fileIndex !== index));
      updateContinueState();
    });

    item.append(preview, name, removeButton);
    conditionPhotoUploadList.append(item);
  });

  updateContinueState();
}

function handleNext() {
  if (isProgressiveFlow()) {
    handleProgressiveNext();
    return;
  }

  if (route === 'products') {
    if (!canContinue()) return;
    saveProductForRouting();
    navigateTo(routeMap.products.next);
    return;
  }

  if (route === 'terms') {
    if (!saveTermsAgreement()) {
      updateContinueState();
      return;
    }
    navigateTo(routeMap.terms.next);
    return;
  }

  if (route === 'service') {
    if (!canContinue()) return;
    const serviceType = saveServiceSelection();
    navigateTo(serviceDetailUrl(serviceType));
    return;
  }

  if (isDetailRoute()) {
    if (!canContinue()) return;
    saveRepairDetail();
    navigateTo(nextAfterDetailUrl(readState()));
    return;
  }

  if (route === 'condition') {
    if (!canContinue()) return;
    saveConditionDetail();
    navigateTo(routeMap.condition.next);
    return;
  }

  if (route === 'shipping') {
    if (!canContinue()) return;
    saveShippingDetail();
    navigateTo(routeMap.shipping.next);
    return;
  }

  if (route === 'return') {
    if (!canContinue()) return;
    saveReturnDetail();
    navigateTo(routeMap.return.next);
    return;
  }

  if (route === 'review') {
    navigateTo(routeMap.review.next);
  }
}

function handlePrevious() {
  if (isProgressiveFlow()) {
    handleProgressivePrevious();
    return;
  }

  if (route === 'condition') {
    navigateTo(previousDetailUrl());
    return;
  }

  if (route === 'shipping') {
    navigateTo(needsConditionStep(readState()) ? './request-condition.html' : previousDetailUrl());
    return;
  }

  if (route === 'return') {
    navigateTo(isAccessoryOnlyRequest(readState()) ? previousDetailUrl() : './request-shipping.html');
    return;
  }

  navigateTo(routeMap[route]?.prev || './start.html');
}

function bindSelectableCards() {
  document.querySelectorAll('.selectable').forEach((card) => {
    card.addEventListener('click', () => {
      const group = card.parentElement.querySelectorAll('.selectable');
      group.forEach((item) => {
        item.classList.remove('selected');
        const label = item.querySelector(':scope > span');
        if (label) label.textContent = '선택 →';
      });
      card.classList.add('selected');
      const selectedLabel = card.querySelector(':scope > span');
      if (selectedLabel) selectedLabel.textContent = '선택됨 →';
      updateContinueState();
    });
  });
}

function bindProductCards() {
  document.querySelectorAll('.product-selectable').forEach((card) => {
    card.addEventListener('click', () => {
      const group = card.parentElement.querySelectorAll('.product-selectable');
      group.forEach((item) => item.classList.remove('selected'));
      card.classList.add('selected');
      updateContinueState();
    });
  });
}

function bindServiceOptions() {
  document.querySelectorAll('.service-option').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.service-option').forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      updateContinueState();
    });
  });
}

function bindFittingOptions() {
  document.querySelectorAll('input[name="fitting-option"]').forEach((input) => {
    input.addEventListener('change', syncFittingOptions);
  });

  if (expiryConsentCheck) {
    expiryConsentCheck.addEventListener('change', updateContinueState);
  }
}

function bindConditionOptions() {
  document.querySelectorAll('input[name="lens-status"]').forEach((input) => {
    input.addEventListener('change', () => {
      syncLensOptions();
      updateContinueState();
    });
  });

  if (conditionPhotoUploadButton && conditionPhotoUpload) {
    conditionPhotoUploadButton.addEventListener('click', () => conditionPhotoUpload.click());

    conditionPhotoUpload.addEventListener('change', () => {
      const nextFiles = [...conditionPhotoFiles, ...Array.from(conditionPhotoUpload.files)].slice(0, 3);
      renderConditionPhotoFiles(nextFiles);
      conditionPhotoUpload.value = '';
    });
  }
}

function bindShippingOptions() {
  document.querySelectorAll('.shipping-option[data-shipping-group]').forEach((button) => {
    button.addEventListener('click', () => {
      const previousValue = selectedShippingValue(button.dataset.shippingGroup);
      setShippingValue(button.dataset.shippingGroup, button.dataset.shippingValue);
      if (button.dataset.shippingGroup === 'collection' && previousValue !== button.dataset.shippingValue) {
        setStoreCity('');
        setShippingStoreName('');
      }
      if (button.dataset.shippingGroup === 'return' && previousValue !== button.dataset.shippingValue) {
        setReturnStoreCity('');
        setReturnStoreName('');
      }
      syncShippingPanels();
      syncReturnPanels();
      updateContinueState();
    });
  });

  document.querySelectorAll('.shipping-option[data-schedule-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      setScheduleMode(button.dataset.scheduleMode);
      document.querySelectorAll('.shipping-date-option').forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      syncShippingPanels();
      updateContinueState();
    });
  });

  if (shippingStoreCityButton) {
    shippingStoreCityButton.addEventListener('click', () => {
      const expanded = shippingStoreCityButton.getAttribute('aria-expanded') === 'true';
      shippingStoreCityButton.setAttribute('aria-expanded', String(!expanded));
      if (shippingStoreCityOptions) shippingStoreCityOptions.classList.toggle('hidden', expanded);
    });
  }

  document.querySelectorAll('.shipping-city-option').forEach((button) => {
    button.addEventListener('click', () => {
      setStoreCity(button.dataset.city || '');
      setShippingStoreName('');
      syncShippingPanels();
      updateContinueState();
    });
  });

  if (shippingStoreCityChange) {
    shippingStoreCityChange.addEventListener('click', () => {
      setStoreCity('');
      setShippingStoreName('');
      syncShippingPanels();
      if (shippingStoreCityButton) {
        shippingStoreCityButton.setAttribute('aria-expanded', 'true');
        if (shippingStoreCityOptions) shippingStoreCityOptions.classList.remove('hidden');
      }
      updateContinueState();
    });
  }

  if (returnStoreCityButton) {
    returnStoreCityButton.addEventListener('click', () => {
      const expanded = returnStoreCityButton.getAttribute('aria-expanded') === 'true';
      returnStoreCityButton.setAttribute('aria-expanded', String(!expanded));
      if (returnStoreCityOptions) returnStoreCityOptions.classList.toggle('hidden', expanded);
    });
  }

  document.querySelectorAll('.return-city-option').forEach((button) => {
    button.addEventListener('click', () => {
      setReturnStoreCity(button.dataset.city || '');
      setReturnStoreName('');
      syncReturnPanels();
      updateContinueState();
    });
  });

  if (returnStoreCityChange) {
    returnStoreCityChange.addEventListener('click', () => {
      setReturnStoreCity('');
      setReturnStoreName('');
      syncReturnPanels();
      if (returnStoreCityButton) {
        returnStoreCityButton.setAttribute('aria-expanded', 'true');
        if (returnStoreCityOptions) returnStoreCityOptions.classList.remove('hidden');
      }
      updateContinueState();
    });
  }

  document.querySelectorAll('.shipping-address-card:not(.shipping-address-add), .shipping-store-card').forEach((card) => {
    card.addEventListener('click', () => {
      const group = card.classList.contains('shipping-address-card') ? '.shipping-address-card:not(.shipping-address-add)' : '.shipping-store-card';
      document.querySelectorAll(group).forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
      updateContinueState();
    });
  });

  document.querySelectorAll('.shipping-partner-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.shipping-partner-card').forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
      updateContinueState();
    });
  });

  [shippingPackageConsentCheck, customLensConsentCheck].forEach((input) => {
    if (input) input.addEventListener('change', updateContinueState);
  });
}

function bindRepairOptions() {
  document.querySelectorAll('#repair-detail-panel .repair-part-option').forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.toggle('selected');
      button.setAttribute('aria-pressed', String(button.classList.contains('selected')));
      updateRepairGuidance();
    });
  });

  document.querySelectorAll('.repair-issue-option[data-repair-issue]').forEach((button) => {
    button.addEventListener('click', () => {
      setRepairIssue(button.dataset.repairIssue || '');
      updateRepairGuidance();
    });
  });

  [restorationConsentCheck, repairExpiredConsentCheck].forEach((input) => {
    if (input) input.addEventListener('change', updateContinueState);
  });

  document.querySelectorAll('[data-switch-total-care]').forEach((button) => {
    button.addEventListener('click', switchToTotalCare);
  });

  document.querySelectorAll('[data-select-parts-issue]').forEach((button) => {
    button.addEventListener('click', () => {
      setRepairIssue('parts');
      updateRepairGuidance();
    });
  });
}

function bindConsultingOptions() {
  document.querySelectorAll('.consulting-option').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.consulting-option').forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      syncConsultingPanels();
      updateContinueState();
    });
  });

  document.querySelectorAll('.consulting-part-option').forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.toggle('selected');
      button.setAttribute('aria-pressed', String(button.classList.contains('selected')));
      updateContinueState();
    });
  });

  document.querySelectorAll('[data-accessory-key]').forEach((input) => {
    input.addEventListener('change', () => {
      syncAccessoryItems();
      updateContinueState();
    });
  });

  document.querySelectorAll('[data-accessory-quantity]').forEach((select) => {
    select.addEventListener('change', updateContinueState);
  });

  document.querySelectorAll('.consulting-contact-option').forEach((button) => {
    button.addEventListener('click', () => {
      setConsultingContactMethod(button.dataset.contactMethod || '');
      syncConsultingContactPanels();
      updateContinueState();
    });
  });

  if (consultingLiveChatOpen && consultingLiveChat) {
    consultingLiveChatOpen.addEventListener('click', () => {
      consultingLiveChat.classList.remove('hidden');
    });

    document.querySelectorAll('[data-live-chat-close]').forEach((button) => {
      button.addEventListener('click', () => {
        consultingLiveChat.classList.add('hidden');
      });
    });
  }

  if (consultingImageUploadButton && consultingImageUpload) {
    consultingImageUploadButton.addEventListener('click', () => consultingImageUpload.click());

    consultingImageUpload.addEventListener('change', () => {
      const nextFiles = [...consultingImageFiles, ...Array.from(consultingImageUpload.files)].slice(0, 3);
      renderConsultingImageFiles(nextFiles);
      consultingImageUpload.value = '';
    });
  }
}

function bindManualEntry() {
  if (manualEntryOpenButton) {
    manualEntryOpenButton.addEventListener('click', () => setManualEntry(true));
  }

  if (manualEntryCloseButton) {
    manualEntryCloseButton.addEventListener('click', () => setManualEntry(false));
  }

  if (manualProofUploadButton && manualProofUpload) {
    manualProofUploadButton.addEventListener('click', () => manualProofUpload.click());

    manualProofUpload.addEventListener('change', () => {
      const nextFiles = [...manualProofFiles, ...Array.from(manualProofUpload.files)].slice(0, 3);
      renderManualProofFiles(nextFiles);
      manualProofUpload.value = '';
    });
  }

  document.querySelectorAll('.searchable-field').forEach((field) => {
    const input = field.querySelector('input');
    const suggestions = Array.from(field.querySelectorAll('.manual-suggestion-list button'));
    const updateSuggestions = () => {
      if (!input) return;
      const query = input.value.trim().toLowerCase();
      let visibleCount = 0;

      suggestions.forEach((button) => {
        const matches = query.length > 0 && button.textContent.trim().toLowerCase().includes(query);
        const visible = matches && visibleCount < 3;
        button.classList.toggle('hidden', !visible);
        if (visible) visibleCount += 1;
      });

      field.classList.toggle('has-query', visibleCount > 0);
    };

    if (input) {
      input.addEventListener('input', () => {
        updateSuggestions();
        if (input === manualProductNameInput) updateManualSerialPlaceholder(input.value.trim());
        updateContinueState();
      });

      input.addEventListener('blur', () => {
        window.setTimeout(() => field.classList.remove('has-query'), 120);
      });
    }

    suggestions.forEach((button) => {
      button.addEventListener('click', () => {
        const selectedValue = button.textContent.trim().split(' · ')[0];
        if (input) input.value = selectedValue;
        if (input === manualProductNameInput) updateManualSerialPlaceholder(selectedValue);
        field.classList.remove('has-query');
        updateContinueState();
      });
    });
  });

  [manualProductNameInput, manualPurchaseStoreInput, manualDateInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', updateContinueState);
    input.addEventListener('change', updateContinueState);
  });
}

function bindChips() {
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
    });
  });
}

function init() {
  if (screenStatus && routeMap[route]) screenStatus.textContent = routeMap[route].status;
  if (nextButton) nextButton.textContent = route === 'review' ? 'SUBMIT' : 'CONTINUE';

  bindSelectableCards();
  bindProductCards();
  bindServiceOptions();
  bindFittingOptions();
  bindConditionOptions();
  bindShippingOptions();
  bindRepairOptions();
  bindConsultingOptions();
  bindManualEntry();
  bindChips();

  if (route === 'terms') renderTermsScreen();
  if (route === 'service') {
    renderServiceScreen();
    initProgressiveFlow();
  }
  if (isDetailRoute()) renderDetailScreen();
  if (route === 'condition') renderConditionScreen();
  if (route === 'shipping') renderShippingScreen();
  if (route === 'return') renderReturnScreen();
  if (route === 'review') renderReview();

  if (prevButton) prevButton.addEventListener('click', handlePrevious);
  if (nextButton) nextButton.addEventListener('click', handleNext);

  if (resetButton) {
    resetButton.addEventListener('click', () => navigateTo('./request.html'));
  }

  updateContinueState();
}

init();
