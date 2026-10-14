/* ===== 계정 화면 입력 검사 (04 회원가입 · 06 비밀번호 재설정) ===== */
const accountForm = document.querySelector('form[data-validate]');

if (accountForm) {
  const PW_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;      // 8자 이상 + 영문 + 숫자
  const pw = accountForm.querySelector('input[name="password"]');
  const pwCheck = accountForm.querySelector('input[name="password_check"]');

  // 칸별 검사 규칙: 문제가 있으면 오류 문구, 없으면 ''
  const rules = {
    name: v => (v.trim() ? '' : '이름을 입력해 주세요.'),
    email: v => {
      if (!v.trim()) return '이메일을 입력해 주세요.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : '이메일 형식이 올바르지 않습니다.';
    },
    password: v => (PW_RULE.test(v) ? '' : '8자 이상, 영문과 숫자를 포함해 주세요.'),
    password_check: v => {
      if (!v) return '비밀번호를 한 번 더 입력해 주세요.';
      return v === pw.value ? '' : '비밀번호가 일치하지 않습니다.';
    },
  };

  // 오류 표시 / 지우기
  function setError(input, msg) {
    const field = input.closest('.field');
    const hint = field.querySelector('.field__hint');
    input.classList.toggle('is-error', Boolean(msg));
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');

    // 안내 문구가 이미 있는 칸(06 새 비밀번호)은 그 문구를 빨갛게만
    if (hint) {
      hint.classList.toggle('is-error', Boolean(msg));
      return;
    }

    let err = field.querySelector('.field__error');
    if (msg) {
      if (!err) {
        err = document.createElement('p');
        err.className = 'field__error';
        err.id = `${input.name}-error`;
        field.append(err);
        input.setAttribute('aria-describedby', err.id);
      }
      err.textContent = msg;
    } else if (err) {
      err.remove();
      input.removeAttribute('aria-describedby');
    }
  }

  // 한 칸 검사 → 통과하면 true
  function validate(input) {
    const rule = rules[input.name];
    if (!rule) return true;
    const msg = rule(input.value, input);
    setError(input, msg);
    return !msg;
  }

  // 칸에서 빠져나올 때: 뭔가 입력했으면 형식 검사
  accountForm.querySelectorAll('.field .input').forEach(input => {
    input.addEventListener('blur', () => { if (input.value) validate(input); });
    // 오류가 떠 있는 칸은 고치는 동안 바로 다시 검사 → 맞으면 오류 사라짐
    input.addEventListener('input', () => {
      if (input.classList.contains('is-error')) validate(input);
    });
  });

  // 비밀번호 확인: 입력하는 동안, 길이가 같아지면 바로 일치 검사
  if (pw && pwCheck) {
    pwCheck.addEventListener('input', () => {
      if (pwCheck.value.length >= pw.value.length) validate(pwCheck);
    });
    pw.addEventListener('input', () => {
      if (pwCheck.value) validate(pwCheck);   // 비밀번호를 고치면 확인 칸도 다시 비교
    });
  }

  // 약관 동의 (회원가입만)
  const agreeAll = accountForm.querySelector('input[name="agree_all"]');
  let checkAgree = () => true;

  if (agreeAll) {
    const items = accountForm.querySelectorAll('.agree__list input');
    const required = accountForm.querySelectorAll('.agree__list input[required]');
    const agreeError = accountForm.querySelector('.agree__error');

    checkAgree = () => {
      const ok = [...required].every(box => box.checked);
      agreeError.hidden = ok;
      return ok;
    };

    agreeAll.addEventListener('change', () => {
      items.forEach(box => { box.checked = agreeAll.checked; });
      if (!agreeError.hidden) checkAgree();
    });

    items.forEach(box => box.addEventListener('change', () => {
      agreeAll.checked = [...items].every(b => b.checked);
      if (!agreeError.hidden) checkAgree();
    }));
  }

  // 제출: 전부 검사
  accountForm.addEventListener('submit', e => {
    e.preventDefault();
    let firstBad = null;
    accountForm.querySelectorAll('.field .input').forEach(input => {
      if (!validate(input) && !firstBad) firstBad = input;
    });
    const agreeOk = checkAgree();

    if (firstBad) { firstBad.focus(); return; }
    if (!agreeOk) { agreeAll.focus(); return; }

    if (accountForm.dataset.next) {
      window.location.href = accountForm.dataset.next;   // 06 재설정: 아직 화면 이동만
    } else {
      accountForm.querySelector('[type="submit"]').disabled = true;   // 두 번 클릭 방지
      accountForm.submit();                               // 04 회원가입: 서버로 전송
    }
  });
}