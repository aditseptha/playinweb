type CloseFn = () => void;

let closeLoginModal: CloseFn = () => {};
let closeSignupModal: CloseFn = () => {};

export function registerLoginModalCloser(fn: CloseFn) {
  closeLoginModal = fn;
}

export function registerSignupModalCloser(fn: CloseFn) {
  closeSignupModal = fn;
}

export function closeLoginModalNow() {
  closeLoginModal();
}

export function closeSignupModalNow() {
  closeSignupModal();
}
