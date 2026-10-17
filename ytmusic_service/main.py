"""
FastAPI Backend Microservice using ytmusicapi for YouTube Music search and metadata retrieval.
Uses unofficial internal YouTube Music API without requiring Google Cloud API keys.
"""

import time
import logging
from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ytmusicapi import YTMusic

from normalizer import normalize_ytmusic_item, MusicTrackModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ytmusic_service")

app = FastAPI(
    title="YouTube Music Fetcher Provider Service",
    description="Unofficial YouTube Music Search Engine using ytmusicapi",
    version="1.0.0",
)

# Enable CORS for local dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize YTMusic instance without authentication (public access)
ytmusic: Optional[YTMusic] = None

try:
    ytmusic = YTMusic()
    logger.info("ytmusicapi client initialized successfully.")
except Exception as e:
    logger.error("Failed to initialize ytmusicapi: %s", e)


class SearchResponseModel(BaseModel):
    provider: str
    query: str
    page: int
    limit: int
    durationMs: int
    totalReturned: int
    hasMore: bool
    items: List[MusicTrackModel]
    errorMessage: Optional[str] = None
    statusCode: Optional[int] = 200


class ProviderInfoModel(BaseModel):
    id: str
    name: str
    description: str
    isDefault: bool
    requiresExternalInstance: bool


@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy" if ytmusic is not None else "degraded",
        "service": "MusicFetcher.YtMusicService",
        "provider": "ytmusicapi",
        "framework": "FastAPI + ytmusicapi 1.12.3",
        "notice": "Uses unofficial internal YouTube Music endpoints. Subject to YouTube rate limits and interface adjustments.",
    }


@app.get("/api/providers")
async def get_providers():
    return [
        {
            "id": "ytmusicapi",
            "name": "ytmusicapi (YouTube Music Engine)",
            "description": "High-fidelity search using YouTube Music's catalog for songs, artists, albums, and playlists without API keys.",
            "isDefault": True,
            "requiresExternalInstance": False,
        },
        {
            "id": "youtubeexplode",
            "name": "YouTubeExplode (.NET Engine)",
            "description": "Direct scraper engine extracting video search metadata from YouTube without API keys.",
            "isDefault": False,
            "requiresExternalInstance": False,
        },
        {
            "id": "invidious",
            "name": "Invidious (Alternative Engine)",
            "description": "Open-source front-end proxy API for YouTube with configurable public instances.",
            "isDefault": False,
            "requiresExternalInstance": True,
        },
    ]


