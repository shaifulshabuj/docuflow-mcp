import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiFetch } from '../hooks/useApi';
import { DOCUFLOW_DATA } from '../data/mock';

export interface ProjectInfo {
  name: string;
  path: string;
  health: number;
  pages: number;
  sources: number;
  entities: number;
  specs: number;
  lastIngest: string;
  syncStatus: string;
}

interface ProjectContextValue {
  projectPath: string;
  setProjectPath: (p: string) => void;
  projectInfo: ProjectInfo;
  projects: ProjectInfo[];
  apiOnline: boolean;
}

const fallbackProject: ProjectInfo = {
  name: DOCUFLOW_DATA.project.name,
  path: '',
  health: DOCUFLOW_DATA.project.health,
  pages: DOCUFLOW_DATA.project.pages,
  sources: DOCUFLOW_DATA.project.sources,
  entities: DOCUFLOW_DATA.project.entities,
  specs: 0,
  lastIngest: DOCUFLOW_DATA.project.lastIngest,
  syncStatus: DOCUFLOW_DATA.project.syncStatus,
};

const ProjectContext = createContext<ProjectContextValue>({
  projectPath: '',
  setProjectPath: () => {},
  projectInfo: fallbackProject,
  projects: [],
  apiOnline: false,
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectPath, setProjectPath] = useState('');
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(fallbackProject);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [apiOnline, setApiOnline] = useState(false);

  // Check if API is online and load project list
  useEffect(() => {
    apiFetch<{ ok: boolean }>('/api/ping')
      .then(() => {
        setApiOnline(true);
        return apiFetch<ProjectInfo[]>('/api/projects');
      })
      .then(list => {
        setProjects(list);
        if (list.length > 0) {
          setProjectPath(p => p || list[0].path);
        }
      })
      .catch(() => setApiOnline(false));
  }, []);

  // Load project stats when path changes
  useEffect(() => {
    if (!projectPath || !apiOnline) return;
    apiFetch<ProjectInfo>(`/api/project?path=${encodeURIComponent(projectPath)}`)
      .then(setProjectInfo)
      .catch(() => {});
  }, [projectPath, apiOnline]);

  return (
    <ProjectContext.Provider value={{ projectPath, setProjectPath, projectInfo, projects, apiOnline }}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProject = () => useContext(ProjectContext);
