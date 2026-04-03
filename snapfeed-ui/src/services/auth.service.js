import { buildQuery } from "../utils/query";

function getGoogleAuthUrl() {
  const baseUrl = import.meta.env.VITE_GOOGLE_AUTH_URL;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;

  const qs = buildQuery({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
  });
  return `${baseUrl}?${qs}`;
}

function getFacebookAuthUrl() {
  const baseUrl = import.meta.env.VITE_FACEBOOK_AUTH_URL;
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
  const redirectUri = import.meta.env.VITE_FACEBOOK_REDIRECT_URI;

  const qs = buildQuery({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: "email",
  });
  return `${baseUrl}?${qs}`;
}

export const authService = {
  getGoogleAuthUrl,
  getFacebookAuthUrl,
  loginWithGoogle: () => {
    window.location.href = getGoogleAuthUrl();
  },
  loginWithFacebook: () => {
    window.location.href = getFacebookAuthUrl();
  },
};
