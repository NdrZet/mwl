import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDlMEDV2wK177VE8ue3b5JBOjbha-_u74I",
  authDomain: "mlw-project.firebaseapp.com",
  projectId: "mlw-project",
  storageBucket: "mlw-project.firebasestorage.app",
  messagingSenderId: "207304432666",
  appId: "1:207304432666:web:bd59002bc242374a1ac5a3",
  measurementId: "G-DG3ZM74PRF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
