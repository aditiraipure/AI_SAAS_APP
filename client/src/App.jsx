import { lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { Route, Routes } from "react-router-dom";

// Route-level code splitting using React.lazy
const Home = lazy(() => import("./pages/Home"));
const Layout = lazy(() => import("./pages/Layout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ResumeBuilder = lazy(() => import("./pages/ResumeBuilder"));
const WriteArticle = lazy(() => import("./pages/WriteArticle"));
const Blogtitles = lazy(() => import("./pages/Blogtitles"));
const GenerateImages = lazy(() => import("./pages/GenerateImages"));
const RemoveBG = lazy(() => import("./pages/RemoveBG"));
const RemoveObj = lazy(() => import("./pages/RemoveObj"));
const ReviewResume = lazy(() => import("./pages/ReviewResume"));
const Community = lazy(() => import("./pages/Community"));

const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFD] gap-3">
    <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-medium text-gray-500">Loading page...</p>
  </div>
);

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ai" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="resume-builder" element={<ResumeBuilder />} />
            <Route path="resumebuilder" element={<ResumeBuilder />} />
            <Route path="resume" element={<ResumeBuilder />} />
            <Route path="write-article" element={<WriteArticle />} />
            <Route path="blog-titles" element={<Blogtitles />} />
            <Route path="generate-images" element={<GenerateImages />} />
            <Route path="remove-background" element={<RemoveBG />} />
            <Route path="remove-object" element={<RemoveObj />} />
            <Route path="review-resume" element={<ReviewResume />} />
            <Route path="community" element={<Community />} />
          </Route>
          <Route path="/resume-builder" element={<ResumeBuilder />} />
          <Route path="/resumebuilder" element={<ResumeBuilder />} />
          <Route path="/writeariticle" element={<WriteArticle />} />
          <Route path="/blogtitles" element={<Blogtitles />} />
          <Route path="/removebg" element={<RemoveBG />} />
          <Route path="/removeobj" element={<RemoveObj />} />
          <Route path="/reviewresume" element={<ReviewResume />} />
          <Route path="/community" element={<Community />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export default App;
