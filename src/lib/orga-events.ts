/**
 * Événement de synchronisation pour le module Organisation (tâches/projets).
 * Permet de rafraîchir la sidebar et les vues après une mutation.
 */

export const ORGA_DATA_UPDATED_EVENT = "nexkeep:orgaDataUpdated";

export const dispatchOrgaUpdated = () => {
  window.dispatchEvent(new CustomEvent(ORGA_DATA_UPDATED_EVENT));
};
