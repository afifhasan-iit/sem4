"use client";

import { useState } from "react";
import TopicContent from "./TopicContent";
import type { Course, Topic } from "../types";

type CoursePageProps = {
  course: Course;
};

export default function CoursePage({ course }: CoursePageProps) {
  const [activeTopic, setActiveTopic] = useState<Topic | null>(
    course.topics[0] ?? null
  );

  function showTopic(topic: Topic) {
    setActiveTopic(topic);
  }

  return (
    <div className="container">
      <aside className="sidebar">
        <h3 className="sidebar-title">{course.name}</h3>
        <div className="topic-list">
          {course.topics.length === 0 ? (
            <p className="muted-text">No topics yet.</p>
          ) : (
            course.topics.map((topic) => (
              <button
                className={
                  activeTopic?.id === topic.id
                    ? "topic-button active"
                    : "topic-button"
                }
                key={topic.id}
                onClick={() => showTopic(topic)}
              >
                <strong>{topic.name}</strong>
                {topic.category && <small>{topic.category}</small>}
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="main">
        {activeTopic ? (
          activeTopic.component ?? <TopicContent topic={activeTopic} /> //topicContent is the thing
        ) : (
          <div className="muted-text">Select a topic to view details.</div>
        )}
      </main>
    </div>
  );
}
