import * as vscode from "vscode";
import { randomBytes } from "crypto";
import { getSelectedText } from "../utils/editor";

export class RuleInputProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "repolens.rules";

  private _view?: vscode.WebviewView;

  private _extensionUri: vscode.Uri;

  private _languageId: string;

  constructor(private _context: vscode.ExtensionContext) {
    this._extensionUri = _context.extensionUri;
  }

  public toggle() {
    this._view?.webview.postMessage({ command: "toggle" });
  }

  public setLanguage(language: string) {
    this._languageId = language;
    this._setTitle();
  }

  public setPattern(pattern: string) {
    this._view?.webview.postMessage({
      command: "setPattern",
      pattern: pattern,
    });
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    this._setViewState();

    webviewView.onDidChangeVisibility(() => {
      if (this._view.visible) {
        this._setViewState();
      }
    });

    webviewView.webview.html = await this._getHtmlForWebview(
      webviewView.webview
    );

    const input = getSelectedText();
    this.setPattern(input);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "scan": {
          vscode.commands.executeCommand(
            "repolens.scan.rule",
            data.rule,
            data.advanced,
            false,
            this._languageId
          );
          break;
        }
        case "replace": {
          vscode.commands.executeCommand(
            "repolens.scan.rule",
            data.rule,
            data.advanced,
            true,
            this._languageId
          );
          break;
        }
        case "save": {
          vscode.commands.executeCommand(
            "repolens.rule.create",
            data.rule,
            data.advanced,
            this._languageId
          );
          break;
        }
      }
    });
  }

  private _setViewState() {
    this._languageId = this._resolveLanguage();
    this._setTitle();
  }

  private _setTitle() {
    this._view.title = "Rules - " + this._languageId;
  }

  private _resolveLanguage(): string {
    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor) {
      const languageId = activeEditor.document.languageId;
      switch (languageId) {
        case "python": {
          return languageId;
        }
        case "typescript": {
          return languageId;
        }
        case "typescriptreact": {
          return "typescript";
        }
        case "javascriptreact": {
          return "javascript";
        }
        case "javascript": {
          return languageId;
        }
      }
      return "python";
    }

    return "python";
  }

  private async _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "src", "webview", "search.js")
    );

    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "search.css")
    );
    const nonce = randomBytes(16).toString("base64");

    let cspStr = Object.entries({
      "default-src": "'none'",
      "style-src": `${webview.cspSource + ` 'nonce-${nonce}'`}`,
      "script-src": `'nonce-${nonce}'`,
      "img-src": "* 'self' https:;",
    })
      .map(([key, value]) => {
        return `${key} ${value}`;
      })
      .join("; ");

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="${cspStr}">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
			</head>
			<body>
				<div class="matchesContainer">
					<div id="patternContainer">
						<label for="patternInput">Pattern</label>
						<textarea
							id="patternInput" class="patternInput"
							nonce="${nonce}"
						></textarea>
						<label for="replacementInput">Replacement</label>
						<textarea
							id="replacementInput" class="replacementInput"
							nonce="${nonce}"
						></textarea>
						<label for="conditionInput">Condition</label>
						<textarea
							id="conditionInput" class="conditionInput"
							nonce="${nonce}"
						></textarea>
					</div>
					<div id="advancedContainer" class="hidden">
						<label for="ruleInput">Rule</label>
						<textarea
							id="ruleInput" class="ruleInput"
							placeholder="all:\n- pattern: typing.List\n  replacement: list\n- not:\n    inside:\n      kind: import_from_statement"
							nonce="${nonce}"
						></textarea>		
					</div>
				</div>
				<div class="btnContainer">
					<button class="scanner-button" >Scan</button>
				</div>
				<div class="btnContainer">
					<button class="replace-button" >Replace</button>
				</div>
				<div class="btnContainer">
					<button class="save-button">Save as Rule</button>
				</div>
			</body>
			<script nonce="${nonce}" src="${scriptUri}"></script>
			</html>`;
  }
}
