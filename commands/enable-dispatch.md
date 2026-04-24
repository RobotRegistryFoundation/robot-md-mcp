---
name: enable-dispatch
description: Enable remote HTTP dispatch for this ROBOT.md robot. Generates bearer tokens and writes dispatcher config files. Does NOT print the generated token into this conversation.
---

Run `robot-md-dispatcher init --yes --no-token-stdout` in the workspace root.

Preconditions:

1. `ROBOT.md` must exist at the workspace root. If it's missing, stop and tell the user to run `robot-md init` or `castor init` first.
2. `robot-md-dispatcher` must be installed AND at version `0.2.0` or later. Run `robot-md-dispatcher init --help`; if the command fails or argparse emits "invalid choice: 'init'", stop and tell the user to run `pip install -U 'robot-md-dispatcher>=0.2.0'`.

After the command completes successfully:

1. Tell the user that `bearers.yaml`, `.env`, and `dispatch-test.sh` have been written to the workspace root.
2. Tell the user that their actuate-tier bearer token is in `bearers.yaml` (mode 0600) — and that they should open the file directly to read it. Explain that the token was intentionally not printed here to keep it out of this conversation's context.
3. Print this exact next step:
   ```
   robot-md-dispatcher serve --bearers ./bearers.yaml --robot-md ./ROBOT.md
   ```
4. Remind the user to add `bearers.yaml`, `.env`, and `dispatch-test.sh` to `.gitignore`.

Do not read, echo, or repeat the contents of `bearers.yaml` in this conversation under any circumstances.
