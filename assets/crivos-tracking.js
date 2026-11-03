// CRIVOS // INFRAESTRUTURA DE PERFORMANCE & RASTREAMENTO GLOBAL
// Injeta e dispara de forma assíncrona o Meta Pixel e ferramentas de análise

(function() {
  const META_PIXEL_ID = '1639261614349090';

  window.CRIVOS_TRACKING = window.CRIVOS_TRACKING || {
    metaPixelId: META_PIXEL_ID,
    clarityId: window.CLARITY_PROJECT_ID || null,
    gtagId: window.GTAG_CONVERSION_ID || null
  };

  // Inicializador Meta Pixel (Stub Padrão Oficial Meta)
  if (META_PIXEL_ID && !window.fbq) {
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');

    fbq('init', META_PIXEL_ID);
    fbq('track', 'PageView');
  }

  // Rastreamento automático de cliques em botões de plano / checkout
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a[href*="payment.html"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        try {
          const href = this.getAttribute('href') || '';
          const urlParams = new URLSearchParams(href.split('?')[1] || '');
          const plano = urlParams.get('produto') || 'tatico';
          const concurso = urlParams.get('concurso') || document.title;
          
          if (window.fbq) {
            fbq('track', 'InitiateCheckout', {
              content_name: concurso,
              content_ids: [plano],
              content_type: 'product'
            });
          }
        } catch (e) {
          console.debug('[Tracking] Erro InitiateCheckout:', e);
        }
      });
    });
  });
})();
