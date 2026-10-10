import { useAuth } from "@clerk/react";
import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Info,
  Lightbulb,
  Loader2,
  Lock,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { backendUrl } from "../utils/api";
import { useUserPlan } from "../utils/plan";

const ANALYSIS_STAGES = [
  "Extracting text from resume...",
  "Analyzing skills and experience...",
  "Evaluating ATS score and job match...",
  "Compiling actionable improvements...",
];

const ReviewResume = () => {
  const { getToken } = useAuth();
  const { isPremium } = useUserPlan();

  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analysisData, setAnalysisData] = useState(null);
  const [activeTab, setActiveTab] = useState("strengths"); // 'strengths' | 'weaknesses' | 'improvements'
  const [loading, setLoading] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);

  // Cycling progress stages during loading
  useEffect(() => {
    if (!loading) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentStageIndex((prev) => (prev + 1) % ANALYSIS_STAGES.length);
    }, 2500);

    return () => {
      clearInterval(interval);
    };
  }, [loading]);

  const validateFile = (file) => {
    if (!file) return false;
    const validExtensions = [".pdf", ".doc", ".docx"];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      toast.error("Please upload a valid PDF, DOC, or DOCX file");
      setError("Please upload a valid PDF, DOC, or DOCX file.");
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume file size exceeds the 5 MB limit");
      setError("Resume file size exceeds the 5 MB limit.");
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setSelectedFile(file);
        setError("");
      } else {
        e.target.value = "";
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setSelectedFile(file);
        setError("");
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const getFileExtension = (filename) => {
    if (!filename) return "FILE";
    return filename.split(".").pop().toUpperCase();
  };

  // Normalizes API response into structured ATS review object
  const parseAnalysisResponse = (data) => {
    if (!data) return null;

    // Check if analysis is embedded under `analysis` or returned directly
    const rawAnalysis =
      data.analysis ||
      (typeof data === "object" &&
      (data.atsScore !== undefined ||
        data.matchedSkills !== undefined ||
        data.strengths !== undefined ||
        data.weaknesses !== undefined)
        ? data
        : null);

    if (rawAnalysis) {
      const atsScore =
        typeof rawAnalysis.atsScore === "number"
          ? Math.min(100, Math.max(0, Math.round(rawAnalysis.atsScore)))
          : 0;

      const matchedSkills = Array.isArray(rawAnalysis.matchedSkills)
        ? rawAnalysis.matchedSkills
        : Array.isArray(rawAnalysis.topKeywords)
        ? rawAnalysis.topKeywords
        : [];

      const missingSkills = Array.isArray(rawAnalysis.missingSkills)
        ? rawAnalysis.missingSkills
        : Array.isArray(rawAnalysis.missingKeywords)
        ? rawAnalysis.missingKeywords
        : [];

      const strengths = Array.isArray(rawAnalysis.strengths)
        ? rawAnalysis.strengths
        : [];

      const weaknesses = Array.isArray(rawAnalysis.weaknesses)
        ? rawAnalysis.weaknesses
        : [];

      const improvements = Array.isArray(rawAnalysis.improvements)
        ? rawAnalysis.improvements
        : Array.isArray(rawAnalysis.recommendations)
        ? rawAnalysis.recommendations
        : Array.isArray(rawAnalysis.actionPlan)
        ? rawAnalysis.actionPlan
        : [];

      const markdownFallback = data.review || data.content || "";

      return {
        atsScore,
        matchedSkills,
        missingSkills,
        strengths,
        weaknesses,
        improvements,
        markdownFallback,
        isStructured: true,
      };
    }

    // Fallback for markdown-only response
    const markdownContent =
      data.review || data.content || (typeof data === "string" ? data : "");

    return {
      atsScore: 0,
      matchedSkills: [],
      missingSkills: [],
      strengths: [],
      weaknesses: [],
      improvements: [],
      markdownFallback: markdownContent,
      isStructured: false,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a resume file first");
      setError("Please select a resume file first.");
      return;
    }

    if (!isPremium) {
      const msg =
        "This feature is available only on the Premium plan. Please upgrade your plan to access Resume Review.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!validateFile(selectedFile)) {
      return;
    }

    setError("");
    setCurrentStageIndex(0);
    setLoading(true);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("resume", selectedFile);
      formData.append("jobDescription", jobDescription);

      // Primary endpoint POST /api/resume/review with automatic multipart/form-data boundary
      let response = await fetch(`${backendUrl}/api/resume/review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      // Backward-compatible fallback if endpoint is mounted on /api/ai/resume-review
      if (response.status === 404) {
        response = await fetch(`${backendUrl}/api/ai/resume-review`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to review resume");
      }

      const parsed = parseAnalysisResponse(data);
      setAnalysisData(parsed);
      setActiveTab("strengths");
      toast.success("Resume reviewed successfully!");
    } catch (err) {
      console.error("Resume review error:", err);
      const errMsg =
        err.message || "An error occurred while reviewing the resume.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!analysisData) return;

    const textToCopy = analysisData.isStructured
      ? `ATS Score: ${analysisData.atsScore}/100\n\nMatched Skills: ${analysisData.matchedSkills.join(", ")}\n\nMissing Skills: ${analysisData.missingSkills.join(", ")}\n\nStrengths:\n${analysisData.strengths.map((s) => `• ${s}`).join("\n")}\n\nWeaknesses:\n${analysisData.weaknesses.map((w) => `• ${w}`).join("\n")}\n\nImprovements:\n${analysisData.improvements.map((i) => `• ${i}`).join("\n")}`
      : analysisData.markdownFallback;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Analysis copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // ATS score helpers
  const getScoreBadge = (score) => {
    if (score >= 80) {
      return {
        label: "Good Match",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
        message:
          "Your resume has a strong match with the job description. Consider addressing the missing skills to improve your chances.",
      };
    }
    if (score >= 60) {
      return {
        label: "Moderate Match",
        color: "text-amber-700 bg-amber-50 border-amber-200",
        message:
          "Your resume moderately matches the requirements. Adding key missing skills can boost your ATS ranking.",
      };
    }
    return {
      label: "Needs Improvement",
      color: "text-rose-700 bg-rose-50 border-rose-200",
      message:
        "Your resume needs alignment with the target role. Incorporate the recommended improvements below.",
    };
  };

  const atsScore = analysisData?.atsScore ?? 0;
  const scoreBadge = getScoreBadge(atsScore);

  // SVG Circular progress math (radius: 42, circumference: 2 * PI * 42 = ~263.89)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (atsScore / 100) * circumference;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
            <FileText className="size-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Resume Review & ATS Analysis
              </h1>
              {!isPremium && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Lock className="size-3" />
                  Premium
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
              Upload your resume and job description to get an AI-powered analysis with ATS score, strengths, weaknesses, and improvements.
            </p>
          </div>
        </div>

        {/* Right Badge */}
        <div className="flex flex-col sm:items-end shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/70 text-purple-700 text-xs font-semibold shadow-2xs">
            <Sparkles className="size-3 text-purple-600" />
            <span>RAG-powered analysis</span>
          </div>
          <span className="text-[11px] text-gray-400 mt-1">
            Your resume is securely analyzed using AI
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Side: 2 Separate Cards for Step 1 and Step 2 */}
        <div className="w-full lg:w-[460px] shrink-0 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Premium required banner */}
            {!isPremium && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                <span>Resume review is a Premium feature.</span>
                <Link
                  to="/"
                  className="shrink-0 font-semibold text-amber-700 hover:text-amber-800 underline"
                >
                  Upgrade
                </Link>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="size-4.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* BOX 1: 1. UPLOAD RESUME */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-3.5">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Upload className="size-4 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    1. Upload Your Resume
                  </h2>
                  <p className="text-xs text-gray-400">
                    Upload your resume in PDF, DOC, or DOCX format.
                  </p>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading}
              />

              {/* Compact Drag & Drop Zone */}
              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !loading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl py-4 px-5 transition-all flex flex-col items-center justify-center text-center cursor-pointer select-none ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-50/40 scale-[0.99]"
                      : "border-gray-200 bg-slate-50/30 hover:bg-slate-50/70 hover:border-gray-300"
                  }`}
                >
                  <div className="size-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                    <UploadCloud className="size-5 stroke-[2.2]" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    Drag & drop your resume here
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    or click to browse
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-2.5 px-3.5 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="size-3.5 text-gray-500" />
                    <span>Choose File</span>
                  </button>
                  <p className="text-[11px] text-gray-400 mt-2">
                    Supports PDF, DOC, and DOCX formats (Max 5 MB)
                  </p>
                </div>
              ) : (
                <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-3.5 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-indigo-100/80 text-indigo-700 shrink-0">
                        <FileText className="size-4.5 stroke-[2.2]" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-xs sm:text-sm font-semibold text-gray-800 truncate"
                          title={selectedFile.name}
                        >
                          {selectedFile.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-medium text-indigo-600 bg-indigo-100/60 px-1.5 py-0.2 rounded">
                            {getFileExtension(selectedFile.name)}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {formatFileSize(selectedFile.size)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline px-2 py-1 cursor-pointer disabled:opacity-50"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        disabled={loading}
                        aria-label="Remove file"
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        title="Remove file"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BOX 2: 2. JOB DESCRIPTION */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-3.5">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Briefcase className="size-4 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    2. Job Description
                  </h2>
                  <p className="text-xs text-gray-400">
                    Paste the job description to analyze your resume against the requirements.
                  </p>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value.slice(0, 5000))}
                  disabled={loading}
                  rows={5}
                  placeholder="Enter the job description here..."
                  className="w-full rounded-xl border border-gray-200 bg-white p-3.5 pb-6 text-xs sm:text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all resize-y min-h-[120px]"
                />
                <div className="absolute right-3 bottom-2 text-[11px] text-gray-400 pointer-events-none select-none">
                  {jobDescription.length}/5000
                </div>
              </div>
            </div>

            {/* ACTION BUTTON, PROGRESS & SECURITY NOTICE */}
            <div className="space-y-3 pt-1">
              <button
                type="submit"
                disabled={loading || !selectedFile}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4.5 animate-spin" />
                    <span>Analyzing Resume...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4.5" />
                    <span>Analyze Resume</span>
                  </>
                )}
              </button>

              {/* Progress Stage Indicator */}
              {loading && (
                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-2.5 text-xs text-indigo-700 animate-pulse">
                  <Loader2 className="size-3.5 animate-spin shrink-0 text-indigo-600" />
                  <span className="font-medium">
                    {ANALYSIS_STAGES[currentStageIndex]}
                  </span>
                </div>
              )}

              {/* Security Footer */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 text-center pt-1">
                <Lock className="size-3.5 shrink-0" />
                <span>Your files are processed securely and are not stored permanently.</span>
              </div>
            </div>
          </form>
        </div>

        {/* Right Output Card: Analysis Results (Structured Result Display) */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-xs flex-1 w-full min-h-[520px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <FileText className="size-4.5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Analysis Results
                </h2>
                <p className="text-xs text-gray-400">
                  Here&apos;s how your resume matches with the job description.
                </p>
              </div>
            </div>

            {analysisData && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="size-3.5 text-gray-400" />
                  <span>Analyzed just now</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                  title="Copy Analysis"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-medium">
                        Copied!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          {loading ? (
            <div className="min-h-[420px] flex flex-col items-center justify-center text-center p-8">
              <div className="relative mb-5">
                <div className="size-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                <Sparkles className="size-6 text-indigo-600 absolute inset-0 m-auto" />
              </div>
              <h3 className="text-base font-semibold text-gray-800">
                Analyzing your resume
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                {ANALYSIS_STAGES[currentStageIndex]}
              </p>
            </div>
          ) : analysisData ? (
            analysisData.isStructured ? (
              <div className="mt-6 space-y-6">
                {/* 1. ATS SCORE SECTION */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-gradient-to-r from-teal-50/40 via-emerald-50/30 to-blue-50/20 border border-emerald-100/70">
                  {/* Circular Progress Meter */}
                  <div className="relative size-28 shrink-0 flex items-center justify-center">
                    <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                      {/* Background track */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-emerald-100"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      {/* Progress bar */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-teal-600 transition-all duration-1000 ease-out"
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    {/* Score inside circle */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                      <span className="text-2xl font-black text-gray-900 leading-none">
                        {atsScore}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400 mt-0.5">
                        / 100
                      </span>
                    </div>
                  </div>

                  {/* Score Details */}
                  <div className="space-y-1.5 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h3 className="text-base font-bold text-gray-900">
                        ATS Score
                      </h3>
                      <span title="Compatibility score calculated based on keyword match, experience depth, and formatting">
                        <Info className="size-3.5 text-gray-400 cursor-help" />
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${scoreBadge.color}`}
                      >
                        {scoreBadge.label}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-lg">
                      {scoreBadge.message}
                    </p>
                  </div>
                </div>

                {/* 2 & 3. MATCHED & MISSING SKILLS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Matched Skills */}
                  <div className="p-4 rounded-xl border border-emerald-100 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="size-4.5 shrink-0" />
                      <h4 className="text-sm font-bold text-gray-900">
                        Matched Skills ({analysisData.matchedSkills.length})
                      </h4>
                    </div>

                    {analysisData.matchedSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analysisData.matchedSkills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-lg text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        No matched skills identified yet.
                      </p>
                    )}
                  </div>

                  {/* Missing Skills */}
                  <div className="p-4 rounded-xl border border-rose-100 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-rose-600">
                      <AlertCircle className="size-4.5 shrink-0" />
                      <h4 className="text-sm font-bold text-gray-900">
                        Missing Skills ({analysisData.missingSkills.length})
                      </h4>
                    </div>

                    {analysisData.missingSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analysisData.missingSkills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-lg text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        No missing skills identified! Great coverage.
                      </p>
                    )}
                  </div>
                </div>

                {/* 4, 5 & 6. TABBED SECTION (Strengths | Weaknesses | Improvements) */}
                <div className="space-y-4 pt-2">
                  {/* Tabs Navigation */}
                  <div className="flex items-center gap-6 border-b border-gray-200 pb-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("strengths")}
                      className={`flex items-center gap-1.5 pb-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
                        activeTab === "strengths"
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <Trophy className="size-4" />
                      <span>Strengths</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("weaknesses")}
                      className={`flex items-center gap-1.5 pb-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
                        activeTab === "weaknesses"
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <AlertTriangle className="size-4" />
                      <span>Weaknesses</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("improvements")}
                      className={`flex items-center gap-1.5 pb-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
                        activeTab === "improvements"
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <Lightbulb className="size-4" />
                      <span>Improvements</span>
                    </button>
                  </div>

                  {/* Tab Panel Content */}
                  <div className="p-5 rounded-2xl bg-slate-50/60 border border-gray-100">
                    {/* Strengths Tab */}
                    {activeTab === "strengths" && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-teal-700">
                          <Trophy className="size-4.5" />
                          <h4 className="text-sm font-bold text-gray-900">
                            Key Strengths
                          </h4>
                        </div>
                        {analysisData.strengths.length > 0 ? (
                          <ul className="space-y-2.5 pt-1">
                            {analysisData.strengths.map((item, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 leading-relaxed"
                              >
                                <CheckCircle2 className="size-4 text-teal-600 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            No strengths recorded.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Weaknesses Tab */}
                    {activeTab === "weaknesses" && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-amber-700">
                          <AlertTriangle className="size-4.5" />
                          <h4 className="text-sm font-bold text-gray-900">
                            Identified Weaknesses
                          </h4>
                        </div>
                        {analysisData.weaknesses.length > 0 ? (
                          <ul className="space-y-2.5 pt-1">
                            {analysisData.weaknesses.map((item, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 leading-relaxed"
                              >
                                <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            No weaknesses found.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Improvements Tab */}
                    {activeTab === "improvements" && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-indigo-700">
                          <Lightbulb className="size-4.5" />
                          <h4 className="text-sm font-bold text-gray-900">
                            Suggested Improvements
                          </h4>
                        </div>
                        {analysisData.improvements.length > 0 ? (
                          <ul className="space-y-2.5 pt-1">
                            {analysisData.improvements.map((item, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 leading-relaxed"
                              >
                                <Sparkles className="size-4 text-indigo-600 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            No improvements required.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback Markdown Display */
              <div className="mt-6 text-sm text-gray-700 leading-relaxed max-h-[550px] overflow-y-auto pr-2">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold text-gray-900 mt-4 mb-2">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-bold text-gray-900 mt-4 mb-2 pb-1 border-b border-gray-100">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold text-gray-900 mt-3 mb-1">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="my-2.5 leading-relaxed text-gray-700">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-5 my-2 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-5 my-2 space-y-1">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-700">{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900">
                        {children}
                      </strong>
                    ),
                  }}
                >
                  {analysisData.markdownFallback}
                </ReactMarkdown>
              </div>
            )
          ) : (
            /* Initial Empty State */
            <div className="min-h-[420px] flex flex-col items-center justify-center text-center p-8">
              <div className="size-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                <FileText className="size-8 text-gray-300 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">
                No analysis yet
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Upload your resume and click &ldquo;Analyze Resume&rdquo; to get started with ATS scoring and feedback.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewResume;
