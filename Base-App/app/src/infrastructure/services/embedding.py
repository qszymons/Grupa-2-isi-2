"""Module containing embedding service implementation."""

import time
from sentence_transformers import SentenceTransformer

from src.infrastructure.services.iembedding import IEmbeddingService

AVAILABLE_MODELS: list[dict] = [
    {
        "name": "all-MiniLM-L6-v2",
        "dimensions": 384,
        "description": "Szybki i lekki model (angielski)",
        "size_mb": 80,
        "language": "en",
    },
    {
        "name": "all-mpnet-base-v2",
        "dimensions": 768,
        "description": "Wysoka jakość, duży wymiar (angielski)",
        "size_mb": 420,
        "language": "en",
    },
    {
        "name": "paraphrase-multilingual-MiniLM-L12-v2",
        "dimensions": 384,
        "description": "Model wielojęzyczny — rekomendowany dla polskiego",
        "size_mb": 470,
        "language": "multilingual",
        "recommended": True,
    },
]

DEFAULT_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"


class EmbeddingService(IEmbeddingService):
    """Embedding service using sentence-transformers.

    Each model is lazily loaded on first use.
    """

    _models: dict[str, SentenceTransformer]
    _default_model_name: str

    def __init__(self, model_name: str = DEFAULT_MODEL) -> None:
        """Initialize the embedding service.

        Args:
            model_name: The default sentence-transformers model name.
        """

        self._default_model_name = model_name
        self._models = {}

    def _resolve_model_name(self, model_name: str | None) -> str:
        """Resolve model name, falling back to default."""

        return model_name or self._default_model_name

    def _load_model(self, model_name: str | None = None) -> SentenceTransformer:
        """Lazily load a model by name, caching in memory.

        Args:
            model_name: The model to load. None = default.

        Returns:
            SentenceTransformer: The loaded model.
        """
        name = self._resolve_model_name(model_name)

        if name not in self._models:
            self._models[name] = SentenceTransformer(name)

        return self._models[name]

    def validate_model_name(self, model_name: str) -> bool:
        """Check if a model name is in the available list.

        Args:
            model_name: The model name to check.

        Returns:
            bool: True if available.
        """
        return any(m["name"] == model_name for m in AVAILABLE_MODELS)

    def embed_texts(
        self, texts: list[str], model_name: str | None = None,
    ) -> list[list[float]]:
        """Generate embeddings for a list of texts.

        Args:
            texts: The texts to embed.
            model_name: Which model to use.

        Returns:
            list[list[float]]: A list of embedding vectors.

        """
        if not texts:
            return []

        model = self._load_model(model_name)
        embeddings = model.encode(texts, show_progress_bar=False)
        return [e.tolist() for e in embeddings]

    def embed_query(
        self, query: str, model_name: str | None = None,
    ) -> list[float]:
        """Generate an embedding for a single query.

        Args:
            query: The query text.
            model_name: Which model to use.

        Returns:
            list[float]: The embedding vector.
        """
        model = self._load_model(model_name)
        embedding = model.encode(query, show_progress_bar=False)
        return embedding.tolist()

    def get_model_info(self, model_name: str | None = None) -> dict:
        """Return information about an embedding model.

        Args:
            model_name: The model to query. None = default.

        Returns:
            dict: Model metadata.
        """

        name = self._resolve_model_name(model_name)

        for m in AVAILABLE_MODELS:
            if m["name"] == name:
                return {**m, "active": name == self._default_model_name}

        return {
            "name": name,
            "dimensions": None,
            "description": "Model niestandardowy",
            "size_mb": None,
            "language": "unknown",
            "active": name == self._default_model_name,
        }

    def get_available_models(self) -> list[dict]:
        """Return a list of all available embedding models.

        Returns:
            list[dict]: Each dict contains model metadata.
        """

        result = []
        for m in AVAILABLE_MODELS:
            result.append({
                **m,
                "active": m["name"] == self._default_model_name,
            })
        return result

    def compare_models(
        self,
        text: str,
        model_names: list[str] | None = None,
    ) -> list[dict]:
        """Compare embedding models on a sample text.

        Args:
            text: Sample text to embed.
            model_names: Models to compare. Defaults to all.

        Returns:
            list[dict]: Comparison results per model.
        """
        if model_names is None:
            model_names = [m["name"] for m in AVAILABLE_MODELS]

        results = []

        for name in model_names:
            try:
                model = self._load_model(name)

                start = time.perf_counter()
                embedding = model.encode(text, show_progress_bar=False)
                elapsed = time.perf_counter() - start

                results.append({
                    "model": name,
                    "dimensions": len(embedding),
                    "encoding_time_ms": round(elapsed * 1000, 2),
                    "status": "ok",
                })
            except Exception as e:
                results.append({
                    "model": name,
                    "dimensions": None,
                    "encoding_time_ms": None,
                    "status": f"error: {e}",
                })

        return results
