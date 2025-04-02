import { useEffect, useState } from "react";
import { auth, db, doc, getDoc } from "../firebaseConfig";
import Sidebar from "../components/Sidebar";

function ChatPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.email);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUser(userSnap.data());
        }
      }
    };

    fetchUserData();
  }, []);

  if (!user) {
    return <div className="text-white p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#2C2638]">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <h2 className="text-2xl font-semibold mb-6 text-white">Chat</h2>
          <div className="bg-[#3A3344] p-6 rounded-lg shadow-md text-white">
            <p>Chat and file uploads will be implemented here.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ChatPage;
  