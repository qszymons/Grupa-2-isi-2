"""Module containing chunk service implementation."""

import tiktoken

from src.core.domain.chunk import Chunk, ChunkBroker, ChunkEmbeddingBroker
from src.core.repositories.ichunk import IChunkRepository
from src.infrastructure.services.ichunk import IChunkService
from src.infrastructure.utils.chunking.base import IChunking
from src.infrastructure.utils.chunking.length import LengthChunking
from src.infrastructure.utils.chunking.chunktoken import TokenChunking
from src.infrastructure.services.iembedding import IEmbeddingService

_TOKEN_ENCODER = tiktoken.get_encoding("cl100k_base")

_STRATEGIES: dict[str, type[IChunking]] = {
    "length": LengthChunking,
    "token": TokenChunking,
}


class ChunkService(IChunkService):
    """A class implementing the chunk service."""

    _repository: IChunkRepository
    _embedding_service: IEmbeddingService

    def __init__(
        self,
        repository: IChunkRepository,
        embedding_service: IEmbeddingService,
    ) -> None:
        self._repository = repository
        self._embedding_service = embedding_service

    @staticmethod
    def _get_strategy(name: str) -> IChunking:
        """Resolve a chunking strategy by name.

        Args:
            name: The strategy name ('length' or 'token').

        Returns:
            IChunking: The instantiated strategy.

        Raises:
            ValueError: If the strategy name is unknown.
        """
        cls = _STRATEGIES.get(name)
        if cls is None:
            allowed = ", ".join(_STRATEGIES.keys())
            raise ValueError(
                f"Nieznana strategia chunkingu: '{name}'. "
                f"Dozwolone: {allowed}"
            )
        return cls()

    @staticmethod
    def _count_tokens(text: str) -> int:
        """Count tokens using shared tokenizer.

        Ensures token_count is always filled regardless of strategy.

        Args:
            text: The text to count.

        Returns:
            int: Token count.
        """
        return len(_TOKEN_ENCODER.encode(text))

    def _build_brokers(
        self,
        document_id: int,
        chunk_data_list: list,
        strategy: str,
        chunk_size: int,
        chunk_overlap: int,
    ) -> list[ChunkBroker]:
        """Convert ChunkData list to ChunkBroker list with metadata.

        Always fills token_count.

        Args:
            document_id: The document ID.
            chunk_data_list: Raw chunk data from strategy.
            strategy: Strategy name used.
            chunk_size: Size parameter used.
            chunk_overlap: Overlap parameter used.

        Returns:
            list[ChunkBroker]: Brokers ready for persistence.
        """
        return [
            ChunkBroker(
                document_id=document_id,
                chunk_index=cd.chunk_index,
                content=cd.content,
                char_offset=cd.char_offset,
                token_count=cd.token_count or self._count_tokens(cd.content),
                strategy=strategy,
                chunk_size_used=chunk_size,
                chunk_overlap_used=chunk_overlap,
            )
            for cd in chunk_data_list
        ]

    async def generate_chunks(
        self,
        document_id: int,
        text: str,
        chunk_size: int = 150,
        chunk_overlap: int = 0,
        strategy: str = "length",
    ) -> list[Chunk]:
        """Generate and store chunks for a given document.

        Args:
            document_id: The internal document id.
            text: The full text of the document.
            chunk_size: The maximum chunk size.
            chunk_overlap: The overlap between chunks.
            strategy: The chunking strategy ('length' or 'token').

        Returns:
            list[Chunk]: The generated chunks.
        """
        chunker = self._get_strategy(strategy)
        chunk_data_list = chunker.chunk(text, chunk_size, chunk_overlap)

        if not chunk_data_list:
            return []

        brokers = self._build_brokers(
            document_id, chunk_data_list,
            strategy, chunk_size, chunk_overlap,
        )

        records = await self._repository.add_chunks(brokers)
        return [Chunk(**dict(r)) for r in records]

    async def rechunk_document(
        self,
        document_id: int,
        text: str,
        chunk_size: int = 150,
        chunk_overlap: int = 0,
        strategy: str = "length",
    ) -> list[Chunk]:
        """Atomically re-chunk a document.

        Uses transactional replace - on failure old chunks preserved.

        Args:
            document_id: The internal document id.
            text: The full text of the document.
            chunk_size: The maximum chunk size.
            chunk_overlap: The overlap between chunks.
            strategy: The chunking strategy.

        Returns:
            list[Chunk]: The new chunks.
        """
        chunker = self._get_strategy(strategy)
        chunk_data_list = chunker.chunk(text, chunk_size, chunk_overlap)

        brokers = self._build_brokers(
            document_id, chunk_data_list,
            strategy, chunk_size, chunk_overlap,
        ) if chunk_data_list else []

        records = await self._repository.replace_chunks(
            document_id, brokers,
        )
        return [Chunk(**dict(r)) for r in records]

    async def get_chunks_for_document(self, document_id: int) -> list[Chunk]:
        """Get all chunks associated with a specific document.

        Args:
            document_id: The internal document id.

        Returns:
            list[Chunk]: A list of chunks.
        """
        records = await self._repository.get_by_document(document_id)
        return [Chunk(**dict(r)) for r in records]

    async def delete_chunks_by_document(self, document_id: int) -> bool:
        """Delete all chunks associated with a specific document.

        Args:
            document_id: The internal document id.

        Returns:
            bool: Success of the operation.
        """
        return await self._repository.delete_by_document(document_id)

    async def generate_embeddings(
        self,
        document_id: int,
        model_name: str,
    ) -> int:
        """Generate embeddings for all chunks of a document.

        Args:
            document_id: The internal document id.
            model_name: The embedding model to use.

        Returns:
            int: Number of chunks that received embeddings.
        """

        if not self._embedding_service.validate_model_name(model_name):
            raise ValueError(
                f"Nieznany model embeddingów: '{model_name}'"
            )

        chunks = await self.get_chunks_for_document(document_id)

        if not chunks:
            return 0

        texts = [c.content for c in chunks]

        embeddings = self._embedding_service.embed_texts(texts, model_name)

        model_info = self._embedding_service.get_model_info(model_name)
        expected_dim = model_info.get("dimensions")

        if expected_dim and embeddings:
            actual_dim = len(embeddings[0])

            if actual_dim != expected_dim:
                raise ValueError(
                    f"Niezgodność wymiarów embeddingu: oczekiwano "
                    f"{expected_dim}, otrzymano {actual_dim} "
                    f"(model: {model_name})"
                )

        emb_brokers = [
            ChunkEmbeddingBroker(
                chunk_id=chunk.id,
                model_name=model_name,
                embedding=embedding,
            )
            for chunk, embedding in zip(chunks, embeddings)
        ]

        await self._repository.add_embeddings_batch(emb_brokers)

        return len(chunks)

    async def get_embedding_info_for_document(
        self,
        document_id: int,
    ) -> list[dict]:
        """Get embedding metadata for document's chunks.

        Args:
            document_id: The internal document id.

        Returns:
            list[dict]: Embedding info per chunk.
        """
        records = await self._repository.get_embeddings_by_document(
            document_id,
        )
        return [dict(r) for r in records]
