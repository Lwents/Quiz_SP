from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Quiz_SP System"
    API_V1_STR: str = "/api/v1"
    
    # Database
    POSTGRES_SERVER: str = "db"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "quiz_db"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: Optional[str] = None

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # JWT Security
    SECRET_KEY: str = "change-this-jwt-secret-in-production-via-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI Integration
    AI_BASE_URL: str = "http://localhost:8000/v1"
    AI_API_KEY: str = ""
    AI_MODEL: str = "ag/gemini-3.8-flash-high"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
