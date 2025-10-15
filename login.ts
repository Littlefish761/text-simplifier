import { i18n } from './i18n.ts';

const form = document.getElementById('login-form') as HTMLFormElement;
const errorEl = document.getElementById('login-error') as HTMLParagraphElement;
const button = document.getElementById('login-btn') as HTMLButtonElement;
const langToggle = document.getElementById('lang-toggle') as HTMLButtonElement;

// Fallback verifier parameters (encoded for Admin/hbksfn1994)
const ITER = 210000;
const USER_SALT_B64 = 'nvSOeiTErtRnxleTibkMRg==';
const USER_DK_B64 = 'AEXgeeuNPE5mJ03/p2iT/YD/68S7MkjDEmOhk38V5Zk=';
const PASS_SALT_B64 = 'qGsnla4d95myxARs4rL3OQ==';
const PASS_DK_B64 = 'UMCrpSk0GtSn4dymfJqCs2/V49qnDrxunuDDm8A20KY=';

function showError(msg: string) {
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}

function b64ToBytes(b64: string) {
  if (!b64 || typeof b64 !== 'string') {
    throw new Error('Invalid base64 string');
  }
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function derivePBKDF2(pass: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  // Ensure we pass a clean ArrayBuffer (not SharedArrayBuffer-like types)
  const saltBuf = salt.byteOffset === 0 && salt.byteLength === salt.buffer.byteLength
    ? salt.buffer
    : salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBuf as ArrayBuffer, iterations }, keyMaterial, 256);
  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl?.classList.add('hidden');
  button.disabled = true;

  try {
    const fd = new FormData(form);
    const username = (fd.get('username') || '').toString().trim();
    const password = (fd.get('password') || '').toString();



    const userSalt = b64ToBytes(USER_SALT_B64);
    const userDk = b64ToBytes(USER_DK_B64);
    const passSalt = b64ToBytes(PASS_SALT_B64);
    const passDk = b64ToBytes(PASS_DK_B64);

    const derivedUser = await derivePBKDF2(username, userSalt, ITER);
    const derivedPass = await derivePBKDF2(password, passSalt, ITER);

    const userOk = timingSafeEqual(derivedUser, userDk);
    const passOk = timingSafeEqual(derivedPass, passDk);

    if (userOk && passOk) {
      const token = crypto.getRandomValues(new Uint8Array(16));
      const tokenB64 = btoa(String.fromCharCode(...token));
      sessionStorage.setItem('auth_ok', '1');
      sessionStorage.setItem('auth_token', tokenB64);
      window.location.replace('index.html');
    } else {
      showError(i18n.t('login_error_invalid'));
    }
  } catch (err) {
    console.error(err);
    showError(i18n.t('login_error_failed'));
  } finally {
    button.disabled = false;
  }
});

// Language toggle functionality
langToggle?.addEventListener('click', () => {
  i18n.toggleLanguage();
});