@app.get("/api/search", response_model=SearchResponseModel)
async def search(
    q: Optional[str] = Query(None, description="Search query string"),
    filter: Optional[str] = Query(None, description="Search filter: songs, artists, albums, playlists, new_releases, all"),
    limit: Optional[int] = Query(20, ge=1, le=50, description="Max results per page"),
    page: Optional[int] = Query(1, ge=1, description="Page number"),
):
    start_time = time.perf_counter()

    # 1. Validation
    if not q or not q.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty.",
        )

    sanitized_query = q.strip()
    if len(sanitized_query) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query is too short. Minimum 2 characters required.",
        )

    if len(sanitized_query) > 150:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query is too long. Maximum 150 characters allowed.",
        )

    if ytmusic is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ytmusicapi client is not initialized.",
        )

    norm_limit = limit or 20
    norm_page = page or 1

    normalized_filter: Optional[str] = None
    if filter:
        f_clean = filter.strip().lower()
        if f_clean in ["songs", "song", "track", "tracks"]:
            normalized_filter = "songs"
        elif f_clean in ["artists", "artist"]:
            normalized_filter = "artists"
        elif f_clean in ["albums", "album"]:
            normalized_filter = "albums"
        elif f_clean in ["playlists", "playlist"]:
            normalized_filter = "playlists"
        elif f_clean in ["videos", "video"]:
            normalized_filter = "videos"
        elif f_clean in ["new_releases", "new", "recent"]:
            normalized_filter = "new_releases"
        elif f_clean in ["all", "any"]:
            normalized_filter = None

    try:
        raw_items = []

        if normalized_filter == "new_releases" or sanitized_query.lower() in [
            "new releases",
            "latest releases",
            "recent releases",
            "new music",
        ]:
            # Fetch recently released music via get_explore
            logger.info("Fetching explore/new releases from ytmusicapi...")
            explore_data = ytmusic.get_explore()
            if isinstance(explore_data, dict):
                raw_items = explore_data.get("new_releases", [])
            elif isinstance(explore_data, list):
                raw_items = explore_data
        else:
            # Query standard search with requested filter
            logger.info(
                "Searching ytmusicapi for '%s' with filter '%s'...",
                sanitized_query,
                normalized_filter,
            )
            # Fetch extra to support pagination slice
            fetch_count = norm_limit * norm_page + 5
            raw_items = ytmusic.search(
                sanitized_query,
                filter=normalized_filter,
                limit=fetch_count,
            )

        # Normalize items
        normalized_tracks: List[MusicTrackModel] = []
        seen_ids = set()

        for raw_item in raw_items:
            try:
                track = normalize_ytmusic_item(raw_item)
                if track.id not in seen_ids:
                    seen_ids.add(track.id)
                    normalized_tracks.append(track)
            except Exception as item_err:
                logger.warning("Error normalizing item: %s", item_err)
                continue

        # Pagination slice
        skip = (norm_page - 1) * norm_limit
        paged_items = normalized_tracks[skip : skip + norm_limit]
        has_more = len(normalized_tracks) > (skip + norm_limit)

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        return SearchResponseModel(
            provider="ytmusicapi (YouTube Music Engine)",
            query=sanitized_query,
            page=norm_page,
            limit=norm_limit,
            durationMs=elapsed_ms,
            totalReturned=len(paged_items),
            hasMore=has_more,
            items=paged_items,
            statusCode=200,
        )

    except HTTPException:
        raise
    except Exception as ex:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        logger.error("ytmusicapi error during search: %s", ex, exc_info=True)
        # Check for rate limit or network issues
        err_str = str(ex).lower()
        status_code = status.HTTP_502_BAD_GATEWAY
        if "429" in err_str or "too many requests" in err_str:
            status_code = status.HTTP_429_TOO_MANY_REQUESTS
            msg = "YouTube Music rate limit reached. Please wait a moment before trying again."
        elif "timeout" in err_str or "timed out" in err_str:
            status_code = status.HTTP_504_GATEWAY_TIMEOUT
            msg = "Request to YouTube Music timed out."
        else:
            msg = f"ytmusicapi error: {ex}"

        raise HTTPException(
            status_code=status_code,
            detail={
                "error": msg,
                "provider": "ytmusicapi (YouTube Music Engine)",
                "durationMs": elapsed_ms,
                "statusCode": status_code,
            },
        )


@app.get("/api/new_releases", response_model=SearchResponseModel)
async def get_new_releases(limit: Optional[int] = Query(20, ge=1, le=50)):
    start_time = time.perf_counter()
    if ytmusic is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ytmusicapi client is not initialized.",
        )

    try:
        explore_data = ytmusic.get_explore()
        raw_items = []
        if isinstance(explore_data, dict):
            raw_items = explore_data.get("new_releases", [])

        normalized: List[MusicTrackModel] = []
        seen = set()
        for it in raw_items[:limit]:
            tr = normalize_ytmusic_item(it)
            if tr.id not in seen:
                seen.add(tr.id)
                normalized.append(tr)

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        return SearchResponseModel(
            provider="ytmusicapi (YouTube Music Engine)",
            query="New Releases",
            page=1,
            limit=limit or 20,
            durationMs=elapsed_ms,
            totalReturned=len(normalized),
            hasMore=False,
            items=normalized,
            statusCode=200,
        )
    except Exception as ex:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch new releases: {ex}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=5006, reload=False)
