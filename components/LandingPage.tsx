'use client';
import Link from "next/link";

const courses = [
  {
    id: "design-pattern",
    name: "Design Pattern",
    desc: "Reusable solutions for common design problems",
  },
  { id: "srs", name: "SRS", desc: "Software Requirement Specification topics" },
  { id: "dbms", name: "DBMS", desc: "Database management systems" },
  { id: "os", name: "Operating Systems", desc: "OS fundamentals and concepts" },
  { id: "business", name: "Business", desc: "Business and software processes" },
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <h1>Study Platform</h1>
      <p className="muted-text">Pick a course to begin</p>

      <div className="course-grid">
        {courses.map((course) => (
          <Link className="card course-card" key={course.id} href={`/${course.id}`}>
            <div>
              <h3>{course.name}</h3>
              <p className="muted-text">{course.desc}</p>
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
      </div>
    </div>
  );
}
