// Conflict HUD: Displays real-time cross-site sync status and alerts
export class ConflictHud {
  constructor(badgeEl, messageEl) {
    this.badgeEl = badgeEl;
    this.messageEl = messageEl;
  }

  setStatus(status, message) {
    if (status === 'OK') {
      this.badgeEl.className = 'hud-badge green';
      this.badgeEl.textContent = '● ACTIVE INTENT SYNC';
    } else if (status === 'WARN') {
      this.badgeEl.className = 'hud-badge yellow';
      this.badgeEl.textContent = '● CONFLICT DETECTED';
    } else {
      this.badgeEl.className = 'hud-badge green';
      this.badgeEl.textContent = '● STANDBY';
    }
    this.messageEl.innerHTML = message;
  }
}
