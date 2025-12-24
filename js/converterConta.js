import { auth } from "./firebase.js";
import {
    GoogleAuthProvider,
    linkWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export async function converterParaGoogle() {
    const provider = new GoogleAuthProvider();
    await linkWithPopup(auth.currentUser, provider);
}
