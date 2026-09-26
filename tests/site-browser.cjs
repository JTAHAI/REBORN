'use strict';
const {execFileSync}=require('node:child_process'),path=require('node:path');
execFileSync(process.env.PYTHON||(process.platform==='win32'?'python':'python3'),[path.join(__dirname,'website-browser.py')],{stdio:'inherit',timeout:240000});
