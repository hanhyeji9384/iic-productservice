/* Language / Region modal — injected into all pages */
(function () {
  var COUNTRY_MAP = {
    kr: { currency: 'krw', lang: 'ko' },
    us: { currency: 'usd', lang: 'en' }
  };

  var COUNTRY_LABEL = {
    kr: 'South Korea',
    us: 'United States'
  };

  function applyCountryToPage(country) {
    var label = COUNTRY_LABEL[country] || country;
    document.querySelectorAll('.site-footer a, footer a').forEach(function(el) {
      var txt = el.textContent.trim();
      if (txt.indexOf('국가:') === 0 || txt.indexOf('Country:') === 0) {
        el.textContent = '국가: ' + label;
      }
    });
  }

  var MODAL_HTML =
    '<div id="lang-modal-overlay" onclick="if(event.target===this)closeLangModal()" ' +
    'style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;justify-content:center;align-items:center;">' +

    '<div style="background:#fff;width:490px;max-width:90vw;max-height:90vh;overflow-y:auto;border-radius:12px;padding:48px 40px 40px;position:relative;">' +

    '<button onclick="closeLangModal()" style="position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:50%;border:1px solid #d0d0d0;background:#fff;cursor:pointer;font-size:16px;color:#333;display:flex;align-items:center;justify-content:center;line-height:1;padding:0;font-family:inherit;">✕</button>' +

    '<h2 style="font-size:22px;font-weight:500;letter-spacing:-0.01em;margin-bottom:28px;color:#111;">국가 또는 지역 선택</h2>' +

    '<p style="font-size:13px;color:#111;margin-bottom:10px;">국가/지역</p>' +
    '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 16px;margin-bottom:10px;">' +
    '<p style="font-size:11px;color:#aaa;margin-bottom:2px;">국가/지역*</p>' +
    '<div style="display:flex;align-items:center;">' +
    '<select id="modal-country" onchange="onModalCountryChange(this.value)" style="flex:1;-webkit-appearance:none;appearance:none;border:none;font-size:14px;font-family:inherit;background:transparent;cursor:pointer;outline:none;color:#111;padding:0;">' +
    '<option value="kr">Korea, South</option>' +
    '<option value="us">United States</option>' +
    '</select>' +
    '<span style="pointer-events:none;color:#333;font-size:13px;margin-left:8px;">∨</span>' +
    '</div></div>' +

    '<p style="font-size:12px;color:#888;line-height:1.6;margin-bottom:24px;">쇼핑 도중에 장소를 변경하시는 경우 쇼핑백에 있는 모든 제품이 삭제되므로 주의하시기 바랍니다.</p>' +

    '<p style="font-size:13px;color:#111;margin-bottom:10px;">통화</p>' +
    '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 16px;margin-bottom:24px;">' +
    '<p style="font-size:11px;color:#aaa;margin-bottom:2px;">통화</p>' +
    '<div style="display:flex;align-items:center;">' +
    '<select id="modal-currency" style="flex:1;-webkit-appearance:none;appearance:none;border:none;font-size:14px;font-family:inherit;background:transparent;cursor:pointer;outline:none;color:#111;padding:0;">' +
    '<option value="krw">Won</option>' +
    '<option value="usd">Dollar</option>' +
    '</select>' +
    '<span style="pointer-events:none;color:#333;font-size:13px;margin-left:8px;">∨</span>' +
    '</div></div>' +

    '<p style="font-size:13px;color:#111;margin-bottom:10px;">언어</p>' +
    '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 16px;margin-bottom:32px;">' +
    '<p style="font-size:11px;color:#aaa;margin-bottom:2px;">언어</p>' +
    '<div style="display:flex;align-items:center;">' +
    '<select id="modal-lang" style="flex:1;-webkit-appearance:none;appearance:none;border:none;font-size:14px;font-family:inherit;background:transparent;cursor:pointer;outline:none;color:#111;padding:0;">' +
    '<option value="ko">한국어</option>' +
    '<option value="en">English</option>' +
    '</select>' +
    '<span style="pointer-events:none;color:#333;font-size:13px;margin-left:8px;">∨</span>' +
    '</div></div>' +

    '<button onclick="saveLangModal()" style="width:100%;padding:18px;background:#111;color:#fff;border:none;border-radius:6px;font-size:15px;font-family:inherit;cursor:pointer;letter-spacing:0.02em;">저장하기</button>' +

    '</div></div>';

  document.addEventListener('DOMContentLoaded', function () {
    var wrap = document.createElement('div');
    wrap.innerHTML = MODAL_HTML;
    document.body.appendChild(wrap.firstElementChild);

    try {
      var saved = localStorage.getItem('ps-lang');
      var savedCountry = localStorage.getItem('ps-country');
      if (saved) {
        var sel = document.getElementById('modal-lang');
        if (sel) sel.value = saved;
        var countrySel = document.getElementById('modal-country');
        if (countrySel) countrySel.value = saved === 'en' ? 'us' : 'kr';
        var currSel = document.getElementById('modal-currency');
        if (currSel) currSel.value = saved === 'en' ? 'usd' : 'krw';
      }
      if (savedCountry) applyCountryToPage(savedCountry);
    } catch (e) {}
  });

  window.onModalCountryChange = function (countryVal) {
    var map = COUNTRY_MAP[countryVal];
    if (!map) return;
    var currSel = document.getElementById('modal-currency');
    if (currSel) currSel.value = map.currency;
    // 언어는 현재 선택값이 해당 국가 언어와 다를 때만 변경
    var langSel = document.getElementById('modal-lang');
    if (langSel) langSel.value = map.lang;
  };

  window.openLangModal = function () {
    var overlay = document.getElementById('lang-modal-overlay');
    if (!overlay) return;
    try {
      var savedLang = localStorage.getItem('ps-lang');
      var savedCountry = localStorage.getItem('ps-country');
      var langSel = document.getElementById('modal-lang');
      var countrySel = document.getElementById('modal-country');
      var currSel = document.getElementById('modal-currency');
      if (savedLang && langSel) langSel.value = savedLang;
      if (savedCountry) {
        if (countrySel) countrySel.value = savedCountry;
        if (currSel) currSel.value = savedCountry === 'us' ? 'usd' : 'krw';
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
    applyCountryToPage(country);
    if (typeof window.setCountry === 'function') window.setCountry(country);
    if (typeof window.setLang === 'function') window.setLang(lang);
    closeLangModal();
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLangModal();
  });
})();
