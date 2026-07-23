import * as vscode from "vscode";
import { Position, TreeItemLabel, Uri } from "vscode";

export interface ScanResultEdit {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}

export interface DiagnosticItem {
  first_line_code: string;
  first_line_highlight: [number, number];
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  text_edits: ScanResultEdit[];
}

export interface ScanResultsNotification {
  uri: string;
  diagnostics: DiagnosticItem[];
  results: number;
  files: number;
}

class ScanResult extends vscode.TreeItem {
  children: undefined;
  startPosition: Position;
  endPosition: Position;
  edits: ScanResultEdit[];

  constructor(
    label: TreeItemLabel,
    uri: Uri,
    startPosition: Position,
    endPosition: Position,
    edits: ScanResultEdit[]
  ) {
    super(label);
    this.resourceUri = uri;
    this.startPosition = startPosition;
    this.endPosition = endPosition;
    this.edits = edits;
    if (edits.length > 0) {
      this.contextValue = "editable";
    }
  }
}

class FileResults extends vscode.TreeItem {
  children: ScanResult[] | undefined;
  startPosition: Position;
  endPosition: Position;
  constructor(label: string | undefined, uri: Uri, children?: ScanResult[]) {
    super(
      label,
      children === undefined
        ? vscode.TreeItemCollapsibleState.None
        : vscode.TreeItemCollapsibleState.Expanded
    );
    this.children = children;
    this.resourceUri = uri;
    this.startPosition = new Position(0, 0);
    this.endPosition = new Position(0, 0);

    this.description = true;
  }
}

export class ScanResultProvider
  implements vscode.TreeDataProvider<FileResults>
{
  data: FileResults[] = [];

  private _onDidChangeTreeData: vscode.EventEmitter<
    FileResults | undefined | null | void
  > = new vscode.EventEmitter<FileResults | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    FileResults | undefined | null | void
  > = this._onDidChangeTreeData.event;

  constructor() {
    this.data = [];
  }

  getTreeItem(
    element: FileResults | ScanResult
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    element.command = {
      command: "repolens.selectCode",
      title: "Open",
      arguments: [
        element.resourceUri,
        element.startPosition,
        element.endPosition,
        [],
        "goto",
      ],
    };
    return element;
  }

  getChildren(
    element?: FileResults | ScanResult | undefined
  ): vscode.ProviderResult<FileResults[] | ScanResult[]> {
    if (element === undefined) {
      return this.data;
    }
    return element.children;
  }

  update(params: ScanResultsNotification): void {
    const uri = Uri.parse(params.uri);
    const scanResults: ScanResult[] = [];
    for (let result of params.diagnostics) {
      scanResults.push(
        new ScanResult(
          {
            label: result.first_line_code,
            highlights: [result.first_line_highlight],
          },
          uri,
          new Position(result.range.start.line, result.range.start.character),
          new Position(result.range.end.line, result.range.end.character),
          result.text_edits
        )
      );
    }
    this.data.push(new FileResults(undefined, uri, scanResults));
    this._onDidChangeTreeData.fire();
  }

  clear(): void {
    this.data = [];
    this._onDidChangeTreeData.fire();
  }
}
