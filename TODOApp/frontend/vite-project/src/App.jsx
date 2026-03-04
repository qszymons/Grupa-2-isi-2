import { useState, useEffect } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/task/all`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTask = async () => {
    const trimmed = newTask.trim()
    if (!trimmed) return

    try {
      const response = await fetch(`${API_URL}/task/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })

      if (response.ok) {
        const created = await response.json()
        setTasks((prev) => [...prev, created])
        setNewTask('')
      }
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const deleteTask = async (id) => {
    try {
      const response = await fetch(`${API_URL}/task/${id}`, {
        method: 'DELETE',
      })

      if (response.ok || response.status === 204) {
        setTasks((prev) => prev.filter((t) => t.id !== id))
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      addTask()
    }
  }

  return (
    <div className="app-wrapper">
      <div className="todo-card">
        <div className="input-row">
          <input
            id="task-input"
            type="text"
            className="task-input"
            placeholder="Enter a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button id="add-btn" className="add-btn" onClick={addTask}>
            Add
          </button>
        </div>

        <div className="task-list">
          {loading ? (
            <p className="loading-text">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="empty-text">No tasks yet. Add one above!</p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="task-item" id={`task-${task.id}`}>
                <span className="task-name">{task.name}</span>
                <button
                  className="delete-btn"
                  id={`delete-${task.id}`}
                  onClick={() => deleteTask(task.id)}
                  title="Delete task"
                >
                  X
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default App
