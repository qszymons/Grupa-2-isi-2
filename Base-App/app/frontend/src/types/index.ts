export interface Tag {
  id: number;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  data: string;
  user_id: string;
  is_public: boolean;
  embedding_model_name: string;
  tags?: Tag[];
}

export interface PublicProject {
  id: string;
  name: string;
  data: string;
  is_public: boolean;
  embedding_model_name: string;
  owner_username?: string | null;
  owner_has_image: boolean;
  tags?: Tag[];
}

export interface User {
  id: string;
  username: string;
  image?: string;
}

export interface ProjectDocument {
  public_id: string;
  name: string;
  data: string;
  is_public: boolean;
  project_id: string;
  created_at: string;
}

export interface Chunk {
  chunk_index: number;
  content: string;
  char_offset: number;
  token_count: number | null;
  strategy: string | null;
}

export interface EmbeddingModel {
  name: string;
  dimensions: number;
  description: string;
  size_mb: number;
  language: string;
  active: boolean;
}

export interface SemanticSearchRequest {
  query: string;
  top_k?: number;
  threshold?: number;
}

export interface SemanticSearchResult {
  document_name: string;
  document_public_id: string;
  chunk_index: number;
  chunk_content: string;
  score: number;
}

export interface SemanticSearchResponse {
  project_id: string;
  model_name: string;
  results: SemanticSearchResult[];
  total: number;
}
