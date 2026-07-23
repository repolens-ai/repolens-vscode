import * as vscode from "vscode";
import { URI } from "vscode-languageclient/node";

export type IDEState = {
  activeFile?: URI;
  allOpenFiles: URI[];
  selectionLocation?: {
    uri: URI;
    range: vscode.Range;
  };
};

export function getLocalIDEState(): IDEState {
  const { activeTextEditor } = vscode.window;
  const activeFile = activeTextEditor?.document.uri.toString();
  const allOpenFiles = vscode.window.tabGroups.all.flatMap((tabGroup) =>
    tabGroup.tabs
      .map((tab) => tab.input)
      .filter(
        (input): input is vscode.TabInputText =>
          input instanceof vscode.TabInputText
      )
      .map((input) => input.uri.toString())
  );
  const selectionLocation = activeTextEditor
    ? {
        uri: activeTextEditor.document.uri.toString(),
        range: activeTextEditor.selection,
      }
    : undefined;

  return { activeFile, allOpenFiles, selectionLocation };
}
