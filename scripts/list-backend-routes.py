"""Print all FastAPI route paths, including nested _IncludedRouter objects."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
import server


def walk(router, seen, paths, prefix=""):
    ident = id(router)
    if ident in seen:
        return
    seen.add(ident)
    for route in getattr(router, "routes", []):
        path = getattr(route, "path", None)
        if path:
            full_path = f"{prefix.rstrip('/')}/{path.lstrip('/')}" if prefix else path
            paths.add(full_path)
        original = getattr(route, "original_router", None)
        if original is not None:
            walk(original, seen, paths, prefix)
    original = getattr(router, "original_router", None)
    if original is not None:
        walk(original, seen, paths, prefix)


paths = set()
walk(server.app, set(), paths)
walk(server.api_router, set(), paths)
# FastAPI 0.141+ represents an included router lazily; include the source
# routers explicitly so contract checks see the same paths the runtime serves.
for module_name in ("routes.auth", "routes.cj_admin"):
    try:
        module = __import__(module_name, fromlist=["router"])
        walk(module.router, set(), paths, "/api")
    except Exception:
        pass
print(json.dumps(sorted(paths)))
