import { useState } from "react";
import { auth, provider, signInWithPopup, db, setDoc, doc, getDoc } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";

function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!firstName || !lastName) {
      setErrorMessage("Please enter both first and last name.");
      return;
    }

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

      // Check if the user already exists
      if (userSnap.exists()) {
        setErrorMessage("An account with this email already exists. Please log in.");
        return;
      }

      // Create new user in Firestore
      await setDoc(userRef, {
        firstName,
        lastName,
        email,
      });

      localStorage.setItem("firstName", firstName);
      localStorage.setItem("lastName", lastName);

      navigate("/home");
    } catch (error) {
      console.error("Signup failed:", error);
      setErrorMessage("Signup failed. Please try again.");
    }
  };

  const handleInputChange = () => {
    setIsFormValid(firstName && lastName);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#B5A8D5]">
      <div className="h-[75%] w-[75%] bg-[#2C2638] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex w-full h-full">
          {/* Left Section with Illustration */}
          <div className="w-1/2 flex items-center justify-center p-8">
            <img 
              src="Image.jpeg" 
              alt="Person reading with flowing hair and ideas" 
              className="w-full h-full object-cover rounded-xl shadow-lg" 
            />
          </div>

          {/* Right Section with Form */}
          <div className="w-1/2 flex flex-col justify-center p-16">
            <h1 className="text-5xl font-bold text-white mb-4">Sign Up</h1>
            <p className="text-gray-300 text-xl mb-12">Join The Common Thread community</p>
            
            {/* Input Fields */}
            <div className="space-y-6 mb-8">
              <input 
                type="text" 
                placeholder="First Name" 
                value={firstName} 
                onChange={(e) => { setFirstName(e.target.value); handleInputChange(); }}
                className="w-full px-4 py-3 rounded-md bg-[#3A3344] text-white placeholder-gray-400 border border-[#6E5BA6] focus:outline-none focus:border-[#8A74C9]"
              />
              <input 
                type="text" 
                placeholder="Last Name" 
                value={lastName} 
                onChange={(e) => { setLastName(e.target.value); handleInputChange(); }}
                className="w-full px-4 py-3 rounded-md bg-[#3A3344] text-white placeholder-gray-400 border border-[#6E5BA6] focus:outline-none focus:border-[#8A74C9]"
              />
            </div>

            {/* Signup Button */}
            <button 
              onClick={handleSignup} 
              disabled={!isFormValid}
              className={`text-white font-medium py-3 px-6 rounded-md w-full mb-6 transition duration-300 flex justify-center items-center ${
                isFormValid ? 'bg-[#6E5BA6] hover:bg-[#4D3E78]' : 'bg-[#4A4254] cursor-not-allowed'
              }`}
            >
              Sign Up with Google
              <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </button>

            {/* Back to Login Link */}
            <button 
              onClick={() => navigate("/")}
              className="text-gray-400 hover:text-white transition duration-300"
            >
              Already have an account? Login
            </button>

            {/* Error Message Display */}
            {errorMessage && <p className="text-red-500 mt-4 text-center">{errorMessage}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
