from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/bites_rms"
    openweathermap_api_key: str = ""
    model_storage_path: str = "/tmp/bites_rms_models"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    log_level: str = "INFO"

    model_config = {
        "env_prefix": "AI_",
        "env_file": ".env",
        "protected_namespaces": (),
    }


settings = Settings()
