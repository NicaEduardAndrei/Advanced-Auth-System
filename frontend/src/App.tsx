import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./context/ProtectedRoute";

//PAGES
import AuthPage from "./pages/Auth/AuthPage";
import MainPage from "./pages/App/MainPage";
//PAGES

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/home" element={
          <ProtectedRoute>
            <MainPage />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}
