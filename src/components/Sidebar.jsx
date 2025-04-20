import { useNavigate } from "react-router-dom";
import { auth, signOut } from "../firebaseConfig";
import { useUser } from "../context/UserContext";

function Sidebar({ showPurpleBackground = false }) {
  const navigate = useNavigate();
  const { user, loading } = useUser();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="w-80 relative">
      {/* Background container */}
      <div className="absolute inset-0">
        {/* Purple top section */}
        {showPurpleBackground && (
          <div className="absolute top-0 left-0 right-0 h-32" style={{ backgroundColor: '#6E5BA6' }}></div>
        )}
        {/* Dark background */}
        <div className="absolute inset-0 rounded-r-3xl" style={{ backgroundColor: '#241F2D' }}></div>
      </div>

      {/* Content */}
      <div className="relative p-8">
        <div className="px-4 mb-8">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-6 rounded w-32" style={{ backgroundColor: '#3A3344' }}></div>
            </div>
          ) : user ? (
            <h3 className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>
              {user.firstName} {user.lastName}
            </h3>
          ) : null}
        </div>
        
        <nav className="space-y-4">
          <button 
            onClick={() => navigate("/profile")}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition duration-200`}
            style={{
              backgroundColor: window.location.pathname === '/profile' ? '#6E5BA6' : 'transparent',
              color: window.location.pathname === '/profile' ? '#FFFFFF' : '#9CA3AF'
            }}
          >
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            <span>View Profile</span>
          </button>
          <button 
            onClick={() => navigate("/home")}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition duration-200`}
            style={{
              backgroundColor: window.location.pathname === '/home' ? '#6E5BA6' : 'transparent',
              color: window.location.pathname === '/home' ? '#FFFFFF' : '#9CA3AF'
            }}
          >
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span>Home</span>
          </button>
          <button 
            onClick={() => navigate("/spaces")}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition duration-200`}
            style={{
              backgroundColor: window.location.pathname === '/spaces' ? '#6E5BA6' : 'transparent',
              color: window.location.pathname === '/spaces' ? '#FFFFFF' : '#9CA3AF'
            }}
          >
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>Spaces</span>
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-lg transition duration-200"
            style={{ color: '#9CA3AF' }}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default Sidebar; 