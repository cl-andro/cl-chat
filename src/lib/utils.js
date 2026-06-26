export function toHex(uint8) {
    return Array.from(uint8).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex) {
    return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

export function isLikelyCode(text) {
    return /[`]/.test(text)
        || /^[a-fA-F0-9]{32,}$/.test(text.trim())
        || /^ssh-(rsa|ed25519|ecdsa)/.test(text.trim())
        || /^-----BEGIN/.test(text.trim())
        || /^[A-Za-z0-9+/=]{40,}$/.test(text.trim())
        || text.split('\n').length > 2;
}

export function isSecretKey(text) {
    return /^-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/.test(text.trim())
        || /^[a-fA-F0-9]{64,}$/.test(text.trim())
        || /sk-[A-Za-z0-9]{20,}/.test(text)
        || /ghp_[A-Za-z0-9]{36,}/.test(text)
        || /gho_[A-Za-z0-9]{36,}/.test(text)
        || /xox[bpras]-[A-Za-z0-9-]{24,}/.test(text)
        || /AKIA[0-9A-Z]{16}/.test(text);
}

export function truncate(str, len) {
    return str.length > len ? str.slice(0, len) + '...' : str;
}

export function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function debounce(fn, ms) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}
