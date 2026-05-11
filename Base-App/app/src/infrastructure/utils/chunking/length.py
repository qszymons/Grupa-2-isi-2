"""Module containing length-based chunking strategy."""

from src.infrastructure.utils.chunking.base import ChunkData, IChunking


class LengthChunking(IChunking):
    """Chunking strategy based on character length.

    Splits text into chunks of a given character size,
    respecting word boundaries. Overlap is in characters.
    """

    def chunk(
        self,
        text: str,
        chunk_size: int = 150,
        chunk_overlap: int = 0,
    ) -> list[ChunkData]:
        """Split text into chunks by character length.

        Args:
            text (str): The full text to split.
            chunk_size (int): Maximum number of characters per chunk.
            chunk_overlap (int): Number of overlapping characters between chunks.

        Returns:
            list[ChunkData]: The list of produced chunks.

        Raises:
            ValueError: If chunk_size < 1 or chunk_overlap >= chunk_size.
        """

        if chunk_size < 1:
            raise ValueError("chunk_size musi być >= 1")

        if chunk_overlap >= chunk_size:
            raise ValueError(
                "chunk_overlap musi być mniejszy niż chunk_size"
            )

        stripped = text.strip()
        if not stripped:
            return []

        results: list[ChunkData] = []
        start = 0
        index = 0

        while start < len(stripped):
            end = start + chunk_size

            if end >= len(stripped):
                chunk_content = stripped[start:]
            else:
                boundary = stripped.rfind(" ", start, end)

                if boundary <= start:
                    boundary = end

                end = boundary
                chunk_content = stripped[start:end]

            chunk_content = chunk_content.strip()

            if chunk_content:
                results.append(
                    ChunkData(
                        content=chunk_content,
                        char_offset=start,
                        chunk_index=index,
                    )
                )
                index += 1

            step = max(1, (end - start) - chunk_overlap)
            start += step

        return results
