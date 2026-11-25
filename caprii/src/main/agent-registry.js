'use strict';

class ToolRegistry {
  constructor() { this.tools = new Map(); }
  add(name, { description, validate, run, modifies = false }) {
    if (!/^[a-z][a-z_.]*$/.test(name) || this.tools.has(name)) throw new Error('Invalid or duplicate tool');
    this.tools.set(name, { description, validate, run, modifies });
    return this;
  }
  describe() { return [...this.tools].map(([tool, entry]) => ({ tool, ...entry.description })); }
  async execute(action, context) {
    if (!action || typeof action !== 'object' || Array.isArray(action)) throw new Error('Expected a tool object');
    const entry = this.tools.get(action.tool);
    if (!entry) throw new Error('Unknown tool: ' + String(action.tool).slice(0, 60));
    context.signal.throwIfAborted();
    entry.validate(action);
    const result = await entry.run(action, context);
    context.signal.throwIfAborted();
    return { result, modifies: entry.modifies };
  }
}

function text(value, name, max = 8000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || value.includes('\0')) throw new Error('Invalid ' + name);
  return value;
}
function number(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error('Invalid ' + name);
  return value;
}
module.exports = { ToolRegistry, text, number };
