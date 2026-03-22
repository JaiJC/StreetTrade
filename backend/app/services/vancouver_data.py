"""Vancouver Open Data — business licence connector.

Fetches business licence records from the City of Vancouver Open Data
Portal. This is a goldmine: 199k+ records with geo coordinates, business
names, trade names, categories, addresses, and status — all via a free
public API with no authentication.

API: https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/business-licences/records
Geo query support: within_distance(geo_point_2d, geom'POINT(lng lat)', Xm)

Key fields:
  - businessname: legal owner name (e.g., "Women Working With Women Society")
  - businesstradename: customer-facing name (e.g., "Miscellany Finds")
  - businesstype: category (e.g., "Beauty Services", "Restaurant")
  - businesssubtype: subcategory
  - status: Issued / Cancelled / GOB / Inactive / Pending
  - house + street: address
  - geo_point_2d: {lat, lon} coordinates
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import httpx

log = logging.getLogger(__name__)

BASE_URL = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/business-licences/records"

FIELDS = (
    "businessname,businesstradename,businesstype,businesssubtype,"
    "status,house,street,city,province,postalcode,localarea,"
    "numberofemployees,issueddate,expireddate,geo_point_2d,licencersn"
)


@dataclass
class RegistryBusiness:
    """A business as recorded in the city registry."""
    licence_rsn: str
    legal_name: str
    trade_name: str | None
    display_name: str  # trade_name if available, else legal_name
    business_type: str
    business_subtype: str | None
    status: str
    address: str
    local_area: str | None
    latitude: float
    longitude: float
    employee_count: int | None = None
    issued_date: str | None = None
    expired_date: str | None = None


def _parse_record(rec: dict) -> RegistryBusiness | None:
    """Parse a raw API record into a RegistryBusiness."""
    geo = rec.get("geo_point_2d")
    if not geo or geo.get("lat") is None or geo.get("lon") is None:
        return None

    legal = (rec.get("businessname") or "").strip()
    trade = (rec.get("businesstradename") or "").strip() or None
    display = trade or legal
    if not display:
        return None

    house = rec.get("house") or ""
    street = rec.get("street") or ""
    address = f"{house} {street}".strip()

    emp = rec.get("numberofemployees")
    emp_count = int(emp) if emp is not None else None

    return RegistryBusiness(
        licence_rsn=rec.get("licencersn", ""),
        legal_name=legal,
        trade_name=trade,
        display_name=display,
        business_type=rec.get("businesstype") or "Unknown",
        business_subtype=rec.get("businesssubtype"),
        status=rec.get("status") or "Unknown",
        address=address,
        local_area=rec.get("localarea"),
        latitude=geo["lat"],
        longitude=geo["lon"],
        employee_count=emp_count,
        issued_date=rec.get("issueddate"),
        expired_date=rec.get("expireddate"),
    )


async def fetch_businesses_near(
    lat: float,
    lng: float,
    radius_m: float = 500.0,
    limit: int = 100,
    active_only: bool = True,
) -> list[RegistryBusiness]:
    """Fetch all registered businesses within radius_m of a coordinate.

    Uses the Vancouver Open Data v2.1 ODSQL API with geo-distance filter.
    No API key required.
    """
    where_clauses = [
        f"within_distance(geo_point_2d, geom'POINT({lng} {lat})', {int(radius_m)}m)"
    ]
    if active_only:
        where_clauses.append("status = 'Issued'")

    where = " AND ".join(where_clauses)

    all_records: list[RegistryBusiness] = []
    offset = 0
    page_size = min(limit, 100)

    async with httpx.AsyncClient(timeout=30.0) as client:
        while len(all_records) < limit:
            resp = await client.get(
                BASE_URL,
                params={
                    "select": FIELDS,
                    "where": where,
                    "limit": page_size,
                    "offset": offset,
                    "order_by": "businesstradename ASC",
                },
            )

            if resp.status_code != 200:
                log.warning("Vancouver API returned %s: %s", resp.status_code, resp.text[:200])
                break

            data = resp.json()
            results = data.get("results", [])

            if not results:
                break

            for rec in results:
                biz = _parse_record(rec)
                if biz:
                    all_records.append(biz)

            if len(results) < page_size:
                break

            offset += page_size

    log.info(
        "Fetched %d businesses from Vancouver Open Data near (%s, %s) within %sm",
        len(all_records), lat, lng, radius_m,
    )
    return all_records


async def fetch_businesses_by_type(
    lat: float,
    lng: float,
    radius_m: float,
    business_type: str,
    limit: int = 50,
) -> list[RegistryBusiness]:
    """Fetch registered businesses of a specific type near a coordinate."""
    where = (
        f"within_distance(geo_point_2d, geom'POINT({lng} {lat})', {int(radius_m)}m)"
        f" AND status = 'Issued'"
        f" AND businesstype = '{business_type}'"
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            BASE_URL,
            params={
                "select": FIELDS,
                "where": where,
                "limit": min(limit, 100),
                "order_by": "businesstradename ASC",
            },
        )

        if resp.status_code != 200:
            return []

        data = resp.json()
        results = []
        for rec in data.get("results", []):
            biz = _parse_record(rec)
            if biz:
                results.append(biz)

        return results
