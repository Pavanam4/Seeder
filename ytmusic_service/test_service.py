"""
Unit test for normalizer and direct queries.
"""
from normalizer import normalize_ytmusic_item, format_duration, parse_duration_string
from ytmusicapi import YTMusic

def test_duration_helpers():
    assert format_duration(65) == "1:05"
    assert format_duration(3665) == "1:01:05"
    assert parse_duration_string("1:05") == 65
    assert parse_duration_string("1:01:05") == 3665
    print("Duration helpers passed.")

def test_normalizer_synthetic():
    sample_song = {
        "resultType": "song",
        "title": "Midnight City",
        "artists": [{"name": "M83", "id": "123"}],
        "album": {"name": "Hurry Up, We're Dreaming", "id": "456"},
        "videoId": "dX3k_QDnzHE",
        "duration": "4:04",
        "duration_seconds": 244,
        "thumbnails": [{"url": "https://example.com/thumb.jpg", "width": 100, "height": 100}]
    }
    track = normalize_ytmusic_item(sample_song)
    assert track.id == "dX3k_QDnzHE"
    assert track.title == "Midnight City"
    assert track.artist == "M83"
    assert track.album == "Hurry Up, We're Dreaming"
    assert track.duration == "4:04"
    assert track.durationSeconds == 244
    assert track.isEmbeddableCandidate is True
    assert track.source == "ytmusicapi"
    print("Synthetic song test passed.")

    sample_artist = {
        "resultType": "artist",
        "artist": "Daft Punk",
        "browseId": "UCartist123",
        "thumbnails": [{"url": "https://example.com/artist.jpg", "width": 200, "height": 200}]
    }
    artist_track = normalize_ytmusic_item(sample_artist)
    assert artist_track.id == "UCartist123"
    assert artist_track.title == "Daft Punk"
    assert artist_track.artist == "Daft Punk"
    assert artist_track.album is None
    assert artist_track.isEmbeddableCandidate is False
    assert artist_track.resultType == "artist"
    print("Synthetic artist test passed.")

def test_live_ytmusic():
    yt = YTMusic()
    # Test songs
    songs = yt.search("Get Lucky", filter="songs", limit=3)
    assert len(songs) > 0
    t = normalize_ytmusic_item(songs[0])
    assert t.title
    assert t.artist
    assert t.id
    print(f"Live song search: '{t.title}' by '{t.artist}', ID={t.id}, Album={t.album}")

    # Test albums
    albums = yt.search("Discovery", filter="albums", limit=2)
    assert len(albums) > 0
    alb = normalize_ytmusic_item(albums[0])
    print(f"Live album search: '{alb.title}' by '{alb.artist}', ID={alb.id}")

    # Test new releases
    exp = yt.get_explore()
    new_rels = exp.get("new_releases", [])
    if new_rels:
        nr = normalize_ytmusic_item(new_rels[0])
        print(f"Live new release: '{nr.title}' by '{nr.artist}', type={nr.resultType}")

if __name__ == "__main__":
    test_duration_helpers()
    test_normalizer_synthetic()
    test_live_ytmusic()
    print("All python tests passed successfully!")
