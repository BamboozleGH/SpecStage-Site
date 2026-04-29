'use strict';

// ── Footer year ─────────────────────────────────────────────────
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ── Topbar border on scroll ─────────────────────────────────────
const topbar = document.getElementById('topbar');
if (topbar) {
  const onScroll = () => topbar.classList.toggle('scrolled', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ── Beta application form (request-access page) ─────────────────
// AJAX submit so visitors stay on the page and see inline feedback
// rather than being redirected to Formspree's thank-you page.
(() => {
  const form = document.getElementById('apply-form');
  if (!form) return;

  // Record the time the page rendered — submissions made within 2s of
  // load are almost certainly bots. Belt-and-suspenders alongside the
  // honeypot field and Formspree's own filtering.
  const renderedAt = Date.now();

  const status      = document.getElementById('apply-status');
  const loading     = document.getElementById('apply-loading');
  const submitBtn   = form.querySelector('button[type="submit"]');

  function showStatus(kind, msg) {
    if (!status) return;
    status.className = 'apply-status ' + kind;
    status.textContent = msg;
    status.style.display = '';
  }

  function showLoading() {
    if (loading) loading.hidden = false;
    submitBtn.disabled = true;
  }
  function hideLoading() {
    if (loading) loading.hidden = true;
    submitBtn.disabled = false;
  }

  // Build the success card. Returns an HTML string accepting an inline
  // min-height so the new card matches the form's height (no layout shift).
  function buildSuccessHtml(minHeightPx) {
    const heightStyle = minHeightPx ? ` style="min-height:${minHeightPx}px"` : '';
    return `
      <div class="apply-success" role="status" aria-live="polite"${heightStyle}>
        <svg class="success-mark" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="0"   y="0"  width="8"  height="100" fill="#1a7a3e"/>
          <rect x="0"   y="0"  width="28" height="8"   fill="#1a7a3e"/>
          <rect x="0"   y="92" width="28" height="8"   fill="#1a7a3e"/>
          <rect x="192" y="0"  width="8"  height="100" fill="#1a7a3e"/>
          <rect x="172" y="0"  width="28" height="8"   fill="#1a7a3e"/>
          <rect x="172" y="92" width="28" height="8"   fill="#1a7a3e"/>
          <path class="check" d="M 70 52 L 90 70 L 132 30"
                stroke="#1a7a3e" stroke-width="7" fill="none"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>Application sent.</h3>
        <p>Thanks — we'll read it personally and respond within a few business days.</p>
        <p>If you don't hear back, write to <a href="mailto:hello@specstage.com">hello@specstage.com</a>.</p>
      </div>`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Native validation first
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Bot speed check — discard submissions made implausibly quickly
    if (Date.now() - renderedAt < 2000) return;

    if (status) status.style.display = 'none';
    showLoading();

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        // Capture the form's current height so the success card matches it.
        // Without this the layout collapses (form ~700-1000px tall, success
        // card much shorter) which feels jarring on submit.
        const formHeight = form.offsetHeight;
        form.outerHTML = buildSuccessHtml(formHeight);
      } else {
        let errMsg = 'Something went wrong. Please try again, or email hello@specstage.com directly.';
        try {
          const data = await res.json();
          if (data && data.error) {
            errMsg = data.error;                    // Cloudflare Function shape
          } else if (data && data.errors && data.errors[0] && data.errors[0].message) {
            errMsg = data.errors[0].message;        // Formspree-style fallback
          }
        } catch {}
        hideLoading();
        showStatus('err', errMsg);
      }
    } catch (err) {
      hideLoading();
      showStatus('err', 'Network error. Please try again, or email hello@specstage.com directly.');
    }
  });
})();

// ── Hero chip animation ─────────────────────────────────────────
// Now driven entirely by CSS @keyframes with animation-delay (see
// .opt-add / .opt-del / .endorse in styles.css). No JS needed — this
// makes the animation robust to JS being disabled or blocked, and
// the chips' default styles already represent the final coloured
// state so the meaning is preserved even if animations don't run.

// ── Reveal-on-scroll (Intersection Observer) ────────────────────
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in'));
}

// ── Cookie consent + Google Analytics ───────────────────────────
const CONSENT_KEY = 'specstage-analytics-consent';
const banner = document.getElementById('cookie-banner');

function loadGA() {
  const id = window.GA_MEASUREMENT_ID;
  if (!id || id.startsWith('G-XXXX')) return; // not configured yet
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id, { anonymize_ip: true });
}

function showBanner() { if (banner) requestAnimationFrame(() => banner.classList.add('show')); }
function hideBanner() { if (banner) banner.classList.remove('show'); }

const stored = localStorage.getItem(CONSENT_KEY);
if (stored === 'granted') {
  loadGA();
} else if (stored !== 'denied') {
  // First visit — prompt
  setTimeout(showBanner, 600);
}

document.getElementById('cookie-accept')?.addEventListener('click', () => {
  localStorage.setItem(CONSENT_KEY, 'granted');
  hideBanner();
  loadGA();
});

document.getElementById('cookie-decline')?.addEventListener('click', () => {
  localStorage.setItem(CONSENT_KEY, 'denied');
  hideBanner();
});
