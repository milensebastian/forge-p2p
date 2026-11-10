import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';

export interface MonacoNamespace {
  Range: any;
  Selection: any;
  SelectionDirection?: any;
}

class RelativeSelection {
  constructor(
    public start: Y.RelativePosition,
    public end: Y.RelativePosition,
    public direction: any
  ) {}
}

const createRelativeSelection = (editor: any, monacoModel: any, type: Y.Text) => {
  const sel = editor.getSelection();
  if (sel !== null) {
    const startPos = sel.getStartPosition();
    const endPos = sel.getEndPosition();
    const start = Y.createRelativePositionFromTypeIndex(type, monacoModel.getOffsetAt(startPos));
    const end = Y.createRelativePositionFromTypeIndex(type, monacoModel.getOffsetAt(endPos));
    return new RelativeSelection(start, end, sel.getDirection());
  }
  return null;
};

const createMonacoSelectionFromRelativeSelection = (
  monaco: MonacoNamespace,
  editor: any,
  type: Y.Text,
  relSel: RelativeSelection,
  doc: Y.Doc
) => {
  const start = Y.createAbsolutePositionFromRelativePosition(relSel.start, doc);
  const end = Y.createAbsolutePositionFromRelativePosition(relSel.end, doc);
  if (start !== null && end !== null && start.type === type && end.type === type) {
    const model = editor.getModel();
    const startPos = model.getPositionAt(start.index);
    const endPos = model.getPositionAt(end.index);
    return monaco.Selection.createWithDirection
      ? monaco.Selection.createWithDirection(
          startPos.lineNumber,
          startPos.column,
          endPos.lineNumber,
          endPos.column,
          relSel.direction
        )
      : new monaco.Selection(
          startPos.lineNumber,
          startPos.column,
          endPos.lineNumber,
          endPos.column
        );
  }
  return null;
};

export class MonacoBinding {
  public readonly doc: Y.Doc;
  public readonly ytext: Y.Text;
  public readonly monacoModel: any;
  public readonly editors: Set<any>;
  public readonly monaco: MonacoNamespace;
  public readonly awareness: Awareness | null;

  private _mux = false;
  private _savedSelections = new Map<any, RelativeSelection>();
  private _decorations = new Map<any, any>();
  private _beforeTransaction: () => void;
  private _ytextObserver: (event: Y.YTextEvent) => void;
  private _monacoChangeHandler: { dispose: () => void };
  private _monacoDisposeHandler: { dispose: () => void };
  private _rerenderDecorations: () => void;

