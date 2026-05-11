"""Module containing token-based chunking strategy."""

import tiktoken

from src.infrastructure.utils.chunking.base import ChunkData, IChunking

_DEFAULT_ENCODING = "cl100k_base"


class TokenChunking(IChunking):
    """Chunking strategy based on token count (tiktoken).

    Splits text into chunks of a given token size,
    respecting sentence boundaries where possible.
    Overlap is expressed in tokens.
    """

    _encoding: tiktoken.Encoding

    def __init__(self, encoding_name: str = _DEFAULT_ENCODING) -> None:
        """Initialize the tokenizer.

        Args:
            encoding_name: The tiktoken encoding name to use.
        """
        self._encoding = tiktoken.get_encoding(encoding_name)

    def _count_tokens(self, text: str) -> int:
        """Count the number of tokens in a text.

        Args:
            text: The text to tokenize.

        Returns:
            int: The token count.
        """
        return len(self._encoding.encode(text))

    def _split_into_sentences(self, text: str) -> list[str]:
        """Split text into sentence-like segments.

        Uses simple heuristics: splits on '.', '!', '?', '\\n'
        while keeping the delimiter attached to the sentence.

        Args:
            text: The text to split.

        Returns:
            list[str]: List of sentence-like segments.
        """
        sentences: list[str] = []
        current: list[str] = []

        for char in text:
            current.append(char)

            if char in ".!?\n":
                sentence = "".join(current).strip()
                if sentence:
                    sentences.append(sentence)
                current = []

        remaining = "".join(current).strip()
        if remaining:
            sentences.append(remaining)

        return sentences

    def chunk(
        self,
        text: str,
        chunk_size: int = 150,
        chunk_overlap: int = 0,
    ) -> list[ChunkData]:
        """Split text into chunks by token count.

        Groups sentences together until the token limit is reached.
        Overlap is achieved by carrying over trailing sentences
        from the previous chunk.

        Args:
            text: The full text to split.
            chunk_size: Maximum number of tokens per chunk.
            chunk_overlap: Number of overlapping tokens between chunks.

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

        sentences = self._split_into_sentences(stripped)

        results: list[ChunkData] = []
        current_sentences: list[str] = []
        current_tokens = 0
        chunk_index = 0
        search_from = 0

        for sentence in sentences:
            sentence_tokens = self._count_tokens(sentence)

            if sentence_tokens > chunk_size and not current_sentences:
                tokens = self._encoding.encode(sentence)

                for i in range(0, len(tokens), chunk_size):
                    slice_tokens = tokens[i:i + chunk_size]
                    chunk_text = self._encoding.decode(slice_tokens).strip()

                    if chunk_text:
                        found_at = stripped.find(chunk_text, search_from)
                        offset = found_at if found_at >= 0 else search_from

                        results.append(
                            ChunkData(
                                content=chunk_text,
                                char_offset=offset,
                                chunk_index=chunk_index,
                                token_count=len(slice_tokens),
                            )
                        )
                        chunk_index += 1
                        search_from = offset + len(chunk_text)

                continue

            if current_tokens + sentence_tokens > chunk_size and current_sentences:
                chunk_content = " ".join(current_sentences).strip()

                if chunk_content:
                    first_sentence = current_sentences[0]
                    found_at = stripped.find(first_sentence, max(0, search_from - len(first_sentence)))
                    offset = found_at if found_at >= 0 else search_from

                    results.append(
                        ChunkData(
                            content=chunk_content,
                            char_offset=offset,
                            chunk_index=chunk_index,
                            token_count=current_tokens,
                        )
                    )
                    chunk_index += 1

                overlap_sentences: list[str] = []
                overlap_tokens = 0

                for s in reversed(current_sentences):
                    s_tokens = self._count_tokens(s)
                    if overlap_tokens + s_tokens > chunk_overlap:
                        break
                    overlap_sentences.insert(0, s)
                    overlap_tokens += s_tokens

                non_overlap_sents = current_sentences[:len(current_sentences) - len(overlap_sentences)]
                if non_overlap_sents:
                    last_non_overlap = non_overlap_sents[-1]
                    pos = stripped.find(last_non_overlap, search_from)
                    if pos >= 0:
                        search_from = pos + len(last_non_overlap)

                current_sentences = list(overlap_sentences)
                current_tokens = overlap_tokens

            current_sentences.append(sentence)
            current_tokens += sentence_tokens

        if current_sentences:
            chunk_content = " ".join(current_sentences).strip()

            if chunk_content:
                first_sentence = current_sentences[0]
                found_at = stripped.find(first_sentence, max(0, search_from - len(first_sentence)))
                offset = found_at if found_at >= 0 else search_from

                results.append(
                    ChunkData(
                        content=chunk_content,
                        char_offset=offset,
                        chunk_index=chunk_index,
                        token_count=current_tokens,
                    )
                )

        return results
