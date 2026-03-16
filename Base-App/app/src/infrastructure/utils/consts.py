"""A module containing constant values for infrastructure layer."""

EXPIRATION_MINUTES = 60
REFRESH_EXPIRATION_MINUTES = 60 * 24 * 3
ACTIVATION_EXPIRATION_MINUTES = 60 * 24
SECRET_KEY = "s3cr3t"
# TODO: secret key powinien być generowany losowo, i trzymany w .env
ALGORITHM = "HS256"
