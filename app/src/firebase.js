import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBkfcWt7NXMBHZdYGv7ht5NC8ZxiVY4bIY",
  authDomain: "rmtech-68ce4.firebaseapp.com",
  projectId: "rmtech-68ce4",
  storageBucket: "rmtech-68ce4.firebasestorage.app",
  messagingSenderId: "1069592428280",
  appId: "1:1069592428280:web:4bae4d67fd0c4a049cc50d",
  measurementId: "G-GVETR2201R"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

//to deploy, open a terminal window, then navigate to or create a root directory for your web app.
//1. firebase login
//2. firebase init
//3. firebase deploy