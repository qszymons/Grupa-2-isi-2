import { useState, useEffect } from "react";
import { Search, User, X, FileText, Scissors, Brain, Globe } from "lucide-react";
import type { Tag, PublicProject, ProjectDocument, Chunk, SemanticSearchResult } from "../../types";

export function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [tagMatch, setTagMatch] = useState<'any' | 'all'>('any');
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<PublicProject | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [chunkedDoc, setChunkedDoc] = useState<ProjectDocument | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  // Semantic search state
  const [semQuery, setSemQuery] = useState("");
  const [semTopK, setSemTopK] = useState(10);
  const [semThreshold, setSemThreshold] = useState(0.3);
  const [semResults, setSemResults] = useState<SemanticSearchResult[]>([]);
  const [semLoading, setSemLoading] = useState(false);
  const [semError, setSemError] = useState("");
  const [semModelName, setSemModelName] = useState("");

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
            {projects.map((project) => (
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
                      {project.owner_has_image ? (
                        <img
                          src={`/api/project/${project.id}/owner-avatar`}
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
                        @{project.owner_username || "uzytkownik"}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 border-2 border-border bg-accent/30 text-accent-foreground pixel-8">
                      <Brain size={10} />
                      {project.embedding_model_name}
                    </span>
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
            ))}
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
                  {selectedProject.owner_has_image ? (
                    <img
                      src={`/api/project/${selectedProject.id}/owner-avatar`}
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
                    @{selectedProject.owner_username || "uzytkownik"}
                  </p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1 px-2 py-1 border-2 bg-green-900/40 text-green-400 border-green-700 pixel-8">
                  <Globe size={10} />
                  PUBLICZNY
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 border-2 border-border bg-accent/30 text-accent-foreground pixel-8">
                  <Brain size={10} />
                  {selectedProject.embedding_model_name}
                </span>
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

              {/* Public Semantic Search Section */}
              <div className="mt-8 border-t-4 border-border pt-8">
                <h3 className="text-foreground mb-4 pixel-14 flex items-center">
                  <Brain className="mr-2" size={20} />
                  WYSZUKIWANIE SEMANTYCZNE
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={semQuery}
                    onChange={(e) => setSemQuery(e.target.value)}
                    placeholder="Wpisz zapytanie..."
                    className="w-full px-4 py-3 bg-input-background text-foreground border-4 border-border focus:border-primary focus:outline-none mono-font"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-foreground mb-1 pixel-8">Top K</label>
                      <input
                        type="number"
                        value={semTopK}
                        onChange={(e) => setSemTopK(Number(e.target.value))}
                        min={1} max={50}
                        className="w-full px-2 py-2 bg-input-background text-foreground border-2 border-border focus:border-primary focus:outline-none mono-font"
                        style={{ fontSize: '11px' }}
                      />
                    </div>
                    <div>
                      <label className="block text-foreground mb-1 pixel-8">Próg (threshold)</label>
                      <input
                        type="number"
                        value={semThreshold}
                        onChange={(e) => setSemThreshold(Number(e.target.value))}
                        min={0} max={1} step={0.05}
                        className="w-full px-2 py-2 bg-input-background text-foreground border-2 border-border focus:border-primary focus:outline-none mono-font"
                        style={{ fontSize: '11px' }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!semQuery.trim() || !selectedProject) return;
                      setSemLoading(true);
                      setSemError('');
                      setSemResults([]);
                      setSemModelName('');
                      try {
                        const res = await fetch(`/api/public/projects/${selectedProject.id}/semantic-search`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ query: semQuery, top_k: semTopK, threshold: semThreshold }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setSemResults(data.results);
                          setSemModelName(data.model_name);
                        } else {
                          const err = await res.json().catch(() => null);
                          setSemError(err?.detail || 'Błąd wyszukiwania');
                        }
                      } catch { setSemError('Błąd wyszukiwania'); }
                      finally { setSemLoading(false); }
                    }}
                    disabled={semLoading || !semQuery.trim()}
                    className="w-full bg-primary text-primary-foreground px-4 py-3 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform pixel-10 shadow-retro-fg disabled:opacity-50"
                  >
                    <Search size={14} className={`inline mr-2 ${semLoading ? 'animate-pulse' : ''}`} />
                    {semLoading ? 'SZUKANIE...' : 'SZUKAJ SEMANTYCZNIE'}
                  </button>
                </div>

                {semError && (
                  <div className="bg-destructive/20 border-2 border-destructive p-3 mt-3">
                    <p className="text-destructive pixel-8">{semError}</p>
                  </div>
                )}

                {!semLoading && semResults.length === 0 && semQuery && !semError && semModelName && (
                  <p className="text-muted-foreground pixel-10 mt-3">Brak wyników dla tego zapytania.</p>
                )}

                {semResults.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-muted-foreground pixel-8">
                      Znaleziono: {semResults.length} {semModelName && `| model: ${semModelName}`}
                    </p>
                    {semResults.map((r, i) => (
                      <div key={i} className="bg-background border-2 border-border p-4 card-panel-sm">
                        <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                          <span className="text-primary pixel-10">
                            {r.document_name} — chunk #{r.chunk_index}
                          </span>
                          <span className="text-accent-foreground pixel-8 bg-accent px-2 py-0.5 border border-border">
                            {(r.score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <pre className="text-foreground mono-font whitespace-pre-wrap text-sm leading-relaxed">{r.chunk_content}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Documents Section (read-only) */}
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
                          <button
                            onClick={async () => {
                              setChunkedDoc(doc);
                              setLoadingChunks(true);
                              try {
                                const res = await fetch(`/api/documents/${doc.public_id}/chunks`);
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

      {/* Chunks Modal (read-only — no rechunk/embed controls) */}
      {chunkedDoc && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
          onClick={() => { setChunkedDoc(null); setChunks([]); }}
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
                onClick={() => { setChunkedDoc(null); setChunks([]); }}
                className="bg-destructive text-destructive-foreground px-3 py-1 border-2 border-foreground hover:translate-x-[1px] hover:translate-y-[1px] transition-transform pixel-10"
              >
                ZAMKNIJ
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-background p-4">
              {loadingChunks ? (
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
