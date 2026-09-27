/*
SPDX-License-Identifier: CPAL-1.0
The contents of this file are subject to the Common Public Attribution License
Version 1.0 (the "License"); you may not use this file except in compliance with
the License. You may obtain a copy at https://opensource.org/license/cpal-1.0
and in the accompanying LICENSE file, including its completed Exhibit B.
The License is based on the Mozilla Public License Version 1.1 but Sections 14
and 15 have been added to cover use of software over a computer network and
provide for limited attribution for the Original Developer. In addition,
Exhibit A has been modified to be consistent with Exhibit B.
Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
the specific language governing rights and limitations under the License.
The Original Code is the 99½ REBORN browser driving game and Buttercup memorial
website. The Initial Developer and Original Developer is Justin Tahai.
All portions of the code written by Justin Tahai are Copyright (c) 2026
Justin Tahai. All Rights Reserved. Contributors: see CONTRIBUTORS.md.
Attribution: In loving memory — Buttercup, Justin Tahai's 99.5 mkIV
No alternative license is designated by this release.
*/
'use strict';
(() => {
 const memorial="In loving memory — Buttercup, Justin Tahai's 99.5 mkIV";

 // A previous /play/ release may still be controlled by its own scoped worker.
 // The memorial homepage is outside that scope, so it can force a safe update
 // before the player follows a versioned Drive link. The game worker installs
 // its complete shell before activation and owns only /play/ caches.
 const refreshPlayInstallation=async()=>{
  if(!location.protocol.startsWith('http')||!('serviceWorker' in navigator))return;
  const playScope=new URL('/play/',location.origin).href;
  try{
   const registrations=await navigator.serviceWorker.getRegistrations();
   const registration=registrations.find(item=>item.scope===playScope);
   if(!registration)return;
   await registration.update();
   const worker=registration.installing||registration.waiting;
   if(worker&&worker.state!=='activated')await new Promise(resolve=>{
    const timer=setTimeout(resolve,15000);
    worker.addEventListener('statechange',()=>{if(worker.state==='activated'||worker.state==='redundant'){clearTimeout(timer);resolve();}},{once:false});
   });
  }catch(error){console.warn('Game update check unavailable:',error.message);}
 };
 refreshPlayInstallation();

 const header=document.querySelector('.site-header');
 const navToggle=document.querySelector('[data-nav-toggle]');
 const nav=document.getElementById('site-nav');
 const closeNav=()=>{if(!header||!navToggle)return;header.removeAttribute('data-menu-open');navToggle.setAttribute('aria-expanded','false');};
 navToggle?.addEventListener('click',()=>{const open=header.hasAttribute('data-menu-open');if(open)closeNav();else{header.setAttribute('data-menu-open','');navToggle.setAttribute('aria-expanded','true');}});
 nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeNav));
 window.addEventListener('keydown',event=>{if(event.key==='Escape')closeNav();});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const reveal=[...document.querySelectorAll('[data-reveal]')];
 if(reduced||!('IntersectionObserver' in window))reveal.forEach(el=>el.classList.add('is-visible'));
 else{
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
  reveal.forEach(el=>observer.observe(el));
 }

 const url='https://reborn.tahai.net/';
 async function copy(text){
  if(navigator.clipboard&&window.isSecureContext){try{await navigator.clipboard.writeText(text);return true;}catch(_e){}}
  const input=document.createElement('textarea');input.value=text;input.setAttribute('readonly','');input.style.cssText='position:fixed;top:0;left:-10000px;';document.body.append(input);
  const active=document.activeElement;input.select();let ok=false;try{ok=document.execCommand('copy');}catch(_e){}input.remove();active?.focus();return ok;
 }
 document.querySelectorAll('[data-copy-credit]').forEach(button=>button.addEventListener('click',async()=>{
  const done=await copy(memorial);const status=document.querySelector('[data-credit-status]');
  if(status)status.textContent=done?'Exact credit copied.':'Select and copy the dedication above.';
 }));
 document.querySelectorAll('[data-share]').forEach(button=>button.addEventListener('click',async()=>{
  const status=document.querySelector('[data-share-status]');
  if(navigator.share){try{await navigator.share({title:'99½ REBORN — For Buttercup',text:'Instead of a moment of silence, take her for a drive.',url});return;}catch(error){if(error.name==='AbortError')return;}}
  const done=await copy(url);if(status)status.textContent=done?'Tribute link copied.':'Share reborn.tahai.net with someone who loves a good drive.';
 }));
})();
