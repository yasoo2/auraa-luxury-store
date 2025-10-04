from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import asyncio

from ..db import get_db
from ..repositories.products import ProductRepo
from ..services.aliexpress import AliExpressClient

router = APIRouter(prefix="/admin/import/aliexpress", tags=["admin-import"])

class BulkItem(BaseModel):
    product_id: Optional[str] = None
    url: Optional[str] = None

class BulkRequest(BaseModel):
    items: List[BulkItem]
    max_concurrency: int = 5
    dry_run: bool = False

def extract_id(url: str) -> Optional[str]:
    if not url:
        return None
    # محاولة بسيطة لاستخراج رقم المنتج من الرابط
    for part in url.split("/"):
        if part.isdigit():
            return part
    return None

@router.post("/bulk")
async def import_bulk(body: BulkRequest, db=Depends(get_db)):
    # جهّز قائمة IDs فريدة من الروابط/المعرفات
    ids = []
    for it in body.items:
        pid = it.product_id or extract_id(it.url)
        if pid:
            ids.append(pid)
    ids = list(dict.fromkeys(ids))
    if not ids:
        raise HTTPException(400, "No valid product ids/urls provided")

    cli = AliExpressClient()
    repo = ProductRepo(db)
    sem = asyncio.Semaphore(body.max_concurrency)

    async def one(pid: str):
        async with sem:
            try:
                mapped = await cli.fetch_product(pid)
                if body.dry_run:
                    return {"id": pid, "status": "ok(dry_run)"}
                new_id = await repo.upsert_from_source(pid, mapped)
                return {"id": pid, "status": "ok", "product_id": new_id}
            except Exception as e:
                return {"id": pid, "status": f"error: {e}"}

    results = await asyncio.gather(*(one(pid) for pid in ids))
    ok_count = sum(1 for r in results if str(r["status"]).startswith("ok"))
    return {"summary": {"total": len(ids), "ok": ok_count, "error": len(results)-ok_count}, "results": results}

@router.get("/demo")
async def demo(ids: str, dry_run: bool = True, db=Depends(get_db)):
    items = [BulkItem(product_id=i.strip()) for i in ids.split(",") if i.strip()]
    body = BulkRequest(items=items, dry_run=dry_run)
    return await import_bulk(body, db)
