// Firefox-only DOM API not declared in lib.dom.d.ts.
// https://developer.mozilla.org/en-US/docs/Web/API/Document/caretPositionFromPoint
interface CaretPosition {
  readonly offsetNode: Node;
  readonly offset: number;
}

interface Document {
  caretPositionFromPoint?(x: number, y: number): CaretPosition | null;
}
