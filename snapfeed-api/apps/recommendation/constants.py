from apps.videos.constants import Reactions

# Reaction weights when blending video embeddings into the user's embedding vector.
REACTION_EMBEDDING_MULTIPLIERS: dict[str, float] = {
    Reactions.LOVE.value: 1.5,
    Reactions.LIKE.value: 1.3,
    Reactions.HAHA.value: 1.2,
    Reactions.WOW.value: 1.2,
    Reactions.SAD.value: 0.8,
    Reactions.ANGRY.value: 0.8,
}
