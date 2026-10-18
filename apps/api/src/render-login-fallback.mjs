// Dynamic fallback login page renderer for site-dev when S3 object hasn't been written yet.
export function renderDevLoginPageHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In — OpenPress ePaper</title>
  <meta name="description" content="Sign in to your OpenPress account to read the ePaper and keep your preferences." />
  <link rel="icon" href="/openpress-quill-nobg-trim.png" type="image/png" />

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Share+Tech+Mono&display=swap" rel="stylesheet" />

  <!-- Tailwind CDN for development fallback -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Identity Services (GIS) for Google Sign-In -->
  <script src="https://accounts.google.com/gsi/client" async defer></script>

  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f8f9fa;
      color: #1d1d1f;
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }
    .font-merriweather { font-family: 'Merriweather', Georgia, serif; }
    .font-share { font-family: 'Share Tech Mono', monospace; }
  </style>
</head>
<body class="flex flex-col min-h-screen">
  <!-- Minimal Top Header -->
  <header class="w-full bg-white border-b border-neutral-200 py-3 px-4 sm:px-8">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <a href="/" class="flex items-center gap-2 hover:opacity-85 transition-opacity" aria-label="OpenPress Home">
        <img src="/openpress-logo-full-nobg-trim.png" alt="OpenPress" class="h-9 sm:h-11 w-auto object-contain" />
      </a>
      <a href="/" class="text-xs font-semibold text-neutral-600 hover:text-black font-share uppercase tracking-wider flex items-center gap-1.5 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        <span>Back to ePaper</span>
      </a>
    </div>
  </header>

  <!-- Main Content: Centered Auth Card -->
  <main class="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
    <div class="w-full max-w-md bg-white border border-neutral-200/90 shadow-xl rounded-2xl p-6 sm:p-9 transition-all">
      
      <!-- Card Header -->
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-neutral-900 text-white mb-3 shadow-sm">
          <img src="/openpress-quill-nobg-trim.png" alt="" class="h-6 w-auto invert" />
        </div>
        <h1 id="auth-title" class="text-2xl font-bold font-merriweather text-neutral-900 tracking-tight">Sign In to OpenPress</h1>
        <p class="text-xs text-neutral-500 mt-1.5 font-share leading-relaxed">
          Sign in or create an account to read the ePaper and keep your preferences.
        </p>
      </div>

      <!-- Already Logged In State Banner (hidden by default) -->
      <div id="already-logged-in-banner" class="hidden mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
        <p class="text-xs text-emerald-900 font-semibold mb-1">You are signed in as:</p>
        <p id="logged-in-email" class="text-sm font-bold text-neutral-900 truncate mb-3"></p>
        <div class="flex gap-2">
          <a href="/" class="flex-1 py-2 px-3 bg-neutral-900 text-white text-xs font-semibold rounded-lg text-center hover:bg-black transition">Go to Home</a>
          <button onclick="handleReaderLogout()" type="button" class="py-2 px-3 border border-neutral-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition cursor-pointer">Sign Out</button>
        </div>
      </div>

      <!-- Error Banner -->
      <div id="auth-error-banner" class="hidden mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-share leading-normal"></div>

      <!-- Primary Action: Google Sign-In Button -->
      <div class="space-y-4" id="login-container">
        <button
          id="google-signin-btn"
          type="button"
          onclick="handleGoogleSignInClick()"
          class="w-full min-h-[46px] flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-800 text-sm font-semibold rounded-xl border border-neutral-300 shadow-sm hover:shadow transition-all duration-150 cursor-pointer active:scale-[0.99]"
        >
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <!-- Divider -->
        <div id="auth-divider" class="relative flex py-2 items-center">
          <div class="flex-grow border-t border-neutral-200"></div>
          <span class="flex-shrink mx-3 text-neutral-400 text-[11px] uppercase tracking-wider font-share">Or with email</span>
          <div class="flex-grow border-t border-neutral-200"></div>
        </div>

        <!-- Email & Passwordless Form -->
        <form id="reader-login-form" onsubmit="handleEmailAuth(event)" class="space-y-3.5">
          <div>
            <label for="reader-email" class="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 font-share">Reader Email</label>
            <input
              id="reader-email"
              type="email"
              required
              autocomplete="email"
              placeholder="reader@example.com"
              class="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-base sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition"
            />
          </div>

          <div>
            <label for="reader-name" class="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 font-share">Your Name (Optional)</label>
            <input
              id="reader-name"
              type="text"
              autocomplete="name"
              placeholder="e.g. Jane Doe"
              class="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-base sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition"
            />
          </div>

          <button
            id="reader-submit-btn"
            type="submit"
            class="w-full min-h-[46px] py-3 px-4 bg-neutral-900 hover:bg-black text-white font-share font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <span>Sign In to ePaper</span>
          </button>
        </form>

        <!-- Email and password: sign in or create an account -->
        <form id="neon-form" onsubmit="handleNeonEmailAuth(event)" class="hidden space-y-3.5">
          <div id="neon-name-row" class="hidden">
            <label for="neon-name" class="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 font-share">Your Name</label>
            <input id="neon-name" type="text" autocomplete="name" placeholder="e.g. Jane Doe" class="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-base sm:text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200" />
          </div>
          <div>
            <label for="neon-email" class="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 font-share">Email</label>
            <input id="neon-email" type="email" required autocomplete="email" placeholder="you@example.com" class="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-base sm:text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200" />
          </div>
          <div>
            <label for="neon-password" class="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 font-share">Password</label>
            <input id="neon-password" type="password" required minlength="8" autocomplete="current-password" placeholder="At least 8 characters" class="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-base sm:text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200" />
          </div>
          <button id="neon-submit-btn" type="submit" class="w-full min-h-[46px] py-3 px-4 bg-neutral-900 hover:bg-black text-white font-share font-semibold text-sm rounded-xl shadow-sm transition-colors">
            <span>Sign in</span>
          </button>
        </form>

      </div>

      <!-- Switch between signing in and creating an account -->
      <div id="auth-mode-toggle" class="hidden mt-6 pt-5 border-t border-neutral-100 text-center">
        <p class="text-sm text-neutral-600">
          <span id="auth-mode-question">New here?</span>
          <button type="button" id="auth-mode-switch" onclick="setAuthMode()" class="font-semibold text-neutral-900 underline hover:text-black">Create an account</button>
        </p>
      </div>

    </div>
  </main>



  <!-- Client-side Script -->
  <script>
    (function() {
      const apiBase = window.__openPress_API__ || (window.location.origin.includes(':8080') ? 'http://localhost:3001' : window.location.origin);
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl') || '/';
      // Set by scripts/publish-login.mjs in production. Without it the page keeps the local demo sign-in.
      const neonAuth = (window.__NEON_AUTH_URL__ || '').replace(/[/]+$/, '');
      if (neonAuth) {
        ['auth-divider', 'reader-login-form'].forEach(function(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; });
        ['neon-form', 'auth-mode-toggle'].forEach(function(id) { var el = document.getElementById(id); if (el) el.classList.remove('hidden'); });
      }

      function showError(msg) {
        const el = document.getElementById('auth-error-banner');
        if (el) {
          el.textContent = msg;
          el.classList.remove('hidden');
        }
      }

      function clearError() {
        const el = document.getElementById('auth-error-banner');
        if (el) {
          el.textContent = '';
          el.classList.add('hidden');
        }
      }

      function checkExistingAuth() {
        const token = localStorage.getItem('website_token');
        const userRaw = localStorage.getItem('website_user') || localStorage.getItem('auth_user');
        if (token && userRaw) {
          try {
            const user = JSON.parse(userRaw);
            const banner = document.getElementById('already-logged-in-banner');
            const emailEl = document.getElementById('logged-in-email');
            if (banner && emailEl) {
              emailEl.textContent = (user.displayName || user.name ? (user.displayName || user.name) + ' (' + user.email + ')' : user.email);
              banner.classList.remove('hidden');
            }
          } catch(e) {}
        }
      }

      window.handleReaderLogout = async function() {
        try {
          await fetch(apiBase + '/epaper/auth/logout', { method: 'POST' }).catch(() => {});
        } catch(e) {}
        localStorage.removeItem('website_token');
        localStorage.removeItem('website_user');
        localStorage.removeItem('auth_user');
        document.cookie = "website_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        const banner = document.getElementById('already-logged-in-banner');
        if (banner) banner.classList.add('hidden');
      };

      async function completeAuth(data) {
        localStorage.setItem('website_token', data.token);
        localStorage.setItem('website_user', JSON.stringify(data.reader));
        localStorage.setItem('auth_user', JSON.stringify(data.reader));
        document.cookie = 'website_token=' + data.token + '; path=/; max-age=2592000; SameSite=Lax';

        // Redirect back to returnUrl or home
        const dest = (returnUrl && !returnUrl.includes('/login')) ? returnUrl : '/';
        window.location.href = dest;
      }

      // Email Authentication Form Submit
      window.handleEmailAuth = async function(e) {
        if (e) e.preventDefault();
        clearError();
        const email = document.getElementById('reader-email')?.value?.trim();
        const name = document.getElementById('reader-name')?.value?.trim();
        const btn = document.getElementById('reader-submit-btn');

        if (!email) return;

        try {
          if (btn) { btn.disabled = true; btn.innerHTML = '<span>Signing in...</span>'; }
          const res = await fetch(apiBase + '/epaper/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              displayName: name || email.split('@')[0],
              neonAuthId: 'neon_reader_' + Math.random().toString(36).substring(2, 10),
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Authentication failed');
          await completeAuth(data);
        } catch(err) {
          showError(err.message || 'Failed to sign in. Please try again.');
          if (btn) { btn.disabled = false; btn.innerHTML = '<span>Sign In to ePaper</span>'; }
        }
      };

      // Handle Google OAuth Redirect Token in URL Hash
      async function handleOAuthCallback() {
        if (!window.location.hash) return;
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        if (!accessToken) return;

        try {
          const btn = document.getElementById('google-signin-btn');
          if (btn) { btn.disabled = true; btn.innerHTML = '<span>Verifying Google account...</span>'; }

          const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: 'Bearer ' + accessToken }
          });
          if (userInfoRes.ok) {
            const profile = await userInfoRes.json();
            const res = await fetch(apiBase + '/epaper/auth/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: profile.email,
                displayName: profile.name || profile.given_name || profile.email.split('@')[0],
                avatarUrl: profile.picture || null,
                neonAuthId: 'google_' + (profile.sub || profile.id || Math.random().toString(36).substring(2, 10)),
              })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Google authentication sync failed');
            await completeAuth(data);
          }
        } catch (e) {
          showError('Google authentication error: ' + (e.message || e));
        }
      }

      // Google Sign-In click handler (direct redirect, zero popup)
      window.handleGoogleSignInClick = async function() {
        clearError();
        const btn = document.getElementById('google-signin-btn');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span>Redirecting to Google...</span>';
        }

        if (neonAuth) {
          try {
            const callbackURL = window.location.origin + '/login?neon=1&returnUrl=' + encodeURIComponent(returnUrl);
            const res = await fetch(neonAuth + '/sign-in/social', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider: 'google', callbackURL: callbackURL })
            });
            const data = await res.json();
            if (!res.ok || !data.url) throw new Error(data.message || 'Could not start Google sign-in');
            window.location.href = data.url;
          } catch (err) {
            showError(err.message || 'Could not start Google sign-in.');
            if (btn) { btn.disabled = false; btn.textContent = 'Continue with Google'; }
          }
          return;
        }

        const googleClientId = window.__GOOGLE_CLIENT_ID__;
        if (googleClientId) {
          // Standard Google OAuth direct redirect flow (no popups)
          const redirectUri = encodeURIComponent(window.location.origin + '/login');
          const scope = encodeURIComponent('openid email profile');
          const state = encodeURIComponent(returnUrl);
          window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' + googleClientId + '&redirect_uri=' + redirectUri + '&response_type=token&scope=' + scope + '&state=' + state;
          return;
        }

        // Direct Google Sign-In (no popup, immediately authenticates & redirects back to returnUrl or home)
        try {
          const res = await fetch(apiBase + '/epaper/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'reader.google@openpress.local',
              displayName: 'Google Reader',
              avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
              neonAuthId: 'google_reader_' + Math.random().toString(36).substring(2, 10),
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Google authentication failed');
          await completeAuth(data);
        } catch (err) {
          showError(err.message || 'Failed to authenticate via Google.');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg><span>Continue with Google</span>';
          }
        }
      };

      // Back from Google.
      // Trade the session cookie for a signed token and let the API verify it (it ignores anything else).
      async function finishNeonSession(button, idleLabel) {
        try {
          const tokenRes = await fetch(neonAuth + '/token', { credentials: 'include' });
          const tokenData = tokenRes.ok ? await tokenRes.json() : null;
          if (!tokenData || !tokenData.token) throw new Error('Sign in did not finish. If your browser blocks third-party cookies, allow them for this site and try again.');
          const res = await fetch(apiBase + '/epaper/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenData.token },
            body: '{}'
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Sign in failed');
          await completeAuth(data);
        } catch (err) {
          showError(err.message || 'Sign in failed.');
          if (button) { button.disabled = false; button.textContent = idleLabel; }
        }
      }

      // Back from Google.
      async function completeNeonSignIn() {
        if (!neonAuth || urlParams.get('neon') !== '1') return;
        const btn = document.getElementById('google-signin-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Finishing sign in...'; }
        await finishNeonSession(btn, 'Continue with Google');
      }

      var authMode = 'signin';
      window.setAuthMode = function() {
        authMode = authMode === 'signin' ? 'signup' : 'signin';
        var signup = authMode === 'signup';
        document.getElementById('neon-name-row').classList.toggle('hidden', !signup);
        document.getElementById('auth-title').textContent = signup ? 'Create your account' : 'Sign In to OpenPress';
        document.querySelector('#neon-submit-btn span').textContent = signup ? 'Create account' : 'Sign in';
        document.getElementById('neon-password').setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
        document.getElementById('auth-mode-question').textContent = signup ? 'Already have an account?' : 'New here?';
        document.getElementById('auth-mode-switch').textContent = signup ? 'Sign in' : 'Create an account';
        clearError();
      };

      window.handleNeonEmailAuth = async function(e) {
        if (e) e.preventDefault();
        clearError();
        var signup = authMode === 'signup';
        var email = document.getElementById('neon-email').value.trim();
        var password = document.getElementById('neon-password').value;
        var name = document.getElementById('neon-name').value.trim() || email.split('@')[0];
        var btn = document.getElementById('neon-submit-btn');
        var idle = signup ? 'Create account' : 'Sign in';
        btn.disabled = true; btn.querySelector('span').textContent = signup ? 'Creating account...' : 'Signing in...';
        try {
          var res = await fetch(neonAuth + (signup ? '/sign-up/email' : '/sign-in/email'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signup ? { email: email, password: password, name: name } : { email: email, password: password })
          });
          var data = await res.json().catch(function() { return {}; });
          if (!res.ok) throw new Error(data.message || (signup ? 'Could not create the account.' : 'Wrong email or password.'));
        } catch (err) {
          showError(err.message);
          btn.disabled = false; btn.querySelector('span').textContent = idle;
          return;
        }
        await finishNeonSession(null, '');
        btn.disabled = false; btn.querySelector('span').textContent = idle;
      };

      // Check if user is already authenticated
      completeNeonSignIn();
      checkExistingAuth();
      handleOAuthCallback();
    })();
  </script>
</body>
</html>`;
}
