import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider, signInWithPopup, db, doc, getDoc } from "../firebaseConfig";

function MainPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      if (!email.endsWith("@srmist.edu.in")) {
        setErrorMessage("Invalid email domain!");
        auth.signOut();
        return;
      }

      const userRef = doc(db, "users", email);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        localStorage.setItem("firstName", userData.firstName);
        localStorage.setItem("lastName", userData.lastName);
        navigate("/home");
      } else {
        setErrorMessage("Please sign up first!");
        auth.signOut();
      }
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMessage("An error occurred. Please try again.");
    }
  };

  const handleSignupRedirect = () => {
    navigate("/signup");
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#B5A8D5]">
  {/* Outer Box */}
  <div className="h-[75%] w-[75%] bg-[#2C2638] flex rounded-2xl shadow-lg overflow-hidden">
    
    {/* Left Section */}
    <div className="w-1/2 flex flex-col justify-center p-16">
      <h1 className="text-5xl font-bold text-white mb-4">The Common Thread</h1>
      <p className="text-gray-300 text-xl mb-12">Find shared interests and engage in meaningful dialogue</p>
      
      {/* Sign Up Button */}
      <button 
        onClick={handleSignupRedirect} 
        className="text-white font-medium py-3 px-6 rounded-md w-full mb-6 transition duration-300"
        style={{ backgroundColor: "#6E5BA6" }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4D3E78"}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#6E5BA6"}
      >
        New User? Sign Up
      </button>
      
      {/* Login Button */}
      <button 
        onClick={handleLogin} 
        className="text-white font-medium py-3 px-6 rounded-md w-full flex items-center justify-center transition duration-300"
        style={{ backgroundColor: "#6E5BA6" }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4D3E78"}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#6E5BA6"}
      >
        Login with Google
        <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      </button>

      {/* Error Message Display */}
      {errorMessage && <p className="text-red-500 mt-4 text-center">{errorMessage}</p>}
    </div>

    {/* Right Section (Image) */}
    <div className="w-1/2 flex items-center justify-end m-8">
  <img 
    src="/Image.jpeg" 
    alt="Person reading with flowing hair and ideas" 
    className="w-[90%] h-full object-cover rounded-2xl" 
    />
</div>

  

  </div>
</div>

  );
}

export default MainPage;