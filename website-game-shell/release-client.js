// Browser-only release cache. No server, account, telemetry, or map service.
'use strict';
if (location.protocol.startsWith('http') && window.isSecureContext && 'serviceWorker' in navigator) {
  const previouslyControlled = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (previouslyControlled && !reloading) { reloading = true; location.reload(); }
  });
  navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'})
    .then(registration => registration.update()).catch(error => console.warn('Offline installation unavailable:', error.message));
}
