import * as vscode from "vscode";
import { randomBytes } from "crypto";
import { getCodingAssistantAssetsPath } from "../utils/executable";
import * as path from "path";

export type Recipe = {
  id: string;
  name: string;
};

type DocumentPosition = {
  line: number;
  character: number;
};

type DocumentRange = {
  start: DocumentPosition;
  end: DocumentPosition;
};

export type ExtensionMessage =
  | {
      target: "extension";
      request: "openLink";
      linkType: "url" | "file" | "directory";
      link: string;
      documentRange: DocumentRange | null;
    }
  | {
      target: "extension";
      request: "copyToClipboard";
      content: string;
    }
  | {
      target: "extension";
      request: "insertAtCursor";
      content: string;
    }
  | {
      target: "extension";
      request: "updateConfiguration";
      section: "repolens.codeLens";
      value: boolean;
      configurationTarget: vscode.ConfigurationTarget;
    };

type LanguageServerMessage = {
  target: "languageServer";
};

type OutboundMessage = LanguageServerMessage | ExtensionMessage;

const getNonce = () => randomBytes(16).toString("base64");

export class ChatProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "repolens.chat";

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _assetsUri: vscode.Uri;
  private _panel?: vscode.WebviewPanel;

  public recipes: Recipe[] = [];

  constructor(private _context: vscode.ExtensionContext) {
    this._extensionUri = _context.extensionUri;
    const _assetsPath = getCodingAssistantAssetsPath();
    this._assetsUri = vscode.Uri.file(_assetsPath);
  }

  private async _handleWebviewMessage({
    message,
    ...rest
  }: {
    message: OutboundMessage;
  }) {
    switch (message.target) {
      case "languageServer":
        vscode.commands.executeCommand("repolens.coding_assistant", {
          message,
          ...rest,
        });
        break;
      case "extension":
        switch (message.request) {
          case "openLink":
            this.handleOpenLinkRequest(message);
            break;
          case "copyToClipboard": {
            this.handleCopyToClipboardRequest(message);
            break;
          }
          case "insertAtCursor": {
            this.handleInsertAtCursorRequest(message);
            break;
          }
          case "updateConfiguration": {
            await vscode.workspace
              .getConfiguration()
              .update(
                message.section,
                message.value,
                message.configurationTarget
              );
          }
        }
    }
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    console.log(
      `Initialising webview. Assets URI: ${this._assetsUri}; Extension URI: ${this._extensionUri}`
    );

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri, this._assetsUri],
    };

    webviewView.webview.html = await this._getHtmlForWebview(
      webviewView.webview
    );

    webviewView.webview.onDidReceiveMessage(this._handleWebviewMessage);
  }

  public async createOrShowWebviewPanel(): Promise<vscode.WebviewPanel> {
    if (this._panel) {
      this._panel.reveal();
      return this._panel;
    }

    const panel = vscode.window.createWebviewPanel(
      "repolensChatPanel",
      "RepoLens Analytics",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this._extensionUri, this._assetsUri],
      }
    );

    panel.webview.html = await this._getHtmlForWebview(panel.webview);

    panel.webview.onDidReceiveMessage(this._handleWebviewMessage);

    this._panel = panel;
    panel.onDidDispose(() => {
      this._panel = undefined;
    });

    return panel;
  }

  public postCommand(command: any) {
    switch (command.command) {
      case "recipes/addRecipes": {
        this.recipes = command.recipes;
        break;
      }
    }

    if (this._view?.webview) {
      this._view.webview.postMessage(command);
    }

    if (this._panel?.webview) {
      switch (command.command) {
        case "context/update": {
          command["updates"]["isAnalyticsPanel"] = true;
          break;
        }
      }
      this._panel.webview.postMessage(command);
    }
  }

  private handleOpenLinkRequest({
    link,
    linkType,
    documentRange,
  }: {
    target: "extension";
    request: "openLink";
    linkType: "url" | "file" | "directory";
    link: string;
    documentRange: DocumentRange | null;
  }) {
    if (linkType === "url") {
      vscode.env.openExternal(vscode.Uri.parse(link));
    } else {
      let filePath = vscode.Uri.file(link);
      if (!path.isAbsolute(link)) {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri;
        if (workspaceRoot) {
          filePath = vscode.Uri.joinPath(workspaceRoot, link);
        }
      }

      if (linkType === "file") {
        vscode.workspace.openTextDocument(filePath).then((doc) => {
          vscode.window.showTextDocument(doc).then((editor) => {
            if (documentRange) {
              editor.selection = new vscode.Selection(
                documentRange.start.line,
                documentRange.start.character,
                documentRange.end.line,
                documentRange.end.character
              );
              editor.revealRange(
                editor.selection,
                vscode.TextEditorRevealType.InCenter
              );
            }
          });
        });
      } else {
        vscode.commands
          .executeCommand("revealInExplorer", filePath)
          .then(() =>
            vscode.commands.executeCommand("revealInExplorer", filePath)
          );
      }
    }
  }

  private handleCopyToClipboardRequest({
    content,
  }: {
    target: "extension";
    request: "copyToClipboard";
    content: string;
  }) {
    vscode.env.clipboard.writeText(content);
  }

  private handleInsertAtCursorRequest({
    content,
  }: {
    target: "extension";
    request: "insertAtCursor";
    content: string;
  }) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage("No active text editor!");
      return;
    }

    activeEditor.edit((editBuilder) => {
      if (!activeEditor.selection.isEmpty) {
        editBuilder.replace(activeEditor.selection, content);
      } else {
        editBuilder.insert(activeEditor.selection.active, content);
      }
    });
  }

  private async _getHtmlForWebview(webview: vscode.Webview) {
    const baseSrc = webview.asWebviewUri(
      vscode.Uri.joinPath(this._assetsUri, "..", "index.html")
    );

    const appScriptSrc = webview.asWebviewUri(
      vscode.Uri.joinPath(this._assetsUri, "index.js")
    );

    const appStylesSrc = webview.asWebviewUri(
      vscode.Uri.joinPath(this._assetsUri, "index.css")
    );

    const ideStylesSrc = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "ide-styles.css")
    );

    const appScriptNonce = getNonce();
    const apiInjectionNonce = getNonce();

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${appScriptNonce}' 'nonce-${apiInjectionNonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RepoLens</title>
    <base href="${baseSrc}" />
    <link rel="stylesheet" href="${ideStylesSrc}">
    <link rel="stylesheet" href="${appStylesSrc}">
  </head>
  <body style="height: 100vh;">
    <div id="root" style="height: 100%; overflow-y: hidden;"></div>
    <script type="module" nonce="${appScriptNonce}" src="${appScriptSrc}"></script>
    <script nonce=${apiInjectionNonce}>
      (function () {
        const vscode = acquireVsCodeApi();
        window.repolensLS = {
          postMessage: vscode.postMessage,
        };

        const updateTheme = () => {
          const theme = document.body.classList.contains("vscode-light") ? "light" : "dark";
          document.documentElement.classList.remove("light", "dark");
          document.documentElement.classList.add(theme);
        };
        updateTheme();
        new MutationObserver(updateTheme).observe(document.body, {attributes: true});
      }())
    </script>
  </body>
</html>
`;
  }
}
