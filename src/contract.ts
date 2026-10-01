// Clean document contract: a stored CV carries no scripts and no editor markup.
// Attribute checks only match inside tags, so CV text may mention these words.
// Shared by the Worker (server guard) and the import tool (self-check).
export const EDITOR_MARKUP = /<script\b|<[^>]*[\s/](contenteditable|data-ed)\b|<[^>]*\sid=["']?__ed\b/i;
