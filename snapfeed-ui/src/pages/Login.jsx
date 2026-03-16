const GOOGLE_CLIENT_ID = "944363268636-kj1hef52s8jelgujjtn4fafa2kebu44i.apps.googleusercontent.com";

function loginWithGoogle() {
  const redirectUri = "http://localhost:8000/api/v1/auth/google/callback";

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=openid email profile`;

  window.location.href = url;
}

export default function LoginPage() {
  return (
    <div>
      <h2>Login</h2>

      <button onClick={loginWithGoogle}>
        Login with Google
      </button>
    </div>
  );
}