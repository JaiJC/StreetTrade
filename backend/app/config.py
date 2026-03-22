from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://streettrade:streettrade@localhost:5432/streettrade"
    database_url_sync: str = "postgresql+psycopg2://streettrade:streettrade@localhost:5432/streettrade"

    # CLIP ViT-B/32: 512-dimensional shared text+image embedding space
    clip_model_name: str = "openai/clip-vit-base-patch32"
    embedding_dimensions: int = 512

    default_search_radius_km: float = 2.0
    default_search_limit: int = 20

    # Google Maps Platform key — Street View Static API + Places API.
    # Free tier: $200/month credit.
    google_maps_api_key: str = ""

    # Street View tile settings
    streetview_tile_size: str = "640x640"
    streetview_fov: int = 90
    streetview_pitch: int = 0

    # Reddit API — create a "script" app at https://www.reddit.com/prefs/apps/
    # Free, read-only access for searching subreddits.
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "StreetTrade/0.1 (hackathon local-biz discovery)"
    reddit_subreddits: list[str] = ["vancouver", "vancouverBC"]

    model_config = {"env_prefix": "ST_", "env_file": ".env"}


settings = Settings()
