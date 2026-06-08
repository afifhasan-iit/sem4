"use client";
import CoursePage from "../../components/CoursePage";

const topics = [];

export default function Page() {
  return <CoursePage course={{ id: 'srs', name: 'SRS', topics }} />;
}
