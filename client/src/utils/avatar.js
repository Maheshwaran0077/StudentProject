/**
 * Generates a unique, anonymous robot avatar URL using the user's ID or email as a seed.
 * Bypasses human pictures to ensure complete privacy and non-identifiability.
 */
export const getAvatarUrl = (user) => {
  if (!user) return 'https://api.dicebear.com/7.x/bottts/svg?seed=default';
  
  const seed = encodeURIComponent(user.email || user._id || user.name || 'anonymous');
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
};
