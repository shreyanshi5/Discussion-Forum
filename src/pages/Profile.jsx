import { useEffect, useState } from "react";
import { auth, db, doc, getDoc } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.email);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUser(userSnap.data());
        }
      }
    };

    fetchUserProfile();
  }, []);

  if (!user) {
    return <div className="text-white p-8">Loading Profile...</div>;
  }

  const isBlocked = (user.warnings || 0) > 3;

  return (
    <div className="min-h-screen bg-[#2C2638]">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">User Profile</h2>
          <div className="bg-[#3A3344] p-6 rounded-lg shadow-md text-white">
            <p className="mb-2"><strong>Name:</strong> {user.firstName} {user.lastName}</p>
            <p className="mb-2"><strong>Email:</strong> {user.email}</p>
            <p className="mb-2"><strong>Warnings:</strong> {user.warnings || 0}</p>
            <p className="mb-2"><strong>Flagged Messages:</strong> {user.flaggedMessages || 0}</p>
            <p className="mb-2">
              <strong>Account Status:</strong>{' '}
              <span className={`px-2 py-1 rounded`}>
                {isBlocked ? 'Blocked' : 'Not Blocked'}
              </span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Profile;
