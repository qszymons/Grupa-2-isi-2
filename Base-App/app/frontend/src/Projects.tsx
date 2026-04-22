import { useState, useEffect } from 'react';
import { authFetch } from './utils/authFetch';
import './App.css';

interface Project {
    id: number;
    name: string;
    data: string;
    user_id: string;
}

function Projects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [, setUser] = useState<any>(null);
    const [name, setName] = useState('');
    const [data, setData] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);

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
            } catch (error) {
                console.error('Failed to fetch data', error);
            }
        };
        fetchUserAndProjects();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                const response = await authFetch(`/api/project/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, data })
                });
                if (response.ok) {
                    const updated = await response.json();
                    setProjects(projects.map(p => p.id === editingId ? updated : p));
                    setEditingId(null);
                    setName('');
                    setData('');
                } else {
                    window.alert('Błąd aktualizacji projektu');
                }
            } else {
                const response = await authFetch('/api/project', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, data })
                });
                if (response.ok) {
                    const added = await response.json();
                    setProjects([...projects, added]);
                    setName('');
                    setData('');
                } else {
                    const err = await response.json();
                    window.alert(err.detail || 'Błąd dodawania projektu');
                }
            }
        } catch (error) {
            window.alert('Wystąpił błąd serwera.');
        }
    };

    const handleEdit = (p: Project) => {
        setEditingId(p.id);
        setName(p.name);
        setData(p.data);
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

    return (
        <div className="login-container projects-container">
            <h2>Moje projekty</h2>

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
                <button type="submit" className="login-button">
                    {editingId ? 'Zapisz zmiany' : 'Dodaj projekt'}
                </button>
                {editingId && (
                    <button type="button" className="logout-btn" onClick={() => { setEditingId(null); setName(''); setData(''); }}>
                        Anuluj edycję
                    </button>
                )}
            </form>

            <div className="project-list">
                {projects.map(p => (
                    <div key={p.id} className="project-card">
                        <h3>{p.name}</h3>
                        <p>{p.data}</p>
                        <div className="project-actions">
                            <button onClick={() => handleEdit(p)} className="login-button project-action-btn">Edytuj</button>
                            <button onClick={() => handleDelete(p.id)} className="logout-btn project-action-btn" style={{backgroundColor: '#dc3545', color: 'white', border: 'none'}}>Usuń</button>
                        </div>
                    </div>
                ))}
                {projects.length === 0 && <p>Brak projektów.</p>}
            </div>
        </div>
    );
}

export default Projects;
