(() => {
  const body = document.body;
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.querySelector('.nav');
  if (!menuBtn || !nav) return;

  const setOpen = (open) => {
    body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };

  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.addEventListener('click', () => setOpen(!body.classList.contains('nav-open')));
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
  document.addEventListener('click', (event) => {
    if (!body.classList.contains('nav-open')) return;
    if (event.target.closest('.nav') || event.target.closest('.menu-btn')) return;
    setOpen(false);
  });
})();
