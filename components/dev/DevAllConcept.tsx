'use client';
import Link from "next/link";

const topics = [
  {
    id: "React",
    name: "React",
    desc: "A JavaScript library for building user interfaces",
  },
  {id: 'nextjs', name: 'Next.js', desc: 'A React framework for production'},
  {id: 'typescript', name: 'TypeScript', desc: 'A typed superset of JavaScript'},

];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <h1> Learn dev </h1>
      <p className="muted-text">Pick a topic to begin</p>

      <div className="course-grid">
        {topics.map((topic) => (
          <Link className="card course-card" key={topic.id} href={`./${topic.id}`}>
            <div>
              <h3>{topic.name}</h3>
              <p className="muted-text">{topic.desc}</p>
            </div> 
          </Link>
        ))}
      </div>

      <h3>ShortCuts</h3>
      <div className="bonus-link"> 
        <Link className="copy-btn" href="/shortcut/code-smells">
          View Code Smells 
        </Link>
        <Link className="copy-btn" href="/shortcut/design-patterns">
          View Design Patterns 
        </Link>
        <Link className="copy-btn" href="/shortcut/react">
          React
        </Link>
      </div>
    </div>
  );
}
