"use strict";

import * as path from "path";
import { exec } from "child_process";
import { getExecutablePath } from "./utils/executable";
const command = path.join(
  __dirname,
  "..",
  "repolens_binaries/" + getExecutablePath() + " uninstall"
);

exec(command);
