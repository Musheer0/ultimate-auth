export const getSessionExpiry = () => {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};
