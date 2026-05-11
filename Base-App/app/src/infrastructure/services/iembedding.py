"""Module containing embedding service abstractions."""

from abc import ABC, abstractmethod


class IEmbeddingService(ABC):
    """Abstract base class for embedding services."""

    @abstractmethod
    def embed_texts(
        self, texts: list[str], model_name: str | None = None,
    ) -> list[list[float]]:
        """Generate embeddings for a list of texts.

        Args:
            texts: The texts to embed.
            model_name: The model to use. None = default.

        Returns:
            list[list[float]]: A list of embedding vectors.
        """

    @abstractmethod
    def embed_query(
        self, query: str, model_name: str | None = None,
    ) -> list[float]:
        """Generate an embedding for a single query.

        Args:
            query: The query text.
            model_name: The model to use. None = default.

        Returns:
            list[float]: The embedding vector.
        """

    @abstractmethod
    def get_model_info(self, model_name: str | None = None) -> dict:
        """Return information about an embedding model.

        Args:
            model_name: The model to query. None = default.

        Returns:
            dict: Model name, dimensions, and description.
        """

    @abstractmethod
    def get_available_models(self) -> list[dict]:
        """Return a list of all available embedding models.

        Returns:
            list[dict]: Each dict contains name, dimensions, description, and size info.
        """

    @abstractmethod
    def validate_model_name(self, model_name: str) -> bool:
        """Check if a model name is valid/available.

        Args:
            model_name: The model name to validate.

        Returns:
            bool: True if the model is available.
        """
