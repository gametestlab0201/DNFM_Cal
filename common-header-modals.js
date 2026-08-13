(function () {
  const MODAL_MOUNT_ID = 'chmCommonHeaderModalMount';
  const DEFAULT_API = 'https://dnf-backend.gogo456654.workers.dev';
  let currentBoardNickname = '';
  let currentBoardNicknameChangedAt = '';
  let currentBoardNicknameCanChange = true;
  let currentBoardNicknameNextChangeAt = '';

  function getToken() {
    return sessionStorage.getItem('id_token') || localStorage.getItem('id_token') || '';
  }

  async function apiJSON(type, payload = {}) {
    if (typeof window.apiJSON === 'function') return window.apiJSON(type, payload);
    const token = getToken();
    const base = window.WEBAPP_URL || DEFAULT_API;
    const res = await fetch(`${base}?type=${encodeURIComponent(type)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id_token: token, ...payload }),
    });
    if (!res.ok) throw new Error(`${type}_http_${res.status}`);
    return res.json();
  }

  function ensureMount() {
    let mount = document.getElementById(MODAL_MOUNT_ID);
    if (mount) return mount;
    mount = document.createElement('div');
    mount.id = MODAL_MOUNT_ID;
    mount.innerHTML = '  <div id="chm-contactModal" class="modal" aria-hidden="true">\n    <div class="backdrop" data-contact-close></div>\n    <div class="dialog contact-dialog" role="dialog" aria-modal="true" aria-labelledby="chm-contactTitle"\n>\n      <header>\n        <div style="width:32px;"></div>\n        <h2 id="chm-contactTitle">게임실험연구소에 문의하기</h2>\n        <div style="width:32px;"></div>\n      </header>\n\n      <div class="contact-body">\n        <div class="contact-notice">\n          계산기 이용 중 정상적이지 않은 동작들이나 오류, 버그들을 제보해주세요.<br>\n          계산기 업데이트에 큰 힘이 됩니다!<br>\n          그 외 멤버십 관련, 한마디 문구 변경 등도 적어주시면 확인하도록 하겠습니다.<br>\n          실시간 문의는 저희 게임실험연구소 <a href="https://open.kakao.com/o/sEvtIGpf" target="_blank" rel="noopener">오픈채팅</a> 으로\n          문의주시면 되겠습니다.\n        </div>\n\n        <div id="chm-contactGuestField" class="contact-guest-field">\n          <label for="chm-contactGuestNickname">닉네임</label>\n          <input id="chm-contactGuestNickname" class="contact-guest-input" type="text" maxlength="20"\n            placeholder="문의 확인에 사용할 닉네임을 입력해 주세요">\n          <div class="contact-guest-note">비로그인 문의는 답장 알림을 받을 수 없습니다. 답변이 필요한 문의는 오픈채팅을 이용해 주세요.</div>\n        </div>\n\n        <textarea id="chm-contactTalk" class="contact-textarea" placeholder="문의하실 내용을 최대한 상세하게 적어주셔야 빠르고 정확한 답변이 가능합니다.\n\n소울브링어 계산이 안됩니다.  (X)\n소울브링어, 암흑의 별 선택시 계산값이 0으로 나옵니다.  (O)"></textarea>\n        <div class="contact-actions">\n          <button id="chm-btnContactSend" class="ui-btnetc">문의 보내기</button>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- 문의하기 전 자주하는 Q&A (목록) -->\n  <div id="chm-faqModal" class="modal" aria-hidden="true">\n    <div class="backdrop" data-faq-close></div>\n    <div class="dialog contact-dialog faq-dialog" role="dialog" aria-modal="true" aria-labelledby="chm-faqTitle"\n      style="width:min(720px,96vw);max-height:min(700px,90vh);">\n      <header>\n        <div style="width:32px;"></div>\n        <h2 id="chm-faqTitle">문의하기 전 자주하는 Q&amp;A</h2>\n        <div style="width:32px;"></div>\n      </header>\n\n      <div class="contact-body">\n        <div class="contact-notice">\n          계산기 사용 중, 혹시 이런 점들이 궁금하신가요? 가장 많이 하시는 질문들을 모아두었습니다.\n        </div>\n        <div id="chm-faqList" class="faq-list"></div>\n      </div>\n    </div>\n  </div>\n\n  <!-- 내 이용 정보 모달 -->\n  <div id="chm-myUsageInfoModal" class="modal" aria-hidden="true">\n    <div class="backdrop" data-my-usage-close></div>\n    <div class="dialog contact-dialog my-usage-dialog" role="dialog" aria-modal="true" aria-labelledby="chm-myUsageInfoTitle">\n      <header class="my-usage-header">\n        <div class="my-usage-title-wrap">\n          <div class="my-usage-crest" aria-hidden="true">\n            <span class="crest-crown"></span>\n            <span class="crest-wing left"></span>\n            <span class="crest-core"><span class="crest-gem"></span></span>\n            <span class="crest-wing right"></span>\n            <span class="crest-plate"></span>\n            <span class="crest-ribbon"></span>\n          </div>\n          <div class="my-usage-title-text">\n            <div class="my-usage-eyebrow">LAB MEMBERSHIP CREST</div>\n            <h2 id="chm-myUsageInfoTitle">내 정보</h2>\n          </div>\n        </div>\n        <div style="width:32px;flex:0 0 32px;"></div>\n      </header>\n\n      <div class="usage-info-body">\n        <div class="usage-info-notice">\n          현재 계정의 이용 상태와 적용 중인 혜택을 확인할 수 있습니다.\n        </div>\n        <div id="chm-myUsageInfoContent" class="usage-info-grid">\n          <div class="usage-info-row">\n            <div class="usage-info-label">상태</div>\n            <div class="usage-info-value">불러오는 중...</div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- Q&A 답변 모달 -->\n  <div id="chm-faqAnswerModal" class="modal" aria-hidden="true">\n    <div class="backdrop" data-faqans-close></div>\n    <div class="dialog contact-dialog faq-dialog" role="dialog" aria-modal="true" aria-labelledby="chm-faqAnswerTitle"\n      style="width:min(920px,96vw);max-height:min(700px,90vh);">\n      <header>\n        <button type="button" class="faq-back-btn" data-faqans-back>← 목록</button>\n        <h2 id="chm-faqAnswerTitle">Q&amp;A</h2>\n        <div style="width:32px;"></div>\n      </header>\n\n      <div class="contact-body">\n        <div id="chm-faqAnswerQ" style="font-weight:800;margin-bottom:10px;"></div>\n        <div id="chm-faqAnswerA" class="faq-answer-text"></div>\n      </div>\n    </div>\n  </div>\n\n\n  <!-- 관리자 답장 팝업 -->\n  <div id="chm-replyModal" class="modal" aria-hidden="true">\n    <div class="backdrop" data-reply-close></div>\n    <div class="dialog contact-dialog" role="dialog" aria-modal="true" aria-labelledby="chm-replyTitle"\n      style="width:min(620px,96vw);max-height:min(820px,90vh);">\n      <header>\n        <div style="width:32px;"></div>\n        <h2 id="chm-replyTitle">관리자 답장 도착</h2>\n        <div style="width:32px;"></div>\n      </header>\n\n      <div class="contact-body">\n        <div class="contact-notice">\n          최근에 남기신 문의에 대한 답장이 도착했습니다.\n        </div>\n\n        <div class="reply-block">\n          <div class="reply-label">내 문의</div>\n          <div class="reply-text original" id="chm-replyOriginal"></div>\n        </div>\n\n        <div class="reply-block answer-block">\n          <div class="reply-label">관리자 답장</div>\n          <div class="reply-text answer" id="chm-replyAnswer"></div>\n        </div>\n        <!-- ★ 아래 추가 -->\n        <div class="reply-actions">\n          <label class="reply-dontshow">\n            <input type="checkbox" id="chm-replyDontShow">\n            더 이상 보지 않기\n          </label>\n          <button type="button" id="chm-replyConfirmBtn" class="ui-btnetc">확인</button>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- ✅ 탈퇴 안내 모달 -->\n  <div id="chm-withdrawModal" class="modal" aria-hidden="true">\n    <div class="backdrop" data-close></div>\n    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="chm-withdrawModalTitle"\n      style="width:min(780px,95vw); height:auto; max-height:none; display:flex; flex-direction:column;">\n      <header>\n        <div style="width:32px;"></div>\n        <h2 id="chm-withdrawModalTitle">연구원 만료안내</h2>\n        <button type="button" class="btn" data-close>닫기</button>\n      </header>\n\n      <div class="patch-log-body" style="flex:0 0 auto; min-height:0; overflow:visible; padding:14px 18px 20px;">\n        <div id="chm-withdrawModalMsg" style="white-space:pre-wrap; line-height:1.62; margin-top:8px; margin-bottom:22px; word-break:keep-all;">\n        </div>\n\n        <!-- ✅ 성안의 봉인 \'선택 하기\'와 동일 스타일(ui-btnetc) 버튼 -->\n        <a href="https://www.youtube.com/channel/UCijUV3SuVe_qErzBpdOmKIA/join" target="_blank"\n          rel="noopener noreferrer" class="ui-btnetc" style="text-decoration:none;">연구원 재가입 하기!</a>\n      </div>\n    </div>\n  </div>\n  </div>\n\n\n  <!-- PC 계산기 로딩 후 안내 공지 모달 -->\n  <div id="chm-noticeModal" class="modal" aria-hidden="true">\n    <div class="backdrop" data-close></div>\n    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="chm-noticeModalTitle"\n      style="width:min(740px,95vw);height:auto;max-height:min(810px,87vh);display:flex;flex-direction:column;">\n      <header>\n        <div style="width:32px;"></div>\n        <h2 id="chm-noticeModalTitle">안내사항</h2>\n        <button type="button" class="btn" data-close>닫기</button>\n      </header>\n\n      <div class="patch-log-body" style="flex:1;min-height:0;overflow-y:auto;">\n        <div class="notice-page active" data-notice-page="1">\n          <div class="notice-new-page">\n            <strong class="notice-new-title">📢 캐릭터 세팅 현황 관리가 추가되었습니다!</strong>\n\n            안녕하세요 게임실험연구소 입니다.<br><br>\n\n            이제 계산기에서 저장한 캐릭터 세팅을 한눈에 확인하고 관리할 수 있는<br>\n            <strong style="color: #ff4444;">캐릭터 전체 세팅 현황</strong> 기능이 추가되었습니다.<br><br>\n\n            장비, 마법부여, 엠블렘, 강화, 마법봉인 등 주요 세팅 상태를<br>\n            <strong style="color:#ffe8a3;">캐릭터별로</strong> 정리해서 확인할 수 있으며, 여러 캐릭터의 세팅 현황을 비교하거나<br>\n            부족한 부분을 점검할 때 더욱 편리하게 사용할 수 있습니다.<br><br>\n\n            PC 계산기에서는 상단의 캐릭터 전체 세팅 현황 버튼을 통해 이동할 수 있으며,<br>\n            모바일 계산기에서도 캐릭터 선택 화면 아래에 추가된 버튼을 통해 이용할 수 있습니다.<br><br>\n\n            앞으로도 더 편리하게 세팅을 관리할 수 있도록 계속 개선해 나가겠습니다.<br><br>\n\n            <li class="sign-row">\n              <span class="sign-text">- 게임실험연구소장 드림 -</span>\n              <img src="/img/sign.png" alt="게임실험연구소장 직인" class="seal-stamp">\n            </li>\n\n          </div>\n        </div>\n\n        <div class="notice-page" data-notice-page="2">\n          <ul class="patch-log-list notice-list">\n            <li></li>\n\n            <strong style="font-size:18px;">🎉 누적 로그인 20,000회 돌파! 감사 기념 <strong style="color: #ff4444;">저장슬롯 3배</strong>\n              이벤트 🎉</strong><br><br>\n\n            <br>안녕하세요 게임실험연구소 입니다.<br><br>\n\n            계산기 오픈 이후 연구원분들의 많은 관심과 이용 덕분에 누적 로그인 <strong style="font-size:1.15em;">20,000회</strong>를 넘겼습니다! <br><br>\n\n            보내주신 성원에 감사드리며, 감사 기념으로 1개월 이상 장기 이용자분들께 <strong style="font-size:1.15em; color:#ff4444;">저장슬롯 3배\n              이벤트</strong>를 진행합니다.<br><br>\n\n            더 많은 세팅을 저장하고, 더 편하게 비교해보시길 바랍니다.<br>\n            앞으로도 더욱 좋은 계산기로 보답하겠습니다.<br><br>\n\n            감사합니다.<br><br><br>\n\n            ※ 본 이벤트는 \'선임 연구원\' 이상 등급에서 연속 2회 이상 이용하고 계신 연구원분들께 자동 적용됩니다.<br>\n            (정확한 이벤트 적용 시점은 2회차 이용이 시작된 뒤 약 2주 후, 총 이용기간 45일 전후로 자동 반영됩니다.)<br><br>\n\n\n            <li class="sign-row">\n              <span class="sign-text">- 게임실험연구소장 드림 -</span>\n              <img src="/img/sign.png" alt="게임실험연구소장 직인" class="seal-stamp">\n            </li>\n\n            <!--\n               저희 <span style="color: yellow;">게임실험연구소</span> <strong style="color: #ff4444; font-size:15px;">\'던파모바일 시즌5\n                계산기\'</strong> 발전에 함께해주신 모든 연구원 여러분께 깊은 감사드립니다.<br>\n              여러분의 <strong style="color: white;">후원과 관심, 그리고 세심한 오류·버그 제보</strong> 덕분에<br>\n              출시 초기보다 계산기가 훨씬 안정적이고, 성능 또한 크게 향상 되었습니다.<br><br>\n              2026년에는 <strong><u>보다 더 정확하고 편리한 계산 환경</u></strong>을 위해 꾸준히 업데이트를 이어가겠습니다.<br>\n              올 한 해도 게임실험연구소 계산기와 함께, 효율적인 템세팅 해보시길 바랍니다.<br><br>\n            \n            <!--<li>\n                 <span style="color: yellow;">\'10레벨 스킬 공격력 증가\'</span> 옵션이 <strong style="color: #ff4444;">평타 데미지에도 영향을 미치는 버그</strong>를 발견하였습니다.<br> \n              </li>\n              <li>\n                또한 <span style="color: yellow;">\'조화: 콰트로 마누스 연산장치\'</span> 세트 옵션 중, <br>\n                <span style="color: #ff4444;">\'던전 입장 시 악세서리 강화 수치 합이 45이상일 경우, 모든 타입 피해 3% 증가\'</span> 옵션이,<br>\n                일반 <span style="color: yellow;">\'콰트로 마누스 연산장치\'</span> 세트와, <span style="color: yellow;">\'가속: 콰트로 마누스 연산장치\'</span> 세트에 <br>\n                <strong style="color: #ff4444;">동일하게 적용되는 버그</strong>를 발견하였습니다.\n              </li>\n              <li>\n                패치 이전에 해당 세트로 데미지 계산을 진행하신 경우, <br>\n                위 내용을 참고하시어 다시 한번 데미지 값을 계산해 보시기 바랍니다.\n              </li>\n              <li>\n                이용에 혼란을 드려 죄송합니다. <br>\n                조그마한 이상한 점이라도 제보 해 주시면, 빠르게 확인하고 수정조치 진행하도록 하겠습니다.\n              </li>\n              <li>\n                감사합니다.\n              </li>-->\n          </ul>\n        </div>\n      </div>\n      <div class="notice-page-controls">\n        <button type="button" id="chm-noticePrevBtn" class="notice-page-btn">이전</button>\n        <span id="chm-noticePageIndicator" class="notice-page-indicator">1 / 2</span>\n        <button type="button" id="chm-noticeNextBtn" class="notice-page-btn">다음</button>\n      </div>\n    </div>\n  </div>\n\n    </div>\n\n  <!-- ✅ 한마디 변경 모달 -->\n  <div id="chm-oneLinerModal" class="modal" aria-hidden="true">\n    <div class="backdrop" data-close></div>\n    <div class="dialog one-liner-dialog" role="dialog" aria-modal="true" aria-labelledby="chm-oneLinerTitle">\n      <header>\n        <div style="width:32px;"></div>\n        <h2 id="chm-oneLinerTitle">한마디 변경</h2>\n        <button type="button" class="close" data-close>✕</button>\n      </header>\n\n      <div class="one-liner-body">\n  <div id="chm-oneLinerAccessNotice" class="one-liner-access-notice" role="status">\n    <div class="one-liner-access-icon" aria-hidden="true">🔒</div>\n    <div class="one-liner-access-copy">\n      <div id="chm-oneLinerAccessTitle" class="one-liner-access-title">한마디 변경 권한이 없습니다</div>\n      <div id="chm-oneLinerAccessDesc" class="one-liner-access-desc">한마디 변경은 책임 등급부터 이용할 수 있습니다.</div>\n    </div>\n  </div>\n  <div class="one-liner-guide">\n    · 한마디는 수석, 책임 등급부터 이용이 가능합니다.<br>\n    · 모욕적인 언행이나 비방, 비하, 비속어 등 사용시 무통보 삭제 될 수 있습니다.<br>\n    · 한마디는 한달에 한번 변경이 가능합니다.<br>\n    · 불가피하게 변경불가 기간 내에 한마디 변경이 필요할 시 언제든 문의주세요.\n  </div>\n\n  <div id="chm-oneLinerNicknameBox" class="one-liner-field" style="display:none;">\n  <div class="one-liner-label">인게임 닉네임</div>\n  <input id="chm-oneLinerNicknameInput" class="one-liner-input" type="text" maxlength="20"\n    placeholder="인게임 닉네임 입력">\n  <div class="one-liner-help">인게임 닉네임은 최초 1회만 등록할 수 있으며, 이후 수정은 별도 문의 바랍니다.<br>\n  존재하지 않는 닉네임이나 깡통계정 닉네임일 경우 무통보 삭제 될 수 있습니다.</div>\n</div>\n\n<div class="one-liner-field">\n  <div id="chm-oneLinerCurrentTitle" class="one-liner-label">현재 한마디</div>\n  <div id="chm-oneLinerCurrent" class="one-liner-current">-</div>\n</div>\n\n<div class="one-liner-field">\n  <div class="one-liner-label">새 한마디 입력</div>\n  <input id="chm-oneLinerInput" class="one-liner-input" type="text" maxlength="30"\n    placeholder="40자 이하로 입력">\n</div>\n\n        <div id="chm-oneLinerCooldown" class="one-liner-cooldown">확인 중...</div>\n\n        <div class="one-liner-actions">\n          <button id="chm-btnOneLinerSave" class="btn main" type="button">변경하기</button>\n          <button class="btn" type="button" data-close>닫기</button>\n        </div>\n      </div>\n    </div>\n  </div>\n\n\n  <!-- ✅ 한마디 변경 확인 모달 -->\n  <div id="chm-oneLinerConfirmModal" class="modal" aria-hidden="true">\n    <div class="backdrop" data-one-liner-confirm-close></div>\n    <div class="dialog one-liner-dialog" role="dialog" aria-modal="true" aria-labelledby="chm-oneLinerConfirmTitle">\n      <header>\n        <div style="width:32px;"></div>\n        <h2 id="chm-oneLinerConfirmTitle">한마디 변경 확인</h2>\n        <button type="button" class="close" data-one-liner-confirm-close>✕</button>\n      </header>\n\n      <div class="one-liner-body">\n        <div class="one-liner-guide">\n          아래 내용으로 한마디를 변경합니다.<br>\n          변경 후에는 한 달 동안 다시 변경할 수 없으니 한 번 더 확인해주세요.\n        </div>\n\n        <div class="one-liner-field">\n          <div class="one-liner-label">변경할 한마디</div>\n          <div id="chm-oneLinerConfirmMessage" class="one-liner-current">-</div>\n        </div>\n\n        <div id="chm-oneLinerConfirmNicknameBox" class="one-liner-field" style="display:none;">\n          <div class="one-liner-label">등록할 인게임 닉네임</div>\n          <div id="chm-oneLinerConfirmNickname" class="one-liner-current">-</div>\n        </div>\n\n        <div class="one-liner-actions">\n          <button id="chm-btnOneLinerConfirmSave" class="btn main" type="button">확인 후 변경</button>\n          <button class="btn" type="button" data-one-liner-confirm-close>다시 수정</button>\n        </div>\n      </div>\n    </div>\n  </div>\n';

    mount.insertAdjacentHTML('beforeend', `
      <div id="chm-boardNicknameEditModal" class="modal" aria-hidden="true">
        <div class="backdrop" data-board-nickname-cancel></div>
        <div class="dialog contact-dialog board-nickname-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="chm-boardNicknameEditTitle">
          <header>
            <div style="width:32px;"></div>
            <h2 id="chm-boardNicknameEditTitle">게시판 닉네임 변경</h2>
            <button type="button" class="close" data-board-nickname-cancel>✕</button>
          </header>
          <div class="board-nickname-edit-body">
            <div class="board-nickname-edit-guide">
              현재 닉네임을 지우고 새 닉네임을 입력해 주세요.<br>
              변경하면 기존 게시글과 댓글의 작성자명도 새 닉네임으로 변경됩니다.
            </div>
            <div class="board-nickname-edit-field">
              <label for="chm-boardNicknameEditInput">게시판 닉네임</label>
              <input id="chm-boardNicknameEditInput" class="board-nickname-edit-input" type="text" maxlength="8" autocomplete="off" placeholder="2~8자로 입력">
              <div class="board-nickname-edit-rules" aria-label="닉네임 이용 규칙">
                <p>닉네임은 2~8자 이내여야 합니다.</p>
                <p>신상 정보가 포함된 닉네임은 금지입니다.</p>
                <p>던파와 관련 없는 특정 사이트 언급, 반사회적, 성적, 욕설, 비방 닉네임은 금지합니다.</p>
                <p>악성/타유저 유사 닉네임 사용할 경우 영구 차단될 수 있습니다.</p>
                <p>닉네임은 30일에 한 번 변경할 수 있습니다.</p>
                <p class="board-nickname-edit-last">(마지막 변경: <span id="chm-boardNicknameLastChanged">-</span>)</p>
              </div>
            </div>
            <div id="chm-boardNicknameEditStatus" class="board-nickname-edit-status" role="status"></div>
            <div class="board-nickname-edit-actions">
              <button id="chm-boardNicknameEditSave" class="btn main" type="button">변경하기</button>
              <button class="btn" type="button" data-board-nickname-cancel>취소</button>
            </div>
          </div>
        </div>
      </div>
    `);
    document.body.appendChild(mount);
    return mount;
  }

  function show(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('show');
    el.setAttribute('aria-hidden', 'false');
  }
  function hide(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'true');
  }


  function getCommonRoot() {
    const header = document.getElementById('commonSiteHeader');
    const raw = String(header?.dataset?.root || '.').trim() || '.';
    return raw.replace(/\/$/, '');
  }

  function resolveFaqImagePath(path) {
    const value = String(path || '').trim();
    if (!value) return '';
    if (/^(?:https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('/')) {
      return value;
    }
    const clean = value.replace(/^\.\//, '');
    const root = getCommonRoot();
    return `${root}/${clean}`.replace(/([^:]\/)\/+/g, '$1');
  }

  function isFaqImagePath(value) {
    return /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(String(value || '').trim());
  }

  function renderFaqAnswer(container, answer) {
    container.innerHTML = '';
    const lines = String(answer || '').split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        const spacer = document.createElement('div');
        spacer.className = 'faq-answer-spacer';
        container.appendChild(spacer);
        continue;
      }

      const parts = line.split('|').map(v => v.trim()).filter(Boolean);
      const allImages = parts.length > 0 && parts.every(isFaqImagePath);

      if (allImages) {
        const gallery = document.createElement('div');
        gallery.className = 'faq-answer-gallery';
        for (const path of parts) {
          const img = document.createElement('img');
          img.className = 'faq-answer-image';
          img.src = resolveFaqImagePath(path);
          img.alt = 'Q&A 안내 이미지';
          img.loading = 'lazy';
          img.addEventListener('error', () => {
            img.classList.add('is-error');
            img.alt = `이미지를 불러올 수 없습니다: ${path}`;
          });
          gallery.appendChild(img);
        }
        container.appendChild(gallery);
        continue;
      }

      const text = document.createElement('div');
      text.className = 'faq-answer-line';
      text.textContent = rawLine;
      container.appendChild(text);
    }
  }

  async function loadFaq() {
    const box = document.getElementById('chm-faqList');
    if (box) box.innerHTML = '<div style="opacity:.8">Q&A를 불러오는 중입니다...</div>';
    try {
      const base = window.WEBAPP_URL || DEFAULT_API;
      const res = await fetch(`${base}?type=public_faq&public=1`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`public_faq_http_${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!box) return;
      box.innerHTML = '';
      if (!items.length) { box.innerHTML = '<div style="opacity:.8">등록된 Q&A가 없습니다.</div>'; return; }
      for (const it of items) {
        const q = String(it?.q || '').trim();
        const a = String(it?.a || '').trim();
        if (!q) continue;
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'faq-q-btn'; btn.textContent = q;
        btn.addEventListener('click', () => {
          hide('chm-faqModal');
          document.getElementById('chm-faqAnswerQ').textContent = q;
          const ans = document.getElementById('chm-faqAnswerA');
          if (ans) renderFaqAnswer(ans, a);
          show('chm-faqAnswerModal');
        });
        box.appendChild(btn);
      }
    } catch (e) {
      console.error('[common faq]', e);
      if (box) box.innerHTML = '<div style="opacity:.8">Q&A를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>';
    }
  }

  function formatMyUsageDate(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return date.toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  }

  function formatMyUsageDateOnly(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  }

  function escapeMyUsageHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[ch]));
  }

  function getMyUsageRoleBase(res) {
    const raw = String(res?.roleLabelBase || res?.roleLabel || '전임').trim();
    return raw.replace(/^\[이벤트\]\s*/, '').replace(/\s*연구원\s*$/, '').trim() || '전임';
  }

  function getMyUsageRoleDisplay(res) {
    return `${getMyUsageRoleBase(res)} 연구원`;
  }

  function getMyUsageJoinedDateText(res) {
    return formatMyUsageDateOnly(res?.joinedAt || res?.joinedAtRaw || res?.joinDate || res?.joinedDate || res?.signupDate || '');
  }

  function getMyUsageBaseSlotSub(res) {
    return `기본 ${getMyUsageRoleBase(res)} 연구원 등급 저장 슬롯 갯수`;
  }

  function getMyUsageSlotExtensionInfo(res) {
    if (res?.slotEventActive) {
      return {
        text: `${Number(res.slotEventMultiplier || 3)}배 확장 적용 중`,
        sub: res.slotEventUntil
          ? `종료일: ${formatMyUsageDate(res.slotEventUntil)}`
          : (res.slotEventDescription || '가입 45일 경과로 저장슬롯 3배 확장이 적용 중입니다.')
      };
    }
    if (Number(res?.roleLevel || 0) <= 0) {
      return { text: '미적용', sub: '선임 연구원 이상 등급부터 혜택이 적용됩니다' };
    }
    const raw = String(res?.joinedAt || res?.joinedAtRaw || res?.joinDate || res?.joinedDate || res?.signupDate || '').trim();
    const joined = raw ? new Date(raw) : null;
    if (joined && !Number.isNaN(joined.getTime())) {
      const expected = new Date(joined.getTime());
      expected.setDate(expected.getDate() + 45);
      return { text: '미적용', sub: `3배 확장 예정일 : ${formatMyUsageDateOnly(expected)}` };
    }
    return { text: '미적용', sub: '가입일을 확인할 수 없어 45일 확장 여부를 계산하지 못했습니다.' };
  }

  function getMyUsageExtraSlotItems(res) {
    const eventExtra = Math.max(0, Number(res?.eventExtraSlots || 0));
    const sheetExtra = Math.max(0, Number(res?.sheetExtraSlots ?? res?.manualExtraSlots ?? 0));
    const items = [];
    if (eventExtra > 0) items.push({ count: `+${eventExtra}개`, reason: '저장슬롯 3배 확장 이벤트' });
    if (sheetExtra > 0) items.push({ count: `+${sheetExtra}개`, reason: '버그제보 및 기타사유' });
    return items;
  }

  function getMyUsageThemeClass(res) {
    const roleLevel = Number(res?.roleLevel ?? res?.level ?? 0);
    if (roleLevel >= 3) return 'usage-theme-senior';
    if (roleLevel === 2) return 'usage-theme-lead';
    if (roleLevel === 1) return 'usage-theme-junior';
    return '';
  }

  function applyMyUsageTheme(res) {
    const dialog = document.querySelector('#chm-myUsageInfoModal .my-usage-dialog');
    if (!dialog) return;
    dialog.classList.remove('usage-theme-senior', 'usage-theme-lead', 'usage-theme-junior', 'usage-theme-public');
    const theme = getMyUsageThemeClass(res);
    if (theme) dialog.classList.add(theme);
  }

  function isPublicMyUsageUser(res = null) {
    if (typeof res?.isRegistered === 'boolean') return res.isRegistered !== true;
    if (res?.accessTier) return String(res.accessTier).toLowerCase() !== 'member';
    return false;
  }

  function usageInfoPublicView(res, options = {}) {
    const isGuest = options.isGuest === true;
    const email = escapeMyUsageHtml(res?.email || '로그인 계정');
    const title = isGuest
      ? '현재 로그인하지 않은 상태로 일반 계산기를 이용하고 있습니다.'
      : '현재 Google 로그인으로 일반 계산기를 이용하고 있습니다.';
    const account = isGuest ? '비로그인 이용 중' : `로그인 계정 · ${email}`;
    const nicknameSection = isGuest ? '' : `
      <div class="usage-public-profile">
        <div class="usage-public-benefit-title">내 프로필</div>
        <div class="usage-info-grid usage-public-profile-grid">
          ${usageInfoBoardNicknameRow(
            options.nickname || '미설정',
            options.nickname ? '세팅 종합토론방에서 표시되는 닉네임입니다.' : '닉네임을 설정하면 글과 댓글 작성 시 사용할 수 있습니다.'
          )}
        </div>
      </div>`;
    return `
      <div class="usage-public-view">
        <section class="usage-public-hero">
          <div class="usage-public-badge">일반 이용자</div>
          <div class="usage-public-title">${title}</div>
          <div class="usage-public-desc">캐릭터·장비 세팅 비교와 데미지 계산 기능은 이용할 수 있으며, 연구원 가입 시 저장과 관리 기능을 포함한 추가 혜택이 제공됩니다.</div>
          <div class="usage-public-account">${account}</div>
        </section>
        ${nicknameSection}
        <div class="usage-public-benefit-title">연구원 가입 혜택</div>
        <div class="usage-public-benefits">
          <div class="usage-public-benefit"><div class="usage-public-benefit-icon">◆</div><strong>광고 없이 이용</strong><span>등록 연구원은 계산기를 보다 깔끔한 화면으로 이용할 수 있습니다.</span></div>
          <div class="usage-public-benefit"><div class="usage-public-benefit-icon">▣</div><strong>등급별 저장슬롯</strong><span>자주 사용하는 캐릭터와 장비 세팅을 저장하고 다시 불러올 수 있습니다.</span></div>
          <div class="usage-public-benefit"><div class="usage-public-benefit-icon">◎</div><strong>세팅 현황 기능</strong><span>여러 캐릭터의 장비와 세팅 상태를 한눈에 관리할 수 있습니다.</span></div>
          <div class="usage-public-benefit"><div class="usage-public-benefit-icon">✦</div><strong>등급별 추가 기능</strong><span>등급에 따라 저장슬롯 확장과 한마디 기능 등의 혜택이 적용됩니다.</span></div>
        </div>
        <section class="usage-public-join">
          <strong>더 많은 혜택을 누리려면 연구원으로 가입해 보세요!</strong>
          <p>가입 후 승인이 완료되면 계정 등급에 맞는 전용 기능을 이용해보실 수 있습니다.</p>
          <a class="usage-public-join-btn" href="https://www.youtube.com/channel/UCijUV3SuVe_qErzBpdOmKIA/join" target="_blank" rel="noopener noreferrer">연구원 가입하기</a>
        </section>
      </div>`;
  }

  function usageInfoRow(label, value, sub = '', tone = '') {
    const toneClass = tone ? ` tone-${tone}` : '';
    const extra = sub ? `<div class="usage-info-sub">${escapeMyUsageHtml(sub)}</div>` : '';
    return `<div class="usage-info-row${toneClass}"><div class="usage-info-label">${escapeMyUsageHtml(label)}</div><div class="usage-info-value">${escapeMyUsageHtml(value || '')}${extra}</div></div>`;
  }

  function usageInfoBoardNicknameRow(value, sub = '') {
    const safeValue = escapeMyUsageHtml(value || '미설정');
    const extra = sub ? `<div class="usage-info-sub">${escapeMyUsageHtml(sub)}</div>` : '';
    return `<div class="usage-info-row usage-board-nickname-row">
      <div class="usage-info-label">게시판 닉네임</div>
      <div class="usage-info-value">
        <div class="usage-board-nickname-line">
          <span class="usage-board-nickname-text">${safeValue}</span>
          <button type="button" class="usage-board-nickname-edit-btn" data-board-nickname-edit>변경하기</button>
        </div>
        ${extra}
      </div>
    </div>`;
  }

  function usageInfoOneLinerRow(value, sub = '', canEdit = false, tone = '') {
    const toneClass = tone ? ` tone-${tone}` : '';
    const safeValue = escapeMyUsageHtml(value || '사용 불가');
    const extra = sub ? `<div class="usage-info-sub">${escapeMyUsageHtml(sub)}</div>` : '';
    const editButton = canEdit
      ? '<button type="button" class="usage-board-nickname-edit-btn usage-one-liner-edit-btn" data-one-liner-edit>변경하기</button>'
      : '';
    return `<div class="usage-info-row usage-board-nickname-row usage-one-liner-row${toneClass}">
      <div class="usage-info-label">한마디 변경</div>
      <div class="usage-info-value">
        <div class="usage-board-nickname-line usage-one-liner-line">
          <span class="usage-board-nickname-text usage-one-liner-text">${safeValue}</span>
          ${editButton}
        </div>
        ${extra}
      </div>
    </div>`;
  }

  function usageInfoExtraSlotRow(res) {
    const items = getMyUsageExtraSlotItems(res);
    const body = items.length
      ? `<div class="usage-extra-list">${items.map(item => `<div class="usage-extra-item"><div class="usage-extra-count">${escapeMyUsageHtml(item.count)}</div><div class="usage-extra-reason">${escapeMyUsageHtml(item.reason)}</div></div>`).join('')}</div>`
      : '<div class="usage-extra-count">0개</div>';
    return `<div class="usage-info-row"><div class="usage-info-label">추가 저장슬롯</div><div class="usage-info-value">${body}</div></div>`;
  }

  function usageInfoSummary(res, eventText, phraseText) {
    const role = escapeMyUsageHtml(getMyUsageRoleDisplay(res));
    const joined = escapeMyUsageHtml(getMyUsageJoinedDateText(res) || '가입일 정보 없음');
    const total = Number(res.totalSlots || res.presetSlots || 0);
    const formula = escapeMyUsageHtml(res.slotFormulaText || `기본 ${Number(res.baseSlots || 0)}개 + 추가 ${Number(res.extraSlots || 0)}개`);
    return `<div class="usage-info-summary">
      <div class="usage-summary-card primary"><div class="usage-summary-label">현재 등급</div><div class="usage-summary-value">${role}</div><div class="usage-summary-sub">가입일: ${joined}</div></div>
      <div class="usage-summary-card gold"><div class="usage-summary-label">현재 사용 가능 슬롯</div><div class="usage-summary-value">${total}개</div><div class="usage-summary-sub">${formula} · 저장슬롯 확장 ${escapeMyUsageHtml(eventText || '미적용')} · 한마디 ${escapeMyUsageHtml(phraseText || '-')}</div></div>
    </div>`;
  }

  async function loadUsage() {
    const box = document.getElementById('chm-myUsageInfoContent');
    if (!box) return;
    applyMyUsageTheme(null);
    box.innerHTML = usageInfoRow('상태', '불러오는 중...');

    const token = getToken();
    if (!token || token.startsWith('GUEST.')) {
      const dialog = document.querySelector('#chm-myUsageInfoModal .my-usage-dialog');
      if (dialog) dialog.classList.add('usage-theme-public');
      box.innerHTML = usageInfoPublicView({ email: '' }, { isGuest: true });
      return;
    }

    try {
      const res = await apiJSON('my_usage_info', {});
      if (res && isPublicMyUsageUser(res)) {
        const dialog = document.querySelector('#chm-myUsageInfoModal .my-usage-dialog');
        if (dialog) dialog.classList.add('usage-theme-public');

        let publicNickname = '';
        currentBoardNickname = '';
        currentBoardNicknameChangedAt = '';
        currentBoardNicknameCanChange = true;
        currentBoardNicknameNextChangeAt = '';
        try {
          const boardProfile = await apiJSON('board_profile_get', {});
          if (boardProfile?.configured && String(boardProfile.nickname || '').trim()) {
            publicNickname = String(boardProfile.nickname).trim();
            currentBoardNickname = publicNickname;
          }
          currentBoardNicknameChangedAt = String(boardProfile?.lastNicknameChangedAt || '').trim();
          currentBoardNicknameCanChange = boardProfile?.canChangeNickname !== false;
          currentBoardNicknameNextChangeAt = String(boardProfile?.nextNicknameChangeAt || '').trim();
        } catch (boardProfileError) {
          console.warn('[common board_profile_get] public user load failed:', boardProfileError);
        }

        box.innerHTML = usageInfoPublicView(
          { email: res.email || '' },
          { nickname: publicNickname, nicknameChangedAt: currentBoardNicknameChangedAt }
        );
        return;
      }
      if (!res || !res.ok) {
        if (res?.error === 'user_not_found') {
          const dialog = document.querySelector('#chm-myUsageInfoModal .my-usage-dialog');
          if (dialog) dialog.classList.add('usage-theme-public');
          let publicNickname = '';
          currentBoardNickname = '';
          currentBoardNicknameChangedAt = '';
          currentBoardNicknameCanChange = true;
          currentBoardNicknameNextChangeAt = '';
          try {
            const boardProfile = await apiJSON('board_profile_get', {});
            if (boardProfile?.configured && String(boardProfile.nickname || '').trim()) {
              publicNickname = String(boardProfile.nickname).trim();
              currentBoardNickname = publicNickname;
            }
            currentBoardNicknameChangedAt = String(boardProfile?.lastNicknameChangedAt || '').trim();
            currentBoardNicknameCanChange = boardProfile?.canChangeNickname !== false;
            currentBoardNicknameNextChangeAt = String(boardProfile?.nextNicknameChangeAt || '').trim();
          } catch (boardProfileError) {
            console.warn('[common board_profile_get] user_not_found profile load failed:', boardProfileError);
          }
          box.innerHTML = usageInfoPublicView({ email: '' }, { nickname: publicNickname, nicknameChangedAt: currentBoardNicknameChangedAt });
          return;
        }
        box.innerHTML = usageInfoRow('상태', res?.message || res?.error || '이용 정보를 불러오지 못했습니다.');
        return;
      }

      applyMyUsageTheme(res);

      // 게시판 닉네임은 이용 정보와 별도 API에서 관리된다.
      // 게시판 프로필 조회가 실패하더라도 내 이용 정보 전체는 정상 표시한다.
      let boardNicknameText = '미설정';
      currentBoardNickname = '';
      currentBoardNicknameChangedAt = '';
      currentBoardNicknameCanChange = true;
      currentBoardNicknameNextChangeAt = '';
      try {
        const boardProfile = await apiJSON('board_profile_get', {});
        if (boardProfile?.configured && String(boardProfile.nickname || '').trim()) {
          boardNicknameText = String(boardProfile.nickname).trim();
          currentBoardNickname = boardNicknameText;
        }
        currentBoardNicknameChangedAt = String(boardProfile?.lastNicknameChangedAt || '').trim();
        currentBoardNicknameCanChange = boardProfile?.canChangeNickname !== false;
        currentBoardNicknameNextChangeAt = String(boardProfile?.nextNicknameChangeAt || '').trim();
      } catch (boardProfileError) {
        console.warn('[common board_profile_get] load failed:', boardProfileError);
        boardNicknameText = '확인 불가';
        currentBoardNickname = '';
      }

      const extension = getMyUsageSlotExtensionInfo(res);
      const phraseText = res.canEditPhrase ? (res.canChangePhrase ? '변경 가능' : '변경 대기 중') : '사용 불가';
      const phraseParts = [];
      const currentPhrase = String(res.phraseMessage || '').trim();
      if (currentPhrase) phraseParts.push(currentPhrase);
      phraseParts.push((!res.canChangePhrase && res.phraseNextAt)
        ? `다음 변경 가능일: ${formatMyUsageDate(res.phraseNextAt)}`
        : (res.canChangePhrase ? '지금 한마디를 변경할 수 있습니다.' : '책임 등급 이상부터 한마디를 사용할 수 있습니다.'));

      box.innerHTML = usageInfoSummary(res, extension.text, phraseText) + [
        usageInfoRow('현재 등급', getMyUsageRoleDisplay(res), res.email || ''),
        usageInfoRow('가입일', getMyUsageJoinedDateText(res) || '가입일 정보 없음'),
        usageInfoBoardNicknameRow(boardNicknameText, boardNicknameText === '미설정' ? '닉네임을 설정하면 세팅 종합토론방에서 사용할 수 있습니다.' : ''),
        usageInfoRow('기본 저장슬롯', `${Number(res.baseSlots || 0)}개`, getMyUsageBaseSlotSub(res)),
        usageInfoRow('저장슬롯 확장', extension.text, extension.sub, res.slotEventActive ? 'good' : ''),
        usageInfoExtraSlotRow(res),
        usageInfoRow('현재 사용 가능 슬롯', `${Number(res.totalSlots || res.presetSlots || 0)}개`, res.slotFormulaText || `기본 ${Number(res.baseSlots || 0)}개 + 추가 ${Number(res.extraSlots || 0)}개`, 'warn'),
        usageInfoOneLinerRow(phraseText, phraseParts.filter(Boolean).join('\n'), res.canEditPhrase === true, res.canChangePhrase ? 'good' : '')
      ].join('');
    } catch (err) {
      console.warn('[common my_usage_info] load failed:', err);
      box.innerHTML = usageInfoRow('상태', '이용 정보를 불러오는 중 오류가 발생했습니다.');
    }
  }


  function formatBoardNicknameChangedAt(value) {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).format(date).replace(/\. /g, '-').replace('.', '').replace(/-/g, '-');
  }

  function openBoardNicknameEditModal() {
    const token = getToken();
    if (!token || token.startsWith('GUEST.')) {
      alert('게시판 닉네임 변경은 Google 로그인이 필요합니다.');
      return;
    }
    const input = document.getElementById('chm-boardNicknameEditInput');
    const status = document.getElementById('chm-boardNicknameEditStatus');
    const lastChanged = document.getElementById('chm-boardNicknameLastChanged');
    const saveButton = document.getElementById('chm-boardNicknameEditSave');
    if (lastChanged) lastChanged.textContent = formatBoardNicknameChangedAt(currentBoardNicknameChangedAt);
    if (status) {
      status.textContent = currentBoardNicknameCanChange
        ? ''
        : `다음 변경 가능일: ${formatBoardNicknameChangedAt(currentBoardNicknameNextChangeAt)}`;
    }
    if (input) {
      input.value = currentBoardNickname || '';
      input.disabled = !currentBoardNicknameCanChange;
    }
    if (saveButton) saveButton.disabled = !currentBoardNicknameCanChange;
    hide('chm-myUsageInfoModal');
    show('chm-boardNicknameEditModal');
    setTimeout(() => {
      input?.focus();
      input?.select();
    }, 0);
  }

  function cancelBoardNicknameEdit() {
    hide('chm-boardNicknameEditModal');
    show('chm-myUsageInfoModal');
  }

  async function saveBoardNicknameEdit() {
    const input = document.getElementById('chm-boardNicknameEditInput');
    const status = document.getElementById('chm-boardNicknameEditStatus');
    const saveButton = document.getElementById('chm-boardNicknameEditSave');
    const nickname = String(input?.value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();

    if (nickname.length < 2 || nickname.length > 8) {
      if (status) status.textContent = '닉네임은 2~8자로 입력해주세요.';
      input?.focus();
      return;
    }
    if (nickname === currentBoardNickname) {
      if (status) status.textContent = '현재 닉네임과 동일합니다.';
      input?.focus();
      return;
    }

    try {
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = '변경 중...';
      }
      if (status) status.textContent = '닉네임을 변경하는 중...';

      const result = await apiJSON('board_profile_set', { nickname });
      if (!result?.ok) {
        throw new Error(result?.message || result?.error || '닉네임 변경에 실패했습니다.');
      }

      currentBoardNickname = String(result.nickname || nickname).trim();
      currentBoardNicknameChangedAt = String(result.lastNicknameChangedAt || '').trim();
      currentBoardNicknameCanChange = result.canChangeNickname !== false;
      currentBoardNicknameNextChangeAt = String(result.nextNicknameChangeAt || '').trim();
      hide('chm-boardNicknameEditModal');
      show('chm-myUsageInfoModal');
      await loadUsage();
      alert('게시판 닉네임이 변경되었습니다.');
    } catch (error) {
      console.warn('[common board_profile_set] save failed:', error);
      if (status) status.textContent = error?.message || '닉네임 변경에 실패했습니다.';
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = '변경하기';
      }
    }
  }

  function bindContactSend() {
    const send = document.getElementById('chm-btnContactSend');
    if (!send || send.dataset.commonBound) return;
    send.dataset.commonBound='1';
    send.addEventListener('click', async () => {
      const talk = String(document.getElementById('chm-contactTalk')?.value || '').trim();
      const nick = String(document.getElementById('chm-contactGuestNickname')?.value || '').trim();
      const token = getToken();
      const isGuest = !token || token.startsWith('GUEST.');
      if (isGuest && (nick.length < 2 || nick.length > 20)) return alert('닉네임을 2~20자로 입력해 주세요.');
      if (talk.length < 10) return alert('문의 내용을 10자 이상 입력해 주세요.');
      try {
        send.disabled=true;
        const res=await apiJSON('contact_admin',{talk,nickname:isGuest?nick:'',ingame:isGuest?nick:'...',youtube:'',role:isGuest?'비로그인':''});
        if(!res?.ok) throw new Error(res?.error||'contact_fail');
        document.getElementById('chm-contactTalk').value='';
        hide('chm-contactModal'); alert('문의가 전송되었습니다. 감사합니다!');
      } catch(e) { console.error(e); alert(e?.message==='rate_limited'?'비로그인 문의는 5분에 한 번만 보낼 수 있습니다.':'전송에 실패했습니다. 잠시 후 다시 시도해 주세요.'); }
      finally { send.disabled=false; }
    });
  }

  function init() {
    if (window.__COMMON_HEADER_MODALS_INITIALIZED__) return;
    window.__COMMON_HEADER_MODALS_INITIALIZED__ = true;
    ensureMount();
    bindContactSend();
    document.getElementById('chm-boardNicknameEditSave')?.addEventListener('click', saveBoardNicknameEdit);
    document.getElementById('chm-boardNicknameEditInput')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveBoardNicknameEdit();
      }
    });
    window.CommonHeaderModals = {
      openContact() { show('chm-contactModal'); document.getElementById('chm-contactTalk')?.focus(); },
      openFaq() { show('chm-faqModal'); loadFaq(); },
      openUsage() { show('chm-myUsageInfoModal'); loadUsage(); },
      openOneLiner() {
        if (typeof window.openOneLinerModal === 'function') return window.openOneLinerModal();
        show('chm-oneLinerModal');
        const c=document.getElementById('chm-oneLinerCooldown'); if(c) c.textContent='현재 페이지에서는 로그인 정보를 확인한 뒤 이용할 수 있습니다.';
      },
      close: hide,
    };
    document.addEventListener('click', e => {
      const t=e.target;
      if (t.closest?.('[data-contact-close]')) hide('chm-contactModal');
      if (t.closest?.('[data-faq-close]')) hide('chm-faqModal');
      if (t.closest?.('[data-faqans-close]')) hide('chm-faqAnswerModal');
      if (t.closest?.('[data-faqans-back]')) { hide('chm-faqAnswerModal'); window.CommonHeaderModals.openFaq(); }
      if (t.closest?.('[data-my-usage-close]')) hide('chm-myUsageInfoModal');
      if (t.closest?.('[data-board-nickname-edit]')) openBoardNicknameEditModal();
      if (t.closest?.('[data-one-liner-edit]')) {
        hide('chm-myUsageInfoModal');
        window.CommonHeaderModals.openOneLiner();
      }
      if (t.closest?.('[data-board-nickname-cancel]')) cancelBoardNicknameEdit();
      if (t.closest?.('#chm-noticeModal [data-close]')) hide('chm-noticeModal');
      if (t.closest?.('#chm-withdrawModal [data-close]')) hide('chm-withdrawModal');
      if (t.closest?.('#chm-oneLinerModal [data-close]')) hide('chm-oneLinerModal');
      if (t.closest?.('[data-one-liner-confirm-close]')) hide('chm-oneLinerConfirmModal');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
