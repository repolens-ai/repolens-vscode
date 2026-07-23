import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";
import { env, extensions, version, workspace } from "vscode";
import { getExecutablePath } from "../utils/executable";

const SAFE_ENV_VARS = [
  "PATH",
  "HOME",
  "USER",
  "PYTHONHASHSEED",
  "LANG",
  "LC_ALL",
  "SHELL",
  "TMPDIR",
  "TEMP",
  "TMP",
];

function getSafeEnv(): NodeJS.ProcessEnv {
  const safeEnv: NodeJS.ProcessEnv = {};
  for (const key of SAFE_ENV_VARS) {
    if (process.env[key] !== undefined) {
      safeEnv[key] = process.env[key];
    }
  }
  return safeEnv;
}

export type RepoLensConfig = {
  token: string | undefined;
  showCodeLens: boolean | undefined;
  suggestFixes: boolean | undefined;
};

export function getRepoLensConfig(): RepoLensConfig {
  const configuration = workspace.getConfiguration("repolens");
  return {
    token: configuration.get<string>("token"),
    showCodeLens: configuration.get<boolean>("codeLens"),
    suggestFixes: configuration.get<boolean>("suggestFixes"),
  };
}

export function createLangServer(): LanguageClient {
  const config = getRepoLensConfig();
  const packageJson = extensions.getExtension("repolens.repolens")
    ?.packageJSON ?? { version: "unknown" };
  const extensionVersion = packageJson.version;

  const command = getExecutablePath();

  const serverOptions: ServerOptions = {
    command,
    args: ["lsp"],
    options: {
      env: {
        PYTHONHASHSEED: "0",
        ...getSafeEnv(),
      },
    },
  };

  const clientOptions: LanguageClientOptions = {
    markdown: {
      isTrusted: true,
    },
    diagnosticCollectionName: "repolens",
    documentSelector: [
      { language: "*", scheme: "file" },
      { language: "*", scheme: "untitled" },
      { language: "*", scheme: "vscode-notebook-cell" },
    ],
    synchronize: {
      configurationSection: "repolens",
    },
    initializationOptions: {
      token: config.token,
      editor_version: "vscode " + version,
      extension_version: extensionVersion,
      telemetry_enabled: env.isTelemetryEnabled,
      show_code_lens: config.showCodeLens,
      suggest_ai_fixes: config.suggestFixes,
    },
  };

  return new LanguageClient(command, serverOptions, clientOptions);
}
