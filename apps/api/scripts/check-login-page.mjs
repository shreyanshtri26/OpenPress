// Fails if the reader sign-in page's inline script does not parse (one bad regex once disabled every button).
import { renderDevLoginPageHtml } from '../src/render-login-fallback.mjs';

const scripts = [...renderDevLoginPageHtml().matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!scripts.length) throw new Error('login page has no inline script');
for (const js of scripts) new Function(js);
console.log('login page script: ok');
