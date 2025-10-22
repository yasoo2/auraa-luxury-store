"""Utility functions"""

def ok(data=None, **kw):
    """Standard success response"""
    base = {"ok": True}
    if data is not None:
        base["data"] = data
    base.update(kw)
    return base

def error(message: str, code: int = 400, **kw):
    """Standard error response"""
    base = {"ok": False, "error": message, "code": code}
    base.update(kw)
    return base

__all__ = ['ok', 'error']
