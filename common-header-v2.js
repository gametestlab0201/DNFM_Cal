(function () {
  const mount = document.getElementById('commonSiteHeader');
  if (!mount) return;

  const DEFAULT_API = 'https://dnf-backend.gogo456654.workers.dev';
  const GOOGLE_CLIENT_ID = '110486887643-3c136grpud2llf2b31d24fqr40s1p44g.apps.googleusercontent.com';
  const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
  const root = (mount.dataset.root || '.').replace(/\/$/, '');
  const homeUrl = mount.dataset.home || `${root}/`;
  const title = mount.dataset.title || '게임실험연구소 계산기 (시즌5)';
  const logoUrl = mount.dataset.logo || `${root}/img/gametestlab.png`;
  const extra = document.getElementById('commonHeaderActions');

  let rotateTimer = null;
  let rotateIndex = 0;
  let rotatePaused = false;
  let phraseItems = [];

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function normalizePhraseItem(item) {
    const position = String(item?.position || '').trim().replace(/^\[이벤트\]\s*/, '');
    const message = String(item?.message || '').trim();
    const nickname = String(item?.ingame || item?.youtube || item?.google || '').trim();
    const isAdmin = /^관리자/.test(position);
    const isSenior = /^수석/.test(position);
    const isLead = /^책임/.test(position);
    if (!message || (!isAdmin && !isSenior && !isLead)) return null;
    return {
      message,
      nickname,
      role: isAdmin ? 'admin' : isSenior ? 'senior' : 'lead',
    };
  }

  function renderPhrase(item) {
    const target = document.getElementById('commonHeaderPhraseText');
    if (!target) return;

    if (!item) {
      target.className = 'common-site-header__phrase-text is-muted';
      target.textContent = '등록된 한마디가 없습니다.';
      return;
    }

    const isSenior = item.role === 'senior' || item.role === 'admin';
    const badge = item.role === 'admin'
      ? '<span class="common-site-header__phrase-badge is-senior" aria-label="관리자">🛡️</span>'
      : item.role === 'senior'
        ? '<span class="common-site-header__phrase-badge is-senior" aria-label="수석">👑</span>'
        : '<span class="common-site-header__phrase-badge is-lead" aria-hidden="true"></span>';

    target.className = `common-site-header__phrase-text is-${item.role}`;
    target.innerHTML = `
      <span class="common-site-header__phrase-message">
        ${badge}
        ${item.nickname ? `<strong class="common-site-header__phrase-nick">${escapeHtml(item.nickname)} 님</strong>` : ''}
        <span class="common-site-header__phrase-dot">·</span>
        <span class="common-site-header__phrase-copy">${escapeHtml(item.message)}</span>
      </span>`;
  }

  function showPhrase(index) {
    const target = document.getElementById('commonHeaderPhraseText');
    if (!target || !phraseItems.length) return;
    target.classList.add('is-changing');
    window.setTimeout(() => {
      renderPhrase(phraseItems[index % phraseItems.length]);
      requestAnimationFrame(() => target.classList.remove('is-changing'));
    }, 180);
  }

  async function loadPhrases() {
    const target = document.getElementById('commonHeaderPhraseText');
    if (!target) return;
    target.className = 'common-site-header__phrase-text is-muted';
    target.textContent = '한마디 불러오는 중…';

    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }

    try {
      const apiBase = window.WEBAPP_URL || DEFAULT_API;
      const response = await fetch(`${apiBase}?type=phrase&public=1`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`phrase_http_${response.status}`);
      const data = await response.json();
      const rawItems = Array.isArray(data?.items) ? data.items : [];
      const unique = new Map();
      rawItems.map(normalizePhraseItem).filter(Boolean).forEach((item) => {
        unique.set(`${item.role}|${item.nickname}|${item.message}`, item);
      });
      phraseItems = shuffle([...unique.values()]);
      rotateIndex = 0;

      if (!phraseItems.length) {
        renderPhrase(null);
        return;
      }

      renderPhrase(phraseItems[0]);
      rotateTimer = window.setInterval(() => {
        if (rotatePaused || phraseItems.length < 2) return;
        rotateIndex = (rotateIndex + 1) % phraseItems.length;
        showPhrase(rotateIndex);
      }, 6000);
    } catch (error) {
      console.warn('[common header phrase] 불러오기 실패:', error);
      renderPhrase(null);
    }
  }


  function getStoredToken() {
    return String(sessionStorage.getItem('id_token') || localStorage.getItem('id_token') || '').trim();
  }

  function isJwtExpired(token) {
    if (!token || token.split('.').length !== 3) return false;
    try {
      const payloadPart = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payloadPart + '='.repeat((4 - payloadPart.length % 4) % 4);
      const payload = JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(padded), (char) =>
        '%' + char.charCodeAt(0).toString(16).padStart(2, '0')
      ).join('')));
      return Number(payload?.exp || 0) > 0 && Number(payload.exp) * 1000 <= Date.now();
    } catch (_) {
      return false;
    }
  }

  function hasGoogleLogin() {
    const token = getStoredToken();
    if (!token || token.startsWith('GUEST.')) return false;
    if (isJwtExpired(token)) {
      sessionStorage.removeItem('id_token');
      localStorage.removeItem('id_token');
      return false;
    }
    return true;
  }

  function loadGoogleIdentityScript() {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (window.__COMMON_HEADER_GSI_PROMISE__) return window.__COMMON_HEADER_GSI_PROMISE__;

    window.__COMMON_HEADER_GSI_PROMISE__ = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src^="${GOOGLE_SCRIPT_URL}"]`);
      if (existing) {
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
          if (window.google?.accounts?.id) {
            clearInterval(timer);
            resolve();
          } else if (Date.now() - startedAt > 10000) {
            clearInterval(timer);
            reject(new Error('google_identity_load_timeout'));
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('google_identity_load_failed'));
      document.head.appendChild(script);
    });

    return window.__COMMON_HEADER_GSI_PROMISE__;
  }

  function rememberGoogleCredential(credential) {
    const clean = String(credential || '').trim();
    if (!clean) throw new Error('google_credential_missing');
    window.idToken = clean;
    sessionStorage.setItem('id_token', clean);
    localStorage.setItem('id_token', clean);
    document.dispatchEvent(new Event('gsi:issued'));
    window.dispatchEvent(new CustomEvent('common-header-auth-changed', { detail: { loggedIn: true } }));
  }

  async function handleHeaderGoogleCredential(response) {
    const credential = String(response?.credential || '').trim();
    if (!credential) return;

    try {
      rememberGoogleCredential(credential);
      renderAuthArea();

      const pageHandler = window.onGoogleCredential;
      if (typeof pageHandler === 'function' && pageHandler !== handleHeaderGoogleCredential) {
        await pageHandler({ credential });
        return;
      }

      window.setTimeout(() => location.reload(), 120);
    } catch (error) {
      console.error('[common header google login]', error);
      alert('Google 로그인 처리에 실패했습니다. 다시 시도해주세요.');
    }
  }

  function clearLoginState() {
    sessionStorage.removeItem('id_token');
    localStorage.removeItem('id_token');
    sessionStorage.removeItem('return_to_calculator');
    localStorage.removeItem('return_to_calculator');
    window.idToken = null;
    window.__IS_SPECIAL_USER__ = false;
    window.__IS_RESEARCH_USER__ = false;
    window.__GUEST_MODE__ = false;
    if (window.CORE && typeof window.CORE === 'object') window.CORE.userEmail = '';
  }

  async function logoutFromHeader() {
    try {
      await loadGoogleIdentityScript();
      window.google?.accounts?.id?.disableAutoSelect?.();
    } catch (_) {
      // Google 스크립트를 불러오지 못해도 사이트 로그아웃은 계속 진행한다.
    }

    clearLoginState();
    window.dispatchEvent(new CustomEvent('common-header-auth-changed', { detail: { loggedIn: false } }));
    location.reload();
  }

  function googleLogoSvg() {
    return `
      <svg class="common-site-header__google-logo" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.614Z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.584-5.037-3.71H.956v2.332A9 9 0 0 0 9 18Z"/>
        <path fill="#FBBC05" d="M3.963 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.281-1.71V4.958H.956A9 9 0 0 0 0 9c0 1.452.347 2.826.956 4.042l3.007-2.332Z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.44 1.345l2.582-2.582C13.463.891 11.426 0 9 0A9 9 0 0 0 .956 4.958L3.963 7.29C4.672 5.164 6.656 3.58 9 3.58Z"/>
      </svg>`;
  }

  async function renderGoogleButton() {
    const host = document.getElementById('commonHeaderGoogleButton');
    if (!host) return;

    host.innerHTML = '<span class="common-site-header__auth-loading">로그인 준비 중…</span>';

    try {
      await loadGoogleIdentityScript();
      host.innerHTML = '';

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleHeaderGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
      });

      const isMobileHeader = window.matchMedia('(max-width: 620px)').matches;
      window.google.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'filled_blue',
        // 모바일에서는 버튼 외곽 크기는 CSS 그대로 두고
        // Google이 그리는 내부 로고/로그인 텍스트만 한 단계 작게 렌더링한다.
        size: isMobileHeader ? 'small' : 'medium',
        shape: 'pill',
        text: 'signin',
        logo_alignment: 'left',
        width: isMobileHeader ? 64 : 104,
        locale: 'ko',
      });

      host.classList.add('is-ready');
    } catch (error) {
      console.warn('[common header google button]', error);
      host.innerHTML = `<button class="common-site-header__auth-fallback" type="button">${googleLogoSvg()}<span>로그인</span></button>`;
      host.querySelector('button')?.addEventListener('click', async () => {
        try {
          await loadGoogleIdentityScript();
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleHeaderGoogleCredential,
            auto_select: false,
            itp_support: true,
          });
          window.google.accounts.id.prompt((notification) => {
            if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
              alert('Google 로그인 창을 열지 못했습니다. 브라우저의 팝업 및 서드파티 로그인 설정을 확인해주세요.');
            }
          });
        } catch (_) {
          alert('Google 로그인 창을 열지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
      });
    }
  }

  function renderAuthArea() {
    const auth = document.getElementById('commonHeaderAuth');
    if (!auth) return;

    if (hasGoogleLogin()) {
      auth.innerHTML = '<button id="commonHeaderLogout" class="common-site-header__logout-btn" type="button">로그아웃</button>';
      document.getElementById('commonHeaderLogout')?.addEventListener('click', logoutFromHeader);
      return;
    }

    auth.innerHTML = '<div id="commonHeaderGoogleButton" class="common-site-header__google-button" aria-label="Google 로그인"></div>';
    renderGoogleButton();
  }

  // 모바일에서도 인증/내정보/메뉴는 CSS로 제목과 같은 첫 행에 고정한다.
  mount.innerHTML = `
    <div class="common-site-header-wrap">
      <header class="common-site-header">
        <div class="common-site-header__title">
          <a class="common-site-header__logo" href="${homeUrl}" aria-label="메인으로 이동"><img src="${logoUrl}" alt="게임실험연구소 로고"></a>
          <a class="common-site-header__home" href="${homeUrl}"><span class="common-site-header__home-desktop">${escapeHtml(title)}</span><span class="common-site-header__home-mobile">게임실험연구소</span></a>
          <button id="chmHeaderUsage" class="common-site-header__menu-btn" type="button" title="내 정보">
            <svg viewBox="0 0 24 24" aria-hidden="true" style="width:16px;height:16px;color:#d7e6ff"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" style="stroke-width:2.1"></path><path d="M4.5 21c0-4.15 3.35-7.5 7.5-7.5s7.5 3.35 7.5 7.5" style="stroke-width:2.1"></path></svg><span class="common-site-header__label">내 정보</span>
          </button>
          <button id="chmHeaderContact" class="common-site-header__menu-btn" type="button" title="게임실험연구소에 문의">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect><path d="M3 7l9 6 9-6"></path></svg><span class="common-site-header__label">문의하기</span>
          </button>
          <button id="chmHeaderFaq" class="common-site-header__menu-btn" type="button" title="문의하기 전 자주하는 Q&A">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18h.01"></path><path d="M9.1 9a3 3 0 1 1 5.8 1c-.6.7-1.4 1.1-1.9 1.5-.4.4-.5.6-.5 1.5"></path><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z"></path></svg><span class="common-site-header__label">Q&amp;A</span>
          </button>
        </div>
        <div class="common-site-header__actions" id="commonSiteHeaderActions">
          <div id="commonHeaderAuth" class="common-site-header__auth"></div>
          <button id="chmHeaderUsageMobile" class="common-site-header__menu-btn common-site-header__mobile-only" type="button" title="내 정보">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path><path d="M4.5 21c0-4.15 3.35-7.5 7.5-7.5s7.5 3.35 7.5 7.5"></path></svg><span class="common-site-header__label">내 정보</span>
          </button>
          <div class="common-site-header__mobile-menu common-site-header__mobile-only" id="commonHeaderMobileMenu">
            <button id="chmHeaderMenuMobile" class="common-site-header__menu-btn" type="button" aria-haspopup="menu" aria-expanded="false" title="메뉴">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"></path></svg><span class="common-site-header__label">메뉴</span>
            </button>
            <div class="common-site-header__mobile-menu-popover" id="commonHeaderMobileMenuPopover" role="menu" hidden>
              <button type="button" role="menuitem" data-common-mobile-action="contact">문의하기</button>
              <button type="button" role="menuitem" data-common-mobile-action="faq">Q&amp;A</button>
            </div>
          </div>
        </div>
      </header>
      <div id="commonHeaderPhraseBar" class="common-site-header__phrase-bar" aria-live="polite">
        <span class="common-site-header__phrase-label">연구원 한마디</span>
        <div id="commonHeaderPhraseText" class="common-site-header__phrase-text is-muted">한마디 불러오는 중…</div>
      </div>
    </div>`;

  if (extra) {
    const actions = document.getElementById('commonSiteHeaderActions');
    const auth = document.getElementById('commonHeaderAuth');
    if (actions && auth) {
      while (extra.firstChild) actions.insertBefore(extra.firstChild, auth);
    }
  }

  const invokeCommonHeaderModal = (action, attempt = 0) => {
    const modals = window.CommonHeaderModals;
    const fn = action === 'contact' ? modals?.openContact
      : action === 'faq' ? modals?.openFaq
      : action === 'usage' ? modals?.openUsage
      : null;
    if (typeof fn === 'function') {
      fn.call(modals);
      return true;
    }
    // 페이지마다 공통 모달 JS가 헤더보다 늦게 준비될 수 있으므로 짧게 재시도한다.
    if (attempt < 8) {
      window.setTimeout(() => invokeCommonHeaderModal(action, attempt + 1), 80);
      return false;
    }
    console.warn(`[common header] ${action} modal is not available on this page.`);
    return false;
  };

  document.getElementById('chmHeaderContact')?.addEventListener('click', () => invokeCommonHeaderModal('contact'));
  document.getElementById('chmHeaderFaq')?.addEventListener('click', () => invokeCommonHeaderModal('faq'));
  document.getElementById('chmHeaderUsage')?.addEventListener('click', () => invokeCommonHeaderModal('usage'));
  document.getElementById('chmHeaderUsageMobile')?.addEventListener('click', () => invokeCommonHeaderModal('usage'));

  const mobileMenu = document.getElementById('commonHeaderMobileMenu');
  const mobileMenuButton = document.getElementById('chmHeaderMenuMobile');
  const mobileMenuPopover = document.getElementById('commonHeaderMobileMenuPopover');

  // 페이지별 overflow / stacking context의 영향을 받지 않도록 모바일 메뉴는 body 직속 포털로 이동한다.
  if (mobileMenuPopover && mobileMenuPopover.parentElement !== document.body) {
    document.body.appendChild(mobileMenuPopover);
  }

  const closeMobileMenu = () => {
    if (!mobileMenuButton || !mobileMenuPopover) return;
    mobileMenuButton.setAttribute('aria-expanded', 'false');
    mobileMenuPopover.hidden = true;
    mobileMenu.classList.remove('is-open');
  };

  const positionMobileMenu = () => {
    if (!mobileMenuButton || !mobileMenuPopover || mobileMenuPopover.hidden) return;
    const rect = mobileMenuButton.getBoundingClientRect();
    const gap = 6;
    const width = Math.max(112, mobileMenuPopover.offsetWidth || 112);
    const right = Math.max(8, window.innerWidth - rect.right);
    mobileMenuPopover.style.position = 'fixed';
    mobileMenuPopover.style.top = `${Math.round(rect.bottom + gap)}px`;
    mobileMenuPopover.style.right = `${Math.round(right)}px`;
    mobileMenuPopover.style.left = 'auto';
    mobileMenuPopover.style.zIndex = '2147483000';
    mobileMenuPopover.style.minWidth = `${width}px`;
  };

  const openMobileMenu = () => {
    if (!mobileMenuButton || !mobileMenuPopover) return;
    mobileMenuButton.setAttribute('aria-expanded', 'true');
    mobileMenuPopover.hidden = false;
    mobileMenu.classList.add('is-open');
    positionMobileMenu();
  };

  const toggleMobileMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const isOpen = mobileMenuButton?.getAttribute('aria-expanded') === 'true';
    if (isOpen) closeMobileMenu();
    else openMobileMenu();
  };
  // 메인 등 페이지별 버블 단계 핸들러가 클릭을 가로채더라도 공통 메뉴가 우선 동작하도록 캡처 단계에서 처리한다.
  mobileMenuButton?.addEventListener('click', toggleMobileMenu, true);

  mobileMenuPopover?.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-common-mobile-action]');
    if (!actionButton) return;
    event.preventDefault();
    event.stopPropagation();
    const action = actionButton.dataset.commonMobileAction;
    closeMobileMenu();
    if (action === 'contact') invokeCommonHeaderModal('contact');
    if (action === 'faq') invokeCommonHeaderModal('faq');
  }, true);

  document.addEventListener('click', (event) => {
    if (mobileMenu?.contains(event.target) || mobileMenuPopover?.contains(event.target)) return;
    closeMobileMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMobileMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 620) closeMobileMenu();
    else positionMobileMenu();
  });
  window.addEventListener('scroll', positionMobileMenu, { passive: true });

  const phraseBar = document.getElementById('commonHeaderPhraseBar');
  phraseBar?.addEventListener('mouseenter', () => { rotatePaused = true; });
  phraseBar?.addEventListener('mouseleave', () => { rotatePaused = false; });

  const startAuth = () => window.setTimeout(renderAuthArea, 0);
  if (document.readyState === 'complete') startAuth();
  else window.addEventListener('load', startAuth, { once: true });

  window.addEventListener('storage', (event) => {
    if (event.key === 'id_token') renderAuthArea();
  });

  loadPhrases();
})();
