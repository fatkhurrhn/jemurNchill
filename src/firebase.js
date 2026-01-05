import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCyyPsZFmGdErx7wcCoF7vkXLexJuzI9QM",
  authDomain: "iot-project-4c311.firebaseapp.com",
  projectId: "iot-project-4c311",
  storageBucket: "iot-project-4c311.firebasestorage.app",
  messagingSenderId: "352828597698",
  appId: "1:352828597698:web:a8917cfc0cca8bac03e25b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };
