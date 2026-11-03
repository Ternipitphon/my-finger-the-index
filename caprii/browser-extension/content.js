// Commands are dispatched by the extension worker. A hidden Spotify tab may throttle page timers.
// This file remains in the injection bundle to stop an old page poller during an upgrade.
globalThis.__capriiPolling=false;
void 0;
