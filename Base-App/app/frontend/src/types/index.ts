export interface Tag {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  name: string;
  data: string;
  user_id: string;
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
  project_id: number;
  created_at: string;
}
