import { useState, useEffect } from "react";
import { Plus, FileText, Upload, Edit, Tag as TagIcon, X, User as UserIcon, Search } from "lucide-react";
import { authFetch } from "../../utils/authFetch";
import type { Tag, Project, User, ProjectDocument } from "../../types";

const parseErrors = (data: any): { global: string, fields: Record<string, string> } => {
  const result = { global: "", fields: {} as Record<string, string> };

  if (!data?.detail) {
    result.global = "Błąd serwera";
    return result;
  }

  if (typeof data.detail === 'string') {
    const detailLower = data.detail.toLowerCase();
    if (detailLower.includes('projekt o takiej nazwie') || detailLower.includes('identycznej nazwie')) {
      result.fields['name'] = data.detail;
    } else if (detailLower.includes('tag')) {
      result.fields['tag_name'] = data.detail;
    } else {
      result.global = data.detail;
    }
    return result;
  }

  if (Array.isArray(data.detail)) {
    data.detail.forEach((err: any) => {
      const field = err.loc?.[1];
      let msg = err.msg || "Błąd walidacji";

      if (field && typeof field === 'string') {
        result.fields[field] = msg;
      } else {
        result.global += msg + " ";
      }
    });
    return result;
  }

  result.global = JSON.stringify(data.detail);
  return result;
};

export function Projects() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectData, setNewProjectData] = useState("");
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
        await Promise.all(uploadPromises);
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

  const handleDeleteProject = async (id: number) => {
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
    <div className="max-w-6xl mx-auto px-4 py-12">
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

      {/* Tag Management Section */}
      <div className="mb-12 bg-card border-4 border-border p-6 card-panel">
        <h2 className="text-foreground mb-4 pixel-12 leading-tight">
          <TagIcon size={14} className="inline mr-2" />
          ZARZĄDZANIE TAGAMI
        </h2>

        {/* Create New Tag */}
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

        {/* Available Tags */}
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => (
            <div
              key={tag.id}
              className="bg-accent text-accent-foreground px-3 py-2 border-2 border-border flex items-center gap-2"
              style={{ maxWidth: '100%' }}
            >
              <span className="pixel-10 text-wrap-anywhere">
                {tag.name}
              </span>
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

      {/* Search and Filter Section */}
      <div className="mb-12 bg-card border-4 border-border p-6 card-panel">
        <h2 className="text-foreground mb-4 pixel-12 leading-tight">
          SZUKAJ I FILTRUJ
        </h2>

        {/* Search Input */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj projektów po nazwie lub treści..."
          className="w-full px-4 py-3 mb-4 bg-input-background text-foreground border-4 border-border focus:border-primary focus:outline-none mono-font"
        />

        {/* Tag Filters */}
        <div>
          <p className="text-foreground mb-2 pixel-8">
            Filtruj po tagach:
          </p>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleFilterTag(tag.id)}
                className={`px-3 py-2 border-2 transition-all text-wrap-anywhere pixel-10 ${filterTags.includes(tag.id)
                  ? 'bg-primary text-primary-foreground border-foreground'
                  : 'bg-secondary text-secondary-foreground border-border hover:border-primary'
                  }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
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
                        <a
                          href={`/api/documents/${doc.public_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-primary text-primary-foreground p-2 border-2 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform shadow-retro-fg"
                          title="Pokaż dokument (JSON)"
                        >
                          <Search size={16} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
