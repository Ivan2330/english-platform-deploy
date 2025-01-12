from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    secret_key: str
    algorithm: str = "HS256"
    expire_token_minutes: int = 30

    log_level: str = "info"
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
