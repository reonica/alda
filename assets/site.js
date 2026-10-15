(() => {
  'use strict';
  // Keep Netlify Identity invitation/recovery handling confined to the admin page.
  if (/^#(?:invite_token|recovery_token|confirmation_token)=/.test(location.hash) && !location.pathname.startsWith('/admin/')) {
    location.replace(`/admin/${location.hash}`);
    return;
  }
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#primary-nav');
  if (toggle && nav) {
    document.documentElement.classList.add('js');
    toggle.hidden = false;
    const setOpen = open => { toggle.setAttribute('aria-expanded', String(open)); nav.dataset.open = String(open); };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); } });
  }

  const backToTop = document.querySelector('[data-back-to-top]');
  if (backToTop) {
    let pending = false;
    const updateBackToTop = () => {
      backToTop.hidden = window.scrollY < 400;
      pending = false;
    };
    updateBackToTop();
    window.addEventListener('scroll', () => {
      if (!pending) {
        pending = true;
        window.requestAnimationFrame(updateBackToTop);
      }
    }, { passive: true });
    backToTop.addEventListener('click', () => {
      document.querySelector('.site-header .brand')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }

  // Only interaction metadata is emitted. No field values or personal information.
  const track = (name, detail = {}) => {
    const event = { event: name, page_path: location.pathname, ...detail };
    document.dispatchEvent(new CustomEvent('aldahub:conversion', { detail: event }));
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(event);
  };
  document.querySelectorAll('[data-whatsapp]').forEach(link => link.addEventListener('click', () => track('whatsapp_click')));

  const service = document.querySelector('#audit-service');
  const requested = new URLSearchParams(location.search).get('service');
  if (service && [...service.options].some(option => option.value === requested)) service.value = requested;

  document.querySelectorAll('[data-lead-form]').forEach(form => {
    const status = form.querySelector('.form-status');
    if (document.body.hasAttribute('data-form-preview') && status) status.textContent = 'Preview: forms do not send here. Use the live website or WhatsApp to contact us.';
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (document.body.hasAttribute('data-form-preview')) return;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      status.textContent = 'Sending…';
      try {
        const response = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() });
        if (!response.ok) throw new Error(`Form submission failed (${response.status})`);
        track('form_submit_success', { form_name: form.getAttribute('name') });
        window.location.assign(form.getAttribute('action'));
      } catch {
        status.textContent = 'We could not send your request. Please try again, or contact us on WhatsApp.';
        button.disabled = false;
      }
    });
  });
})();
