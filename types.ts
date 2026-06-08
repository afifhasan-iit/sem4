import type { ReactNode } from "react";

export type Example = {
  title?: string;
  code?: string;
};

export type Topic = {
  id: string;
  name: string;
  category?: string;
  component?: ReactNode;
  content?: {
    intent?: string;
    analogy?: string;
    explanation?: string;
    examples?: Example[];
  };
};

export type Course = {
  id: string;
  name: string;
  topics: Topic[];
};
