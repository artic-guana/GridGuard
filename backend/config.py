from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "ps2"
    models_dir: str = "./models"

    # Feature window
    history_days: int = 90
    min_days_for_scoring: int = 7
    decision_threshold: float = 0.35

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()