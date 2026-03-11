"""A module containing constant values for infrastructure layer."""

from src.config import config

EXPIRATION_MINUTES = 60
REFRESH_EXPIRATION_MINUTES = 60 * 24 * 3
ACTIVATION_EXPIRATION_MINUTES = 60 * 24
PASSWORD_RESET_EXPIRATION_MINUTES = 60
SECRET_KEY = config.SECRET_KEY
ALGORITHM = "HS256"
