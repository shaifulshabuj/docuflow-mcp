import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
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

export interface AddResult {
  ok: boolean;
  error?: string;
}

interface ProjectContextValue {
  projectPath: string;
  setProjectPath: (p: string) => void;
  projectInfo: ProjectInfo;
  projects: ProjectInfo[];
  apiOnline: boolean;
  /** Add a project by its absolute path. Returns { ok: true } on success or { ok: false, error } if not found. */
  addProjectByPath: (absPath: string) => Promise<AddResult>;
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

const STORAGE_KEY = 'df-custom-paths';

function loadCustomPaths(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

function saveCustomPaths(paths: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
  } catch { /* storage unavailable */ }
}

const ProjectContext = createContext<ProjectContextValue>({
  projectPath: '',
  setProjectPath: () => {},
  projectInfo: fallbackProject,
  projects: [],
  apiOnline: false,
  addProjectByPath: async () => ({ ok: false, error: 'not ready' }),
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectPath, setProjectPath] = useState('');
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(fallbackProject);
  const [projects, setProjects]       = useState<ProjectInfo[]>([]);
  const [apiOnline, setApiOnline]     = useState(false);

  // Track which paths were auto-discovered so we know which are custom
  const autoDiscovered = useRef<Set<string>>(new Set());

  // ── Boot: ping → auto-discover → load custom paths ──────────────────────
  useEffect(() => {
    apiFetch<{ ok: boolean }>('/api/ping')
      .then(() => {
        setApiOnline(true);
        return apiFetch<ProjectInfo[]>('/api/projects');
      })
      .then(async list => {
        // Track auto-discovered paths
        list.forEach(p => autoDiscovered.current.add(p.path));

        // Fetch any manually saved custom paths
        const customPaths = loadCustomPaths();
        const customResults: ProjectInfo[] = [];

        for (const cp of customPaths) {
          if (autoDiscovered.current.has(cp)) continue; // already in list
          try {
            const res = await apiFetch<ProjectInfo[]>(
              `/api/projects?path=${encodeURIComponent(cp)}`
            );
            res.forEach(p => customResults.push(p));
          } catch { /* path no longer valid — skip */ }
        }

        const merged = [...list, ...customResults];
        setProjects(merged);

        // Restore last selected project if it's still in the list
        const savedPath = localStorage.getItem('df-selected-path') ?? '';
        const restoredPath = merged.find(p => p.path === savedPath)?.path
          ?? merged[0]?.path
          ?? '';
        setProjectPath(restoredPath);
      })
      .catch(() => setApiOnline(false));
  }, []);

  // ── Persist selected path ─────────────────────────────────────────────────
  useEffect(() => {
    if (projectPath) localStorage.setItem('df-selected-path', projectPath);
  }, [projectPath]);

  // ── Load project stats when selection changes ─────────────────────────────
  useEffect(() => {
    if (!projectPath || !apiOnline) return;
    apiFetch<ProjectInfo>(`/api/project?path=${encodeURIComponent(projectPath)}`)
      .then(setProjectInfo)
      .catch(() => {});
  }, [projectPath, apiOnline]);

  // ── Add project by absolute path ──────────────────────────────────────────
  const addProjectByPath = async (absPath: string): Promise<AddResult> => {
    const trimmed = absPath.trim();
    if (!trimmed) return { ok: false, error: 'Path is empty' };

    // Already in list?
    if (projects.some(p => p.path === trimmed)) {
      setProjectPath(trimmed);
      return { ok: true };
    }

    try {
      const result = await apiFetch<ProjectInfo[]>(
        `/api/projects?path=${encodeURIComponent(trimmed)}`
      );

      if (result.length === 0) {
        return { ok: false, error: 'No .docuflow/ found at that path' };
      }

      setProjects(prev => {
        const existingPaths = new Set(prev.map(p => p.path));
        const newOnes = result.filter(p => !existingPaths.has(p.path));
        const merged = [...prev, ...newOnes];

        // Persist only the custom (non-auto-discovered) paths
        const custom = merged
          .map(p => p.path)
          .filter(p => !autoDiscovered.current.has(p));
        saveCustomPaths(custom);

        return merged;
      });

      setProjectPath(result[0].path);
      return { ok: true };
    } catch (e: unknown) {
      return { ok: false, error: (e as Error).message ?? 'Request failed' };
    }
  };

  return (
    <ProjectContext.Provider
      value={{ projectPath, setProjectPath, projectInfo, projects, apiOnline, addProjectByPath }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export const useProject = () => useContext(ProjectContext);
