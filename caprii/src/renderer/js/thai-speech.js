export class ThaiSpeech {
 constructor({synthesis=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance}={}){this.synthesis=synthesis;this.Utterance=Utterance;this.enabled=false;this.volume=0.7;}
 configure({speechThai,muted,volume}){this.enabled=speechThai===true&&!muted;this.volume=Math.max(0,Math.min(1,volume??0.7));if(!this.enabled){try{this.synthesis?.cancel();}catch{}}}
 speak(text){
  if(!this.enabled||!this.synthesis||!this.Utterance||!/[\u0e00-\u0e7f]/.test(text))return false;
  try{const voice=this.synthesis.getVoices().find(v=>/^th(?:-|$)/i.test(v.lang)&&v.localService!==false);if(!voice)return false;
  const utterance=new this.Utterance(text.slice(0,1000));utterance.voice=voice;utterance.lang='th-TH';utterance.volume=this.volume;utterance.rate=1;
  this.synthesis.cancel();this.synthesis.speak(utterance);return true;}catch{return false;}
 }
}
