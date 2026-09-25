"""Mirror the sandbox's tracked files to GitHub main via the Git Data API (through the Lovable connector gateway).

Usage: python3 sync_to_github.py [--dry-run] [--message "..."]
Creates a single fast-forward commit on top of the current remote head. Never force-pushes.
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

OWNER, REPO, BRANCH = "RR-LIBRARY", "win-win-agency", "main"
GW = "https://connector-gateway.lovable.dev/github"
LOVABLE_KEY = os.environ["LOVABLE_API_KEY"]
GH_KEY = os.environ["GITHUB_API_KEY"]
ROOT = "/dev-server"
DRY = "--dry-run" in sys.argv
MSG = "Sync from Lovable sandbox"
if "--message" in sys.argv:
    MSG = sys.argv[sys.argv.index("--message") + 1]

SKIP_PREFIXES = (".lovable/", "node_modules/", "dist/", ".output/")
SKIP_EXACT = {"bun.lockb", "package-lock.json"}


def api(method, path, body=None, retries=3):
    url = f"{GW}{path}"
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Bearer {LOVABLE_KEY}")
        req.add_header("X-Connection-Api-Key", GH_KEY)
        req.add_header("Accept", "application/vnd.github+json")
        if data is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, json.loads(r.read().decode() or "null")
        except urllib.error.HTTPError as e:
            txt = e.read().decode(errors="replace")
            if e.code in (429, 502, 503) and attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            return e.code, {"error": txt}
    return 599, {"error": "retries exhausted"}


def sh(*args):
    return subprocess.run(args, cwd=ROOT, check=True, capture_output=True).stdout


def local_files():
    """path -> blob sha for every tracked file (working-tree content)."""
    out = {}
    # ls-files -s gives index sha; recompute for files modified in the working tree.
    modified = set(sh("git", "status", "--porcelain", "-z").decode().split("\0"))
    modified = {m[3:] for m in modified if m and m[0:2].strip() in {"M", "AM", "MM", "A"}}
    for line in sh("git", "ls-files", "-s", "-z").decode().split("\0"):
        if not line:
            continue
        meta, path = line.split("\t", 1)
        mode, sha, _stage = meta.split(" ")
        if path.startswith(SKIP_PREFIXES) or path in SKIP_EXACT:
            continue
        if not os.path.exists(os.path.join(ROOT, path)):
            continue
        if path in modified:
            sha = sh("git", "hash-object", path).decode().strip()
        out[path] = (mode, sha)
    return out


def main():
    st, ref = api("GET", f"/repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}")
    if st != 200:
        print("ref error", st, ref); sys.exit(1)
    head = ref["object"]["sha"]
    st, commit = api("GET", f"/repos/{OWNER}/{REPO}/git/commits/{head}")
    base_tree = commit["tree"]["sha"]
    st, tree = api("GET", f"/repos/{OWNER}/{REPO}/git/trees/{base_tree}?recursive=1")
    if st != 200:
        print("tree error", st, tree); sys.exit(1)
    remote = {t["path"]: t["sha"] for t in tree["tree"] if t["type"] == "blob"}
    local = local_files()

    changed = [(p, m, s) for p, (m, s) in local.items() if remote.get(p) != s]
    deleted = [p for p in remote if p not in local and not p.startswith(SKIP_PREFIXES) and p not in SKIP_EXACT]
    print(f"remote head {head[:8]} · remote files {len(remote)} · local files {len(local)}")
    print(f"changed/added: {len(changed)} · deleted: {len(deleted)}")
    for p, _, _ in changed[:200]:
        print("  ~", p)
    for p in deleted[:50]:
        print("  -", p)
    if DRY or (not changed and not deleted):
        print("nothing to do" if not changed and not deleted else "dry run — no commit made")
        return

    entries = []
    for i, (p, mode, _sha) in enumerate(changed, 1):
        with open(os.path.join(ROOT, p), "rb") as fh:
            content = fh.read()
        st, blob = api("POST", f"/repos/{OWNER}/{REPO}/git/blobs", {"content": base64.b64encode(content).decode(), "encoding": "base64"})
        if st != 201:
            print("blob error", p, st, blob); sys.exit(1)
        entries.append({"path": p, "mode": mode if mode in ("100644", "100755", "120000") else "100644", "type": "blob", "sha": blob["sha"]})
        if i % 20 == 0:
            print(f"  uploaded {i}/{len(changed)}")
    for p in deleted:
        entries.append({"path": p, "mode": "100644", "type": "blob", "sha": None})

    st, new_tree = api("POST", f"/repos/{OWNER}/{REPO}/git/trees", {"base_tree": base_tree, "tree": entries})
    if st != 201:
        print("tree create error", st, new_tree); sys.exit(1)
    st, new_commit = api("POST", f"/repos/{OWNER}/{REPO}/git/commits", {"message": MSG, "tree": new_tree["sha"], "parents": [head]})
    if st != 201:
        print("commit error", st, new_commit); sys.exit(1)
    st, upd = api("PATCH", f"/repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}", {"sha": new_commit["sha"], "force": False})
    if st != 200:
        print("ref update error", st, upd); sys.exit(1)
    print("pushed commit", new_commit["sha"], "->", f"https://github.com/{OWNER}/{REPO}/commit/{new_commit['sha']}")


if __name__ == "__main__":
    main()