  constructor(
    ytext: Y.Text,
    monacoModel: any,
    editors: Set<any> = new Set(),
    awareness: Awareness | null = null,
    monacoInstance?: MonacoNamespace
  ) {
    this.doc = ytext.doc!;
    this.ytext = ytext;
    this.monacoModel = monacoModel;
    this.editors = editors;
    this.awareness = awareness;
    this.monaco = monacoInstance || (typeof window !== 'undefined' ? (window as any).monaco : {});

    this._beforeTransaction = () => {
      if (this._mux) return;
      this._mux = true;
      try {
        this._savedSelections = new Map();
        this.editors.forEach((editor) => {
          if (editor.getModel() === monacoModel) {
            const rsel = createRelativeSelection(editor, monacoModel, ytext);
            if (rsel !== null) {
              this._savedSelections.set(editor, rsel);
            }
          }
        });
      } finally {
        this._mux = false;
      }
    };
    this.doc.on('beforeAllTransactions', this._beforeTransaction);

    this._rerenderDecorations = () => {
      this.editors.forEach((editor) => {
        if (awareness && editor.getModel() === monacoModel) {
          const currentDecorations = this._decorations.get(editor) || [];
          const newDecorations: any[] = [];

          awareness.getStates().forEach((state: any, clientID: number) => {
            if (
              clientID !== this.doc.clientID &&
              state.selection != null &&
              state.selection.anchor != null &&
              state.selection.head != null
            ) {
              const anchorAbs = Y.createAbsolutePositionFromRelativePosition(
                state.selection.anchor,
                this.doc
              );
              const headAbs = Y.createAbsolutePositionFromRelativePosition(
                state.selection.head,
                this.doc
              );
              if (
                anchorAbs !== null &&
                headAbs !== null &&
                anchorAbs.type === ytext &&
                headAbs.type === ytext
              ) {
                let start: any;
                let end: any;
                let afterContentClassName: string | null = null;
                let beforeContentClassName: string | null = null;

                if (anchorAbs.index < headAbs.index) {
                  start = monacoModel.getPositionAt(anchorAbs.index);
                  end = monacoModel.getPositionAt(headAbs.index);
                  afterContentClassName = `yRemoteSelectionHead yRemoteSelectionHead-${clientID}`;
                } else {
                  start = monacoModel.getPositionAt(headAbs.index);
                  end = monacoModel.getPositionAt(anchorAbs.index);
                  beforeContentClassName = `yRemoteSelectionHead yRemoteSelectionHead-${clientID}`;
                }

                newDecorations.push({
                  range: new this.monaco.Range(
                    start.lineNumber,
                    start.column,
                    end.lineNumber,
                    end.column
                  ),
                  options: {
                    className: `yRemoteSelection yRemoteSelection-${clientID}`,
                    afterContentClassName,
                    beforeContentClassName,
                  },
                });
              }
            }
          });

          this._decorations.set(
            editor,
            editor.deltaDecorations(currentDecorations, newDecorations)
          );
        } else {
          this._decorations.delete(editor);
        }
      });
    };

    this._ytextObserver = (event: Y.YTextEvent) => {
      if (this._mux) return;
      this._mux = true;
      try {
        let index = 0;
        event.delta.forEach((op: any) => {
          if (op.retain !== undefined) {
            index += op.retain;
          } else if (op.insert !== undefined) {
            const pos = monacoModel.getPositionAt(index);
            const range = new this.monaco.Selection(
              pos.lineNumber,
              pos.column,
              pos.lineNumber,
              pos.column
            );
            const insert = op.insert as string;
            monacoModel.applyEdits([{ range, text: insert }]);
            index += insert.length;
          } else if (op.delete !== undefined) {
            const pos = monacoModel.getPositionAt(index);
            const endPos = monacoModel.getPositionAt(index + op.delete);
            const range = new this.monaco.Selection(
              pos.lineNumber,
              pos.column,
              endPos.lineNumber,
              endPos.column
            );
            monacoModel.applyEdits([{ range, text: '' }]);
          }
        });

        this._savedSelections.forEach((rsel, editor) => {
          const sel = createMonacoSelectionFromRelativeSelection(
            this.monaco,
            editor,
            ytext,
            rsel,
            this.doc
          );
          if (sel !== null) {
            editor.setSelection(sel);
          }
        });
      } finally {
        this._mux = false;
      }
      this._rerenderDecorations();
    };

    ytext.observe(this._ytextObserver);

    // Initial value synchronization
    const ytextValue = ytext.toString();
    if (monacoModel.getValue() !== ytextValue) {
      monacoModel.setValue(ytextValue);
    }

    this._monacoChangeHandler = monacoModel.onDidChangeContent((event: any) => {
      if (this._mux) return;
      this._mux = true;
      try {
        this.doc.transact(() => {
          event.changes
            .slice()
            .sort((a: any, b: any) => b.rangeOffset - a.rangeOffset)
            .forEach((change: any) => {
              ytext.delete(change.rangeOffset, change.rangeLength);
              ytext.insert(change.rangeOffset, change.text);
            });
        }, this);
      } finally {
        this._mux = false;
      }
    });

    this._monacoDisposeHandler = monacoModel.onWillDispose(() => {
      this.destroy();
    });

    if (awareness) {
      this.editors.forEach((editor) => {
        editor.onDidChangeCursorSelection(() => {
          if (editor.getModel() === monacoModel) {
            const sel = editor.getSelection();
            if (sel === null) return;

            let anchor = monacoModel.getOffsetAt(sel.getStartPosition());
            let head = monacoModel.getOffsetAt(sel.getEndPosition());

            const isRTL =
              this.monaco.SelectionDirection &&
              sel.getDirection() === this.monaco.SelectionDirection.RTL;
            if (isRTL) {
              const tmp = anchor;
              anchor = head;
              head = tmp;
            }

            awareness.setLocalStateField('selection', {
              anchor: Y.createRelativePositionFromTypeIndex(ytext, anchor),
              head: Y.createRelativePositionFromTypeIndex(ytext, head),
            });
          }
        });
      });
      awareness.on('change', this._rerenderDecorations);
    }
  }

  destroy(): void {
    if (this._monacoChangeHandler) {
      this._monacoChangeHandler.dispose();
    }
    if (this._monacoDisposeHandler) {
      this._monacoDisposeHandler.dispose();
    }
    this.ytext.unobserve(this._ytextObserver);
    this.doc.off('beforeAllTransactions', this._beforeTransaction);
    if (this.awareness) {
      this.awareness.off('change', this._rerenderDecorations);
    }
  }
}

