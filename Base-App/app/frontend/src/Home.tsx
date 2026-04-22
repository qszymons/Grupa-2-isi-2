import { useState, useEffect } from 'react';
import './App.css'

interface Project {
    id: number;
    name: string;
    data: string;
    user_id: string;
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
        </div>
    );
}

function Home() {
    const [searchTerm, setSearchTerm] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            const response = await fetch(`/api/project/search?name=${encodeURIComponent(searchTerm)}`);
            if (response.ok) {
                const data = await response.json();
                setProjects(data);
                setHasSearched(true);
            }
        } catch (error) {
            console.error("Failed to search projects:", error);
        }
    }

    return (
        <div className="container home-container">
            <h2>Wyszukaj projekty innych</h2>

            <form onSubmit={handleSearch} className="search-form">
                <input
                    type="text"
                    placeholder="Wpisz nazwę projektu..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="login-input search-input"
                />
                <button type="submit" className="login-button search-btn">Szukaj</button>
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
