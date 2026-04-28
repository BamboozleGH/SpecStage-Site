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

  const status = document.getElementById('apply-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  function showStatus(kind, msg) {
    if (!status) return;
    status.className = 'apply-status ' + kind;
    status.textContent = msg;
    status.style.display = '';
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

    submitBtn.disabled = true;
    const originalLabel = submitBtn.innerHTML;
    submitBtn.textContent = 'Sending…';
    if (status) status.style.display = 'none';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        // Replace the form with a clean confirmation block
        form.outerHTML = `
          <div class="apply-success" role="status" aria-live="polite">
            <h3>Application received.</h3>
            <p>Thanks — we'll read it personally and respond within a few business days. If you don't hear back, write to <a href="mailto:hello@specstage.com">hello@specstage.com</a>.</p>
          </div>`;
      } else {
        let errMsg = 'Something went wrong. Please try again, or email hello@specstage.com directly.';
        try {
          const data = await res.json();
          if (data && data.errors && data.errors[0] && data.errors[0].message) {
            errMsg = data.errors[0].message;
          }
        } catch {}
        showStatus('err', errMsg);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalLabel;
      }
    } catch (err) {
      showStatus('err', 'Network error. Please try again, or email hello@specstage.com directly.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
    }
  });
})();

// ── Hero chip animation: strike-through DEL, highlight ADD ──────
// Adds .chips-go to each .hero-points after a brief pause so visitors
// see the neutral state momentarily, then watch decisions resolve.
(() => {
  const groups = document.querySelectorAll('.hero-points');
  if (!groups.length) return;
  const start = () => groups.forEach(el => el.classList.add('chips-go'));
  // Wait until layout has settled and the user has had a tick to land.
  setTimeout(start, 450);
})();

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
