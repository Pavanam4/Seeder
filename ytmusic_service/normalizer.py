"""
Metadata normalizer for ytmusicapi results.
Normalizes songs, artists, albums, playlists, and new releases into a standard schema.
Does not invent missing metadata.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MusicTrackModel(BaseModel):
    id: str
    title: str
    artist: str
    album: Optional[str] = None
    duration: Optional[str] = None
    durationSeconds: Optional[float] = None
    thumbnailUrl: str
    youtubeUrl: str
    resultType: str = "song"
    source: str = "ytmusicapi"
    isEmbeddableCandidate: bool = True


def format_duration(seconds: float) -> str:
    s = int(seconds)
    m = s // 60
    h = m // 60
    rem_s = s % 60
    if h > 0:
        rem_m = m % 60
        return f"{h}:{rem_m:02d}:{rem_s:02d}"
    return f"{m}:{rem_s:02d}"


def parse_duration_string(duration_str: str) -> Optional[float]:
    if not duration_str or not isinstance(duration_str, str):
        return None
    parts = duration_str.strip().split(":")
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except (ValueError, TypeError):
        return None
    return None


def extract_artist(item: Dict[str, Any]) -> str:
    artists = item.get("artists")
    if isinstance(artists, list) and artists:
        names = []
        for a in artists:
            if isinstance(a, dict) and a.get("name"):
                names.append(str(a["name"]))
            elif isinstance(a, str) and a.strip():
                names.append(a.strip())
        if names:
            return ", ".join(names)
    elif isinstance(artists, str) and artists.strip():
        return artists.strip()

    artist = item.get("artist")
    if isinstance(artist, str) and artist.strip():
        return artist.strip()
    elif isinstance(artist, dict) and artist.get("name"):
        return str(artist["name"])

    author = item.get("author")
    if isinstance(author, str) and author.strip():
        return author.strip()
    elif isinstance(author, dict) and author.get("name"):
        return str(author["name"])

    return "Unknown Artist"


def extract_album(item: Dict[str, Any]) -> Optional[str]:
    album = item.get("album")
    if isinstance(album, dict) and album.get("name"):
        return str(album["name"])
    elif isinstance(album, str) and album.strip():
        return album.strip()

    res_type = item.get("resultType")
    if res_type == "album" and item.get("title"):
        return str(item["title"])

    return None


def extract_thumbnail(item: Dict[str, Any], video_id: Optional[str]) -> str:
    thumbnails = item.get("thumbnails")
    if isinstance(thumbnails, list) and thumbnails:
        def thumb_area(t: Any) -> int:
            if isinstance(t, dict):
                w = t.get("width") or 0
                h = t.get("height") or 0
                return w * h
            return 0

        best = max(thumbnails, key=thumb_area)
        if isinstance(best, dict) and best.get("url"):
            url = str(best["url"])
            # Ensure protocol
            if url.startswith("//"):
                url = "https:" + url
            return url

    if video_id and len(video_id) == 11:
        return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

    return ""


def normalize_ytmusic_item(item: Dict[str, Any]) -> MusicTrackModel:
    result_type = str(item.get("resultType") or "").lower()
    category = str(item.get("category") or "").lower()

    if not result_type:
        if "song" in category:
            result_type = "song"
        elif "video" in category:
            result_type = "video"
        elif "album" in category or item.get("type") in ["Album", "Single", "EP"]:
            result_type = "album"
        elif "artist" in category:
            result_type = "artist"
        elif "playlist" in category:
            result_type = "playlist"
        elif item.get("videoId"):
            result_type = "song"
        else:
            result_type = "track"

    # Artist extraction
    artist = extract_artist(item)

    # Title extraction
    title = item.get("title")
    if not title and result_type == "artist":
        title = item.get("artist") or (artist if artist != "Unknown Artist" else None)
    if not title:
        title = artist if artist != "Unknown Artist" else "Untitled"
    title = str(title).strip()

    # Album extraction
    album = extract_album(item)

    # Video / Item ID extraction
    video_id = item.get("videoId")
    playlist_id = item.get("playlistId") or item.get("audioPlaylistId")
    browse_id = item.get("browseId")
    if not browse_id and isinstance(item.get("artists"), list) and item["artists"]:
        first_a = item["artists"][0]
        if isinstance(first_a, dict) and first_a.get("id"):
            browse_id = first_a["id"]

    item_id: str
    youtube_url: str
    is_embeddable: bool

    if video_id and isinstance(video_id, str) and len(video_id) == 11:
        item_id = video_id
        youtube_url = f"https://www.youtube.com/watch?v={video_id}"
        is_embeddable = True
    elif playlist_id and isinstance(playlist_id, str):
        item_id = playlist_id
        youtube_url = f"https://www.youtube.com/playlist?list={playlist_id}"
        is_embeddable = False
    elif browse_id and isinstance(browse_id, str):
        item_id = browse_id
        if browse_id.startswith("VL"):
            youtube_url = f"https://www.youtube.com/playlist?list={browse_id[2:]}"
        else:
            youtube_url = f"https://music.youtube.com/browse/{browse_id}"
        is_embeddable = False
    else:
        # Fallback pseudo-id if nothing else is returned
        item_id = f"{result_type}-{abs(hash(f'{title}-{artist}')) % 10000000}"
        youtube_url = f"https://music.youtube.com/search?q={title}"
        is_embeddable = False

    # Duration extraction
    duration_str: Optional[str] = None
    duration_seconds: Optional[float] = None

    if item.get("duration"):
        raw_dur = str(item["duration"]).strip()
        if raw_dur and raw_dur.lower() != "none":
            duration_str = raw_dur
            duration_seconds = parse_duration_string(raw_dur)

    if item.get("duration_seconds") is not None:
        try:
            ds = float(item["duration_seconds"])
            duration_seconds = ds
            if not duration_str:
                duration_str = format_duration(ds)
        except (ValueError, TypeError):
            pass

    # Thumbnail extraction
    thumbnail_url = extract_thumbnail(item, video_id if is_embeddable else None)

    return MusicTrackModel(
        id=item_id,
        title=title,
        artist=artist,
        album=album,
        duration=duration_str,
        durationSeconds=duration_seconds,
        thumbnailUrl=thumbnail_url,
        youtubeUrl=youtube_url,
        resultType=result_type,
        source="ytmusicapi",
        isEmbeddableCandidate=is_embeddable,
    )
