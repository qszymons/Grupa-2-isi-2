from fastapi_mail import ConnectionConfig
from pydantic_settings import BaseSettings


class EmailSettings(BaseSettings):
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    ENVIRONMENT: str = "development"
    SUPPRESS_SEND: str = "False"

    class Config:
        env_file = ".env"
        extra = "ignore"

email_settings = EmailSettings()


conf = ConnectionConfig(
    MAIL_USERNAME = email_settings.MAIL_USERNAME,
    MAIL_PASSWORD = email_settings.MAIL_PASSWORD,
    MAIL_FROM = email_settings.MAIL_FROM,
    MAIL_PORT = 1025,
    MAIL_SERVER = "mailhog",
    MAIL_STARTTLS = False,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = False,
    VALIDATE_CERTS = False,
)