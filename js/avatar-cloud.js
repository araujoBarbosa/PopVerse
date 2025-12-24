import { ensureAnonymousAuth } from "./firebase.js";
import { salvarAvatar } from "./avatar-store.js";

// Expose a helper for the non-module avatar.js script to persist the avatar in Firestore
window.popverseSaveAvatar = async function popverseSaveAvatar(avatarData) {
    if (!avatarData) return;
    const user = await ensureAnonymousAuth();
    if (!user) return;
    await salvarAvatar(avatarData);
};
