// Import necessary Firebase modules
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut} from "firebase/auth";
import { 
    getFirestore, 
    collection, 
    getDoc, 
    setDoc, 
    doc, 
    getDocs, 
    updateDoc, 
    arrayUnion,
    increment,
    addDoc,
    query,
    where,
    runTransaction,
    deleteDoc,
    onSnapshot
} from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBmY4RatFkKlAnAlkGnYf5PK-BVKY575f8",
    authDomain: "forum-6ac70.firebaseapp.com",
    projectId: "forum-6ac70",
    storageBucket: "forum-6ac70.firebasestorage.app",
    messagingSenderId: "685264923895",
    appId: "1:685264923895:web:5c86d82430b679d6bd77f2",
    measurementId: "G-0FNNCSJGZZ"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account" // Forces account chooser to appear
});

signInWithPopup(auth, provider)
  .then((result) => {
    // successful login
  })
  .catch((error) => {
    console.error("Login error", error);
  });
const db = getFirestore(app); // Firestore database

// Export everything needed
export { 
    auth, 
    provider, 
    signInWithPopup, 
    signOut, 
    db, 
    collection, 
    getDoc, 
    setDoc, 
    doc, 
    getDocs,
    updateDoc,
    arrayUnion,
    increment ,
    addDoc,
    query,
    where,
    runTransaction,
    deleteDoc,
    onSnapshot
};

