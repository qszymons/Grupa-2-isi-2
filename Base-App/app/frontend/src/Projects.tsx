import { useState, useEffect } from 'react';
import { authFetch } from './utils/authFetch';
import './App.css';

interface Tag {
    id: number;
    name: string;
}

interface Project {
    id: number;
    name: string;
    data: string;
    user_id: string;
    tags?: Tag[];
}

function Projects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [user, setUser] = useState<any>(null);
    const [name, setName] = useState('');
    const [data, setData] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);

    const [newTagName, setNewTagName] = useState('');

    const formatError = (data: any): string => {
        if (!data || !data.detail) return '';
        if (typeof data.detail === 'string') return data.detail;
        if (Array.isArray(data.detail)) {
            return data.detail
                .map((err: any) => err.msg || JSON.stringify(err))
                .join('\n');
        }
        return JSON.stringify(data.detail);
    };

    // Tags and selected tags for form
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

    // Search filters
    const [searchName, setSearchName] = useState('');
    const [searchTagIds, setSearchTagIds] = useState<number[]>([]);
    const [tagMatch, setTagMatch] = useState<'any' | 'all'>('any');

    useEffect(() => {
        const fetchUserAndProjects = async () => {
            try {
                const userRes = await authFetch('/api/me');
                if (userRes.ok) {
                    const userData = await userRes.json();
                    setUser(userData);

                    if (userData.id) {
                        const projRes = await authFetch(`/api/project/user/${userData.id}`);
                        if (projRes.ok) {
                            const projData = await projRes.json();
                            setProjects(projData);
                        }
                    }
                }

                const tagRes = await authFetch('/api/tag');
                if (tagRes.ok) {
                    const tagData = await tagRes.json();
                    setAllTags(tagData);
                }
            } catch (error) {
                console.error('Nie udalo sie pobrac danych', error);
            }
        };
        fetchUserAndProjects();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let projectId = editingId;
            let updatedProject = null;

            if (editingId) {
                const response = await authFetch(`/api/project/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, data })
                });
                if (response.ok) {
                    updatedProject = await response.json();
                } else {
                    window.alert('Błąd aktualizacji projektu');
                    return;
                }
            } else {
                const response = await authFetch('/api/project', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, data })
                });
                if (response.ok) {
                    updatedProject = await response.json();
                    projectId = updatedProject.id;
                } else {
                    const err = await response.json();
                    window.alert(formatError(err) || 'Błąd dodawania projektu');
                    return;
                }
            }

            if (projectId && updatedProject) {
                const tagRes = await authFetch(`/api/project/${projectId}/tags`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(selectedTagIds)
                });

                if (tagRes.ok) {
                    const savedTags = await tagRes.json();
                    updatedProject.tags = savedTags;
                }

                if (editingId) {
                    setProjects(projects.map(p => p.id === editingId ? updatedProject : p));
                    setEditingId(null);
                } else {
                    setProjects([...projects, updatedProject]);
                }

                setName('');
                setData('');
                setSelectedTagIds([]);
            }
        } catch (error) {
            window.alert('Wystąpił błąd serwera.');
        }
    };

    const handleEdit = (p: Project) => {
        setEditingId(p.id);
        setName(p.name);
        setData(p.data);
        setSelectedTagIds(p.tags ? p.tags.map(t => t.id) : []);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten projekt?')) return;
        try {
            const response = await authFetch(`/api/project/${id}`, {
                method: 'DELETE'
            });
            if (response.ok || response.status === 204) {
                setProjects(projects.filter(p => p.id !== id));
            } else {
                window.alert('Błąd usuwania projektu');
            }
        } catch (error) {
            window.alert('Wystąpił błąd serwera.');
        }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        try {
            const response = await authFetch('/api/tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTagName.trim() })
            });
            if (response.ok) {
                const newTag = await response.json();
                // Check if tag already exists in allTags to avoid duplicates
                if (!allTags.find(t => t.id === newTag.id)) {
                    setAllTags([...allTags, newTag]);
                }
                if (!selectedTagIds.includes(newTag.id)) {
                    setSelectedTagIds([...selectedTagIds, newTag.id]);
                }
                setNewTagName('');
            } else {
                const err = await response.json();
                window.alert(formatError(err) || 'Błąd tworzenia tagu');
            }
        } catch (error) {
            window.alert('Wystąpił błąd serwera.');
        }
    };

    const handleDeleteTag = async (id: number) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten tag? Zostanie on również odpięty od wszystkich projektów.')) return;
        try {
            const response = await authFetch(`/api/tag/${id}`, {
                method: 'DELETE'
            });
            if (response.ok || response.status === 204) {
                setAllTags(allTags.filter(t => t.id !== id));
                setSelectedTagIds(selectedTagIds.filter(tId => tId !== id));
                setSearchTagIds(searchTagIds.filter(tId => tId !== id));

                // Odśwież projekty, aby usunięty tag zniknął z listy na karcie projektów
                if (user?.id) {
                    const projRes = await authFetch(`/api/project/user/${user.id}`);
                    if (projRes.ok) {
                        const projData = await projRes.json();
                        setProjects(projData);
                    }
                }
            } else {
                window.alert('Błąd usuwania tagu');
            }
        } catch (error) {
            window.alert('Wystąpił błąd serwera.');
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!searchName && searchTagIds.length === 0) {
                if (user?.id) {
                    const projRes = await authFetch(`/api/project/user/${user.id}`);
                    if (projRes.ok) {
                        const projData = await projRes.json();
                        setProjects(projData);
                    }
                }
                return;
            }

            const params = new URLSearchParams();
            if (searchName) params.append('name', searchName);
            params.append('tag_match', tagMatch);

            searchTagIds.forEach(tagId => {
                const t = allTags.find(tag => tag.id === tagId);
                if (t) params.append('tags', t.name);
            });

            const response = await authFetch(`/api/project/search/tags?${params.toString()}`);
            if (response.ok) {
                const result = await response.json();
                setProjects(result);
            }
        } catch (error) {
            console.error('Nie udało się wyszukać projektów', error);
        }
    };

    const handleResetSearch = async () => {
        setSearchName('');
        setSearchTagIds([]);
        if (user?.id) {
            const projRes = await authFetch(`/api/project/user/${user.id}`);
            if (projRes.ok) {
                const projData = await projRes.json();
                setProjects(projData);
            }
        }
    };

    const toggleTagSelection = (id: number, type: 'form' | 'search') => {
        if (type === 'form') {
            setSelectedTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
        } else {
            setSearchTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
        }
    };

    return (
        <div className="projects-page-wrapper">
            {/* Box 1: Tworzenie / Edycja */}
            <div className="login-container project-create-box">
                <h2>{editingId ? 'Edytuj projekt' : 'Nowy projekt'}</h2>

                <form onSubmit={handleSave} className="project-form">
                    <input
                        type="text"
                        placeholder="Nazwa projektu (3-80 znaków)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        minLength={3}
                        maxLength={80}
                        className="login-input"
                    />
                    <textarea
                        placeholder="Dane"
                        value={data}
                        onChange={e => setData(e.target.value)}
                        required
                        className="login-input project-textarea"
                    />

                    <div className="tag-selection-container">
                        <label>Przypisz tagi:</label>
                        {allTags.length > 0 && (
                            <div className="tags-checkbox-group">
                                {allTags.map(tag => (
                                    <div key={tag.id} className="tag-checkbox-wrapper">
                                        <label className="tag-checkbox-label" style={{ margin: 0 }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedTagIds.includes(tag.id)}
                                                onChange={() => toggleTagSelection(tag.id, 'form')}
                                            />
                                            {tag.name}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteTag(tag.id)}
                                            className="logout-btn tag-delete-btn"
                                            title="Usuń tag"
                                        >
                                            X
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="create-tag-container">
                            <input
                                type="text"
                                placeholder="Nowy tag (1-64 znaków)"
                                value={newTagName}
                                onChange={e => setNewTagName(e.target.value)}
                                className="login-input create-tag-input"
                            />
                            <button type="button" onClick={handleCreateTag} className="login-button create-tag-btn">
                                Stwórz tag
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-button">
                        {editingId ? 'Zapisz zmiany' : 'Dodaj projekt'}
                    </button>
                    {editingId && (
                        <button type="button" className="logout-btn" onClick={() => { setEditingId(null); setName(''); setData(''); setSelectedTagIds([]); }}>
                            Anuluj edycję
                        </button>
                    )}
                </form>
            </div>

            {/* Box 2: Przeglądanie i Wyszukiwanie */}
            <div className="login-container project-view-box">
                <form onSubmit={handleSearch} className="search-form vertical-search-form">
                    <h2 className="projects-search-title">Szukaj projektów</h2>
                    <input
                        type="text"
                        placeholder="Nazwa projektu"
                        value={searchName}
                        onChange={e => setSearchName(e.target.value)}
                        className="login-input"
                    />

                    {allTags.length > 0 && (
                        <div className="tag-selection-container">
                            <label className="tag-filter-label">Filtruj po tagach:</label>
                            <div className="tags-checkbox-group">
                                {allTags.map(tag => (
                                    <label key={tag.id} className="tag-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={searchTagIds.includes(tag.id)}
                                            onChange={() => toggleTagSelection(tag.id, 'search')}
                                        />
                                        {tag.name}
                                    </label>
                                ))}
                            </div>
                            {searchTagIds.length > 1 && (
                                <div className="tag-match-selector">
                                    <label>
                                        <input type="radio" value="any" checked={tagMatch === 'any'} onChange={() => setTagMatch('any')} />
                                        Musi zawierać co najmniej jeden z wybranych
                                    </label>
                                    <label>
                                        <input type="radio" value="all" checked={tagMatch === 'all'} onChange={() => setTagMatch('all')} />
                                        Musi zawierać wszystkie z wybranych
                                    </label>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="search-actions-container">
                        <button type="submit" className="login-button project-action-btn">Szukaj</button>
                        <button type="button" onClick={handleResetSearch} className="logout-btn project-action-btn danger-action-btn">Reset</button>
                    </div>
                </form>

                <div className="project-list">
                    {projects.map(p => (
                        <div key={p.id} className="project-card">
                            <h3>{p.name}</h3>
                            <p>{p.data}</p>
                            {p.tags && p.tags.length > 0 && (
                                <div className="project-tags">
                                    {p.tags.map(tag => (
                                        <span key={tag.id} className="tag-badge">{tag.name}</span>
                                    ))}
                                </div>
                            )}
                            <div className="project-actions">
                                <button onClick={() => handleEdit(p)} className="login-button project-action-btn">Edytuj</button>
                                <button onClick={() => handleDelete(p.id)} className="logout-btn project-action-btn danger-action-btn">Usuń</button>
                            </div>
                        </div>
                    ))}
                    {projects.length === 0 && <p>Brak projektów.</p>}
                </div>
            </div>
        </div>
    );
}

export default Projects;
