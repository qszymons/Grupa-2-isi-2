import { useState, useEffect } from "react";
import { Plus, FileText, Upload, Edit, Tag as TagIcon, X, User as UserIcon, Search, Scissors, RefreshCw, Globe, Lock, Brain } from "lucide-react";
import { authFetch } from "../../utils/authFetch";
import { parseErrors } from "../../utils/parseErrors";
import type { Tag, Project, User, ProjectDocument, Chunk, SemanticSearchResult } from "../../types";

export function Projects() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectData, setNewProjectData] = useState("");
  const [projectIsPublic, setProjectIsPublic] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTags, setFilterTags] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [existingDocuments, setExistingDocuments] = useState<ProjectDocument[]>([]);
  const [selectedProjectView, setSelectedProjectView] = useState<Project | null>(null);
  const [viewDocuments, setViewDocuments] = useState<ProjectDocument[]>([]);
  const [chunkedDoc, setChunkedDoc] = useState<ProjectDocument | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [rechunkStrategy, setRechunkStrategy] = useState("length");
  const [rechunkSize, setRechunkSize] = useState(150);
  const [rechunkOverlap, setRechunkOverlap] = useState(0);
  const [rechunking, setRechunking] = useState(false);
  const [embedding, setEmbedding] = useState(false);
  // Semantic search state
  const [semQuery, setSemQuery] = useState("");
  const [semTopK, setSemTopK] = useState(10);
  const [semThreshold, setSemThreshold] = useState(0.3);
  const [semResults, setSemResults] = useState<SemanticSearchResult[]>([]);
  const [semLoading, setSemLoading] = useState(false);
  const [semError, setSemError] = useState("");
  const [semModelName, setSemModelName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user info
        const userResponse = await authFetch('/api/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);

          // Fetch user's projects
          const projectsResponse = await authFetch(`/api/project/user/${userData.id}`);
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            setProjects(projectsData);
          }
        }

        // Fetch all tags
        const tagsResponse = await fetch('/api/tag');
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          setAllTags(tagsData);
        }
      } catch (err) {
        setError('Błąd ładowania danych');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchDocumentsForView = async () => {
      if (!selectedProjectView) {
        setViewDocuments([]);
        return;
      }
      try {
        const response = await fetch(`/api/project/${selectedProjectView.id}/documents`, {
          credentials: 'include'
        });
        if (response.ok) {
          setViewDocuments(await response.json());
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDocumentsForView();
  }, [selectedProjectView]);

  // Removed: fetchModels useEffect — embedding model comes from project

  const handleCreateOrUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!newProjectName.trim()) {
      setFieldErrors({ name: "Podaj nazwę projektu!" });
      return;
    }

    try {
      const projectData = {
        name: newProjectName,
        data: newProjectData,
        is_public: projectIsPublic,
      };

      let response;
      if (editingId) {
        // Update existing project
        response = await authFetch(`/api/project/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });
      } else {
        // Create new project
        response = await authFetch('/api/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        const parsed = parseErrors(data);
        if (parsed.global) setError(parsed.global);
        if (Object.keys(parsed.fields).length > 0) setFieldErrors(parsed.fields);
        return;
      }

      const savedProject = await response.json();

      // Set tags for the project
      await authFetch(`/api/project/${savedProject.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedTags),
      });

      // Handle document uploads in parallel
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(file => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('is_public', 'true');

          return authFetch(`/api/project/${savedProject.id}/documents`, {
            method: 'POST',
            body: formData,
          });
        });
        const results = await Promise.all(uploadPromises);
        const failedUploads: string[] = [];
        for (let i = 0; i < results.length; i++) {
          if (!results[i].ok) {
            try {
              const errData = await results[i].json();
              failedUploads.push(`${selectedFiles[i].name}: ${errData.detail || 'Błąd uploadu'}`);
            } catch {
              failedUploads.push(`${selectedFiles[i].name}: Błąd uploadu`);
            }
          }
        }
        if (failedUploads.length > 0) {
          setError(`Nie udało się przesłać: ${failedUploads.join('; ')}`);
        }
      }

      // Refresh projects list
      if (user) {
        const projectsResponse = await authFetch(`/api/project/user/${user.id}`);
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          setProjects(projectsData);
        }
      }

      // Reset form
      setNewProjectName("");
      setNewProjectData("");
      setProjectIsPublic(false);
      setSelectedFiles([]);
      setSelectedTags([]);
      setExistingDocuments([]);
      setShowCreateForm(false);
      setEditingId(null);
    } catch (err) {
      setError('Błąd zapisywania projektu');
    }
  };

  const handleEditProject = async (project: Project) => {
    setEditingId(project.id);
    setNewProjectName(project.name);
    setNewProjectData(project.data);
    setProjectIsPublic(project.is_public ?? false);
    setSelectedTags(project.tags?.map(t => t.id) || []);
    setShowCreateForm(true);
    setExistingDocuments([]);

    try {
      const docsRes = await fetch(`/api/project/${project.id}/documents`, { credentials: 'include' });
      if (docsRes.ok) {
        setExistingDocuments(await docsRes.json());
      }
    } catch (e) {
      console.error("Błąd pobierania dokumentów do edycji", e);
    }
  };

  const handleDeleteDocument = async (publicId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten dokument?")) return;
    try {
      const response = await authFetch(`/api/documents/${publicId}`, { method: 'DELETE' });
      if (response.ok || response.status === 204) {
        setExistingDocuments(prev => prev.filter(d => d.public_id !== publicId));
      } else {
        setError("Nie udało się usunąć dokumentu");
      }
    } catch (e) {
      setError("Błąd usuwania dokumentu");
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten projekt?")) {
      return;
    }

    try {
      const response = await authFetch(`/api/project/${id}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        setProjects(projects.filter(p => p.id !== id));
      } else {
        const data = await response.json();
        const parsed = parseErrors(data);
        if (parsed.global) setError(parsed.global);
        if (Object.keys(parsed.fields).length > 0) setFieldErrors(parsed.fields);
      }
    } catch (err) {
      setError('Błąd usuwania projektu');
    }
  };

  const handleCreateTag = async () => {
    setError("");
    setFieldErrors({});

    if (!newTagName.trim()) {
      setFieldErrors({ tag_name: "Podaj nazwę tagu!" });
      return;
    }

    try {
      const response = await authFetch('/api/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        const parsed = parseErrors(data);
        if (parsed.global) setError(parsed.global);
        if (Object.keys(parsed.fields).length > 0) {
          if (parsed.fields.name) parsed.fields.tag_name = parsed.fields.name;
          setFieldErrors(parsed.fields);
        }
        return;
      }

      const newTag = await response.json();
      setAllTags([...allTags, newTag]);
      setNewTagName("");
    } catch (err) {
      setError('Błąd tworzenia tagu');
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!confirm("Czy na pewno chcesz usunąć ten tag? Zostanie usunięty ze wszystkich projektów.")) {
      return;
    }

    try {
      const response = await authFetch(`/api/tag/${tagId}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        setAllTags(allTags.filter(t => t.id !== tagId));
        setFilterTags(filterTags.filter(tid => tid !== tagId));

        // Refresh projects list
        if (user) {
          const projectsResponse = await authFetch(`/api/project/user/${user.id}`);
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            setProjects(projectsData);
          }
        }
      } else {
        const data = await response.json();
        const parsed = parseErrors(data);
        if (parsed.global) setError(parsed.global);
        if (Object.keys(parsed.fields).length > 0) setFieldErrors(parsed.fields);
      }
    } catch (err) {
      setError('Błąd usuwania tagu');
    }
  };

  const toggleProjectTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const toggleFilterTag = (tagId: number) => {
    setFilterTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFiles = (files: File[]) => {
    const allowedTypes = [".pdf", ".txt"];
    const validFiles = files.filter(file => {
      const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      return allowedTypes.includes(fileExt);
    });

    setFieldErrors(prev => {
      const next = { ...prev };
      delete next.files;
      return next;
    });

    if (validFiles.length !== files.length) {
      setFieldErrors(prev => ({ ...prev, files: "Dozwolone formaty: .pdf, .txt" }));
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);

      // Auto-fill content from the first txt file if newProjectData is empty
      const firstTxt = validFiles.find(f => f.name.toLowerCase().endsWith('.txt'));
      if (firstTxt && !newProjectData) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setNewProjectData(event.target?.result as string);
        };
        reader.readAsText(firstTxt);
      }
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchQuery.trim() ||
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.data.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags = filterTags.length === 0 ||
      filterTags.every(tagId => project.tags?.some(t => t.id === tagId));

    return matchesSearch && matchesTags;
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <p className="text-foreground pixel-12">
          ŁADOWANIE...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-foreground mb-12 text-center pixel-20 leading-relaxed">
        MOJE PROJEKTY
      </h1>

      {error && (
        <div className="bg-destructive/20 border-4 border-destructive p-4 mb-8">
          <p className="text-destructive pixel-8 leading-relaxed">
            {error}
          </p>
          <button
            onClick={() => setError("")}
            className="mt-2 text-foreground underline pixel-8"
          >
            Zamknij
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* LEFT COLUMN */}
        <div>

          {/* Tag Management Section */}
          <div className="mb-8 bg-card border-4 border-border p-6 card-panel">
            <h2 className="text-foreground mb-4 pixel-12 leading-tight">
              <TagIcon size={14} className="inline mr-2" />
              ZARZĄDZANIE TAGAMI
            </h2>
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Nazwa nowego tagu..."
                  className={`w-full px-4 py-2 bg-input-background text-foreground border-4 focus:outline-none mono-font ${fieldErrors.tag_name ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'}`}
                  style={{ fontSize: '12px' }}
                />
                {fieldErrors.tag_name && (
                  <p className="text-destructive mt-1 pixel-8">{fieldErrors.tag_name}</p>
                )}
              </div>
              <button
                onClick={handleCreateTag}
                className="bg-primary text-primary-foreground px-4 py-2 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform pixel-10 shadow-retro-fg"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <div
                  key={tag.id}
                  className="bg-accent text-accent-foreground px-3 py-2 border-2 border-border flex items-center gap-2"
                >
                  <span className="pixel-10 text-wrap-anywhere">{tag.name}</span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-destructive hover:text-destructive-foreground flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Create New Project Section */}
          <div className="mb-12">
            {!showCreateForm ? (
              <button
                onClick={() => {
                  setShowCreateForm(true);
                  setEditingId(null);
                  setNewProjectName("");
                  setNewProjectData("");
                  setProjectIsPublic(false);
                  setSelectedTags([]);
                  setSelectedFiles([]);
                  setExistingDocuments([]);
                }}
                className="w-full bg-primary text-primary-foreground px-6 py-4 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform pixel-12 shadow-retro-fg"
              >
                <Plus size={20} className="inline mr-3" />
                UTWÓRZ NOWY PROJEKT
              </button>
            ) : (
              <div className="bg-card border-4 border-border p-8 card-panel">
                <h2 className="text-foreground mb-6 pixel-14 leading-tight">
                  {editingId ? "EDYTUJ PROJEKT" : "NOWY PROJEKT"}
                </h2>

                <form
                  onSubmit={handleCreateOrUpdateProject}
                  className="space-y-6"
                >
                  {/* Project Name */}
                  <div>
                    <label className="block text-foreground mb-2 pixel-10">
                      Nazwa projektu
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) =>
                        setNewProjectName(e.target.value)
                      }
                      placeholder="np. Dokumentacja systemu..."
                      required
                      className={`w-full px-4 py-3 bg-input-background text-foreground border-4 focus:outline-none mono-font ${fieldErrors.name ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'}`}
                    />
                    {fieldErrors.name && (
                      <p className="text-destructive mt-2 pixel-8">{fieldErrors.name}</p>
                    )}
                  </div>

                  {/* Manual Text Entry */}
                  <div>
                    <label className="block text-foreground mb-2 pixel-10">
                      <FileText size={14} className="inline mr-2" />
                      Treść projektu
                    </label>
                    <textarea
                      value={newProjectData}
                      onChange={(e) =>
                        setNewProjectData(e.target.value)
                      }
                      placeholder="Wpisz treść projektu..."
                      rows={8}
                      className={`w-full px-4 py-3 bg-input-background text-foreground border-4 focus:outline-none resize-y mono-font ${fieldErrors.data ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'}`}
                    />
                    {fieldErrors.data && (
                      <p className="text-destructive mt-2 pixel-8">{fieldErrors.data}</p>
                    )}
                  </div>

                  {/* File Upload / Drag & Drop */}
                  <div>
                    <label className="block text-foreground mb-2 pixel-10">
                      <Upload size={14} className="inline mr-2" />
                      Dokumenty (.txt, .pdf)
                    </label>

                    {existingDocuments.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <p className="text-foreground pixel-8">Obecne dokumenty w projekcie:</p>
                        {existingDocuments.map((doc) => (
                          <div key={doc.public_id} className="flex items-center justify-between bg-card border-2 border-border p-2">
                            <span className="text-primary pixel-8 truncate mr-2">{doc.name}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.public_id)}
                              className="text-destructive hover:text-destructive-foreground"
                              title="Usuń dokument z projektu"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div
                      className={`border-4 border-dashed p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary/10' : fieldErrors.files ? 'border-destructive bg-destructive/10' : 'border-border bg-input-background'
                        }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload size={32} className="mx-auto mb-4 text-muted-foreground" />
                      <p className="text-foreground pixel-10 mb-4 leading-relaxed">
                        Przeciągnij i upuść pliki tutaj lub
                      </p>
                      <label className="cursor-pointer bg-primary text-primary-foreground px-4 py-2 border-2 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform inline-block pixel-8 shadow-retro-fg">
                        WYBIERZ PLIKI
                        <input
                          type="file"
                          accept=".txt,.pdf"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-foreground pixel-8">Wybrane pliki:</p>
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-card border-2 border-border p-2">
                            <span className="text-primary pixel-8 truncate mr-2">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-destructive hover:text-destructive-foreground"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {fieldErrors.files && (
                      <p className="text-destructive mt-2 pixel-8">{fieldErrors.files}</p>
                    )}
                  </div>

                  {/* Tag Selection */}
                  <div>
                    <label className="block text-foreground mb-2 pixel-10">
                      <TagIcon size={14} className="inline mr-2" />
                      Wybierz tagi
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleProjectTag(tag.id)}
                          className={`px-3 py-2 border-2 transition-all text-wrap-anywhere pixel-10 ${selectedTags.includes(tag.id)
                            ? 'bg-primary text-primary-foreground border-foreground'
                            : 'bg-secondary text-secondary-foreground border-border hover:border-primary'
                            }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Public/Private Toggle */}
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={projectIsPublic}
                        onChange={(e) => setProjectIsPublic(e.target.checked)}
                        className="w-5 h-5 accent-primary"
                      />
                      <span className="text-foreground pixel-10 flex items-center gap-2">
                        {projectIsPublic ? <Globe size={14} /> : <Lock size={14} />}
                        {projectIsPublic ? 'Projekt publiczny' : 'Projekt prywatny'}
                      </span>
                    </label>
                    <p className="text-muted-foreground pixel-8 mt-1 ml-8">
                      {projectIsPublic
                        ? 'Projekt będzie widoczny w publicznym katalogu i dostępny do wyszukiwania.'
                        : 'Projekt będzie widoczny tylko dla Ciebie.'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-primary-foreground px-6 py-3 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform pixel-10 shadow-retro-fg"
                    >
                      {editingId ? "AKTUALIZUJ" : "ZAPISZ"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingId(null);
                        setNewProjectName("");
                        setNewProjectData("");
                        setProjectIsPublic(false);
                        setSelectedFiles([]);
                        setSelectedTags([]);
                        setExistingDocuments([]);
                      }}
                      className="flex-1 bg-muted text-muted-foreground px-6 py-3 border-4 border-border hover:border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-all pixel-10 shadow-retro"
                    >
                      ANULUJ
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

        </div>{/* end LEFT COLUMN */}

        {/* RIGHT COLUMN */}
        <div>

          {/* Search and Filter Section */}
          <div className="mb-8 bg-card border-4 border-border p-6 card-panel">
            <h2 className="text-foreground mb-4 pixel-12 leading-tight">
              SZUKAJ I FILTRUJ
            </h2>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj projektów po nazwie lub treści..."
              className="w-full px-4 py-3 mb-4 bg-input-background text-foreground border-4 border-border focus:border-primary focus:outline-none mono-font"
            />
            <div>
              <p className="text-foreground mb-2 pixel-8">Filtruj po tagach:</p>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleFilterTag(tag.id)}
                    className={`px-3 py-2 border-2 transition-all text-wrap-anywhere pixel-10 ${filterTags.includes(tag.id) ? 'bg-primary text-primary-foreground border-foreground' : 'bg-secondary text-secondary-foreground border-border hover:border-primary'}`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* My Projects List */}
          <div>
            <h2 className="text-foreground mb-6 pixel-14 leading-tight">
              LISTA PROJEKTÓW ({filteredProjects.length})
            </h2>

            {filteredProjects.length === 0 ? (
              <div className="bg-card border-4 border-border p-12 text-center card-panel">
                <p className="text-muted-foreground pixel-10 leading-relaxed">
                  {projects.length === 0
                    ? "Nie masz jeszcze żadnych projektów."
                    : "Brak projektów pasujących do kryteriów wyszukiwania."}
                  <br />
                  {projects.length === 0 && "Utwórz swój pierwszy projekt!"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-card border-4 border-border p-6 flex items-center justify-between hover:border-primary transition-colors cursor-pointer card-panel"
                    onClick={() => setSelectedProjectView(project)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground mb-2 pixel-12 leading-tight text-wrap-anywhere">
                        {project.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 border-2 pixel-8 ${project.is_public
                            ? 'bg-green-900/40 text-green-400 border-green-700'
                            : 'bg-yellow-900/40 text-yellow-400 border-yellow-700'
                          }`}>
                          {project.is_public ? <Globe size={10} /> : <Lock size={10} />}
                          {project.is_public ? 'PUBLICZNY' : 'PRYWATNY'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 border-2 border-border bg-accent/30 text-accent-foreground pixel-8">
                          <Brain size={10} />
                          {project.embedding_model_name}
                        </span>
                      </div>
                      <p className="text-muted-foreground mb-2 mono-14 leading-tight text-wrap-anywhere">
                        {project.data.substring(0, 150)}{project.data.length > 150 ? '...' : ''}
                      </p>

                      {/* Project Tags */}
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {project.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="bg-primary text-primary-foreground px-3 py-2 border-2 border-foreground pixel-10 text-wrap-anywhere"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditProject(project)}
                        className="bg-blue-600 text-white px-4 py-3 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform pixel-10 shadow-retro-fg"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() =>
                          handleDeleteProject(project.id)
                        }
                        className="bg-destructive text-destructive-foreground px-4 py-3 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform pixel-16 shadow-retro-fg"
                      >
                        X
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>{/* end RIGHT COLUMN */}

      </div>{/* end two-column grid */}

      {/* Project Detail Modal */}
      {selectedProjectView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setSelectedProjectView(null)}
        >
          <div
            className="bg-card border-4 border-border w-full max-w-3xl max-h-[85vh] overflow-y-auto relative shadow-retro-lg-fg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedProjectView(null)}
              className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform pixel-16 shadow-retro-fg"
            >
              X
            </button>

            <div className="p-8">
              {/* Header with avatar */}
              <div className="flex items-start gap-4 mb-6 pr-16">
                <div
                  className="w-16 h-16 flex-shrink-0 border-2 border-foreground flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {user?.image ? (
                    <img
                      src={`/api/avatar/${user.id}`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary-foreground">
                      <UserIcon size={28} />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-foreground mb-2 pixel-16 leading-tight text-wrap-anywhere">
                    {selectedProjectView.name}
                  </h2>
                  <p className="text-primary pixel-10">
                    @{user?.username}
                  </p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`inline-flex items-center gap-1 px-2 py-1 border-2 pixel-8 ${selectedProjectView.is_public
                    ? 'bg-green-900/40 text-green-400 border-green-700'
                    : 'bg-yellow-900/40 text-yellow-400 border-yellow-700'
                  }`}>
                  {selectedProjectView.is_public ? <Globe size={10} /> : <Lock size={10} />}
                  {selectedProjectView.is_public ? 'PUBLICZNY' : 'PRYWATNY'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 border-2 border-border bg-accent/30 text-accent-foreground pixel-8">
                  <Brain size={10} />
                  {selectedProjectView.embedding_model_name}
                </span>
              </div>

              {/* Tags */}
              {selectedProjectView.tags && selectedProjectView.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedProjectView.tags.map(tag => (
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
                  {selectedProjectView.data}
                </p>
              </div>

              {/* Semantic Search Section */}
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
                      if (!semQuery.trim() || !selectedProjectView) return;
                      setSemLoading(true);
                      setSemError('');
                      setSemResults([]);
                      setSemModelName('');
                      try {
                        const res = await authFetch(`/api/projects/${selectedProjectView.id}/semantic-search`, {
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

              {/* Attachments Section */}
              <div className="mt-8 border-t-4 border-border pt-8">
                <h3 className="text-foreground mb-4 pixel-14 flex items-center">
                  <FileText className="mr-2" size={20} />
                  DOKUMENTY ({viewDocuments.length})
                </h3>

                {viewDocuments.length === 0 ? (
                  <p className="text-muted-foreground pixel-10">
                    Brak dołączonych dokumentów.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {viewDocuments.map(doc => (
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
              <button
                onClick={async () => {
                  if (!chunkedDoc) return;
                  setRechunking(true);
                  try {
                    const res = await authFetch(`/api/documents/${chunkedDoc.public_id}/rechunk`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
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
                      setError(err?.detail || 'Błąd re-chunkowania');
                    }
                  } catch { setError('Błąd re-chunkowania'); }
                  finally { setRechunking(false); }
                }}
                disabled={rechunking}
                className="w-full bg-primary text-primary-foreground px-4 py-2 border-2 border-foreground hover:translate-x-[1px] hover:translate-y-[1px] transition-transform pixel-10 shadow-retro-fg disabled:opacity-50"
              >
                <RefreshCw size={14} className={`inline mr-2 ${rechunking ? 'animate-spin' : ''}`} />
                {rechunking ? 'PRZETWARZANIE...' : 'RE-CHUNK'}
              </button>

              {/* Embedding button — model comes from project */}
              <button
                onClick={async () => {
                  if (!chunkedDoc) return;
                  setEmbedding(true);
                  try {
                    const res = await authFetch(`/api/documents/${chunkedDoc.public_id}/embed`, {
                      method: 'POST',
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const taskId = data.task_id;
                      const poll = setInterval(async () => {
                        const s = await authFetch(`/api/embedding/task/${taskId}`);
                        if (s.ok) {
                          const info = await s.json();
                          if (info.status === 'done' || info.status === 'failed') {
                            clearInterval(poll);
                            setEmbedding(false);
                            if (info.status === 'failed') setError(info.error || 'Embedding failed');
                          }
                        }
                      }, 1500);
                    } else {
                      const err = await res.json().catch(() => null);
                      setError(err?.detail || 'Błąd embeddingu');
                      setEmbedding(false);
                    }
                  } catch { setError('Błąd embeddingu'); setEmbedding(false); }
                }}
                disabled={embedding}
                className="w-full mt-3 bg-accent text-accent-foreground px-4 py-2 border-2 border-foreground hover:translate-x-[1px] hover:translate-y-[1px] transition-transform pixel-10 shadow-retro-fg disabled:opacity-50"
              >
                <Brain size={14} className={`inline mr-2 ${embedding ? 'animate-pulse' : ''}`} />
                {embedding ? 'GENEROWANIE EMBEDDINGÓW...' : 'GENERUJ EMBEDDINGI'}
              </button>
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
