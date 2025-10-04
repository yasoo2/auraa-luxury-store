from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from ..db import get_db
from ..repositories.products import ProductRepo
from ..models.product import ProductIn

router = APIRouter(prefix="/admin/products", tags=["admin-products"])

# ملاحظة: اربط حماية الأدمن لاحقًا عبر Dependency عام على مستوى include_router أو هنا
# مثال سريع:
# from ..auth import require_admin
# router = APIRouter(prefix="/admin/products", tags=["admin-products"], dependencies=[Depends(require_admin)])

@router.get("")
async def list_products(search: Optional[str] = "", page: int = 1, limit: int = 50, db=Depends(get_db)):
    repo = ProductRepo(db)
    items = await repo.list(search=search or "", page=page, limit=limit)
    return {"items": items, "page": page, "limit": limit}

@router.post("")
async def create_product(payload: ProductIn, db=Depends(get_db)):
    repo = ProductRepo(db)
    pid = await repo.create(payload.dict())
    return {"id": pid}

@router.put("/{pid}")
async def update_product(pid: str, payload: ProductIn, db=Depends(get_db)):
    repo = ProductRepo(db)
    ok = await repo.update(pid, payload.dict())
    if not ok:
        raise HTTPException(404, "Product not found")
    return {"ok": True}

@router.delete("/{pid}")
async def delete_product(pid: str, db=Depends(get_db)):
    repo = ProductRepo(db)
    ok = await repo.delete(pid)
    if not ok:
        raise HTTPException(404, "Product not found")
    return {"ok": True}
