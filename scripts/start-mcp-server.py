"""Start the robot-md MCP server for the Claude Code plugin.

The plugin's .mcp.json runs this file with python3 instead of calling the
`robot-md` command directly, so the plugin directory's checks can read
exactly what the server command does: find the `robot-md` CLI the user
installed (`pip install 'robot-md[hardware]'`), check its version, and run
`robot-md mcp` with this process's stdin and stdout. Nothing is downloaded
or installed.

The version check is a safety check. In robot-md 1.x, the MCP server's
motion tools (`execute_capability`, `execute_task`) move the arm from inside
the server process, and their gate accepts any non-empty token, which the
model can supply. From robot-md 2.0.0 they send every step to
robot-md-gateway and refuse without one, which is what this plugin's skill
and description say. So the launcher refuses to start an older server rather
than let the plugin's text describe a server that isn't running.
"""

import os
import re
import shutil
import subprocess
import sys

# The first robot-md release whose MCP motion tools go only through
# robot-md-gateway.
MIN_ROBOT_MD = (2, 0, 0)

INSTALL_HINT = (
    "robot-md MCP server: the `robot-md` command was not found on PATH.\n"
    "Install it with:  python3 -m pip install --user 'robot-md[hardware]>=2.0.0'\n"
    "If pip finds no 2.0.0, it isn't released yet, and this plugin's MCP server\n"
    "can't start until it is. Then restart Claude Code.\n"
    "Docs: https://docs.robotmd.dev/mcp/\n"
)

# The whole first line of `robot-md --version`, e.g. "robot-md 2.0.0". A
# pre-release (2.0.0rc1, 2.0.0.dev3) or any other text doesn't match, so it
# is refused: PEP 440 puts a pre-release before the release it leads to.
VERSION_LINE = re.compile(r"robot-md (\d+)\.(\d+)\.(\d+)(?:\.post\d+)?")


def installed_version(exe: str):
    """Return (version, problem).

    version is the (major, minor, patch) that `robot-md --version` prints, or
    None; problem says why it is None.
    """
    try:
        result = subprocess.run(
            [exe, "--version"], capture_output=True, text=True, timeout=30
        )
    except subprocess.TimeoutExpired:
        return None, "`robot-md --version` did not answer within 30 s"
    except (OSError, subprocess.SubprocessError) as exc:
        return None, f"`robot-md --version` could not run ({exc})"
    if result.returncode != 0:
        return None, f"`robot-md --version` exited {result.returncode}"
    lines = (result.stdout or "").strip().splitlines()
    match = VERSION_LINE.fullmatch(lines[0].strip()) if lines else None
    if match is None:
        shown = lines[0].strip()[:80] if lines else "nothing"
        return None, f"`robot-md --version` printed {shown!r}, not a release version"
    return tuple(int(part) for part in match.groups()), None


def refusal_message(found, problem) -> str:
    want = ".".join(str(part) for part in MIN_ROBOT_MD)
    if found is None:
        return (
            f"robot-md MCP server: this plugin needs robot-md {want} or newer, and {problem}.\n"
            "Reinstall robot-md, then restart Claude Code. Docs: https://docs.robotmd.dev/mcp/\n"
        )
    seen = ".".join(str(part) for part in found)
    return (
        f"robot-md MCP server: this plugin needs robot-md {want} or newer, and found {seen}.\n"
        "In robot-md 1.x the MCP server's motion tools move the arm from inside the\n"
        "server process, past robot-md-gateway. From robot-md 2.0.0 every motion goes\n"
        "through the gateway, which is what this plugin's skill tells Claude.\n"
        f"Upgrade with:  python3 -m pip install --user --upgrade 'robot-md[hardware]>={want}'\n"
        f"If pip finds no {want}, it isn't released yet, and this plugin's MCP server\n"
        "can't start until it is. Then restart Claude Code.\n"
        "Docs: https://docs.robotmd.dev/mcp/\n"
    )


def main() -> int:
    exe = shutil.which("robot-md")
    if exe is None:
        sys.stderr.write(INSTALL_HINT)
        return 1
    found, problem = installed_version(exe)
    if found is None or found < MIN_ROBOT_MD:
        sys.stderr.write(refusal_message(found, problem))
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
