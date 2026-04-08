const AUTH_MODAL_EVENT = "snapfeed.auth_modal.open";

export function openAuthModal() {
  window.dispatchEvent(new CustomEvent(AUTH_MODAL_EVENT));
}

export function onAuthModalOpen(handler) {
  window.addEventListener(AUTH_MODAL_EVENT, handler);
  return () => window.removeEventListener(AUTH_MODAL_EVENT, handler);
}

