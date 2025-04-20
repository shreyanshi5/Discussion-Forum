import { useEffect, useState } from "react";
import { auth, db, doc, getDoc } from "../firebaseConfig";
import Sidebar from "../components/Sidebar";

function Home() {
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

  return (
    <div className="min-h-screen bg-[#2C2638]">
      <div className="flex h-screen">
        <Sidebar />
        {/* Main Content */}
        <div className="flex-1 p-8">
          <h2 className="homepage-heading text-2xl font-semibold">Recent Posts</h2>
          {/* Posts will be displayed here */}
        </div>
      </div>
    </div>
  );
}

export default Home;
