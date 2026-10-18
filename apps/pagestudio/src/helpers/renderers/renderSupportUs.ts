import type { RenderContext } from '../core/renderTypes'

// Support Us: pick an amount, pay by UPI through a YouPI PG checkout (https://github.com/gxurav1710/YouPI-PG).
// The checkout script comes from the gateway itself; point the site at it with
//   VITE_YOUPI_URL          e.g. https://pay.yourdomain.com
//   VITE_YOUPI_PUBLIC_KEY   the merchant public key
// Without them the page still renders but says payments are not set up yet. The gateway confirms each payment to
// the API's /youpi/webhook; the browser only shows a thank-you.
const env = ((import.meta as any).env || {}) as Record<string, string | undefined>

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const SAFE_URL = /^https?:\/\/[^\s'"<>]+$/
const SAFE_KEY = /^[A-Za-z0-9._:-]+$/

export type SupportUsProps = {
  kicker?: string
  title?: string
  message?: string
  amounts?: string
  buttonText?: string
  thankYou?: string
  note?: string
}

export const SUPPORT_US_DEFAULTS: Required<SupportUsProps> = {
  kicker: 'Support OpenPress',
  title: 'Keep independent journalism free for everyone.',
  message:
    'OpenPress has no paywall and no ads you have to sit through. If you value what we publish, a contribution of any size helps us keep it that way.',
  amounts: '100,250,500,1000',
  buttonText: 'Support with UPI',
  thankYou: 'Thank you. Your support keeps OpenPress free for everyone.',
  note: 'Payments are made by UPI through YouPI PG. There are no platform fees and we never see your bank details.',
}

export function renderSupportUs(props: SupportUsProps = {}, _ctx?: RenderContext): string {
  const given = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined && v !== ''))
  const p = { ...SUPPORT_US_DEFAULTS, ...given } as Required<SupportUsProps>
  const amounts = String(p.amounts).split(',').map((a) => parseInt(a, 10)).filter((n) => n > 0 && n <= 100000).slice(0, 6)
  const base = (env.VITE_YOUPI_URL || '').replace(/\/$/, '')
  const key = env.VITE_YOUPI_PUBLIC_KEY || ''
  const configured = SAFE_URL.test(base) && SAFE_KEY.test(key)

  const chips = amounts
    .map(
      (a, i) =>
        `<button type="button" class="op-amt rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-[15px] font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7] ${i === 1 ? 'op-amt-on' : ''}" data-amt="${a}">₹${a.toLocaleString('en-IN')}</button>`
    )
    .join('')

  return `
<section id="support-us" class="bg-white">
  <style>
    #support-us .op-amt-on { background:#1d1d1f !important; color:#fff !important; border-color:#1d1d1f !important; }
    #support-us input.op-custom { width: 9rem; text-align:center; }
    #support-us #op-pay[disabled] { opacity:.5; cursor:not-allowed; }
  </style>
  <div class="mx-auto max-w-2xl px-4 py-16 sm:py-24 text-center">
    <p class="inline-block rounded-full bg-[#f5f5f7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6e6e73]">${esc(p.kicker)}</p>
    <h1 class="mt-5 text-4xl sm:text-5xl font-bold leading-[1.08] tracking-tight text-[#1d1d1f]">${esc(p.title)}</h1>
    <p class="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[#6e6e73]">${esc(p.message)}</p>

    <div id="op-thanks" class="mt-8 hidden rounded-2xl bg-[#f5f5f7] px-6 py-5 text-[17px] font-medium text-[#1d1d1f]">${esc(p.thankYou)}</div>

    <div id="op-form" class="mt-10 rounded-3xl border border-[#d2d2d7] p-6 sm:p-8 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.18)]">
      <div class="flex flex-wrap items-center justify-center gap-3">
        ${chips}
        <input type="number" min="10" max="100000" inputmode="numeric" placeholder="Other ₹" aria-label="Other amount in rupees" class="op-custom rounded-full border border-[#d2d2d7] px-4 py-2.5 text-[15px] font-semibold outline-none focus:border-[#0071e3]" />
      </div>
      <button id="op-pay" type="button" class="mt-8 inline-flex items-center justify-center rounded-full bg-[#0071e3] px-8 py-3.5 text-[16px] font-semibold text-white transition hover:brightness-95 active:scale-[0.98]" ${configured ? '' : 'disabled'}>${esc(p.buttonText)}<span id="op-pay-amt" class="ml-2 opacity-80"></span></button>
      <p id="op-status" class="mt-4 text-sm text-[#6e6e73]">${configured ? '' : 'Payments are not set up on this site yet.'}</p>
    </div>
    <p class="mt-6 text-xs text-[#86868b]">${esc(p.note)}</p>
  </div>
  ${configured ? `<script src="${base}/youpi.js" data-youpi-key="${key}" data-currency="INR" async></script>` : ''}
  <script>(function(){
    var root=document.getElementById('support-us'); if(!root) return;
    var amt=0, chips=root.querySelectorAll('.op-amt'), custom=root.querySelector('.op-custom'), pay=root.querySelector('#op-pay'), label=root.querySelector('#op-pay-amt'), status=root.querySelector('#op-status');
    function set(v){ amt=v; label.textContent=v?'· ₹'+v.toLocaleString('en-IN'):''; }
    chips.forEach(function(c){ c.addEventListener('click',function(){ chips.forEach(function(x){x.classList.remove('op-amt-on');}); c.classList.add('op-amt-on'); custom.value=''; set(+c.dataset.amt); }); });
    custom.addEventListener('input',function(){ chips.forEach(function(x){x.classList.remove('op-amt-on');}); set(Math.max(0,Math.min(100000,parseInt(custom.value,10)||0))); });
    var first=root.querySelector('.op-amt-on'); if(first) set(+first.dataset.amt);
    if(/[?&]thanks=1/.test(location.search)){ root.querySelector('#op-thanks').classList.remove('hidden'); root.querySelector('#op-form').classList.add('hidden'); }
    pay.addEventListener('click',function(){
      if(amt<10){ status.textContent='Choose an amount of at least ₹10.'; return; }
      if(!window.Youpi){ status.textContent='The payment window is still loading. Try again in a moment.'; return; }
      status.textContent='';
      window.Youpi.pay({ order_id:'SUPPORT-'+Date.now(), amount:amt, currency:'INR', name:'OpenPress', description:'Support OpenPress',
        handler:function(){ location.href=location.pathname+'?thanks=1'; },
        onClose:function(){ status.textContent=''; } });
    });
  })();</script>
</section>`
}
