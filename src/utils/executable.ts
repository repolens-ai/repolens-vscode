"use strict";

import * as path from "path";
import * as fs from "fs";

const SUPPORTED_ARCHS: Partial<
  Record<NodeJS.Platform, ReadonlyArray<NodeJS.Architecture>>
> = {
  win32: ["x64"],
  darwin: ["x64", "arm64"],
  linux: ["x64"],
};

export type UnsupportedPlatform = {
  platform: NodeJS.Platform;
  arch: NodeJS.Architecture;
};

export function getUnsupportedPlatform(): UnsupportedPlatform | null {
  if (process.env.REPOLENSY_EXECUTABLE) {
    return null;
  }
  const archs = SUPPORTED_ARCHS[process.platform];
  if (archs && archs.includes(process.arch)) {
    return null;
  }
  return { platform: process.platform, arch: process.arch };
}

export function getCodingAssistantAssetsPath(): string {
  if (process.env.REPOLENSY_CODING_ASSISTANT_ASSETS_PATH) {
    console.log(
      "Environment-provided RepoLens Coding Assistant Assets Path: ",
      process.env.REPOLENSY_CODING_ASSISTANT_ASSETS_PATH
    );
    return process.env.REPOLENSY_CODING_ASSISTANT_ASSETS_PATH;
  }

  const executablePath = getExecutablePath();
  const absoluteExecutablePath = path.isAbsolute(executablePath)
    ? executablePath
    : path.join(__dirname, "..", executablePath);

  let codingAssistantAssetsPath = path.join(
    absoluteExecutablePath,
    "..",
    "coding-assistant-app",
    "dist",
    "assets"
  );

  console.log(
    "Derived RepoLens Coding Assistant Assets Path: ",
    codingAssistantAssetsPath
  );

  return codingAssistantAssetsPath;
}

export function getExecutablePath(): string {
  if (process.env.REPOLENSY_EXECUTABLE) {
    console.log(
      "Environment-provided RepoLens Executable Path: ",
      process.env.REPOLENSY_EXECUTABLE
    );
    return process.env.REPOLENSY_EXECUTABLE;
  }
  const repolens_binaries = path.join(__dirname, "..", "repolens_binaries");
  const activePath = path.join(repolens_binaries, "active");
  if (fs.existsSync(activePath)) {
    if (process.platform == "win32") {
      return path.join(activePath, "repolens.exe");
    } else if (process.platform == "darwin") {
      return path.join(activePath, "repolens");
    } else {
      return path.join(activePath, "repolens");
    }
  } else {
    if (process.platform == "win32") {
      return path.join(repolens_binaries, "install/win/repolens.exe");
    } else if (process.platform == "darwin") {
      const macDir = process.arch == "arm64" ? "mac-arm64" : "mac-x86_64";
      return path.join(repolens_binaries, "install", macDir, "repolens");
    } else {
      return path.join(repolens_binaries, "install/linux/repolens");
    }
  }
}
