// Isolated browser-test emulation only; never bundled into the game.
Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5,configurable:true});
