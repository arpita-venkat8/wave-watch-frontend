import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

import "./App.css";

const client = generateClient<Schema>();

function App() {
  const [todos, setTodos] = useState<
    Array<Schema["Todo"]["type"]>
  >([]);

  useEffect(() => {
    const sub = client.models.Todo.observeQuery().subscribe({
      next: (data) => {
        setTodos([...data.items]);
      },
    });

    return () => sub.unsubscribe();
  }, []);

  async function createTodo() {
    const content = window.prompt(
      "Enter coastal hazard or observation:"
    );

    if (!content || !content.trim()) {
      return;
    }

    await client.models.Todo.create({
      content: content.trim(),
    });
  }

  return (
    <main>
      {/* Header */}
      <section className="hero">
        <div className="badge">
          🌊 WAVE WATCH
        </div>

        <h1>
          Coastal Hazard
          <br />
          Monitoring System
        </h1>

        <p className="subtitle">
          Report, monitor and manage coastal hazards
          with real-time cloud technology.
        </p>

        <button onClick={createTodo}>
          + Report a Hazard
        </button>
      </section>

      {/* Dashboard */}
      <section className="dashboard">
        <div className="section-header">
          <div>
            <h2>Recent Reports</h2>
            <p>
              Live coastal hazard observations
            </p>
          </div>

          <div className="status">
            <span className="status-dot"></span>
            Live
          </div>
        </div>

        {todos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌊</div>

            <h3>No reports yet</h3>

            <p>
              Be the first to report a coastal
              hazard or observation.
            </p>

            <button onClick={createTodo}>
              + Create First Report
            </button>
          </div>
        ) : (
          <ul>
            {todos.map((todo) => (
              <li key={todo.id}>
                <div className="hazard-icon">
                  ⚠️
                </div>

                <div className="hazard-content">
                  <h3>{todo.content}</h3>

                  <span>
                    Coastal observation
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Information cards */}
      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">📍</div>
          <h3>Location Based</h3>
          <p>
            Track coastal hazards using
            location-aware monitoring.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Real-Time Reports</h3>
          <p>
            Receive and manage hazard
            observations in real time.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">☁️</div>
          <h3>AWS Powered</h3>
          <p>
            Built using scalable AWS cloud
            services and Amplify.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <p>
          🌊 <strong>Wave Watch</strong>
          {" "}• Coastal Hazard Monitoring
        </p>

        <span>
          Powered by AWS Amplify
        </span>
      </footer>
    </main>
  );
}

export default App;
