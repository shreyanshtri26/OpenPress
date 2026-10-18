// src/context/KanbanContext.tsx
import {
  createContext,
  useState,
  useContext,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react';

export interface Story {
  description: boolean;
  storyId: string;
  title: string;
  category: string;
  status: string;
  updatedAt: string;
  authorName?: string;
  assignedToName?: string[];
  authorId: string;
  assignedTo: string;
  section?: string;
  state: string;
  image: string;
  socialImage?: string;
  socialHeadline?: string;
  [key: string]: any;
}

interface KanbanContextType {
  stories: Story[];
  setStories: Dispatch<SetStateAction<Story[]>>;
}

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export const KanbanProvider = ({ children }: { children: ReactNode }) => {
  const [stories, setStories] = useState<Story[]>([]);

  const value = { stories, setStories };

  return (
    <KanbanContext.Provider value={value}>
      {children}
    </KanbanContext.Provider>
  );
};

export const useKanbanContext = () => {
  const context = useContext(KanbanContext);
  if (context === undefined) {
    throw new Error('useKanbanContext must be used within a KanbanProvider');
  }
  return context;
};