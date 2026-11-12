"""Start the robot-md MCP server for the Claude Code plugin.

The plugin's .mcp.json runs this file with python3 instead of calling the
`robot-md` command directly, so the plugin directory's checks can read
exactly what the server command does: find the `robot-md` CLI the user
installed (`pip install 'robot-md[hardware]'`) and run `robot-md mcp`
with this process's stdin and stdout. Nothing is downloaded or installed.
"""

import os
import shutil
import subprocess
import sys

INSTALL_HINT = (
    "robot-md MCP server: the `robot-md` command was not found on PATH.\n"
    "Install it with:  python3 -m pip install --user 'robot-md[hardware]'\n"
    "then restart Claude Code. Docs: https://docs.robotmd.dev/mcp/\n"
)


def main() -> int:
    exe = shutil.which("robot-md")
    if exe is None:
        sys.stderr.write(INSTALL_HINT)
        return 1
    argv = [exe, "mcp", *sys.argv[1:]]
    if os.name == "nt":
        # os.execv on Windows starts a new process and exits this one,
        # which breaks the stdio pipe Claude Code holds. Run it as a child.
        return subprocess.call(argv)
    os.execv(exe, argv)
    return 0  # not reached


if __name__ == "__main__":
    sys.exit(main())
