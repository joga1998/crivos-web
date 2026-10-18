// Interatividade e Gerenciamento de Tema para Landing Page Oficial da CRIVO
(function() {
  // Inicialização imediata do tema para evitar flash de tela branca
  try {
    const savedTheme = localStorage.getItem('crivo_web_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {}
})();

document.addEventListener('DOMContentLoaded', () => {
  // Sincronização e alternância do botão de Modo Escuro
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  
  function updateThemeButtonText() {
    if (!themeToggleBtn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeToggleBtn.innerHTML = isDark ? '[ ◑ NOITE ]' : '[ ◐ DIA ]';
  }

  updateThemeButtonText();

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      try {
        localStorage.setItem('crivo_web_theme', newTheme);
      } catch (e) {}
      updateThemeButtonText();
    });
  }

  // Menu Hamburguer Mobile
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNavDrawer = document.getElementById('mobile-nav-drawer');

  if (mobileMenuBtn && mobileNavDrawer) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileNavDrawer.classList.toggle('open');
      const isOpen = mobileNavDrawer.classList.contains('open');
      mobileMenuBtn.textContent = isOpen ? '✕ FECHAR' : '☰ MENU';
    });

    document.addEventListener('click', (e) => {
      if (!mobileNavDrawer.contains(e.target) && e.target !== mobileMenuBtn) {
        mobileNavDrawer.classList.remove('open');
        mobileMenuBtn.textContent = '☰ MENU';
      }
    });

    mobileNavDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNavDrawer.classList.remove('open');
        mobileMenuBtn.textContent = '☰ MENU';
      });
    });
  }

  // Smooth scroll para todos os links internos com âncora
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });

  // Fechar acordeões anteriores do FAQ quando um abrir (estilo acordeão único clássico)
  const faqDetails = document.querySelectorAll('.faq-item');
  faqDetails.forEach(targetDetail => {
    targetDetail.addEventListener('toggle', () => {
      if (targetDetail.open) {
        faqDetails.forEach(detail => {
          if (detail !== targetDetail && detail.open) {
            detail.removeAttribute('open');
          }
        });
      }
    });
  });

  // Log de status técnico no console
  console.log('%c■ CRIVO // SISTEMA OPERACIONAL DE ESTUDOS PÓS-EDITAL', 'color: #D92B2B; font-weight: bold; font-family: monospace;');
  console.log('%cDesign System Editorial Suíço + Dark Mode Ativo.', 'color: #111111; font-family: monospace;');
});
