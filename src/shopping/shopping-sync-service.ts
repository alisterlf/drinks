import type { DrinkRepository } from '../data/drink-repository.ts';
import type { DrinkTextFormatter } from '../formatting/drink-text-formatter.ts';
import type { GoogleTasksClient } from '../google/google-tasks-client.ts';
import type { IngredientStore } from '../ingredients/ingredient-store.ts';
import type {
  GoogleTask,
  GoogleTaskFields,
  IngredientInventoryItem,
  ShoppingListItem,
  ShoppingSyncResult,
  ShoppingSyncState,
  StorageAdapter,
} from '../types.ts';
import type { ShoppingListBuilder } from './shopping-list-builder.ts';

interface ShoppingSyncServiceOptions {
  tasksClient: GoogleTasksClient;
  shoppingList: ShoppingListBuilder;
  ingredientStore: IngredientStore;
  repository: DrinkRepository;
  formatter: DrinkTextFormatter;
  storage: StorageAdapter;
  storageKey: string;
  taskListTitle: string;
  now?: () => number;
}

interface ReconcileCounts {
  added: number;
  updated: number;
  removed: number;
}

/**
 * Two-way sync between the shopping list and a Google Tasks list.
 *
 * A task belongs to the app when its title is the name of a known ingredient in any supported
 * language, so the sync works from any device without storing task IDs. Tasks with other titles
 * were added by hand in Google Tasks and are never touched.
 *
 * 1. Completed tasks for known ingredients mark those ingredients as owned and are deleted.
 * 2. Open tasks are updated (title/notes) when still needed, or deleted when no longer missing.
 * 3. Missing ingredients without a task get one, with the drinks that need them as notes.
 */
export class ShoppingSyncService {
  private readonly tasksClient: GoogleTasksClient;
  private readonly shoppingList: ShoppingListBuilder;
  private readonly ingredientStore: IngredientStore;
  private readonly repository: DrinkRepository;
  private readonly formatter: DrinkTextFormatter;
  private readonly storage: StorageAdapter;
  private readonly storageKey: string;
  private readonly taskListTitle: string;
  private readonly now: () => number;

  constructor({
    tasksClient,
    shoppingList,
    ingredientStore,
    repository,
    formatter,
    storage,
    storageKey,
    taskListTitle,
    now = () => Date.now(),
  }: ShoppingSyncServiceOptions) {
    this.tasksClient = tasksClient;
    this.shoppingList = shoppingList;
    this.ingredientStore = ingredientStore;
    this.repository = repository;
    this.formatter = formatter;
    this.storage = storage;
    this.storageKey = storageKey;
    this.taskListTitle = taskListTitle;
    this.now = now;
  }

  get state(): ShoppingSyncState {
    const value = this.storage.read(this.storageKey);
    if (!value) return {};

    try {
      const parsed = JSON.parse(value) as Partial<ShoppingSyncState>;
      const state: ShoppingSyncState = {};
      if (typeof parsed.taskListId === 'string') state.taskListId = parsed.taskListId;
      if (typeof parsed.lastSyncedAt === 'number') state.lastSyncedAt = parsed.lastSyncedAt;
      return state;
    } catch {
      return {};
    }
  }

  async sync(): Promise<ShoppingSyncResult> {
    const [drinks, relatedDrinkSets] = await Promise.all([
      this.repository.loadDrinks(),
      this.repository.loadAllLanguageDrinks(),
    ]);
    const taskListId = await this.resolveTaskListId();
    const tasks = await this.tasksClient.listTasks(taskListId);
    const ingredientsByAlias = this.shoppingList.indexIngredientsByAlias(drinks, relatedDrinkSets);

    const bought = await this.importCompletedTasks(taskListId, tasks, ingredientsByAlias);
    const items = this.shoppingList.listMissingIngredients(drinks, relatedDrinkSets);
    const openTasks = tasks.filter((task) => task.status !== 'completed');
    const counts = await this.reconcileOpenTasks(taskListId, openTasks, items, ingredientsByAlias);

    const syncedAt = this.now();
    this.saveState({ taskListId, lastSyncedAt: syncedAt });

    return { total: items.length, ...counts, bought, syncedAt };
  }

  private async importCompletedTasks(
    taskListId: string,
    tasks: GoogleTask[],
    ingredientsByAlias: Map<string, IngredientInventoryItem>,
  ): Promise<number> {
    let bought = 0;

    for (const task of tasks) {
      if (task.status !== 'completed') continue;

      const ingredient = ingredientsByAlias.get(this.getTaskKey(task));
      if (!ingredient) continue;

      this.ingredientStore.addAll(ingredient.aliasKeys);
      await this.tasksClient.deleteTask(taskListId, task.id);
      bought += 1;
    }

    return bought;
  }

  private async reconcileOpenTasks(
    taskListId: string,
    openTasks: GoogleTask[],
    items: ShoppingListItem[],
    ingredientsByAlias: Map<string, IngredientInventoryItem>,
  ): Promise<ReconcileCounts> {
    const itemsByAlias = new Map<string, ShoppingListItem>();
    for (const item of items) {
      for (const alias of item.aliasKeys) itemsByAlias.set(alias, item);
    }

    const syncedItemKeys = new Set<string>();
    const counts: ReconcileCounts = { added: 0, updated: 0, removed: 0 };

    for (const task of openTasks) {
      const taskKey = this.getTaskKey(task);
      const item = itemsByAlias.get(taskKey);

      if (item && !syncedItemKeys.has(item.key)) {
        syncedItemKeys.add(item.key);
        const fields = this.toTaskFields(item);

        if (task.title !== fields.title || (task.notes ?? '') !== (fields.notes ?? '')) {
          await this.tasksClient.updateTask(taskListId, task.id, fields);
          counts.updated += 1;
        }
        continue;
      }

      if (item || ingredientsByAlias.has(taskKey)) {
        // Either a duplicate of an item already synced, or an ingredient that is no longer missing.
        await this.tasksClient.deleteTask(taskListId, task.id);
        counts.removed += 1;
      }
    }

    // Google Tasks inserts at the top of the list, so insert in reverse to keep alphabetical order.
    for (const item of [...items].reverse()) {
      if (syncedItemKeys.has(item.key)) continue;

      await this.tasksClient.insertTask(taskListId, this.toTaskFields(item));
      counts.added += 1;
    }

    return counts;
  }

  private async resolveTaskListId(): Promise<string> {
    const taskLists = await this.tasksClient.listTaskLists();
    const savedTaskListId = this.state.taskListId;
    const taskList =
      taskLists.find((candidate) => candidate.id === savedTaskListId) ??
      taskLists.find((candidate) => candidate.title === this.taskListTitle);
    if (taskList) return taskList.id;

    const created = await this.tasksClient.createTaskList(this.taskListTitle);
    return created.id;
  }

  private toTaskFields(item: ShoppingListItem): GoogleTaskFields {
    return { title: item.name, notes: this.formatter.formatList(item.drinkNames) };
  }

  private getTaskKey(task: GoogleTask): string {
    return this.formatter.getIngredientKey(task.title ?? '');
  }

  private saveState(state: ShoppingSyncState): void {
    this.storage.write(this.storageKey, JSON.stringify(state));
  }
}
