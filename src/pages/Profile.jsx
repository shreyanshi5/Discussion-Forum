import { useEffect, useState } from "react";
import { auth, db, doc, getDoc, updateDoc } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import WarningPopup from "../components/WarningPopup";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningType, setWarningType] = useState('warning');

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

  const handleUnblock = async () => {
    try {
      const userRef = doc(db, "users", auth.currentUser.email);
      await updateDoc(userRef, {
        isBlocked: false,
        warnings: 0
      });
      
      // Refresh user data
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUser(userSnap.data());
      }
      
      setWarningMessage('Your account has been unblocked successfully.');
      setWarningType('warning');
      setShowWarning(true);
    } catch (error) {
      console.error('Error unblocking user:', error);
      setWarningMessage('Failed to unblock account. Please try again.');
      setWarningType('error');
      setShowWarning(true);
    }
  };

  if (!user) {
    return <div className="text-white p-8">Loading Profile...</div>;
  }

  const isBlocked = (user.warnings || 0) >= 3;

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
            <p className="mb-2">
              <strong>Account Status:</strong>{' '}
              <span className="px-2 py-1 rounded">
                {isBlocked ? 'Blocked' : 'Not Blocked'}
              </span>
            </p>
            {isBlocked && (
              <button
                onClick={handleUnblock}
                className="mt-4 px-4 py-2 bg-[#3A3344] text-white border border-white rounded hover:bg-[#4A4354] transition-colors"
              >
                Unblock Account
              </button>
            )}
          </div>
        </main>
      </div>
      {showWarning && (
        <WarningPopup
          message={warningMessage}
          type={warningType}
          onClose={() => setShowWarning(false)}
        />
      )}
    </div>
  );
}

export default Profile;
