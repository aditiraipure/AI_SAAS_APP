import { Toaster } from "react-hot-toast";
import { Route, Routes } from "react-router-dom";
import Blogtitles from "./pages/Blogtitles";
import Community from "./pages/Community";
import Dashboard from "./pages/Dashboard";
import GenerateImages from "./pages/GenerateImages";
import Home from "./pages/Home";
import Layout from "./pages/Layout";
import RemoveBG from "./pages/RemoveBG";
import RemoveObj from "./pages/RemoveObj";
import ResumeBuilder from "./pages/ResumeBuilder";
import ReviewResume from "./pages/ReviewResume";
import WriteAriticle from "./pages/WriteAriticle";

const App = () => {
  return (
    <div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#ffffff",
            color: "#1f2937",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            border: "1px solid #f3f4f6",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#ffffff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#ffffff",
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ai" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="resume-builder" element={<ResumeBuilder />} />
          <Route path="resumebuilder" element={<ResumeBuilder />} />
          <Route path="resume" element={<ResumeBuilder />} />
          <Route path="write-article" element={<WriteAriticle />} />
          <Route path="blog-titles" element={<Blogtitles />} />
          <Route path="generate-images" element={<GenerateImages />} />
          <Route path="remove-background" element={<RemoveBG />} />
          <Route path="remove-object" element={<RemoveObj />} />
          <Route path="review-resume" element={<ReviewResume />} />
          <Route path="community" element={<Community />} />
        </Route>
        <Route path="/resume-builder" element={<ResumeBuilder />} />
        <Route path="/resumebuilder" element={<ResumeBuilder />} />
        <Route path="/writeariticle" element={<WriteAriticle />} />
        <Route path="/blogtitles" element={<Blogtitles />} />
        <Route path="/removebg" element={<RemoveBG />} />
        <Route path="/removeobj" element={<RemoveObj />} />
        <Route path="/reviewresume" element={<ReviewResume />} />
        <Route path="/community" element={<Community />} />
      </Routes>
    </div>
  );
};

export default App;
