/**
 * Video reaction types (aligned with snapfeed-api apps/videos/constants.py Reactions).
 */
export const REACTION_TYPES = [
  { value: "like", emoji: "👍", label: "Like" },
  { value: "love", emoji: "❤️", label: "Love" },
  { value: "haha", emoji: "😂", label: "Haha" },
  { value: "wow", emoji: "😮", label: "Wow" },
  { value: "sad", emoji: "😢", label: "Sad" },
  { value: "angry", emoji: "😠", label: "Angry" },
];

/** Default reaction shown when user has not reacted (same as “love” icon). */
export const DEFAULT_REACTION = "love";

export function getReactionMeta(value) {
  if (!value) return null;
  return REACTION_TYPES.find((r) => r.value === value) ?? null;
}
