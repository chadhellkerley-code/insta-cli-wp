import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanSimulatedData() {
  try {
    console.log("Starting cleanup of simulated data...");

    // 1. Get all valid accounts
    const accountsSnap = await getDocs(collection(db, "accounts"));
    const validAccountIds = new Set<string>();
    accountsSnap.forEach(doc => {
      validAccountIds.add(doc.id);
    });

    console.log(`Found ${validAccountIds.size} valid connected accounts.`);

    // 2. Fetch all chats
    const chatsSnap = await getDocs(collection(db, "chats"));
    let chatsDeleted = 0;

    const chatsToDelete: string[] = [];

    chatsSnap.forEach(chatDoc => {
      const data = chatDoc.data();
      const accountId = data.accountId;

      // If the chat doesn't belong to a valid connected account, it's simulated/mock data
      if (!accountId || !validAccountIds.has(accountId)) {
        chatsToDelete.push(chatDoc.id);
      }
    });

    console.log(`Found ${chatsToDelete.length} simulated chats to delete.`);

    // 3. Delete the chats and their messages
    for (const chatId of chatsToDelete) {
      console.log(`Deleting simulated chat: ${chatId}...`);

      // Delete associated messages first
      const messagesQuery = query(collection(db, 'messages'), where('chatId', '==', chatId));
      const messagesSnap = await getDocs(messagesQuery);
      let messagesDeleted = 0;

      for (const messageDoc of messagesSnap.docs) {
        await deleteDoc(doc(db, 'messages', messageDoc.id));
        messagesDeleted++;
      }

      if (messagesDeleted > 0) {
        console.log(`  -> Deleted ${messagesDeleted} messages for chat ${chatId}`);
      }

      // Delete the chat itself
      await deleteDoc(doc(db, 'chats', chatId));
      chatsDeleted++;
    }

    console.log(`\nCleanup complete! Deleted ${chatsDeleted} simulated chats.`);
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    process.exit(0);
  }
}

cleanSimulatedData();
