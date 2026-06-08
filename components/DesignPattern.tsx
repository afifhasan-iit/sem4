import CoursePage from "./CoursePage";
import DesignPatternsTopic from "./topics/DesignPatternsTopic";
import CodeSmellsTopic from "./topics/CodeSmellsTopic";

export default function DesignPatternsCourse() {
  const topics = [
    { id: 'design-patterns', name: 'Design Patterns', component: <DesignPatternsTopic /> },
    { id: 'code-smells', name: 'Code Smells', component: <CodeSmellsTopic /> },
    { id: 'more', name: 'More Topics', content: { intent: 'Additional topics will be added here.' } },
  ];

  return <CoursePage course={{ id: 'design-course', name: 'Design', topics }} />;
  
}
