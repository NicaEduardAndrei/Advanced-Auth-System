import { Routes, Route } from "react-router-dom";


//PAGES
import AuthPage from "./pages/Auth/AuthPage";
//PAGES

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<AuthPage />} />
      </Routes>
    </>
  );
}
