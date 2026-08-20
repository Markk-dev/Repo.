/**
 * Single-device active session store.
 * Tracks the single active valid session key per employee ID.
 * When a new login occurs from any device, any previous session for that employee is immediately invalidated.
 */

// Use globalThis so hot reload / multiple route bundles share the exact same in-memory session registry
declare global {
  // eslint-disable-next-line no-var
  var __ACTIVE_EMPLOYEE_SESSIONS__: Map<string, string> | undefined;
}

if (!globalThis.__ACTIVE_EMPLOYEE_SESSIONS__) {
  globalThis.__ACTIVE_EMPLOYEE_SESSIONS__ = new Map<string, string>();
}

export const ActiveSessionStore = {
  /**
   * Sets the new active session for an employee and invalidates all previous sessions.
   */
  setActiveSession(employeeId: string, sessionKey: string): void {
    globalThis.__ACTIVE_EMPLOYEE_SESSIONS__?.set(employeeId.toLowerCase(), sessionKey);
  },

  /**
   * Validates if the given session key is the currently active one for the employee.
   */
  isActiveSession(employeeId: string, sessionKey: string): boolean {
    const activeKey = globalThis.__ACTIVE_EMPLOYEE_SESSIONS__?.get(employeeId.toLowerCase());
    // If no key is set yet, treat the first valid session as active
    if (!activeKey) {
      globalThis.__ACTIVE_EMPLOYEE_SESSIONS__?.set(employeeId.toLowerCase(), sessionKey);
      return true;
    }
    return activeKey === sessionKey;
  },

  /**
   * Invalidates active session upon logout.
   */
  invalidateSession(employeeId: string): void {
    globalThis.__ACTIVE_EMPLOYEE_SESSIONS__?.delete(employeeId.toLowerCase());
  },
};
