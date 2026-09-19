import type { GoogleTask, GoogleTaskFields, GoogleTaskList } from '../types.ts';
import { GoogleApiError } from './google-errors.ts';

interface GoogleTasksClientOptions {
  apiUrl: string;
  fetcher: typeof fetch;
  getAccessToken: () => Promise<string>;
}

interface PagedResponse<T> {
  items?: T[];
  nextPageToken?: string;
}

type QueryParams = Record<string, string>;

/** Thin wrapper over the Google Tasks REST API (v1) for the calls the shopping-list sync needs. */
export class GoogleTasksClient {
  private readonly apiUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly getAccessToken: () => Promise<string>;

  constructor({ apiUrl, fetcher, getAccessToken }: GoogleTasksClientOptions) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.fetcher = fetcher;
    this.getAccessToken = getAccessToken;
  }

  listTaskLists(): Promise<GoogleTaskList[]> {
    return this.listAllPages<GoogleTaskList>('/users/@me/lists', { maxResults: '100' });
  }

  createTaskList(title: string): Promise<GoogleTaskList> {
    return this.requestJson<GoogleTaskList>('POST', '/users/@me/lists', {}, { title });
  }

  listTasks(taskListId: string): Promise<GoogleTask[]> {
    return this.listAllPages<GoogleTask>(this.tasksPath(taskListId), {
      maxResults: '100',
      showCompleted: 'true',
      showHidden: 'true',
    });
  }

  insertTask(taskListId: string, fields: GoogleTaskFields): Promise<GoogleTask> {
    return this.requestJson<GoogleTask>('POST', this.tasksPath(taskListId), {}, fields);
  }

  updateTask(taskListId: string, taskId: string, fields: GoogleTaskFields): Promise<GoogleTask> {
    return this.requestJson<GoogleTask>('PATCH', this.taskPath(taskListId, taskId), {}, fields);
  }

  async deleteTask(taskListId: string, taskId: string): Promise<void> {
    await this.request('DELETE', this.taskPath(taskListId, taskId));
  }

  private tasksPath(taskListId: string): string {
    return `/lists/${encodeURIComponent(taskListId)}/tasks`;
  }

  private taskPath(taskListId: string, taskId: string): string {
    return `${this.tasksPath(taskListId)}/${encodeURIComponent(taskId)}`;
  }

  private async listAllPages<T>(path: string, params: QueryParams): Promise<T[]> {
    const items: T[] = [];
    let pageToken: string | undefined;

    do {
      const page = await this.requestJson<PagedResponse<T>>('GET', path, pageToken ? { ...params, pageToken } : params);
      items.push(...(page.items ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken);

    return items;
  }

  private async requestJson<T>(method: string, path: string, params: QueryParams = {}, body?: unknown): Promise<T> {
    const response = await this.request(method, path, params, body);
    return (await response.json()) as T;
  }

  private async request(method: string, path: string, params: QueryParams = {}, body?: unknown): Promise<Response> {
    const accessToken = await this.getAccessToken();
    const query = new URLSearchParams(params).toString();
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await this.fetcher(`${this.apiUrl}${path}${query ? `?${query}` : ''}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw new GoogleApiError(response.status, await this.readErrorMessage(response, method, path));
    }

    return response;
  }

  private async readErrorMessage(response: Response, method: string, path: string): Promise<string> {
    const fallback = `Google Tasks ${method} ${path} failed with status ${response.status}.`;

    try {
      const payload = (await response.json()) as { error?: { message?: unknown } };
      return typeof payload.error?.message === 'string' ? payload.error.message : fallback;
    } catch {
      return fallback;
    }
  }
}
