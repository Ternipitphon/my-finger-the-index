// Candidate detection only. Actual intents are chosen by AI in the main process.
export function needsMediaInterpretation(text,previous=null){
 if(typeof text!=='string')return false;
 if(previous?.awaiting&&text.trim().length<=300)return true;
 return /spotify|youtube|ยูทู[ปบ]|สปอ[ตท]ิฟ|เพลง|เพลย์ลิส|เพลลิส|\b(?:music|songs?|tracks?|playlists?|liked|favorites?|favourites?)\b/i.test(text)||!!previous&&(/^(?:ของ|ศิลปิน|ชื่อ|อันชื่อ|by)\s*/i.test(text.trim())||text.trim().length<=100&&/^(?:เล่นเลย|เปิดเลย|เล่นต่อ|เปิดหน่อย|เล่นหน่อย|ฟังต่อ|อีกที|อันเดิม|เหมือนเดิม|ต่อเลย|เอาเลย|หยุด|พัก|ข้าม|เพลงก่อน|play it|resume|pause|stop|skip|next|previous|again|go back)/i.test(text.trim()));
}
