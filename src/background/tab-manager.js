// Tab Manager: Manages background tabs pool and their CDP attachment lifecycle
export class TabManager {
  constructor() {
    this.activeTiles = new Map(); // tileId -> { tabId, isAttached, url }
  }

  has(tileId) {
    return this.activeTiles.has(tileId);
  }

  get(tileId) {
    return this.activeTiles.get(tileId);
  }

  getByTabId(tabId) {
    for (const [tileId, tile] of this.activeTiles.entries()) {
      if (tile.tabId === tabId) return { tileId, tile };
    }
    return null;
  }

  set(tileId, data) {
    this.activeTiles.set(tileId, data);
  }

  delete(tileId) {
    this.activeTiles.delete(tileId);
  }

  keys() {
    return Array.from(this.activeTiles.keys());
  }

  entries() {
    return this.activeTiles.entries();
  }

  async cleanupTile(tileId) {
    const tile = this.activeTiles.get(tileId);
    if (!tile) return;
    this.activeTiles.delete(tileId);
    try {
      await chrome.debugger.detach({ tabId: tile.tabId });
    } catch (_) {}
    try {
      await chrome.tabs.remove(tile.tabId);
    } catch (_) {}
  }

  async cleanupAll() {
    for (const tileId of this.keys()) {
      await this.cleanupTile(tileId);
    }
  }

  focusTab(tileId) {
    const tile = this.activeTiles.get(tileId);
    if (tile && tile.tabId) {
      chrome.tabs.update(tile.tabId, { active: true });
    }
  }
}
