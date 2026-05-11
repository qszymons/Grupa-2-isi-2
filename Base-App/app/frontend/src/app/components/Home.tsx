import { useState, useEffect } from "react";
import { Search, User, X, FileText, Download, Scissors, RefreshCw } from "lucide-react";
import type { Tag, Project, ProjectDocument, Chunk, EmbeddingModel } from "../../types";

interface PublicUser {
  username: string;
  has_image: boolean;
  avatar_url?: string;
}

export function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [tagMatch, setTagMatch] = useState<'any' | 'all'>('any');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [userCache, setUserCache] = useState<Record<string, PublicUser>>({});
  const [chunkedDoc, setChunkedDoc] = useState<ProjectDocument | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [rechunkStrategy, setRechunkStrategy] = useState("length");
  const [rechunkSize, setRechunkSize] = useState(150);
  const [rechunkOverlap, setRechunkOverlap] = useState(0);
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([]);
  const [rechunking, setRechunking] = useState(false);
  const [chunkError, setChunkError] = useState("");
  const [embedModel, setEmbedModel] = useState("");
  const [embedding, setEmbedding] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tag');
        if (response.ok) {
          const data = await response.json();
          setAllTags(data);
        }
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      }
    };

    fetchTags();
  }, []);

  // Load all public projects on mount
  useEffect(() => {
    handleSearch();
  }, []);

  // Fetch public user info for all unique user_ids in projects
  useEffect(() => {
    const fetchUsers = async () => {
      const uniqueUserIds = [...new Set(projects.map(p => p.user_id))];
      const missing = uniqueUserIds.filter(id => !userCache[id]);

      if (missing.length === 0) return;

      const results: Record<string, PublicUser> = {};
      const timestamp = Date.now();
      await Promise.all(
        missing.map(async (userId) => {
          try {
            const res = await fetch(`/api/user/${userId}/public`);
            if (res.ok) {
              const userData = await res.json();
              results[userId] = {
                ...userData,
                avatar_url: userData.has_image ? `/api/avatar/${userId}?t=${timestamp}` : undefined
              };
            }
          } catch {
            // ignore
          }
        })
      );

      if (Object.keys(results).length > 0) {
        setUserCache(prev => ({ ...prev, ...results }));
      }
    };

    if (projects.length > 0) {
      fetchUsers();
    }
  }, [projects]);

  // Fetch documents when a project is selected
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!selectedProject) {
        setProjectDocuments([]);
        return;
      }

      try {
        const response = await fetch(`/api/project/${selectedProject.id}/documents`);
        if (response.ok) {
          const data = await response.json();
          setProjectDocuments(data);
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err);
      }
    };

    fetchDocuments();
  }, [selectedProject]);

  useEffect(() => {
    if (!chunkedDoc) return;
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/embedding/models', { credentials: 'include' });
        if (res.ok) setEmbeddingModels(await res.json());
      } catch { /* ignore */ }
    };
    fetchModels();
  }, [chunkedDoc]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('name', searchQuery.trim());
      }

      selectedTags.forEach(tagId => {
        const tag = allTags.find(t => t.id === tagId);
        if (tag) {
          params.append('tags', tag.name);
        }
      });

      if (selectedTags.length > 0) {
        params.append('tag_match', tagMatch);
      }

      const response = await fetch(`/api/project/search/tags?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section with Search */}
        <div className="text-center mb-16">
          <h1 className="text-foreground mb-8 pixel-24 leading-relaxed">
            WITAJ W BAZIE WIEDZY
          </h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Szukaj projektów po nazwie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-4 pr-14 bg-input-background text-foreground border-4 border-border focus:border-primary focus:outline-none mono-font"
              />
              <Search
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={24}
              />
            </div>

            {/* Tag Filters */}
            {allTags.length > 0 && (
              <div className="bg-card border-4 border-border p-4 mb-4 card-panel-sm">
                <p className="text-foreground mb-2 text-left pixel-8">
                  Filtruj po tagach:
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {allTags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-2 border-2 transition-all text-wrap-anywhere pixel-8 ${selectedTags.includes(tag.id)
                        ? 'bg-primary text-primary-foreground border-foreground'
                        : 'bg-secondary text-secondary-foreground border-border hover:border-primary'
                        }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>

                {/* Tag Match Mode */}
                {selectedTags.length > 1 && (
                  <div className="flex items-center gap-4">
                    <p className="text-foreground pixel-8">
                      Dopasowanie:
                    </p>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="tagMatch"
                        value="any"
                        checked={tagMatch === 'any'}
                        onChange={() => setTagMatch('any')}
                        className="w-4 h-4"
                      />
                      <span className="pixel-8">
                        Dowolny tag
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="tagMatch"
                        value="all"
                        checked={tagMatch === 'all'}
                        onChange={() => setTagMatch('all')}
                        className="w-4 h-4"
                      />
                      <span className="pixel-8">
                        Wszystkie tagi
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground px-6 py-3 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform disabled:opacity-50 pixel-10 shadow-retro-fg"
            >
              <Search size={16} className="inline mr-2" />
              {loading ? "SZUKANIE..." : "SZUKAJ"}
            </button>
          </form>
        </div>

        {/* Project Cards Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground pixel-12">
              Nie znaleziono projektów
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => {
              const pubUser = userCache[project.user_id];
              return (
                <div
                  key={project.id}
                  className="bg-card border-4 border-border p-6 hover:border-primary transition-colors cursor-pointer card-panel"
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="flex items-start gap-4 mb-3">
                    {/* Avatar or user icon */}
                    <div
                      className="w-12 h-12 flex-shrink-0 border-2 border-foreground flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      {pubUser?.has_image && pubUser.avatar_url ? (
                        <img
                          src={pubUser.avatar_url}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-primary-foreground">
                          <User size={20} />
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground mb-1 pixel-12 leading-tight text-wrap-anywhere">
                        {project.name}
                      </h3>
                      <p className="text-primary mb-1 pixel-8">
                        @{pubUser?.username || `user_${project.user_id.substring(0, 6)}`}
                      </p>
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-3 mono-14 leading-tight text-wrap-anywhere">
                    {project.data.substring(0, 100)}{project.data.length > 100 ? '...' : ''}
                  </p>

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.tags.slice(0, 5).map(tag => (
                        <span
                          key={tag.id}
                          className="bg-primary text-primary-foreground px-3 py-2 border-2 border-foreground pixel-10 text-wrap-anywhere"
                        >
                          {tag.name}
                        </span>
                      ))}
                      {project.tags.length > 5 && (
                        <span className="bg-secondary text-secondary-foreground px-3 py-2 border-2 border-border pixel-10 flex items-center justify-center">
                          ...
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="bg-card border-4 border-border w-full max-w-3xl max-h-[85vh] overflow-y-auto relative shadow-retro-lg-fg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedProject(null)}
              className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform pixel-16 shadow-retro-fg"
            >
              X
            </button>

            <div className="p-8">
              {/* Header with avatar */}
              <div className="flex items-start gap-4 mb-6 pr-16">
                {/* Avatar */}
                <div
                  className="w-16 h-16 flex-shrink-0 border-2 border-foreground flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {userCache[selectedProject.user_id]?.has_image && userCache[selectedProject.user_id]?.avatar_url ? (
                    <img
                      src={userCache[selectedProject.user_id]!.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary-foreground">
                      <User size={28} />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-foreground mb-2 pixel-16 leading-tight text-wrap-anywhere">
                    {selectedProject.name}
                  </h2>
                  <p className="text-primary pixel-10">
                    @{userCache[selectedProject.user_id]?.username || `user_${selectedProject.user_id.substring(0, 6)}`}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {selectedProject.tags && selectedProject.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedProject.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="bg-primary text-primary-foreground px-3 py-2 border-2 border-foreground pixel-10 text-wrap-anywhere"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Full project data */}
              <div className="bg-background border-4 border-border p-6 card-panel-sm mb-8">
                <p className="text-foreground project-data">
                  {selectedProject.data}
                </p>
              </div>

              {/* Attachments Section */}
              <div className="mt-8 border-t-4 border-border pt-8">
                <h3 className="text-foreground mb-4 pixel-14 flex items-center">
                  <FileText className="mr-2" size={20} />
                  DOKUMENTY ({projectDocuments.length})
                </h3>

                {projectDocuments.length === 0 ? (
                  <p className="text-muted-foreground pixel-10">
                    Brak dołączonych dokumentów.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {projectDocuments.map(doc => (
                      <div key={doc.public_id} className="bg-card border-2 border-border p-4 flex items-center justify-between hover:border-primary transition-colors">
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="text-foreground pixel-10 truncate mb-1">
                            {doc.name}
                          </p>
                          <p className="text-muted-foreground pixel-8">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`/api/documents/${doc.public_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-primary text-primary-foreground p-2 border-2 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform shadow-retro-fg"
                            title="Pokaż dokument (JSON)"
                          >
                            <Search size={16} />
                          </a>
                          <button
                            onClick={async () => {
                              setChunkedDoc(doc);
                              setLoadingChunks(true);
                              try {
                                const res = await fetch(`/api/documents/${doc.public_id}/chunks`, { credentials: 'include' });
                                if (res.ok) setChunks(await res.json());
                                else setChunks([]);
                              } catch { setChunks([]); }
                              finally { setLoadingChunks(false); }
                            }}
                            className="bg-accent text-accent-foreground p-2 border-2 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform shadow-retro-fg"
                            title="Pokaż chunki dokumentu"
                          >
                            <Scissors size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chunks Modal */}
      {chunkedDoc && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
          onClick={() => { setChunkedDoc(null); setChunks([]); setChunkError(''); }}
        >
          <div
            className="bg-card border-4 border-border w-full max-w-4xl max-h-[90vh] flex flex-col relative shadow-retro-lg-fg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b-4 border-border flex justify-between items-center bg-background">
              <h3 className="text-foreground pixel-12 truncate pr-8">
                <Scissors size={14} className="inline mr-2" />
                CHUNKI: {chunkedDoc.name}
              </h3>
              <button
                onClick={() => { setChunkedDoc(null); setChunks([]); setChunkError(''); }}
                className="bg-destructive text-destructive-foreground px-3 py-1 border-2 border-foreground hover:translate-x-[1px] hover:translate-y-[1px] transition-transform pixel-10"
              >
                ZAMKNIJ
              </button>
            </div>

            {/* Rechunk Controls */}
            <div className="p-4 border-b-4 border-border bg-card">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-foreground mb-1 pixel-8">Strategia</label>
                  <select
                    value={rechunkStrategy}
                    onChange={(e) => setRechunkStrategy(e.target.value)}
                    className="w-full px-2 py-2 bg-input-background text-foreground border-2 border-border focus:border-primary focus:outline-none mono-font"
                    style={{ fontSize: '11px' }}
                  >
                    <option value="length">Znakowy (length)</option>
                    <option value="token">Tokenowy (token)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-foreground mb-1 pixel-8">Rozmiar</label>
                  <input
                    type="number"
                    value={rechunkSize}
                    onChange={(e) => setRechunkSize(Number(e.target.value))}
                    min={10}
                    className="w-full px-2 py-2 bg-input-background text-foreground border-2 border-border focus:border-primary focus:outline-none mono-font"
                    style={{ fontSize: '11px' }}
                  />
                </div>
                <div>
                  <label className="block text-foreground mb-1 pixel-8">Overlap</label>
                  <input
                    type="number"
                    value={rechunkOverlap}
                    onChange={(e) => setRechunkOverlap(Number(e.target.value))}
                    min={0}
                    className="w-full px-2 py-2 bg-input-background text-foreground border-2 border-border focus:border-primary focus:outline-none mono-font"
                    style={{ fontSize: '11px' }}
                  />
                </div>

              </div>
              {chunkError && (
                <div className="bg-destructive/20 border-2 border-destructive p-2 mb-3">
                  <p className="text-destructive pixel-8">{chunkError}</p>
                </div>
              )}
              <button
                onClick={async () => {
                  if (!chunkedDoc) return;
                  setRechunking(true);
                  setChunkError('');
                  try {
                    const res = await fetch(`/api/documents/${chunkedDoc.public_id}/rechunk`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        strategy: rechunkStrategy,
                        chunk_size: rechunkSize,
                        chunk_overlap: rechunkOverlap,
                      }),
                    });
                    if (res.ok) {
                      setChunks(await res.json());
                    } else {
                      const err = await res.json().catch(() => null);
                      setChunkError(err?.detail || 'Błąd re-chunkowania');
                    }
                  } catch { setChunkError('Błąd re-chunkowania'); }
                  finally { setRechunking(false); }
                }}
                disabled={rechunking}
                className="w-full bg-primary text-primary-foreground px-4 py-2 border-2 border-foreground hover:translate-x-[1px] hover:translate-y-[1px] transition-transform pixel-10 shadow-retro-fg disabled:opacity-50"
              >
                <RefreshCw size={14} className={`inline mr-2 ${rechunking ? 'animate-spin' : ''}`} />
                {rechunking ? 'PRZETWARZANIE...' : 'RE-CHUNK'}
              </button>

              <div className="flex gap-2 mt-3">
                <select
                  value={embedModel}
                  onChange={(e) => setEmbedModel(e.target.value)}
                  className="flex-1 px-2 py-2 bg-input-background text-foreground border-2 border-border focus:border-primary focus:outline-none mono-font"
                  style={{ fontSize: '11px' }}
                >
                  <option value="">Wybierz model embeddingu</option>
                  {embeddingModels.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.dimensions}d, {m.language})
                    </option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    if (!chunkedDoc || !embedModel) return;
                    setEmbedding(true);
                    setChunkError('');
                    try {
                      const res = await fetch(`/api/documents/${chunkedDoc.public_id}/embed`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ model_name: embedModel }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        const taskId = data.task_id;
                        const poll = setInterval(async () => {
                          const s = await fetch(`/api/embedding/task/${taskId}`, { credentials: 'include' });
                          if (s.ok) {
                            const info = await s.json();
                            if (info.status === 'done' || info.status === 'failed') {
                              clearInterval(poll);
                              setEmbedding(false);
                              if (info.status === 'failed') setChunkError(info.error || 'Embedding failed');
                            }
                          }
                        }, 1500);
                      } else {
                        const err = await res.json().catch(() => null);
                        setChunkError(err?.detail || 'Błąd embeddingu');
                        setEmbedding(false);
                      }
                    } catch { setChunkError('Błąd embeddingu'); setEmbedding(false); }
                  }}
                  disabled={embedding || !embedModel}
                  className="bg-accent text-accent-foreground px-4 py-2 border-2 border-foreground hover:translate-x-[1px] hover:translate-y-[1px] transition-transform pixel-10 shadow-retro-fg disabled:opacity-50 whitespace-nowrap"
                >
                  {embedding ? 'GENEROWANIE...' : 'EMBEDDINGI'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-background p-4">
              {(loadingChunks || rechunking) ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-foreground pixel-10">ŁADOWANIE CHUNKÓW...</p>
                </div>
              ) : chunks.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground pixel-10">Brak chunków dla tego dokumentu.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground pixel-8">Liczba chunków: {chunks.length}</p>
                  {[...chunks].sort((a, b) => a.chunk_index - b.chunk_index).map((chunk) => (
                    <div key={chunk.chunk_index} className="bg-card border-2 border-border p-4 card-panel-sm">
                      <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                        <span className="text-primary pixel-10">CHUNK #{chunk.chunk_index}</span>
                        <div className="flex gap-3">
                          <span className="text-muted-foreground pixel-8">offset: {chunk.char_offset}</span>
                          {chunk.token_count != null && (
                            <span className="text-muted-foreground pixel-8">tokeny: {chunk.token_count}</span>
                          )}
                          {chunk.strategy && (
                            <span className="text-accent-foreground pixel-8 bg-accent px-2 py-0.5 border border-border">{chunk.strategy}</span>
                          )}
                        </div>
                      </div>
                      <pre className="text-foreground mono-font whitespace-pre-wrap text-sm leading-relaxed">{chunk.content}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
