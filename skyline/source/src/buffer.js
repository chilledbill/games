import { TUNE } from './moves.js';
export class InputBuffer {
  constructor() { this.commands = []; }
  add(action, direction, time) {
    this.commands = this.commands.filter(c => c.action !== action);
    this.commands.push({action, direction:{...direction}, time});
  }
  expire(time) { this.commands = this.commands.filter(c => time - c.time <= TUNE.buffer + 1e-8); }
  consume(command) { this.commands = this.commands.filter(c => c !== command); }
  clear() { this.commands = []; }
}
