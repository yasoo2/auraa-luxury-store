from datetime import datetime
from typing import List, Dict, Any, Optional
from bson import ObjectId

def normalize_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    doc["id"] = str(doc.pop("_id"))
    return doc

class ProductRepo:
    def __init__(self, db):
        self.col = db["products"]
        # فهارس للبحث والمصدر الخارجي
        self.col.create_index([("title", 1)])
        self.col.create_index([("source.type", 1)])
        self.col.create_index([("source.external_id", 1)])

    async def list(self, search: str = "", page: int = 1, limit: int = 50) -> List[Dict[str, Any]]:
        q: Dict[str, Any] = {}
        if search:
            q = {"title": {"$regex": search, "$options": "i"}}
        cursor = self.col.find(q).skip((page - 1) * limit).limit(limit).sort("updated_at", -1)
        items = await cursor.to_list(length=limit)
        return [normalize_id(d) for d in items]

    async def get(self, pid: str) -> Optional[Dict[str, Any]]:
        doc = await self.col.find_one({"_id": ObjectId(pid)})
        return normalize_id(doc) if doc else None

    async def create(self, payload: Dict[str, Any]) -> str:
        now = datetime.utcnow()
        payload["created_at"] = now
        payload["updated_at"] = now
        res = await self.col.insert_one(payload)
        return str(res.inserted_id)

    async def update(self, pid: str, payload: Dict[str, Any]) -> bool:
        payload["updated_at"] = datetime.utcnow()
        res = await self.col.update_one({"_id": ObjectId(pid)}, {"$set": payload})
        return res.modified_count > 0

    async def delete(self, pid: str) -> bool:
        res = await self.col.delete_one({"_id": ObjectId(pid)})
        return res.deleted_count > 0

    async def upsert_from_source(self, product_id: str, mapped: Dict[str, Any]) -> str:
        """تُستخدم عند الاستيراد من AliExpress/… لتحديث أو إنشاء المنتج حسب external_id"""
        now = datetime.utcnow()
        doc = {
            "title": mapped["title"],
            "description": mapped.get("description"),
            "images": mapped.get("images", []),
            "price": mapped["price"],
            "stock": int(mapped.get("stock", 0)),
            "brand": mapped.get("brand"),
            "attributes": mapped.get("attributes", {}),
            "tags": mapped.get("tags", []),
            "status": mapped.get("status", "active"),
            "source": {
                "type": "aliexpress",
                "external_id": product_id,
                "external_url": mapped.get("external_url"),
                "last_sync": now,
                "last_sync_status": "ok",
            },
            "updated_at": now,
        }
        existing = await self.col.find_one({"source.type": "aliexpress", "source.external_id": product_id})
        if existing:
            await self.col.update_one({"_id": existing["_id"]}, {"$set": doc})
            return str(existing["_id"])
        else:
            doc["created_at"] = now
            res = await self.col.insert_one(doc)
            return str(res.inserted_id)
