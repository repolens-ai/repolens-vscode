import * as path from "path";
import {
  getExecutablePath,
  getUnsupportedPlatform,
  UnsupportedPlatform,
} from "./utils/executable";

import * as vscode from "vscode";
import {
  commands,
  env,
  ExtensionContext,
  extensions,
  Range,
  StatusBarAlignment,
  TextEditorRevealType,
  TreeItem,
  TreeView,
  Uri,
  version,
  WebviewPanel,
  window,
  workspace,
} from "vscode";
import {
  ExecuteCommandParams,
  ExecuteCommandRequest,
  LanguageClient,
  URI,
} from "vscode-languageclient/node";
import { RuleInputProvider } from "./providers/rule-search";
import { ScanResultProvider } from "./providers/rule-search-results";
import { ChatProvider } from "./providers/chat";
import { askRepoLensCommand } from "./ask-repolens";
import { createLangServer, getRepoLensConfig } from "./lsp/client";
import { getSelectedText } from "./utils/editor";
import { getLocalIDEState, IDEState } from "./utils/ide-state";

function showRepoLensStatusBarItem(context: ExtensionContext) {
  const myStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
  myStatusBarItem.command = "repolens.hub.start";
  myStatusBarItem.text = "RepoLens Analytics";
  myStatusBarItem.tooltip = "See analytics for your repo";
  context.subscriptions.push(myStatusBarItem);
  myStatusBarItem.show();
}

function openWelcomeFile(context: ExtensionContext) {
  openDocument(path.join(context.extensionPath, "scripts", "repolens.py"));
}

function openDocument(document_path: string) {
  const openPath = Uri.file(document_path);
  workspace.openTextDocument(openPath).then((doc) => {
    window.showTextDocument(doc);
  });
}

const UNSUPPORTED_ARCH_WARNING_KEY = "repolens.unsupportedArchWarningShown";

function warnUnsupportedPlatform(
  context: ExtensionContext,
  unsupported: UnsupportedPlatform
): void {
  const archKey = `${unsupported.platform}-${unsupported.arch}`;
  console.warn(
    `RepoLens: unsupported platform ${archKey}; not starting language server.`
  );
  const lastShown = context.globalState.get<string>(
    UNSUPPORTED_ARCH_WARNING_KEY
  );
  if (lastShown === archKey) {
    return;
  }
  window.showWarningMessage(
    `RepoLens does not support ${unsupported.platform} on ${unsupported.arch} and will stay idle on this machine.`
  );
  context.globalState.update(UNSUPPORTED_ARCH_WARNING_KEY, archKey);
}

function registerNotifications({
  languageClient,
  scanResultTree,
  scanResultTreeView,
  chatProvider,
  context,
}: {
  languageClient: LanguageClient;
  scanResultTree: ScanResultProvider;
  scanResultTreeView: TreeView<TreeItem>;
  chatProvider: ChatProvider;
  context: ExtensionContext;
}) {
  languageClient.onNotification("repolens/vscode/executeCommand", (params) => {
    const command = params["command"];
    const args = params["arguments"] || [];
    commands.executeCommand(command, ...args);
  });

  languageClient.onNotification("repolens/vscode/showSettings", (params) => {
    const section = params && params.section ? params.section : "repolens";
    commands.executeCommand("workbench.action.openSettings", section);
  });

  languageClient.onNotification("repolens/vscode/scanResults", (params) => {
    if (params.diagnostics.length > 0) {
      scanResultTree.update(params);
    }
    scanResultTreeView.title =
      "Results - " + params.results + " found in " + params.files + " files.";
  });

  languageClient.onNotification("repolens/codingAssistant", (params) => {
    chatProvider.postCommand(params);
  });

  languageClient.onNotification("repolens/vscode/viewProblems", () => {
    commands.executeCommand("workbench.actions.view.problems");
  });

  languageClient.onNotification("repolens/vscode/accept_recommendation", () => {
    commands.executeCommand(
      "setContext",
      "acceptRecommendationContextKey",
      true
    );
  });

  languageClient.onNotification("repolens/vscode/showUrl", (params) => {
    env.openExternal(Uri.parse(params["url"]));
  });

  languageClient.onNotification("repolens/vscode/showWelcomeFile", () => {
    openWelcomeFile(context);
  });
}

