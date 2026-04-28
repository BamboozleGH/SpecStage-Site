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
