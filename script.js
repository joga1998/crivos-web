// Interatividade leve para Landing Page Oficial da CRIVO
document.addEventListener('DOMContentLoaded', () => {
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
  console.log('%cArquitetura Editorial Suíça carregada com sucesso.', 'color: #111111; font-family: monospace;');
});
