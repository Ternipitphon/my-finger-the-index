'use strict';
function spotifyPath(value){return new URL(value).pathname.replace(/^\/intl-[a-z]{2}(?:-[a-z]{2})?(?=\/)/i,'')||'/';}
function spotifyURL(value){const u=new URL(value);if(u.origin!=='https://open.spotify.com'||u.username||u.password||!/^\/(?:search(?:\/[^?#]*)?|collection(?:\/(?:tracks|playlists))?|playlist\/[A-Za-z0-9]+|track\/[A-Za-z0-9]+)\/?$/.test(spotifyPath(u.href)))throw Error('รองรับเฉพาะหน้าค้นหา เพลง และคลังเพลงใน Spotify');return u.href;}
module.exports={spotifyURL,spotifyPath};