function registerCommands(
  context: ExtensionContext,
  riProvider: RuleInputProvider,
  languageClient: LanguageClient,
  tree: ScanResultProvider,
  treeView: TreeView<TreeItem>,
  hubWebviewPanel: WebviewPanel,
  chatProvider: ChatProvider
) {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      RuleInputProvider.viewType,
      riProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.selectCode", (open_uri, start, end) => {
      workspace.openTextDocument(open_uri).then((doc) => {
        window.showTextDocument(doc).then((e) => {
          e.selection = new vscode.Selection(start, end);
          e.revealRange(new Range(start, end), TextEditorRevealType.InCenter);
        });
      });
    })
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.rules.focus", async () => {
      await commands.executeCommand(
        "workbench.view.extension.repolens-explorer"
      );
      try {
        await commands.executeCommand("revealView", "repolens.rules");
      } catch {
        // Some VS Code versions may not support direct view reveal.
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.lineSuggestions", () => {
      commands.executeCommand(
        "workbench.action.openWalkthrough",
        "KhulnaSoft.repolens-ai#repolens.walkthrough",
        true
      );
      window.showInformationMessage(
        "RepoLens line suggestions appear as inline hints and code lens actions when active."
      );
    })
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.scan.toggleAdvanced", () => {
      riProvider.toggle();
    })
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.chat.ask", (arg?: vscode.Range) => {
      askRepoLensCommand(chatProvider.recipes, arg);
    })
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.chat.toggleCodeLens", () => {
      const config = vscode.workspace.getConfiguration();
      const currentValue = config.get("repolens.codeLens");
      config.update(
        "repolens.codeLens",
        !currentValue,
        vscode.ConfigurationTarget.Global
      );
    })
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.scan.selectLanguage", () => {
      const items = ["python", "javascript", "typescript"];

      window
        .showQuickPick(items, {
          canPickMany: false,
          placeHolder: "Select language",
        })
        .then((selected) => {
          riProvider.setLanguage(selected);
        });
    })
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.effects.enable", () =>
      effects_set_enabled(true)
    )
  );
  context.subscriptions.push(
    commands.registerCommand("repolens.effects.disable", () =>
      effects_set_enabled(false)
    )
  );
  function effects_set_enabled(enabled: boolean) {
    vscode.commands.executeCommand(
      "setContext",
      "repolens.effects.enabled",
      enabled
    );
    let request: ExecuteCommandParams = {
      command: "repolens.effects.set_enabled",
      arguments: [enabled],
    };
    languageClient.sendRequest(ExecuteCommandRequest.type, request);
  }

  context.subscriptions.push(
    commands.registerCommand("repolens.scan.applyRule", async (entry) => {
      const document = await workspace.openTextDocument(entry.resourceUri);
      const editor = await window.showTextDocument(document);
      editor.revealRange(
        new Range(entry.startPosition, entry.endPosition),
        TextEditorRevealType.InCenter
      );

      if (!entry.edits || entry.edits.length === 0) {
        vscode.window.showInformationMessage(
          "No edits were provided for this scan result."
        );
        return;
      }

      const workspaceEdit = new vscode.WorkspaceEdit();
      const edits = entry.edits
        .slice()
        .sort((a, b) => {
          if (a.range.start.line !== b.range.start.line) {
            return b.range.start.line - a.range.start.line;
          }
          return b.range.start.character - a.range.start.character;
        })
        .map(
          (edit) =>
            new vscode.TextEdit(
              new vscode.Range(
                edit.range.start.line,
                edit.range.start.character,
                edit.range.end.line,
                edit.range.end.character
              ),
              edit.newText
            )
        );

      workspaceEdit.set(entry.resourceUri, edits);
      try {
        const applied = await workspace.applyEdit(workspaceEdit);
        if (applied) {
          window.showInformationMessage(
            `Applied ${edits.length} edit(s) to ${document.uri.fsPath}`
          );
        } else {
          window.showErrorMessage("Failed to apply rule edits.");
        }
      } catch (error) {
        window.showErrorMessage(
          `Error applying rule edits: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.welcome.open", () => {
      openWelcomeFile(context);
    })
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.scan.open", () => {
      vscode.commands.executeCommand("setContext", "repolensRulesActive", true);

      vscode.commands.executeCommand("repolens.rules.focus").then(() => {
        const input = getSelectedText();
        riProvider.setPattern(input);
      });
    })
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.walkthrough.open", () => {
      openWelcomeFile(context);
      commands.executeCommand(
        "workbench.action.openWalkthrough",
        "KhulnaSoft.repolens-ai#repolens.walkthrough",
        true
      );
    })
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.config.create", () => {
      let request: ExecuteCommandParams = {
        command: "config/create",
        arguments: [],
      };
      languageClient
        .sendRequest(ExecuteCommandRequest.type, request)
        .then((values) => {
          const rootUri = workspace.workspaceFolders?.[0]?.uri;
          if (rootUri) {
            openDocument(path.join(rootUri.fsPath, ".repolens.yaml"));
          }
        });
    })
  );

  context.subscriptions.push(
    commands.registerCommand(
      "repolens.rule.create",
      (rule, advanced: boolean, language: string) => {
        vscode.window
          .showInputBox({
            title: "What would you like to call your rule?",
            prompt:
              "This should be lowercase, with words separated by hyphens (e.g. my-brilliant-rule)",
          })
          .then((name) => {
            if (name) {
              let request: ExecuteCommandParams = {
                command: "config/rule/create",
                arguments: [
                  {
                    rule_id: name,
                    rule: rule,
                    inplace: false,
                    advanced: advanced,
                    language: language,
                  },
                ],
              };
              languageClient
                .sendRequest(ExecuteCommandRequest.type, request)
                .then((result) => {
                  const openPath = Uri.file(result);
                  workspace.openTextDocument(openPath).then((doc) => {
                    window.showTextDocument(doc);
                  });
                });
            }
          });
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      "repolens.refactor.workspace",
      (resource: Uri, selected?: Uri[]) => {
        let request: ExecuteCommandParams = {
          command: "refactoring/scan",
          arguments: [
            {
              uri: resource,
              all_uris: selected,
            },
          ],
        };
        languageClient.sendRequest(ExecuteCommandRequest.type, request);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      "repolens.coding_assistant",
      ({
        message,
        ideState,
      }: {
        message: any;
        ideState?: Partial<IDEState>;
      }) => {
        const localIDEState = getLocalIDEState();

        let params: ExecuteCommandParams = {
          command: "repolens.coding_assistant",
          arguments: [
            {
              message,
              ideState: {
                ...localIDEState,
                ...ideState,
                selectionLocation: {
                  ...localIDEState.selectionLocation,
                  ...ideState?.selectionLocation,
                },
              },
            },
          ],
        };
        languageClient.sendRequest(ExecuteCommandRequest.type, params);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      "repolens.scan.rule",
      (rule, advanced: boolean, fix: boolean, language: string) => {
        if (fix) {
          vscode.window
            .showInformationMessage("Are you sure?", "Yes", "No")
            .then((answer) => {
              if (answer === "Yes") {
                runScan(rule, advanced, fix, language);
              }
            });
        } else {
          runScan(rule, advanced, fix, language);
        }
      }
    )
  );

  function runScan(rule, advanced: boolean, fix: boolean, language: string) {
    tree.clear();
    treeView.title = "Results";
    let request: ExecuteCommandParams = {
      command: "repolens/rule/scan",
      arguments: [
        {
          rule: rule,
          rule_id: "test-rule",
          advanced: advanced,
          inplace: fix,
          language: language,
        },
      ],
    };
    languageClient.sendRequest(ExecuteCommandRequest.type, request);
  }

  context.subscriptions.push(
    commands.registerCommand(
      "repolens.clones.workspace",
      (resource: Uri, selected?: Uri[]) => {
        let request: ExecuteCommandParams = {
          command: "clone/scan",
          arguments: [
            {
              uri: resource,
              all_uris: selected,
            },
          ],
        };
        languageClient.sendRequest(ExecuteCommandRequest.type, request);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand("repolens.hub.start", async () => {
      languageClient.sendRequest(ExecuteCommandRequest.type, {
        command: "repolens.startHub",
        arguments: [],
      });

      await chatProvider.createOrShowWebviewPanel();
    })
  );
}

export function activate(context: ExtensionContext) {
  const unsupported = getUnsupportedPlatform();
  if (unsupported) {
    warnUnsupportedPlatform(context, unsupported);
    return;
  }

  const languageClient = createLangServer();

  let tree = new ScanResultProvider();

  let treeView = vscode.window.createTreeView("repolens.rules.treeview", {
    treeDataProvider: tree,
  });

  const riProvider = new RuleInputProvider(context);

  const chatProvider = new ChatProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatProvider.viewType,
      chatProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  registerCommands(
    context,
    riProvider,
    languageClient,
    tree,
    treeView,
    undefined,
    chatProvider
  );

  showRepoLensStatusBarItem(context);

  languageClient.start().then(
    () => {
      registerNotifications({
        languageClient,
        scanResultTree: tree,
        scanResultTreeView: treeView,
        chatProvider,
        context,
      });

      languageClient.sendNotification(
        "repolens/configDidChange",
        getRepoLensConfig()
      );
    },
    (reason) => {
      window.showErrorMessage(
        `RepoLens: Failed to start language server: ${reason}`
      );
    }
  );

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("repolens")) {
        languageClient.sendNotification(
          "repolens/configDidChange",
          getRepoLensConfig()
        );
      }
    })
  );
}
