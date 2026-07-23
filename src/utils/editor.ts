import * as vscode from "vscode";

export function getSelectedText(): string | null {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    return editor.document.getText(editor.selection);
  }
  return null;
}
