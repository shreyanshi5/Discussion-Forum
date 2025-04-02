import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import MainPage from "./pages/MainPage";
import SignupPage from "./pages/SignupPage";
import HomePage from "./pages/HomePage";
import SpacesPage from "./pages/SpacesPage";
import ChatPage from "./pages/ChatPage";
import Profile from "./pages/Profile";
import { UserProvider } from './context/UserContext';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Stop loading once auth check is complete
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  if (loading) return <h1>Loading...</h1>; // Prevents redirect before Firebase loads user

  return (
    <Router>
      <UserProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MainPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Routes (Accessible only when logged in) */}
          <Route path="/home" element={user ? <HomePage /> : <Navigate to="/" />} />
          <Route path="/spaces" element={user ? <SpacesPage /> : <Navigate to="/" />} />
          <Route path="/chat" element={user ? <ChatPage /> : <Navigate to="/" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
          {/* Catch-all route to redirect unknown paths */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </UserProvider>
    </Router>
  );
}

export default App;
