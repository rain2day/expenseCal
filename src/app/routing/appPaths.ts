import { useLocation } from 'react-router';

export type AppBasePath = '/app' | '/v2';

function normalizePath(path?: string) {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
}

export function inferAppBasePath(pathname: string): AppBasePath {
  return pathname === '/v2' || pathname.startsWith('/v2/') ? '/v2' : '/app';
}

export function withAppBase(basePath: AppBasePath, path?: string) {
  return `${basePath}${normalizePath(path)}`;
}

export function getAppEntryPath(basePath: AppBasePath, newGroup?: boolean) {
  const entryPath = basePath === '/v2' ? '/v2/start' : '/';
  return newGroup ? `${entryPath}?new=1` : entryPath;
}

export function getJoinGroupPath(basePath: AppBasePath, groupId: string) {
  return basePath === '/v2' ? `/v2/join/${groupId}` : `/join/${groupId}`;
}

export function toAppAbsoluteUrl(path: string) {
  const baseUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  return new URL(path.replace(/^\//, ''), baseUrl).toString();
}

export function useAppPaths() {
  const location = useLocation();
  const basePath = inferAppBasePath(location.pathname);

  return {
    basePath,
    isV2: basePath === '/v2',
    appPath: (path?: string) => withAppBase(basePath, path),
    v1Path: (path?: string) => withAppBase('/app', path),
    entryPath: (newGroup?: boolean) => getAppEntryPath(basePath, newGroup),
    joinPath: (groupId: string) => getJoinGroupPath(basePath, groupId),
    absoluteUrl: (path: string) => toAppAbsoluteUrl(path),
  };
}
