import { useState, useEffect } from 'react';
import './App.css'

interface Project {
    id: number;
    name: string;
    data: string;
    user_id: string;
    tags?: Tag[];
}

interface Tag {
    id: number;
    name: string;
}

interface ProjectCardProps {
    project: Project;
}

function ProjectCard({ project }: ProjectCardProps) {
    const [username, setUsername] = useState('Ładowanie...');
    const [hasImage, setHasImage] = useState(false);

    useEffect(() => {
        fetch(`/api/user/${project.user_id}/public`)
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('N/A');
            })
            .then(data => {
                setUsername(data.username);
                setHasImage(data.has_image);
            })
            .catch(() => setUsername('Nieznany'));
    }, [project.user_id]);

    return (
        <div className="project-card">
            <div className="project-author-header">
                <div className="author-avatar-wrapper" style={{ border: '2px solid #555' }}>
                    {hasImage ? (
                        <img
                            src={`/api/avatar/${project.user_id}`}
                            alt="Avatar"
                            className="author-avatar-img"
                        />
                    ) : (
                        <span className="author-avatar-initial">
                            {username !== 'Ładowanie...' && username !== 'Nieznany' ? username.charAt(0).toUpperCase() : '?'}
                        </span>
                    )}
                </div>
                <span className="project-author">{username}</span>
            </div>
            <h3>{project.name}</h3>
            <p>{project.data}</p>
            {project.tags && project.tags.length > 0 && (
                <div className="project-tags">
                    {project.tags.map((tag: Tag) => (
                        <span key={tag.id} className="tag-badge">{tag.name}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

function Home() {
    const [searchTerm, setSearchTerm] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [searchTagIds, setSearchTagIds] = useState<number[]>([]);
    const [tagMatch, setTagMatch] = useState<'any' | 'all'>('any');

    useEffect(() => {
        const fetchTags = async () => {
            try {
                const res = await fetch('/api/tag');
                if (res.ok) {
                    const data = await res.json();
                    setAllTags(data);
                }
            } catch (error) {
                console.error("Failed to fetch tags:", error);
            }
        };
        fetchTags();
    }, []);

    const toggleTagSelection = (id: number) => {
        setSearchTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('name', searchTerm);
            params.append('tag_match', tagMatch);

            searchTagIds.forEach(tagId => {
                const t = allTags.find(tag => tag.id === tagId);
                if (t) params.append('tags', t.name);
            });

            const response = await fetch(`/api/project/search/tags?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setProjects(data);
                setHasSearched(true);
            }
        } catch (error) {
            console.error("Nie udało się wyszukać projektów:", error);
        }
    }

    return (
        <div className="container home-container">
            <h2>Wyszukaj projekty innych</h2>

            <form onSubmit={handleSearch} className="search-form" style={{ flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Wpisz nazwę projektu..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="login-input search-input"
                    />
                    <button type="submit" className="login-button search-btn">Szukaj</button>
                </div>

                {allTags.length > 0 && (
                    <div className="tag-selection-container" style={{ width: '100%', maxWidth: '600px' }}>
                        <label>Filtruj po tagach:</label>
                        <div className="tags-checkbox-group" style={{ justifyContent: 'center' }}>
                            {allTags.map(tag => (
                                <label key={tag.id} className="tag-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={searchTagIds.includes(tag.id)}
                                        onChange={() => toggleTagSelection(tag.id)}
                                    />
                                    {tag.name}
                                </label>
                            ))}
                        </div>
                        {searchTagIds.length > 1 && (
                            <div className="tag-match-selector" style={{ justifyContent: 'center' }}>
                                <label>
                                    <input type="radio" value="any" checked={tagMatch === 'any'} onChange={() => setTagMatch('any')} />
                                    Projekt musi zawierać co najmniej jeden z wybranych tagów
                                </label>
                                <label>
                                    <input type="radio" value="all" checked={tagMatch === 'all'} onChange={() => setTagMatch('all')} />
                                    Projekt musi zawierać wszystkie z wybranych tagów
                                </label>
                            </div>
                        )}
                    </div>
                )}
            </form>

            {hasSearched && (
                <div className="project-list">
                    {projects.length > 0 ? (
                        projects.map(p => <ProjectCard key={p.id} project={p} />)
                    ) : (
                        <p>Nie odnaleziono projektów spełniających to kryterium.</p>
                    )}
                </div>
            )}

            {!hasSearched && (
                <p>Wpisz szukaną frazę lub zostaw pole puste, aby wyszukać wszystkie projekty.</p>
            )}
        </div>
    )
}

export default Home
