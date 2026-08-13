"""Count FastAPI routes, including modern nested _IncludedRouter objects."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
import server


def walk(router, seen, paths):
    ident = id(router)
    if ident in seen:
        return
    seen.add(ident)
    for route in getattr(router, "routes", []):
        path = getattr(route, "path", None)
        if path:
            paths.add(path)
        original = getattr(route, "original_router", None)
        if original is not None:
            walk(original, seen, paths)
    original = getattr(router, "original_router", None)
    if original is not None:
        walk(original, seen, paths)


paths = set()
walk(server.app, set(), paths)
walk(server.api_router, set(), paths)
print(f"{len(paths)} API routes")
if len(paths) <= 40:
    raise SystemExit(f"only {len(paths)} API routes registered")
