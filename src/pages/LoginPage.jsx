import { auth, provider, signInWithPopup, db, doc, getDoc } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      if (!email.endsWith("@srmist.edu.in")) {
        alert("Invalid email domain!");
        auth.signOut();
        return;
      }

      // Check if user exists in Firestore
      const userRef = doc(db, "users", email);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        navigate("/home"); // User exists, allow login
      } else {
        alert("Please sign up first!");
        auth.signOut(); // Logout if user not found
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div>
      <h2>Login Page</h2>
      <button onClick={handleLogin}>Login with Google</button>
    </div>
  );
}

export default LoginPage;
