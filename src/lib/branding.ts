/**
 * Single source of truth for product branding.
 *
 * Renames happen (this product was previously "Filinvest Milestone Tracker"),
 * so the name lives in one place rather than being duplicated across views.
 *
 * Note: storage keys deliberately do NOT derive from these constants — a
 * branding change must never silently orphan a user's persisted data.
 */

/** Short product name, used where space is tight (sidebar mark, email sender). */
export const APP_SHORT_NAME = "CLIE";

/** Expanded product name. */
export const APP_LONG_NAME = "Customer Lifecycle Intelligence Engine";

/** Fully qualified product name, used for document titles and documentation. */
export const APP_FULL_NAME = `${APP_SHORT_NAME} - ${APP_LONG_NAME}`;
