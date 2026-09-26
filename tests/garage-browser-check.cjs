'use strict';
// Independent browser acceptance against the CURRENT candidate tree.
// Uses an isolated browser session and ephemeral loopback server; no source writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname, '..');
// Optional staged acceptance for a named control, never a replacement for the
// default all-controls release gate. Reject misspellings rather than checking none.
const actionIds = {story:'story-open',drive:'drive',inspect:'inspect-car',controls:'intro-help'};
const args = require.main === module ? process.argv.slice(2) : [];
assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--action' && Object.hasOwn(actionIds,args[1])),
  'Usage: node tests/garage-browser-check.cjs [--action story|drive|inspect|controls]');
const selectedAction = args.length ? actionIds[args[1]] : null;
const npxCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
const portable = process.env.REBORN_BROWSER_DRIVER === 'playwright';
if (!portable) assert.ok(fs.existsSync(npxCli), 'Verification requires Node/npm with cached agent-browser, or REBORN_BROWSER_DRIVER=playwright');
let transport, pending = [], transportBuffer = '';
function portableBrowser(args) {
  if (!transport) {
    transport = spawn(process.env.PYTHON || 'python3', [path.join(__dirname, 'playwright-bridge.py')], {stdio:['pipe','pipe','pipe']});
    transport.stdout.on('data', data => {
      transportBuffer += data;
      let end;
      while ((end=transportBuffer.indexOf('\n')) >= 0) {
        const line=transportBuffer.slice(0,end);transportBuffer=transportBuffer.slice(end+1);
        const next=pending.shift();if(!next)continue;
        try {const value=JSON.parse(line);value.ok?next.resolve(JSON.stringify(value.result)):next.reject(new Error(value.error));} catch(error){next.reject(error);}
      }
    });
    transport.stderr.on('data', data=>process.stderr.write(data));
    const fail=error=>{for(const item of pending.splice(0))item.reject(error);};
    transport.on('error',fail);transport.on('exit',code=>fail(new Error('Playwright transport exited '+code)));
  }
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{transport.kill();reject(new Error('Browser command timed out: '+args[0]));},60000);pending.push({resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});transport.stdin.write(JSON.stringify(args)+'\n');});
}
const session = 'reborn-layout-' + process.pid + '-' + Date.now();
async function browser(...args) {
  if (portable) return portableBrowser(args);
  const input = args[0] === 'eval' ? args[1] : null;
  if (input !== null) args = ['eval', '--stdin'];
  return new Promise((resolve,reject) => {
    const child = spawn(process.execPath, [npxCli, '--yes', '--offline', 'agent-browser@0.38.1', '--session', session, ...args],
      {windowsHide:true,stdio:['pipe','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',chunk=>{stdout+=chunk;});
    child.stderr.on('data',chunk=>{stderr+=chunk;});
    const timer=setTimeout(()=>{child.kill();},60000);
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('exit',(code,signal)=>{
      clearTimeout(timer);
      // The CLI starts a detached browser daemon on Windows. Await its own
      // exit, not inherited pipe closure from that still-running daemon.
      child.stdout.destroy(); child.stderr.destroy();
      if(code===0) resolve(stdout.trim());
      else reject(new Error('Browser '+args[0]+' failed ('+(signal||code)+'): '+stderr.trim()));
    });
    child.stdin.on('error',()=>{});
    child.stdin.end(input || '');
  });
}
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.glb':'model/gltf-binary'};
let browserInitScript='';
const server = http.createServer((request, response) => {
  let filename;
  try {
    const url = new URL(request.url, 'http://localhost');
    filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!filename.startsWith(root + path.sep)) throw new Error('Outside fixture');
  } catch { response.writeHead(400); return response.end(); }
  fs.readFile(filename, (error, data) => {
    if (error) { response.writeHead(404); return response.end(); }
    response.writeHead(200, {'Content-Type':mime[path.extname(filename)] || 'application/octet-stream','Cache-Control':'no-store'});
    response.end(browserInitScript && filename===path.join(root,'index.html') ? data.toString('utf8').replace('<head>','<head><script>'+browserInitScript+'</script>') : data);
  });
});
const measure = `(() => {
  const menu=document.getElementById('intro');
  if(!menu || menu.hidden) throw new Error('Garage not visible');
  const a=menu.querySelector('.intro-copy').getBoundingClientRect(), b=menu.querySelector('.launch-panel').getBoundingClientRect();
  const overlap=Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
  const actions=[...menu.querySelectorAll('.mode-card,#drive,#intro-help,#inspect-car,#story-open')].map(e=>{const r=e.getBoundingClientRect();const label=e.querySelector('strong')||e;const range=document.createRange();range.selectNodeContents(label);const tops=[...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0).map(rect=>Math.round(rect.top));return {id:e.id,text:e.innerText,fontSize:parseFloat(getComputedStyle(label).fontSize),labelLines:new Set(tops).size,height:r.height,visible:r.width>0&&r.height>0&&r.top>=-1&&r.bottom<=innerHeight+1&&r.left>=-1&&r.right<=innerWidth+1};});
  const copyVisible=a.width>0 && a.height>0 && a.top>=-1 && a.left>=-1 && a.bottom<=innerHeight+1 && a.right<=innerWidth+1;
  const titleDirection=getComputedStyle(menu.querySelector('.intro-copy h1')).flexDirection;
  return {viewport:[innerWidth,innerHeight],overlap,copyVisible,titleDirection,copyBottom:a.bottom,panelTop:b.top,actions};
})()`;
async function run(action = selectedAction, compactSecondaryLabels = false) {
  assert.ok(action === null || Object.values(actionIds).includes(action), 'Unknown required control');
  let failure;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    console.log('Opening isolated candidate browser');
    await browser('open', 'http://127.0.0.1:' + server.address().port);
    for (const [width,height] of [[1366,900],[1264,569],[1024,600],[844,390],[390,844]]) {
      await browser('set','viewport',String(width),String(height));
      const result = JSON.parse(await browser('eval',measure));
      console.log(JSON.stringify(result));
      assert.equal(result.overlap,false,'Branding overlaps the activity panel at '+width+'x'+height);
      assert.ok(result.copyVisible,'Branding must remain visible, not moved off screen');
      // Qualify visible usability, not an assistant-chosen CSS technique.
      // Either title orientation is acceptable if the real geometry works.
      // Keep prior failed receipts; this revised contract is for NEW jobs only.
      assert.ok(result.actions.every(action=>action.visible),'An essential garage action is clipped');
      const checkedActions=action ? result.actions.filter(item=>item.id===action) : result.actions;
      assert.ok(checkedActions.length>0,'No controls matched the required acceptance scope');
      const smallLabels=checkedActions.filter(action=>action.fontSize<10);
      const smallTargets=checkedActions.filter(action=>action.height<32);
      assert.equal(smallLabels.length,0,'Action label below 10 CSS pixels at '+width+'x'+height+': '+JSON.stringify(smallLabels));
      assert.equal(smallTargets.length,0,'Action hit area below 32 CSS pixels at '+width+'x'+height+': '+JSON.stringify(smallTargets));
      if(compactSecondaryLabels) {
        const towers=result.actions.filter(item=>['inspect-car','intro-help'].includes(item.id) && item.labelLines>2);
        assert.equal(towers.length,0,'Secondary action text wraps into a narrow tower (more than two lines) at '+width+'x'+height+': '+JSON.stringify(towers));
      }
    }
    console.log(action ? 'SCOPED control acceptance passed at all five viewports: '+action+'. Not full garage acceptance.' : 'Garage browser layout acceptance passed at all five viewports');
  } catch(error) { failure=error; }
  finally {
    if (failure) console.error('Browser acceptance failure: ' + failure.message);
    try { await browser('close'); } catch(error) { failure ||= error; }
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
  if(failure) { console.error(failure.message); process.exitCode=1; }
}
async function withBrowser(check, {initScript='',viewport=null}={}) {
  browserInitScript=initScript;
  let failure;
  try {
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    if(viewport){await browser('open','about:blank');await browser('set','viewport','1366','900');await browser('set','viewport',...viewport.map(String));}
    await browser('open','http://127.0.0.1:'+server.address().port);
    await check(browser);
  } catch(error) {failure=error;}
  finally {
    try {await browser('close');} catch(error) {failure ||= error;}
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
  if(failure) {console.error(failure.message);process.exitCode=1;}
}
module.exports = {run,withBrowser};
if (require.main === module) run();
