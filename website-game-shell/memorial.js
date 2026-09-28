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
 const overlay=document.getElementById('buttercup-dedication');
 const app=document.getElementById('app');
 const button=document.getElementById('buttercup-continue');
 if(!overlay||!app||!button)return;
 let returnTo=null;
 const open=(trigger)=>{returnTo=trigger||null;app.inert=true;overlay.hidden=false;button.textContent=trigger?'BACK TO THE GAME →':'ENTER THE GARAGE →';button.focus();};
 const close=()=>{overlay.hidden=true;app.inert=false;(returnTo||document.getElementById('drive'))?.focus();};
 button.addEventListener('click',close);
 document.getElementById('memorial-credits-open')?.addEventListener('click',e=>open(e.currentTarget));
 document.getElementById('pause-credits')?.addEventListener('click',e=>open(e.currentTarget));
 // No cookies/localStorage bypass: every fresh graphical session starts with the notice.
 // Prevent background game's keyboard listeners from consuming modal interactions.
 const gate=e=>{
  if(overlay.hidden)return;
  if(e.type==='keyup'){e.stopImmediatePropagation();return;}
  const focusable=Array.from(overlay.querySelectorAll('button,a[href],summary')).filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  if(e.key==='Tab'){
   e.preventDefault();const i=focusable.indexOf(document.activeElement),n=focusable.length;
   if(n)focusable[(i+(e.shiftKey?-1:1)+n)%n].focus();
  }else if(e.key==='Enter'||e.key===' '){
   const active=document.activeElement;
   if(overlay.contains(active)&&(active.matches('button,summary')||(e.key==='Enter'&&active.matches('a[href]')))){e.preventDefault();active.click();}
  }
  e.stopImmediatePropagation();
 };
 window.addEventListener('keydown',gate,true);window.addEventListener('keyup',gate,true);
 // GitHub is the explicit source destination on every host and in standalone.
 // Only project credits follow the current preview/production origin.
 if(location.protocol==='https:'||location.protocol==='http:'){
  overlay.querySelector('[data-memorial-credits]').href='./CREDITS.md';
 }
 open(null);
})();
