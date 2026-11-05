function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/** Small in-memory undo/redo stack for editor states. State objects must be JSON-serializable. */
export class HistoryManager {
  constructor(limit = 50) {
    this.limit = Math.max(1, Math.floor(limit));
    this.undoStack = [];
    this.redoStack = [];
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  record(state) {
    const snapshot = cloneState(state);
    const previous = this.undoStack[this.undoStack.length - 1];
    if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) return false;
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    return true;
  }

  undo(currentState) {
    if (!this.canUndo) return null;
    this.redoStack.push(cloneState(currentState));
    if (this.redoStack.length > this.limit) this.redoStack.shift();
    return cloneState(this.undoStack.pop());
  }

  redo(currentState) {
    if (!this.canRedo) return null;
    this.undoStack.push(cloneState(currentState));
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    return cloneState(this.redoStack.pop());
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
