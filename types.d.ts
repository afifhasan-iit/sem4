export type Example = {
  title?: string;
  code?: string;
};

export type Topic = {
  id: string;
  name: string;
  category?: string;
  component?: any;
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
