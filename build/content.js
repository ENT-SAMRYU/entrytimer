// 타이머 설정
let timerInterval = null;
let endTime = null;
let hasDetected = false; // 한 번만 감지하도록

// 저장된 타이머 불러오기
async function loadTimer() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['timerEndTime'], (result) => {
      resolve(result.timerEndTime || null);
    });
  });
}

// 타이머 저장하기
function saveTimer(time) {
  chrome.storage.local.set({ timerEndTime: time });
}

// 타이머 삭제하기
function clearTimer() {
  chrome.storage.local.remove(['timerEndTime']);
  hasDetected = false;
}

// 버튼 텍스트 업데이트
function updateButtonText(isTimerActive) {
  const button = document.querySelector('.css-1adjw8a.e13821ld2');
  if (!button) return;
  
  const text = isTimerActive ? '등록 불가' : '등록';
  button.textContent = text;
}

// 초기화 버튼 생성/제거
function updateResetButton(isTimerActive) {
  const existingButton = document.getElementById('timer-reset-btn');
  
  if (isTimerActive) {
    // 버튼이 없으면 생성
    if (!existingButton) {
      const resetBtn = document.createElement('button');
      resetBtn.id = 'timer-reset-btn';
      resetBtn.innerHTML = '🔄';
      resetBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: #FF6B6B;
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        z-index: 10000;
        transition: all 0.3s ease;
      `;
      
      resetBtn.onmouseover = () => {
        resetBtn.style.backgroundColor = '#FF5252';
        resetBtn.style.transform = 'scale(1.1)';
      };
      
      resetBtn.onmouseout = () => {
        resetBtn.style.backgroundColor = '#FF6B6B';
        resetBtn.style.transform = 'scale(1)';
      };
      
      resetBtn.onclick = () => {
        if (confirm('타이머를 초기화하시겠습니까?')) {
          resetTimer();
        }
      };
      
      document.body.appendChild(resetBtn);
    }
  } else {
    // 버튼이 있으면 제거
    if (existingButton) {
      existingButton.remove();
    }
  }
}

// 타이머 초기화 함수
function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  endTime = null;
  clearTimer();
  
  // UI 업데이트
  const targetElement = document.querySelector('.css-v98ur4.eq36rvw4');
  if (targetElement) {
    targetElement.innerHTML = '<h2>엔트리 이야기</h2>';
  }
  
  updateTextareaPlaceholder(false);
    
  updateButtonText(false);
  updateResetButton(false);
  
  console.log('타이머가 초기화되었습니다');
  
  // 자동 새로고침
  setTimeout(() => {
    location.reload();
  }, 100);
}

// 타이머 업데이트 함수
function updateTimer() {
  const targetElement = document.querySelector('.css-v98ur4.eq36rvw4');
  if (!targetElement) return;

  const now = Date.now();
  const remaining = Math.max(0, endTime - now);
  
  if (remaining === 0) {
    targetElement.innerHTML = '<h2>엔트리 이야기</h2>';
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    clearTimer();
    updateButtonText(false);
    updateResetButton(false);
    return;
  }
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  targetElement.innerHTML = `<h2>도배방지 해제까지 ${minutes}분 ${seconds}초</h2>`;
  updateButtonText(true);
  updateResetButton(true);
}

// 타이머 시작 함수
function startTimer() {
  // 10분 타이머 설정
  endTime = Date.now() + (10 * 60 * 1000);
  saveTimer(endTime);
  
  // 기존 타이머가 있으면 정리
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
  updateButtonText(true);
  updateResetButton(true);
}

// 페이지 로드 시 저장된 타이머 확인
async function initTimer() {
  const savedEndTime = await loadTimer();
  
  if (savedEndTime && savedEndTime > Date.now()) {
    // 저장된 타이머가 아직 유효함
    endTime = savedEndTime;
    hasDetected = true; // 이미 감지된 상태로 표시
    
    // 대상 요소가 있으면 타이머 시작
    const targetElement = document.querySelector('.css-v98ur4.eq36rvw4');
    if (targetElement) {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      updateTimer();
      timerInterval = setInterval(updateTimer, 1000);
      updateButtonText(true);
      updateResetButton(true);
    }
  } else if (savedEndTime) {
    // 만료된 타이머 삭제
    clearTimer();
    updateButtonText(false);
    updateResetButton(false);
  } else {
    // 타이머가 없으면 기본 상태
    updateButtonText(false);
    updateResetButton(false);
  }
}

// MutationObserver 설정 - 처음 한 번만 감지
const observer = new MutationObserver((mutations) => {
  if (hasDetected) return; // 이미 감지했으면 무시
  
  const triggerExists = document.querySelector('.css-g386mi.ev8ee033');
  
  if (triggerExists) {
    hasDetected = true; // 감지 완료 표시
    console.log('도배방지 감지됨 - 타이머 시작');
    startTimer();
    
    // 더 이상 감시 불필요하므로 observer 정지
    observer.disconnect();
  }
});

// 초기화
initTimer();

// DOM 전체 감시 시작
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false
});

// UI 주기적 체크 (다른 스크립트가 변경할 수 있으므로)
setInterval(() => {
  if (endTime && endTime > Date.now()) {
    updateButtonText(true);
    updateResetButton(true);
  } else if (!endTime || endTime <= Date.now()) {
    updateButtonText(false);
    updateResetButton(false);
  }
}, 2000);

console.log('도배방지 타이머 감시 시작됨');
