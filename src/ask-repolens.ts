import * as vscode from "vscode";
import { Recipe } from "./providers/chat";

export function askRepoLensCommand(
  recipes: Recipe[],
  contextRange?: vscode.Range
) {
  showAskRepoLensQuickPick(recipes).then((result: any) => {
    if (!result || !result.label) {
      return;
    }

    let message;
    if ("id" in result && result.id) {
      // the user selected a specific recipe
      message = {
        target: "languageServer",
        view: "chat",
        request: "executeRecipe",
        recipeId: result.id,
        name: result.label,
        trigger: "askRepoLens",
      };
    } else {
      // the user entered some custom text
      message = {
        target: "languageServer",
        view: "chat",
        request: "sendMessage",
        textContent: result.label,
      };
    }

    // Open the chat window.
    vscode.commands.executeCommand("repolens.chat.focus");

    vscode.commands.executeCommand("repolens.coding_assistant", {
      message,
      ideState: {
        selectionLocation: {
          range: contextRange,
        },
      },
    });
  });
}

export function showAskRepoLensQuickPick(recipes: Recipe[]) {
  return new Promise((resolve) => {
    const recipeNames = recipes.map((item) => item.name);
    const recipeItems = recipes.map((item) => ({
      label: item.name,
      id: item.id,
    }));
    let resolved = false;

    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder =
      "Ask RepoLens a question or choose one of these recipes";
    quickPick.items = recipeItems;

    quickPick.onDidAccept(() => {
      const selection = quickPick.activeItems[0] || { label: quickPick.value };
      if (!selection || !selection.label) {
        resolve(undefined);
      } else {
        resolve(selection);
      }
      resolved = true;
      quickPick.hide();
    });

    quickPick.onDidChangeValue(() => {
      if (!recipeNames.includes(quickPick.value)) {
        const newItems = [{ label: quickPick.value }, ...recipeItems];
        quickPick.items = newItems;
      }
    });

    quickPick.onDidHide(() => {
      if (!resolved) {
        resolve(undefined);
      }
      quickPick.dispose();
    });

    quickPick.show();
  });
}
