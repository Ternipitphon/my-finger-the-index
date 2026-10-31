'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('agentTask', {
  exportReport: () => ipcRenderer.invoke('agent:export-report'),
  stop: () => ipcRenderer.send('agent:stop-task'),
  state: () => ipcRenderer.invoke('agent:task-state'),
  onUpdate: fn => {
    const listener = (_event, state) => fn(state);
    ipcRenderer.on('agent:task-update', listener);
    return () => ipcRenderer.removeListener('agent:task-update', listener);
  },
});
