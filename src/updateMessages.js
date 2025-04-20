// Import Firebase
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";

// Firebase configuration
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
const db = getFirestore(app);

async function updateMessagesInSportsSpace() {
  try {
    // First, find the Sports space
    const spacesRef = collection(db, "spaces");
    const spacesSnapshot = await getDocs(spacesRef);
    let sportsSpaceId = null;

    for (const spaceDoc of spacesSnapshot.docs) {
      if (spaceDoc.data().spaceName === "Sports") {
        sportsSpaceId = spaceDoc.id;
        break;
      }
    }

    if (!sportsSpaceId) {
      console.log("Sports space not found");
      return;
    }

    console.log("Found Sports space with ID:", sportsSpaceId);

    // Get all messages in the Sports space
    const messagesRef = collection(db, "spaces", sportsSpaceId, "messages");
    const messagesSnapshot = await getDocs(messagesRef);

    console.log("Found", messagesSnapshot.size, "messages to update");

    // Update each message
    for (const messageDoc of messagesSnapshot.docs) {
      const messageData = messageDoc.data();
      const senderId = messageData.senderId;

      console.log("Processing message from sender:", senderId);

      // Get the user's data
      const userRef = doc(db, "users", senderId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const fullName = `${userData.firstName} ${userData.lastName}`.trim();

        // Update the message with the correct name
        await updateDoc(messageDoc.ref, {
          senderName: fullName
        });
        console.log(`Updated message ${messageDoc.id} with name: ${fullName}`);
      } else {
        console.log(`User data not found for sender: ${senderId}`);
      }
    }

    console.log("Finished updating all messages");
  } catch (error) {
    console.error("Error updating messages:", error);
  }
}

// Run the update
updateMessagesInSportsSpace(); 