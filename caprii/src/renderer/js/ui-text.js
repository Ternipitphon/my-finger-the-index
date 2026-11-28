import * as catalog from './ui-catalog.js';
export const uiText=(value,lang,slots=[])=>globalThis.CAPRII_UI_TEXT.text(value,lang,slots);
export const uiMessage=(value,lang)=>globalThis.CAPRII_UI_TEXT.message(value,lang);
