/* Versioned static installation. Never reload an active drive without consent. */
'use strict';
if(location.protocol.startsWith('http')&&window.isSecureContext&&'serviceWorker' in navigator){
 let registration=null,approved=false,reloading=false;
 const box=document.createElement('aside');box.id='release-update';box.hidden=true;box.setAttribute('aria-label','Game update');
 box.style.cssText='position:fixed;right:16px;top:16px;max-width:min(340px,calc(100vw - 32px));padding:14px;background:#10212c;color:#eef2ed;border:1px solid #b6cfc5;border-radius:10px;z-index:10000;font:14px/1.5 system-ui';
 const text=document.createElement('p'),button=document.createElement('button');button.textContent='SAVE AND UPDATE';button.style.cssText='min-height:44px;padding:10px 14px;background:#dfc69f;color:#18252a;border:0;border-radius:5px';box.append(text,button);document.body.append(box);
 const safe=()=>{const s=window.REBORN?.snapshot?.();return !!s?.release?.safeToUpdate;};
 const refresh=()=>{const scene=window.REBORN?.snapshot?.().appState;box.hidden=!registration?.waiting||scene==='play'||scene==='replay';const ok=safe();text.textContent=ok?'An updated game is ready. Save this session and reload when you are ready.':'Update ready. Finish your commitment and pause or return to the garage before updating.';button.disabled=!ok;};
 button.addEventListener('click',()=>{if(!safe()||!registration?.waiting)return;approved=true;window.dispatchEvent(new Event('reborn-request-safe-update'));});
 window.addEventListener('reborn-safe-update-answer',e=>{if(e.detail?.safe&&approved)registration?.waiting?.postMessage({type:'REBORN_ACTIVATE'});else approved=false;});
 window.addEventListener('reborn-safe-state',refresh);
 navigator.serviceWorker.addEventListener('message',e=>{
  if(e.data?.type==='REBORN_CHECK_IDLE'){const ok=safe();if(ok)window.dispatchEvent(new Event('reborn-request-safe-update'));e.ports[0]?.postMessage({safe:ok&&safe()});}
  if(e.data?.type==='REBORN_UPDATE_BUSY'){approved=false;text.textContent='Another game tab is still active or could not be checked. Pause or close it before updating.';}
 });
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(approved&&safe()&&!reloading){reloading=true;location.reload();}
  else if(registration&&window.REBORN){text.textContent='A newer installation is available. Your current drive was not reloaded.';}
 });
 navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(r=>{
  registration=r;refresh();r.addEventListener('updatefound',()=>{r.installing?.addEventListener('statechange',()=>{refresh();setTimeout(refresh,100);});});return r.update();
 }).catch(error=>console.warn('Offline installation unavailable:',error.message));
}
