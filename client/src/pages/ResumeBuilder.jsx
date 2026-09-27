import { useAuth, useUser } from "@clerk/react";
import {
  Award,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  FolderGit2,
  GraduationCap,
  LayoutTemplate,
  Loader2,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  User,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { backendUrl } from "../utils/api";

const SKILL_CATEGORIES = [
  {
    key: "programming",
    label: "Programming Languages",
    placeholder: "e.g. JavaScript, Python, TypeScript",
  },
  {
    key: "frontend",
    label: "Frontend",
    placeholder: "e.g. React, Tailwind CSS, Next.js",
  },
  {
    key: "backend",
    label: "Backend",
    placeholder: "e.g. Node.js, Express, REST APIs",
  },
  {
    key: "database",
    label: "Database",
    placeholder: "e.g. MongoDB, PostgreSQL, Redis",
  },
  {
    key: "devops",
    label: "DevOps & CI/CD",
    placeholder: "e.g. Git, GitHub Actions, Linux",
  },
  {
    key: "tools",
    label: "Developer Tools",
    placeholder: "e.g. Postman, VS Code, Vite",
  },
  {
    key: "other",
    label: "Other / Soft Skills",
    placeholder: "e.g. Agile, System Design, Team Leadership",
  },
];

const TEMPLATES = [
  {
    id: "modern",
    name: "Modern Indigo",
    description:
      "Sleek sans-serif with vibrant indigo accents & clear division lines.",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    accentColor: "#4F46E5",
  },
  {
    id: "classic",
    name: "Classic Serif",
    description:
      "Traditional formal typography with charcoal accents for corporate roles.",
    badgeColor: "bg-gray-100 text-gray-800 border-gray-300",
    accentColor: "#1F2937",
  },
  {
    id: "minimal",
    name: "Minimal Clean",
    description:
      "Generous whitespace, elegant slate dividers, and compact readability.",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    accentColor: "#475569",
  },
  {
    id: "professional",
    name: "Professional Navy",
    description:
      "Executive navy & teal accents structured for engineers and leaders.",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    accentColor: "#0F172A",
  },
];

/**
 * Format raw date string into clean resume date (e.g. "2024-05" -> "May 2024")
 */
const formatResumeDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return "";
  const trimmed = dateStr.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase() === "present") return "Present";

  if (/^[A-Za-z]{3,9}\s+\d{4}$/.test(trimmed) || /^\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = parseInt(ymdMatch[2], 10);
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    if (month >= 1 && month <= 12) {
      return `${monthNames[month - 1]} ${year}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`;
  }

  return trimmed;
};

/**
 * Reusable DatePicker component with native calendar popup, formatted text, and clear button
 */
const ResumeDatePicker = ({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = "Select date",
  required = false,
  className = "",
  disabledText = "Present",
}) => {
  const inputRef = useRef(null);

  // Helper to convert arbitrary string into YYYY-MM if possible for the native picker input
  const getInputValue = (val) => {
    if (!val || typeof val !== "string") return "";
    const trimmed = val.trim();
    if (trimmed.toLowerCase() === "present") return "";
    if (/^\d{4}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 7);
    }
    const match = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
    if (match) {
      const monthNames = [
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec",
      ];
      const mIdx = monthNames.findIndex((m) =>
        match[1].toLowerCase().startsWith(m),
      );
      if (mIdx !== -1) {
        return `${match[2]}-${String(mIdx + 1).padStart(2, "0")}`;
      }
    }
    if (/^\d{4}$/.test(trimmed)) {
      return `${trimmed}-01`;
    }
    return "";
  };

  const handlePickerChange = (e) => {
    const raw = e.target.value; // "YYYY-MM"
    if (!raw) {
      onChange("");
      return;
    }
    const [year, month] = raw.split("-");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const mNum = parseInt(month, 10);
    if (mNum >= 1 && mNum <= 12) {
      onChange(`${monthNames[mNum - 1]} ${year}`);
    } else {
      onChange(raw);
    }
  };

  const formattedDisplay = disabled ? disabledText : formatResumeDate(value);

  const openCalendar = () => {
    if (disabled || !inputRef.current) return;
    if (typeof inputRef.current.showPicker === "function") {
      try {
        inputRef.current.showPicker();
      } catch {
        inputRef.current.focus();
      }
    } else {
      inputRef.current.focus();
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-[11px] font-semibold text-gray-600">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div
        onClick={openCalendar}
        className={`relative flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all cursor-pointer select-none ${
          disabled
            ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-white border-gray-200 hover:border-indigo-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 text-gray-800"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Calendar
            className={`size-4 shrink-0 ${
              disabled ? "text-gray-300" : "text-indigo-600"
            }`}
          />
          <span
            className={`truncate font-medium ${
              !formattedDisplay ? "text-gray-400 font-normal" : "text-gray-800"
            }`}
          >
            {formattedDisplay || placeholder}
          </span>
        </div>

        {/* Native Month-Year Calendar Picker */}
        <input
          ref={inputRef}
          type="month"
          value={getInputValue(value)}
          onChange={handlePickerChange}
          disabled={disabled}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
          tabIndex={disabled ? -1 : 0}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="p-0.5 text-gray-400 hover:text-rose-600 rounded-sm relative z-10 transition-colors"
            title="Clear date"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const expandEducationDegree = (deg = "") => {
  if (!deg || typeof deg !== "string") return "";
  let text = deg.trim();

  // Compound "Degree [in] Branch" patterns (e.g. "BE CS", "BE ENTC", "BTech CSE", "B.Tech in IT")
  const compoundRegex =
    /^(B\.?E\.?|B\.?Tech\.?|M\.?E\.?|M\.?Tech\.?|B\.?C\.?A\.?|M\.?C\.?A\.?|B\.?B\.?A\.?|M\.?B\.?A\.?|B\.?Sc\.?|M\.?Sc\.?|B\.?S\.?|M\.?S\.?)\s*(?:in\s+)?(CSE|CS|ENTC|E&TC|E&Tc|ETC|ECE|EEE|EE|MECH|ME|CIVIL|AI\s*&\s*DS|AIDS|AI\/DS|AI\s*&\s*ML|AIML|AI\/ML|IT)(.*)$/i;
  const match = text.match(compoundRegex);
  if (match) {
    const rawDeg = match[1].toUpperCase().replace(/\./g, "");
    const rawBranch = match[2].toUpperCase().replace(/\s+/g, "");
    const rest = match[3] ? match[3].trim() : "";

    let degFull = "Bachelor of Engineering";
    if (rawDeg.startsWith("BTECH")) degFull = "Bachelor of Technology";
    else if (rawDeg.startsWith("MTECH")) degFull = "Master of Technology";
    else if (rawDeg.startsWith("ME")) degFull = "Master of Engineering";
    else if (rawDeg.startsWith("BCA"))
      degFull = "Bachelor of Computer Applications";
    else if (rawDeg.startsWith("MCA"))
      degFull = "Master of Computer Applications";
    else if (rawDeg.startsWith("BBA"))
      degFull = "Bachelor of Business Administration";
    else if (rawDeg.startsWith("MBA"))
      degFull = "Master of Business Administration";
    else if (rawDeg.startsWith("BSC") || rawDeg === "BS")
      degFull = "Bachelor of Science";
    else if (rawDeg.startsWith("MSC") || rawDeg === "MS")
      degFull = "Master of Science";

    let branchFull = "Computer Science and Engineering";
    if (rawBranch === "CS" || rawBranch === "CSE")
      branchFull = "Computer Science and Engineering";
    else if (["ENTC", "E&TC", "ETC"].includes(rawBranch))
      branchFull = "Electronics & Telecommunication Engineering";
    else if (rawBranch === "ECE")
      branchFull = "Electronics and Communication Engineering";
    else if (rawBranch === "IT") branchFull = "Information Technology";
    else if (rawBranch === "EEE")
      branchFull = "Electrical and Electronics Engineering";
    else if (rawBranch === "EE") branchFull = "Electrical Engineering";
    else if (rawBranch === "ME" || rawBranch === "MECH")
      branchFull = "Mechanical Engineering";
    else if (rawBranch === "CIVIL") branchFull = "Civil Engineering";
    else if (rawBranch.includes("DS"))
      branchFull = "Artificial Intelligence and Data Science";
    else if (rawBranch.includes("ML"))
      branchFull = "Artificial Intelligence and Machine Learning";

    return `${degFull} in ${branchFull}${rest ? ` ${rest}` : ""}`;
  }

  // Standalone degree replacements
  let res = text
    .replace(/\b(B\.?E\.?)\b/gi, "Bachelor of Engineering")
    .replace(/\b(B\.?Tech\.?)\b/gi, "Bachelor of Technology")
    .replace(/\b(M\.?E\.?)\b/gi, "Master of Engineering")
    .replace(/\b(M\.?Tech\.?)\b/gi, "Master of Technology")
    .replace(/\b(B\.?C\.?A\.?)\b/gi, "Bachelor of Computer Applications")
    .replace(/\b(M\.?C\.?A\.?)\b/gi, "Master of Computer Applications")
    .replace(/\b(B\.?B\.?A\.?)\b/gi, "Bachelor of Business Administration")
    .replace(/\b(M\.?B\.?A\.?)\b/gi, "Master of Business Administration")
    .replace(/\b(B\.?Sc\.?)\b/gi, "Bachelor of Science")
    .replace(/\b(M\.?Sc\.?)\b/gi, "Master of Science")
    .replace(/\b(Ph\.?D\.?)\b/gi, "Doctor of Philosophy");

  // Standalone branch replacements
  res = res
    .replace(
      /\b(E&TC|E&Tc|ENTC|ETC)\b/gi,
      "Electronics & Telecommunication Engineering",
    )
    .replace(/\b(CSE)\b/gi, "Computer Science and Engineering")
    .replace(/\b(ECE)\b/gi, "Electronics and Communication Engineering")
    .replace(/\b(EEE)\b/gi, "Electrical and Electronics Engineering")
    .replace(
      /\b(AI\s*&\s*DS|AIDS|AI\/DS)\b/gi,
      "Artificial Intelligence and Data Science",
    )
    .replace(
      /\b(AI\s*&\s*ML|AIML|AI\/ML)\b/gi,
      "Artificial Intelligence and Machine Learning",
    );

  return res.replace(/\s{2,}/g, " ").trim();
};

export const expandEducationInstitution = (inst = "") => {
  if (!inst || typeof inst !== "string") return "";
  let text = inst.trim();
  text = text
    .replace(
      /\bPVPIT\b/g,
      "Padmabhooshan Vasantdada Patil Institute of Technology (PVPIT)",
    )
    .replace(/\bCOEP\b/g, "College of Engineering Pune (COEP)")
    .replace(/\bPICT\b/g, "Pune Institute of Computer Technology (PICT)")
    .replace(/\bVJTI\b/g, "Veermata Jijabai Technological Institute (VJTI)");

  return text.replace(/\s{2,}/g, " ").trim();
};

export const formatEducationGrade = (grade = "") => {
  if (!grade || typeof grade !== "string") return "";
  const trimmed = grade.trim();
  if (/^\d+(\.\d+)?(\s*\/\s*\d+)?$/.test(trimmed)) {
    return `CGPA of ${trimmed}`;
  }
  return trimmed;
};

export const normalizeSkillText = (text = "") => {
  if (!text || typeof text !== "string") return text;
  const raw = text.trim();
  const lower = raw
    .toLowerCase()
    .replace(/[-_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const collapsed = raw.toLowerCase().replace(/[^a-z0-9+#]/g, "");

  const exactMap = {
    react: "React.js",
    reactjs: "React.js",
    "react.js": "React.js",
    "react js": "React.js",
    "react native": "React Native",
    reactnative: "React Native",
    express: "Express.js",
    expressjs: "Express.js",
    "express.js": "Express.js",
    "express js": "Express.js",
    node: "Node.js",
    nodejs: "Node.js",
    "node.js": "Node.js",
    "node js": "Node.js",
    nest: "NestJS",
    nestjs: "NestJS",
    "nest.js": "NestJS",
    "nest js": "NestJS",
    next: "Next.js",
    nextjs: "Next.js",
    "next.js": "Next.js",
    "next js": "Next.js",
    vue: "Vue.js",
    vuejs: "Vue.js",
    "vue.js": "Vue.js",
    "vue js": "Vue.js",
    angular: "Angular",
    angularjs: "AngularJS",
    "angular.js": "AngularJS",
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    mongo: "MongoDB",
    mongodb: "MongoDB",
    mongoose: "Mongoose",
    postgres: "PostgreSQL",
    postgresql: "PostgreSQL",
    psql: "PostgreSQL",
    mysql: "MySQL",
    sqlite: "SQLite",
    sqlite3: "SQLite",
    redis: "Redis",
    graphql: "GraphQL",
    rest: "RESTful APIs",
    "rest api": "RESTful APIs",
    "rest apis": "RESTful APIs",
    restapi: "RESTful APIs",
    restapis: "RESTful APIs",
    jwt: "JSON Web Tokens (JWT)",
    "json web token": "JSON Web Tokens (JWT)",
    "json web tokens": "JSON Web Tokens (JWT)",
    docker: "Docker",
    dockers: "Docker",
    "docker compose": "Docker Compose",
    "docker-compose": "Docker Compose",
    k8s: "Kubernetes",
    kubernetes: "Kubernetes",
    aws: "AWS",
    "amazon web services": "AWS",
    gcp: "Google Cloud Platform (GCP)",
    "google cloud": "Google Cloud Platform (GCP)",
    "google cloud platform": "Google Cloud Platform (GCP)",
    azure: "Microsoft Azure",
    "microsoft azure": "Microsoft Azure",
    "ci/cd": "CI/CD",
    cicd: "CI/CD",
    "ci cd": "CI/CD",
    "ci cd pipelines": "CI/CD Pipelines",
    html: "HTML5",
    html5: "HTML5",
    css: "CSS3",
    css3: "CSS3",
    tailwind: "Tailwind CSS",
    tailwindcss: "Tailwind CSS",
    "tailwind css": "Tailwind CSS",
    bootstrap: "Bootstrap",
    "bootstrap 5": "Bootstrap",
    bootstrap5: "Bootstrap",
    fastapi: "FastAPI",
    "c++": "C++",
    cpp: "C++",
    "c#": "C#",
    csharp: "C#",
    golang: "Go",
    go: "Go",
    python: "Python",
    python3: "Python",
    py: "Python",
    django: "Django",
    flask: "Flask",
    spring: "Spring Framework",
    "spring boot": "Spring Boot",
    springboot: "Spring Boot",
    kafka: "Apache Kafka",
    "apache kafka": "Apache Kafka",
    rabbitmq: "RabbitMQ",
    postman: "Postman",
    swagger: "Swagger / OpenAPI",
    openapi: "Swagger / OpenAPI",
    git: "Git",
    github: "GitHub",
    gitlab: "GitLab",
    bitbucket: "Bitbucket",
    webpack: "Webpack",
    vite: "Vite",
    vitejs: "Vite",
    "vite.js": "Vite",
    babel: "Babel",
    eslint: "ESLint",
    prettier: "Prettier",
    jest: "Jest",
    mocha: "Mocha",
    cypress: "Cypress",
    playwright: "Playwright",
    selenium: "Selenium",
    figma: "Figma",
    jira: "Jira",
    scrum: "Scrum",
    agile: "Agile",
    "prompt engineering": "Prompt Engineering",
    ai: "Artificial Intelligence",
    "artificial intelligence": "Artificial Intelligence",
    ml: "Machine Learning",
    "machine learning": "Machine Learning",
    nlp: "Natural Language Processing",
    "natural language processing": "Natural Language Processing",
    "deep learning": "Deep Learning",
    redux: "Redux Toolkit",
    "redux toolkit": "Redux Toolkit",
    rtk: "Redux Toolkit",
    zustand: "Zustand",
    prisma: "Prisma ORM",
    sequelize: "Sequelize",
    typeorm: "TypeORM",
    websocket: "WebSockets",
    websockets: "WebSockets",
    "web sockets": "WebSockets",
    "socket.io": "Socket.IO",
    socketio: "Socket.IO",
    "socket io": "Socket.IO",
    vercel: "Vercel",
    netlify: "Netlify",
    heroku: "Heroku",
    linux: "Linux",
    ubuntu: "Ubuntu",
    nginx: "Nginx",
    apache: "Apache HTTP Server",
  };

  if (exactMap[raw.toLowerCase()]) return exactMap[raw.toLowerCase()];
  if (exactMap[lower]) return exactMap[lower];
  if (exactMap[collapsed]) return exactMap[collapsed];

  // Regex patterns
  if (/^express(\.?js)?$/i.test(raw)) return "Express.js";
  if (/^react(\.?js)?$/i.test(raw)) return "React.js";
  if (/^node(\.?js)?$/i.test(raw)) return "Node.js";
  if (/^nest(\.?js)?$/i.test(raw)) return "NestJS";
  if (/^next(\.?js)?$/i.test(raw)) return "Next.js";
  if (/^vue(\.?js)?$/i.test(raw)) return "Vue.js";
  if (/^type\s*script$/i.test(raw)) return "TypeScript";
  if (/^java\s*script$/i.test(raw)) return "JavaScript";
  if (/^mongo\s*db$/i.test(raw)) return "MongoDB";
  if (/^postgre\s*sql$/i.test(raw)) return "PostgreSQL";
  if (/^tailwind(\s*css)?$/i.test(raw)) return "Tailwind CSS";
  if (/^spring\s*boot$/i.test(raw)) return "Spring Boot";
  if (/^k8s$/i.test(raw)) return "Kubernetes";

  return raw;
};

const ResumeBuilder = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const previewRef = useRef(null);

  // Form State with Default Test / Dummy Data
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "Aditi Sharma",
    email: "aditi.sharma.dev@gmail.com",
    phone: "+91 98765 43210",
    location: "Pune, Maharashtra, India",
    linkedin: "https://www.linkedin.com/in/aditi-sharma",
    github: "https://github.com/aditisharma",
    portfolio: "https://aditisharma.dev",
  });

  const [targetRole, setTargetRole] = useState("Software Developer");
  const [jobDescription, setJobDescription] = useState("");
  const [summary, setSummary] = useState(
    "Software Developer with experience building full-stack web applications using React.js, TypeScript, Node.js, NestJS, and MongoDB. Experienced in developing responsive user interfaces, RESTful APIs, database-driven applications, and secure authentication workflows. Worked on modular enterprise applications involving inventory, billing, delivery, customer management, and real-time communication features. Familiar with AI-assisted development, prompt engineering, API debugging, testing, Git, Docker, and Agile development practices.",
  );
  const [selectedTemplate, setSelectedTemplate] = useState("modern");

  // Dynamic Array Sections
  const [education, setEducation] = useState([
    {
      degree:
        "Bachelor of Engineering in Electronics & Telecommunication Engineering",
      institution:
        "Padmabhooshan Vasantdada Patil Institute of Technology (PVPIT)",
      location: "Pune",
      startDate: "2022-11",
      endDate: "2026-06",
      grade: "8.91",
      description: "",
    },
  ]);

  const [experience, setExperience] = useState([
    {
      company: "Nexoraa Technologies",
      role: "Software Developer Intern",
      location: "Pune, Maharashtra",
      employmentType: "Full-time",
      startDate: "2026-01",
      endDate: "2026-09",
      isCurrent: false,
      responsibilitiesText: [
        "React.js, TypeScript, responsive UI development",
        "NestJS, REST APIs, backend development",
        "MongoDB, Mongoose, database operations",
        "API integration, validation, debugging, testing",
        "Inventory, billing, delivery, and customer management modules",
        "Git, GitHub, Docker, Vercel, Agile development",
        "AI-assisted development and prompt engineering",
      ].join("\n"),
      achievementsText: "",
      technologiesText:
        "React.js, TypeScript, NestJS, Node.js, MongoDB, Docker, Git",
    },
  ]);

  const [projects, setProjects] = useState([
    {
      name: "PingUp - Social Media Application",
      description:
        "Social media application with user profiles, posts, likes, comments, follows, authentication, real-time chat, and notifications. Integrated Clerk for authentication and authorization. Implemented RESTful APIs and MongoDB-based data management with real-time communication using WebSockets.",
      technologiesText:
        "React.js, Node.js, Express.js, MongoDB, REST APIs, Clerk, WebSockets",
      responsibilitiesText: [
        "Social media application with user profiles, posts, likes, comments, follows, authentication, real-time chat, and notifications.",
        "Integrated Clerk for authentication and authorization.",
        "Implemented RESTful APIs and MongoDB-based data management with real-time communication using WebSockets.",
      ].join("\n"),
      outcome:
        "Deployed responsive social application supporting real-time messaging.",
      githubUrl: "https://github.com/aditisharma/pingup",
      liveUrl: "https://pingup.aditisharma.dev",
      startDate: "2026-06",
      endDate: "2026-06",
    },
    {
      name: "Redis-Inspired In-Memory Database Server",
      description:
        "Multithreaded TCP server inspired by Redis. Implemented key-value storage, TTL-based expiry, list operations, ordered event streams, and publish/subscribe messaging. Used ExecutorService and ConcurrentHashMap for concurrent client handling and thread-safe operations.",
      technologiesText:
        "Java, TCP, Socket Programming, ExecutorService, ConcurrentHashMap",
      responsibilitiesText: [
        "Multithreaded TCP server inspired by Redis.",
        "Implemented key-value storage, TTL-based expiry, list operations, ordered event streams, and publish/subscribe messaging.",
        "Used ExecutorService and ConcurrentHashMap for concurrent client handling and thread-safe operations.",
      ].join("\n"),
      outcome:
        "Engineered scalable in-memory storage server with concurrent client support.",
      githubUrl: "https://github.com/aditisharma/redis-server",
      liveUrl: "",
      startDate: "2026-06",
      endDate: "2026-06",
    },
  ]);

  const [skills, setSkills] = useState({
    programming: [
      "React.js",
      "TypeScript",
      "JavaScript",
      "HTML",
      "CSS",
      "Node.js",
      "Express.js",
      "NestJS",
      "Java",
      "C++",
    ],
    frontend: ["React.js", "Tailwind CSS"],
    backend: [
      "Node.js",
      "Express.js",
      "NestJS",
      "REST APIs",
      "JWT",
      "Clerk",
      "WebSockets",
    ],
    database: ["MongoDB", "Mongoose"],
    cloud: ["Vercel"],
    devops: [
      "Git",
      "GitHub",
      "Docker",
      "Docker Compose",
      "GitHub Actions",
      "CI/CD",
    ],
    tools: ["Postman", "Swagger"],
    other: [
      "Prompt Engineering",
      "Artificial Intelligence",
      "English",
      "Hindi",
      "Marathi",
    ],
  });

  const [skillInputs, setSkillInputs] = useState({
    programming: "",
    frontend: "",
    backend: "",
    database: "",
    cloud: "",
    devops: "",
    tools: "",
    other: "",
  });

  const [achievements, setAchievements] = useState([
    {
      title: "Smart Helmet Accident Detection Research",
      organization: "Research Publication",
      date: "2025",
      description:
        "Published research paper on Smart Helmet-based accident detection and safety system.",
    },
    {
      title: "Academic Excellence in BE",
      organization: "PVPIT Pune",
      date: "2024",
      description: "Maintained 8.91 CGPA during Bachelor of Engineering.",
    },
    {
      title: "Full Stack & Backend Projects",
      organization: "Software Engineering",
      date: "2026",
      description:
        "Developed multiple full-stack and backend projects using modern software development technologies.",
    },
  ]);

  const [certifications, setCertifications] = useState([
    {
      name: "Full Stack Web Development Certification",
      organization: "Meta",
      issueDate: "2025-06",
      credentialUrl: "",
    },
    {
      name: "Java Programming Certification",
      organization: "Oracle",
      issueDate: "2025-08",
      credentialUrl: "",
    },
    {
      name: "MongoDB Developer Certification",
      organization: "MongoDB University",
      issueDate: "2025-11",
      credentialUrl: "",
    },
  ]);

  // UI Collapsible sections (open by default so user can immediately see and edit prefilled data)
  const [openSections, setOpenSections] = useState({
    personal: true,
    target: true,
    summary: true,
    education: true,
    experience: true,
    projects: true,
    skills: true,
    achievements: true,
    certifications: true,
    template: true,
  });

  // Action states
  const [savedResume, setSavedResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiImprovingSummary, setAiImprovingSummary] = useState(false);
  const [improvingExpIndex, setImprovingExpIndex] = useState(null);
  const [improvingProjIndex, setImprovingProjIndex] = useState(null);
  const [aiGeneratingAll, setAiGeneratingAll] = useState(false);
  const [atsAnalyzing, setAtsAnalyzing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [errors, setErrors] = useState({});

  // Auto-populate initial user info if available
  const hasPopulatedUserRef = useRef(false);
  useEffect(() => {
    if (user && !hasPopulatedUserRef.current) {
      hasPopulatedUserRef.current = true;
      setPersonalInfo((prev) => ({
        ...prev,
        fullName:
          prev.fullName ||
          user.fullName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: prev.email || user.primaryEmailAddress?.emailAddress || "",
      }));
    }
  }, [user]);

  const toggleSection = (sec) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Skill Chip Management with Instant Normalization + AI Verification
  const handleAddSkill = async (category) => {
    const rawVal = skillInputs[category]?.trim();
    if (!rawVal) return;

    // Fast deterministic normalization immediately
    const rawItems = rawVal
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const normalizedItems = rawItems.map((s) => normalizeSkillText(s));

    // Deduplicate against existing skills
    const newItems = normalizedItems.filter(
      (s) => !skills[category].includes(s),
    );

    if (newItems.length > 0) {
      setSkills((prev) => ({
        ...prev,
        [category]: [...prev[category], ...newItems],
      }));
    }

    setSkillInputs((prev) => ({ ...prev, [category]: "" }));

    // For any item, verify with AI normalization in the background if not standard
    for (const item of newItems) {
      if (item.length > 1) {
        try {
          const token = await getToken();
          const res = await fetch(`${backendUrl}/api/resumes/normalize-skill`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              text: item,
              context: `${category} skill`,
            }),
          });
          const data = await res.json();
          if (
            data?.success &&
            data.normalizedSkill &&
            data.normalizedSkill !== item
          ) {
            setSkills((prev) => ({
              ...prev,
              [category]: prev[category].map((s) =>
                s === item ? data.normalizedSkill : s,
              ),
            }));
          }
        } catch {
          // ignore background error
        }
      }
    }
  };

  const handleRemoveSkill = (category, indexToRemove) => {
    setSkills((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== indexToRemove),
    }));
  };

  const handleSkillKeyDown = (e, category) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddSkill(category);
    }
  };

  // Education Abbreviation Expansion on blur
  const handleExpandEducationField = async (index, field, value) => {
    if (!value || typeof value !== "string" || !value.trim()) return;
    const cleanVal = value.trim();

    // Fast deterministic check first
    const fastExpanded =
      field === "degree"
        ? expandEducationDegree(cleanVal)
        : expandEducationInstitution(cleanVal);

    if (fastExpanded && fastExpanded !== cleanVal) {
      updateEducation(index, field, fastExpanded);
      return;
    }

    // Call AI expander for abbreviations
    if (
      /^[A-Z&. -]{2,14}$/i.test(cleanVal) ||
      cleanVal.split(" ").length <= 4
    ) {
      try {
        const token = await getToken();
        const res = await fetch(
          `${backendUrl}/api/resumes/expand-abbreviation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              text: cleanVal,
              context:
                field === "degree"
                  ? "degree / course qualification"
                  : "college / university / institution",
              location: personalInfo.location || "India",
            }),
          },
        );
        const data = await res.json();
        if (
          data?.success &&
          data.expandedText &&
          data.expandedText !== cleanVal
        ) {
          updateEducation(index, field, data.expandedText);
        }
      } catch {
        // ignore background error
      }
    }
  };

  // Dynamic Array Handlers
  const addEducation = () => {
    setEducation((prev) => [
      ...prev,
      {
        degree: "",
        institution: "",
        location: "",
        startDate: "",
        endDate: "",
        grade: "",
      },
    ]);
  };

  const removeEducation = (index) => {
    if (education.length === 1) {
      setEducation([
        {
          degree: "",
          institution: "",
          location: "",
          startDate: "",
          endDate: "",
          grade: "",
        },
      ]);
      return;
    }
    setEducation((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEducation = (index, field, value) => {
    setEducation((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  const addExperience = () => {
    setExperience((prev) => [
      ...prev,
      {
        company: "",
        role: "",
        location: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        responsibilitiesText: "",
        achievementsText: "",
      },
    ]);
  };

  const removeExperience = (index) => {
    if (experience.length === 1) {
      setExperience([
        {
          company: "",
          role: "",
          location: "",
          employmentType: "Full-time",
          startDate: "",
          endDate: "",
          isCurrent: false,
          responsibilitiesText: "",
          achievementsText: "",
          technologiesText: "",
        },
      ]);
      return;
    }
    setExperience((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExperience = (index, field, value) => {
    setExperience((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  const addProject = () => {
    setProjects((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        technologiesText: "",
        responsibilitiesText: "",
        outcome: "",
        githubUrl: "",
        liveUrl: "",
        startDate: "",
        endDate: "",
      },
    ]);
  };

  const removeProject = (index) => {
    if (projects.length === 1) {
      setProjects([
        {
          name: "",
          description: "",
          technologiesText: "",
          responsibilitiesText: "",
          outcome: "",
          githubUrl: "",
          liveUrl: "",
          startDate: "",
          endDate: "",
        },
      ]);
      return;
    }
    setProjects((prev) => prev.filter((_, i) => i !== index));
  };

  const updateProject = (index, field, value) => {
    setProjects((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  const addAchievement = () => {
    setAchievements((prev) => [
      ...prev,
      { title: "", organization: "", date: "", description: "" },
    ]);
  };

  const removeAchievement = (index) => {
    setAchievements((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAchievement = (index, field, value) => {
    setAchievements((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  const addCertification = () => {
    setCertifications((prev) => [
      ...prev,
      { name: "", organization: "", issueDate: "", credentialUrl: "" },
    ]);
  };

  const removeCertification = (index) => {
    setCertifications((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCertification = (index, field, value) => {
    setCertifications((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  // Helper to serialize experience & projects for API
  const preparePayload = () => {
    return {
      personalInfo,
      targetRole: targetRole.trim(),
      summary: summary.trim(),
      template: selectedTemplate,
      jobDescription: jobDescription.trim(),
      status: "completed",
      education: education.filter(
        (e) => e.degree.trim() || e.institution.trim(),
      ),
      experience: experience
        .filter((e) => e.company.trim() || e.role.trim())
        .map((e) => ({
          company: e.company,
          role: e.role,
          location: e.location,
          employmentType: e.employmentType,
          startDate: e.startDate,
          endDate: e.isCurrent ? "Present" : e.endDate,
          isCurrent: e.isCurrent,
          responsibilities:
            typeof e.responsibilitiesText === "string"
              ? e.responsibilitiesText
                  .split("\n")
                  .map((r) => r.trim())
                  .filter(Boolean)
              : e.responsibilities || [],
          achievements:
            typeof e.achievementsText === "string"
              ? e.achievementsText
                  .split("\n")
                  .map((a) => a.trim())
                  .filter(Boolean)
              : e.achievements || [],
          technologies:
            typeof e.technologiesText === "string"
              ? e.technologiesText
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
              : e.technologies || [],
        })),
      projects: projects
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name,
          description: p.description,
          outcome: p.outcome,
          githubUrl: p.githubUrl,
          liveUrl: p.liveUrl,
          startDate: p.startDate || "",
          endDate: p.endDate || "",
          technologies:
            typeof p.technologiesText === "string"
              ? p.technologiesText
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
              : p.technologies || [],
          responsibilities:
            typeof p.responsibilitiesText === "string"
              ? p.responsibilitiesText
                  .split("\n")
                  .map((r) => r.trim())
                  .filter(Boolean)
              : p.responsibilities || [],
        })),
      skills,
      achievements: achievements.filter((a) => a.title.trim()),
      certifications: certifications.filter((c) => c.name.trim()),
    };
  };

  // Validation
  const validateForm = () => {
    const errs = {};
    if (!personalInfo.fullName.trim()) errs.fullName = "Full Name is required";
    if (!personalInfo.email.trim()) errs.email = "Email Address is required";
    if (!targetRole.trim()) errs.targetRole = "Target Job Role is required";

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fill in the required fields highlighted in red.");
      return false;
    }
    return true;
  };

  // 1. Submit Form & Save/Generate Resume
  const handleCreateResume = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = await getToken();
      const payload = preparePayload();

      let res;
      if (savedResume?._id) {
        res = await fetch(`${backendUrl}/api/resumes/${savedResume._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${backendUrl}/api/resumes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save resume");
      }

      setSavedResume(data.resume);
      toast.success("Resume saved & preview generated successfully!");

      // Smooth scroll to preview section
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } catch (err) {
      console.error("Save resume error:", err);
      toast.error(err.message || "Failed to create resume.");
    } finally {
      setLoading(false);
    }
  };

  // 2. AI Polish Professional Summary
  const handleImproveSummary = async () => {
    if (!summary.trim() && !targetRole.trim()) {
      toast.error("Please enter a Target Job Role or rough Summary first.");
      return;
    }

    setAiImprovingSummary(true);
    try {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/api/resumes/improve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          section: "summary",
          sectionData: { summary },
          context: {
            targetRole,
            jobDescription,
            skills,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "AI summary improvement failed");
      }

      if (data.improvedData?.summary) {
        setSummary(data.improvedData.summary);
        toast.success("Summary enhanced with AI!");
      } else if (typeof data.improvedData === "string") {
        setSummary(data.improvedData);
        toast.success("Summary enhanced with AI!");
      }
    } catch (err) {
      console.error("AI Summary error:", err);
      toast.error(err.message || "Failed to enhance summary.");
    } finally {
      setAiImprovingSummary(false);
    }
  };

  // 2b. AI Expand Work Experience Bullets (min 3 bullets/sentences)
  const handleImproveExperienceBullets = async (index) => {
    const exp = experience[index];
    if (!exp) return;

    if (
      !exp.role?.trim() &&
      !exp.company?.trim() &&
      !exp.responsibilitiesText?.trim() &&
      !exp.technologiesText?.trim()
    ) {
      toast.error(
        "Please enter Company, Role, or rough responsibilities first.",
      );
      return;
    }

    setImprovingExpIndex(index);
    try {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/api/resumes/improve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          section: "experienceBullets",
          sectionData: {
            company: exp.company,
            role: exp.role,
            technologiesText: exp.technologiesText,
            responsibilitiesText: exp.responsibilitiesText,
          },
          context: {
            targetRole,
            jobDescription,
            skills,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to expand experience bullets");
      }

      const result = data.improvedData;
      let newText = "";
      if (Array.isArray(result?.bullets) && result.bullets.length > 0) {
        newText = result.bullets
          .map((b) => b.trim())
          .filter(Boolean)
          .join("\n");
      } else if (Array.isArray(result) && result.length > 0) {
        newText = result
          .map((b) => (typeof b === "string" ? b.trim() : JSON.stringify(b)))
          .filter(Boolean)
          .join("\n");
      } else if (typeof result === "string") {
        newText = result.trim();
      }

      if (newText) {
        updateExperience(index, "responsibilitiesText", newText);
        toast.success("Experience bullets enhanced with AI!");
      }
    } catch (err) {
      console.error("AI Experience Bullets error:", err);
      toast.error(err.message || "Failed to expand experience bullets.");
    } finally {
      setImprovingExpIndex(null);
    }
  };

  // 2c. AI Generate / Expand Project Description (min 3 lines/sentences)
  const handleImproveProjectDescription = async (index) => {
    const proj = projects[index];
    if (!proj) return;

    if (
      !proj.name?.trim() &&
      !proj.technologiesText?.trim() &&
      !proj.responsibilitiesText?.trim() &&
      !proj.description?.trim()
    ) {
      toast.error(
        "Please enter a Project Name, Technologies, or feature keywords first.",
      );
      return;
    }

    setImprovingProjIndex(index);
    try {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/api/resumes/improve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          section: "projectDescription",
          sectionData: {
            name: proj.name,
            technologiesText: proj.technologiesText,
            responsibilitiesText: proj.responsibilitiesText,
            description: proj.description,
          },
          context: {
            targetRole,
            jobDescription,
            skills,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message || "Failed to generate project description",
        );
      }

      const result = data.improvedData;
      let newText = "";
      if (Array.isArray(result?.bullets) && result.bullets.length > 0) {
        newText = result.bullets
          .map((b) => b.trim())
          .filter(Boolean)
          .join("\n");
      } else if (Array.isArray(result) && result.length > 0) {
        newText = result
          .map((b) => (typeof b === "string" ? b.trim() : JSON.stringify(b)))
          .filter(Boolean)
          .join("\n");
      } else if (typeof result?.description === "string") {
        newText = result.description.trim();
      } else if (typeof result === "string") {
        newText = result.trim();
      }

      if (newText) {
        updateProject(index, "responsibilitiesText", newText);
        toast.success("Project description generated with AI!");
      }
    } catch (err) {
      console.error("AI Project Description error:", err);
      toast.error(err.message || "Failed to generate project description.");
    } finally {
      setImprovingProjIndex(null);
    }
  };

  // 3. AI Generate / Polish All Sections
  const handleAiGenerateAll = async () => {
    if (!savedResume?._id) {
      toast.error("Please save your resume first by clicking 'Create Resume'.");
      return;
    }

    setAiGeneratingAll(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${backendUrl}/api/resumes/${savedResume._id}/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "AI resume generation failed");
      }

      setSavedResume(data.resume);
      if (data.resume.summary) setSummary(data.resume.summary);
      toast.success("Resume bullet points and content polished with AI!");
    } catch (err) {
      console.error("AI Generate all error:", err);
      toast.error(err.message || "Failed to generate AI content.");
    } finally {
      setAiGeneratingAll(false);
    }
  };

  // 4. Run ATS Scoring
  const handleAtsAnalysis = async () => {
    if (!savedResume?._id) {
      toast.error("Please click 'Create Resume' first.");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Please enter a target Job Description in Section 2.");
      return;
    }

    setAtsAnalyzing(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${backendUrl}/api/resumes/${savedResume._id}/ats-analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ jobDescription }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "ATS analysis failed");
      }

      setSavedResume((prev) => ({
        ...prev,
        atsAnalysis: data.atsAnalysis,
      }));
      toast.success(
        `ATS Match Score: ${data.atsAnalysis.score}/100 calculated!`,
      );
    } catch (err) {
      console.error("ATS analysis error:", err);
      toast.error(err.message || "Failed to run ATS analysis.");
    } finally {
      setAtsAnalyzing(false);
    }
  };

  // 5. Download PDF Binary
  const handleDownloadPdf = async () => {
    let resumeId = savedResume?._id;

    if (!resumeId) {
      if (!validateForm()) return;
      setDownloadingPdf(true);
      try {
        const token = await getToken();
        const payload = preparePayload();
        const res = await fetch(`${backendUrl}/api/resumes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Save failed");
        setSavedResume(data.resume);
        resumeId = data.resume._id;
      } catch (err) {
        setDownloadingPdf(false);
        toast.error("Could not prepare resume before export: " + err.message);
        return;
      }
    }

    setDownloadingPdf(true);
    try {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/api/resumes/${resumeId}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          format: "pdf",
          template: selectedTemplate,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to generate PDF document");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const safeName = (personalInfo.fullName || "Resume")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .toLowerCase();

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${safeName}_resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("PDF Resume downloaded successfully!");
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error(err.message || "Failed to download PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // 6. Download DOCX Binary
  const handleDownloadDocx = async () => {
    if (!savedResume?._id) {
      toast.error("Please click 'Create Resume' first.");
      return;
    }

    setDownloadingDocx(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${backendUrl}/api/resumes/${savedResume._id}/export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            format: "docx",
            template: selectedTemplate,
          }),
        },
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to generate DOCX document");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const safeName = (personalInfo.fullName || "Resume")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .toLowerCase();

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${safeName}_resume.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Word Document (.docx) downloaded successfully!");
    } catch (err) {
      console.error("DOCX download error:", err);
      toast.error(err.message || "Failed to download DOCX.");
    } finally {
      setDownloadingDocx(false);
    }
  };

  // Live preview data
  const currentPreview = savedResume || {
    personalInfo,
    targetRole,
    summary,
    education: education.filter((e) => e.degree || e.institution),
    experience: experience
      .filter((e) => e.company || e.role)
      .map((e) => ({
        ...e,
        responsibilities:
          typeof e.responsibilitiesText === "string"
            ? e.responsibilitiesText.split("\n").filter(Boolean)
            : e.responsibilities || [],
        achievements:
          typeof e.achievementsText === "string"
            ? e.achievementsText.split("\n").filter(Boolean)
            : e.achievements || [],
        technologies:
          typeof e.technologiesText === "string"
            ? e.technologiesText
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : e.technologies || [],
      })),
    projects: projects
      .filter((p) => p.name)
      .map((p) => ({
        ...p,
        technologies:
          typeof p.technologiesText === "string"
            ? p.technologiesText
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : p.technologies || [],
        responsibilities:
          typeof p.responsibilitiesText === "string"
            ? p.responsibilitiesText.split("\n").filter(Boolean)
            : p.responsibilities || [],
        startDate: p.startDate || "",
        endDate: p.endDate || "",
      })),
    skills,
    achievements: achievements.filter((a) => a.title),
    certifications: certifications.filter((c) => c.name),
    template: selectedTemplate,
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] rounded-2xl p-6 sm:p-8 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
                <Sparkles className="size-6 text-white" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                AI Resume Builder
              </h1>
            </div>
            <p className="mt-2 text-white/90 text-sm sm:text-base max-w-2xl leading-relaxed">
              Create, polish, and export professional ATS-ready resumes in a
              single page. Enter your details below with date pickers, select a
              template, and download your styled PDF instantly.
            </p>
          </div>
          {savedResume && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="px-5 py-2.5 rounded-xl bg-white text-indigo-600 font-semibold text-sm hover:bg-white/90 transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
            >
              {downloadingPdf ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              <span>Download PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Single-Page Form */}
      <form onSubmit={handleCreateResume} className="space-y-6">
        {/* 1. Personal Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("personal")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <User className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  1. Personal Information
                </h2>
                <p className="text-xs text-gray-500">
                  Contact info, links, and identity
                </p>
              </div>
            </div>
            {openSections.personal ? (
              <ChevronUp className="size-5 text-gray-400" />
            ) : (
              <ChevronDown className="size-5 text-gray-400" />
            )}
          </button>

          {openSections.personal && (
            <div className="p-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aditi Raipure"
                  value={personalInfo.fullName}
                  onChange={(e) => {
                    setPersonalInfo({
                      ...personalInfo,
                      fullName: e.target.value,
                    });
                    if (errors.fullName)
                      setErrors({ ...errors, fullName: null });
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 ${
                    errors.fullName
                      ? "border-rose-300 focus:ring-rose-200"
                      : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100"
                  }`}
                />
                {errors.fullName && (
                  <p className="text-xs text-rose-500 mt-1">
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. aditi@example.com"
                  value={personalInfo.email}
                  onChange={(e) => {
                    setPersonalInfo({ ...personalInfo, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 ${
                    errors.email
                      ? "border-rose-300 focus:ring-rose-200"
                      : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100"
                  }`}
                />
                {errors.email && (
                  <p className="text-xs text-rose-500 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={personalInfo.phone}
                  onChange={(e) =>
                    setPersonalInfo({ ...personalInfo, phone: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pune, India"
                  value={personalInfo.location}
                  onChange={(e) =>
                    setPersonalInfo({
                      ...personalInfo,
                      location: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={personalInfo.linkedin}
                  onChange={(e) =>
                    setPersonalInfo({
                      ...personalInfo,
                      linkedin: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  GitHub Profile
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/username"
                  value={personalInfo.github}
                  onChange={(e) =>
                    setPersonalInfo({ ...personalInfo, github: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Portfolio / Personal Website
                </label>
                <input
                  type="url"
                  placeholder="https://aditi.dev"
                  value={personalInfo.portfolio}
                  onChange={(e) =>
                    setPersonalInfo({
                      ...personalInfo,
                      portfolio: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Target Job Role & Context */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("target")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Target className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  2. Target Role & Job Description
                </h2>
                <p className="text-xs text-gray-500">
                  Tailors resume headers, AI suggestions, and ATS keyword
                  matching
                </p>
              </div>
            </div>
            {openSections.target ? (
              <ChevronUp className="size-5 text-gray-400" />
            ) : (
              <ChevronDown className="size-5 text-gray-400" />
            )}
          </button>

          {openSections.target && (
            <div className="p-6 border-t border-gray-100 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Job Role <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Full Stack Developer, Frontend Engineer, DevOps Specialist"
                  value={targetRole}
                  onChange={(e) => {
                    setTargetRole(e.target.value);
                    if (errors.targetRole)
                      setErrors({ ...errors, targetRole: null });
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 ${
                    errors.targetRole
                      ? "border-rose-300 focus:ring-rose-200"
                      : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100"
                  }`}
                />
                {errors.targetRole && (
                  <p className="text-xs text-rose-500 mt-1">
                    {errors.targetRole}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Job Description (Optional - For ATS Scoring & Tailoring)
                </label>
                <textarea
                  rows={3}
                  placeholder="Paste the target job description here to check keyword matches and tailored recommendations..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-y"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Professional Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("summary")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <FileText className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  3. Professional Summary
                </h2>
                <p className="text-xs text-gray-500">
                  Concise overview of your experience and value
                </p>
              </div>
            </div>
            {openSections.summary ? (
              <ChevronUp className="size-5 text-gray-400" />
            ) : (
              <ChevronDown className="size-5 text-gray-400" />
            )}
          </button>

          {openSections.summary && (
            <div className="p-6 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-700">
                  Summary Text
                </label>
                <button
                  type="button"
                  onClick={handleImproveSummary}
                  disabled={aiImprovingSummary}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {aiImprovingSummary ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5 text-indigo-600" />
                  )}
                  <span>AI Polish Summary</span>
                </button>
              </div>
              <textarea
                rows={4}
                placeholder="Write a brief professional summary or enter rough bullet points, then click 'AI Polish Summary'..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-y"
              />
            </div>
          )}
        </div>

        {/* 4. Education */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("education")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <GraduationCap className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  4. Education
                </h2>
                <p className="text-xs text-gray-500">
                  Degrees, colleges, grades, and graduation dates
                </p>
              </div>
            </div>
            {openSections.education ? (
              <ChevronUp className="size-5 text-gray-400" />
            ) : (
              <ChevronDown className="size-5 text-gray-400" />
            )}
          </button>

          {openSections.education && (
            <div className="p-6 border-t border-gray-100 space-y-5">
              {education.map((edu, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-gray-150 bg-gray-50/50 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">
                      Education #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove education"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Degree / Course
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. BE Electronics & Telecommunication"
                        value={edu.degree}
                        onChange={(e) =>
                          updateEducation(index, "degree", e.target.value)
                        }
                        onBlur={(e) =>
                          handleExpandEducationField(
                            index,
                            "degree",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Institution / University
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. PVPIT, Pune"
                        value={edu.institution}
                        onChange={(e) =>
                          updateEducation(index, "institution", e.target.value)
                        }
                        onBlur={(e) =>
                          handleExpandEducationField(
                            index,
                            "institution",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pune, India"
                        value={edu.location}
                        onChange={(e) =>
                          updateEducation(index, "location", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    {/* Date Pickers for Education */}
                    <ResumeDatePicker
                      label="Start Date"
                      value={edu.startDate}
                      onChange={(val) =>
                        updateEducation(index, "startDate", val)
                      }
                      placeholder="Select Start Date"
                    />

                    <ResumeDatePicker
                      label="End Date / Expected"
                      value={edu.endDate}
                      onChange={(val) => updateEducation(index, "endDate", val)}
                      placeholder="Select End Date"
                    />

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Grade / CGPA
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CGPA: 9.12 / 10"
                        value={edu.grade}
                        onChange={(e) =>
                          updateEducation(index, "grade", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addEducation}
                className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/50 text-indigo-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Add Education</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. Experience */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("experience")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-sky-50 text-sky-600">
                <Briefcase className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  5. Experience
                </h2>
                <p className="text-xs text-gray-500">
                  Work history, internships, and professional roles
                </p>
              </div>
            </div>
            {openSections.experience ? (
              <ChevronUp className="size-5 text-gray-400" />
            ) : (
              <ChevronDown className="size-5 text-gray-400" />
            )}
          </button>

          {openSections.experience && (
            <div className="p-6 border-t border-gray-100 space-y-5">
              {experience.map((exp, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-gray-150 bg-gray-50/50 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">
                      Experience #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExperience(index)}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove experience"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Google, TechNova"
                        value={exp.company}
                        onChange={(e) =>
                          updateExperience(index, "company", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Job Title / Role
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Software Engineer Intern"
                        value={exp.role}
                        onChange={(e) =>
                          updateExperience(index, "role", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pune / Remote"
                        value={exp.location}
                        onChange={(e) =>
                          updateExperience(index, "location", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    {/* Date Pickers for Experience */}
                    <ResumeDatePicker
                      label="Start Date"
                      value={exp.startDate}
                      onChange={(val) =>
                        updateExperience(index, "startDate", val)
                      }
                      placeholder="Select Start Date"
                    />

                    <ResumeDatePicker
                      label="End Date"
                      value={exp.endDate}
                      onChange={(val) =>
                        updateExperience(index, "endDate", val)
                      }
                      disabled={exp.isCurrent}
                      disabledText="Present"
                      placeholder="Select End Date"
                    />

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 font-medium">
                        <input
                          type="checkbox"
                          checked={exp.isCurrent}
                          onChange={(e) =>
                            updateExperience(
                              index,
                              "isCurrent",
                              e.target.checked,
                            )
                          }
                          className="rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500 size-4"
                        />
                        <span>Currently Working Here</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-gray-600">
                        Key Responsibilities & Achievements (One per line)
                      </label>
                      <button
                        type="button"
                        onClick={() => handleImproveExperienceBullets(index)}
                        disabled={improvingExpIndex === index}
                        className="px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="AI expand rough points or keywords into professional resume bullets"
                      >
                        <Sparkles className="size-3" />
                        <span>
                          {improvingExpIndex === index
                            ? "Expanding..."
                            : "AI Expand Bullets"}
                        </span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Enter bullets here"
                      value={exp.responsibilitiesText}
                      onChange={(e) =>
                        updateExperience(
                          index,
                          "responsibilitiesText",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500 resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Technologies Used (Comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. React, Node.js, Express, MongoDB, Docker"
                      value={exp.technologiesText}
                      onChange={(e) =>
                        updateExperience(
                          index,
                          "technologiesText",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addExperience}
                className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/50 text-indigo-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Add Experience</span>
              </button>
            </div>
          )}
        </div>

        {/* 6. Projects */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("projects")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-pink-50 text-pink-600">
                <FolderGit2 className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  6. Projects
                </h2>
                <p className="text-xs text-gray-500">
                  Key personal and professional projects with timeline
                </p>
              </div>
            </div>
            {openSections.projects ? (
              <ChevronUp className="size-5 text-gray-400" />
            ) : (
              <ChevronDown className="size-5 text-gray-400" />
            )}
          </button>

          {openSections.projects && (
            <div className="p-6 border-t border-gray-100 space-y-5">
              {projects.map((proj, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-gray-150 bg-gray-50/50 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">
                      Project #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeProject(index)}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove project"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Project Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. QuickAI SaaS Platform"
                        value={proj.name}
                        onChange={(e) =>
                          updateProject(index, "name", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        GitHub Repo URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/user/project"
                        value={proj.githubUrl}
                        onChange={(e) =>
                          updateProject(index, "githubUrl", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Live Demo URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://project.vercel.app"
                        value={proj.liveUrl}
                        onChange={(e) =>
                          updateProject(index, "liveUrl", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Project Date Pickers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ResumeDatePicker
                      label="Start Date"
                      value={proj.startDate}
                      onChange={(val) => updateProject(index, "startDate", val)}
                      placeholder="Select Project Start Date"
                    />

                    <ResumeDatePicker
                      label="End Date"
                      value={proj.endDate}
                      onChange={(val) => updateProject(index, "endDate", val)}
                      placeholder="Select Project End Date"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-gray-600">
                        Project Description / Features (One per line)
                      </label>
                      <button
                        type="button"
                        onClick={() => handleImproveProjectDescription(index)}
                        disabled={improvingProjIndex === index}
                        className="px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="AI transform keywords or features into at least 3 professional project description lines"
                      >
                        <Sparkles className="size-3" />
                        <span>
                          {improvingProjIndex === index
                            ? "Generating..."
                            : "AI Generate Description"}
                        </span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="e.g. Inventory management, billing, customer management, JWT login, REST APIs&#10;Click 'AI Generate Description' to expand into 3+ professional resume sentences"
                      value={proj.responsibilitiesText}
                      onChange={(e) =>
                        updateProject(
                          index,
                          "responsibilitiesText",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500 resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Technologies Used (Comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. React, Express, MongoDB, Tailwind CSS, Clerk"
                      value={proj.technologiesText}
                      onChange={(e) =>
                        updateProject(index, "technologiesText", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addProject}
                className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/50 text-indigo-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Add Project</span>
              </button>
            </div>
          )}
        </div>

        {/* 7. Skills */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("skills")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <Wrench className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  7. Categorized Skills
                </h2>
                <p className="text-xs text-gray-500">
                  Organized technical competencies & tools
                </p>
              </div>
            </div>
            {openSections.skills ? (
              <ChevronUp className="size-5 text-gray-400" />
            ) : (
              <ChevronDown className="size-5 text-gray-400" />
            )}
          </button>

          {openSections.skills && (
            <div className="p-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-5">
              {SKILL_CATEGORIES.map((cat) => (
                <div
                  key={cat.key}
                  className="space-y-2 p-3.5 rounded-xl border border-gray-150 bg-gray-50/30"
                >
                  <label className="block text-xs font-semibold text-gray-700">
                    {cat.label}
                  </label>

                  {/* Skill Chips */}
                  <div className="flex flex-wrap gap-1.5 min-h-7">
                    {skills[cat.key]?.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(cat.key, sIdx)}
                          className="hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Input field */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={cat.placeholder}
                      value={skillInputs[cat.key]}
                      onChange={(e) =>
                        setSkillInputs({
                          ...skillInputs,
                          [cat.key]: e.target.value,
                        })
                      }
                      onKeyDown={(e) => handleSkillKeyDown(e, cat.key)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSkill(cat.key)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 8. Achievements & 9. Certifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Achievements */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("achievements")}
              className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                  <Trophy className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    8. Achievements
                  </h2>
                  <p className="text-xs text-gray-500">
                    Awards, hackathons & recognitions
                  </p>
                </div>
              </div>
              {openSections.achievements ? (
                <ChevronUp className="size-5 text-gray-400" />
              ) : (
                <ChevronDown className="size-5 text-gray-400" />
              )}
            </button>

            {openSections.achievements && (
              <div className="p-6 border-t border-gray-100 space-y-4">
                {achievements.map((ach, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl border border-gray-150 bg-gray-50/50 space-y-2.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-600">
                        Achievement #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAchievement(index)}
                        className="text-gray-400 hover:text-rose-600 cursor-pointer p-0.5"
                        title="Remove achievement"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Title (e.g. 1st Place at National Hackathon 2025)"
                      value={ach.title}
                      onChange={(e) =>
                        updateAchievement(index, "title", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Organization / Issuer (e.g. IEEE)"
                        value={ach.organization}
                        onChange={(e) =>
                          updateAchievement(
                            index,
                            "organization",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                      <ResumeDatePicker
                        label=""
                        value={ach.date}
                        onChange={(val) =>
                          updateAchievement(index, "date", val)
                        }
                        placeholder="Date / Month"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Description / Key highlight (Optional)"
                      value={ach.description || ""}
                      onChange={(e) =>
                        updateAchievement(index, "description", e.target.value)
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAchievement}
                  className="w-full py-2 rounded-lg border border-dashed border-gray-300 text-indigo-600 text-xs font-semibold flex items-center justify-center gap-1 hover:border-indigo-500 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Add Achievement</span>
                </button>
              </div>
            )}
          </div>

          {/* Certifications */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("certifications")}
              className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-red-50 text-red-600">
                  <Award className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    9. Certifications
                  </h2>
                  <p className="text-xs text-gray-500">
                    Licenses & certified credentials
                  </p>
                </div>
              </div>
              {openSections.certifications ? (
                <ChevronUp className="size-5 text-gray-400" />
              ) : (
                <ChevronDown className="size-5 text-gray-400" />
              )}
            </button>

            {openSections.certifications && (
              <div className="p-6 border-t border-gray-100 space-y-4">
                {certifications.map((cert, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl border border-gray-150 bg-gray-50/50 space-y-2.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-600">
                        Certification #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCertification(index)}
                        className="text-gray-400 hover:text-rose-600 cursor-pointer p-0.5"
                        title="Remove certification"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Certification Name (e.g. AWS Certified Developer)"
                      value={cert.name}
                      onChange={(e) =>
                        updateCertification(index, "name", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Issuing Organization (e.g. AWS)"
                        value={cert.organization}
                        onChange={(e) =>
                          updateCertification(
                            index,
                            "organization",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                      <ResumeDatePicker
                        label=""
                        value={cert.issueDate}
                        onChange={(val) =>
                          updateCertification(index, "issueDate", val)
                        }
                        placeholder="Issue Date"
                      />
                    </div>
                    <input
                      type="url"
                      placeholder="Credential Verification URL (Optional)"
                      value={cert.credentialUrl || ""}
                      onChange={(e) =>
                        updateCertification(
                          index,
                          "credentialUrl",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCertification}
                  className="w-full py-2 rounded-lg border border-dashed border-gray-300 text-indigo-600 text-xs font-semibold flex items-center justify-center gap-1 hover:border-indigo-500 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Add Certification</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 10. Template Selection Cards */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("template")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <LayoutTemplate className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  10. Choose Resume Template
                </h2>
                <p className="text-xs text-gray-500">
                  Pick the visual styling for your live preview and exported
                  PDF/DOCX
                </p>
              </div>
            </div>
            {openSections.template ? (
              <ChevronUp className="size-5 text-gray-400" />
            ) : (
              <ChevronDown className="size-5 text-gray-400" />
            )}
          </button>

          {openSections.template && (
            <div className="p-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TEMPLATES.map((tpl) => {
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/20 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${tpl.badgeColor}`}
                        >
                          {tpl.name}
                        </span>
                        {isSelected && (
                          <Check className="size-4 text-indigo-600 stroke-[3]" />
                        )}
                      </div>
                      <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-400">
                        Accent
                      </span>
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tpl.accentColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CREATE RESUME SUBMIT BUTTON */}
        <div className="pt-2 flex justify-start">
          <button
            type="submit"
            disabled={loading}
            className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] text-white font-semibold text-sm hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Generating & Saving Resume...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>Create Resume & Generate Preview</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* LIVE RESUME PREVIEW SECTION - Hidden until resume is created */}
      {/* ========================================================================= */}
      {savedResume && (
        <section ref={previewRef} className="space-y-6 pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="size-5" />
                </span>
                <h2 className="text-xl font-bold text-gray-900">
                  Live Resume Preview
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Styled using the{" "}
                <strong>
                  {TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
                </strong>{" "}
                template.
              </p>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5">
              {savedResume && (
                <>
                  <button
                    type="button"
                    onClick={handleAiGenerateAll}
                    disabled={aiGeneratingAll}
                    className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Enhance experience and project bullet points with AI"
                  >
                    {aiGeneratingAll ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    <span>AI Polish All</span>
                  </button>

                  {jobDescription && (
                    <button
                      type="button"
                      onClick={handleAtsAnalysis}
                      disabled={atsAnalyzing}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {atsAnalyzing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Target className="size-3.5" />
                      )}
                      <span>ATS Scan</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDownloadDocx}
                    disabled={downloadingDocx}
                    className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {downloadingDocx ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    <span>DOCX</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {downloadingPdf ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* ATS Score Notification Widget if analyzed */}
          {savedResume?.atsAnalysis?.score > 0 && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shrink-0">
                  {savedResume.atsAnalysis.score}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">
                    ATS Match Score: {savedResume.atsAnalysis.score}/100
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Matched keywords:{" "}
                    {savedResume.atsAnalysis.matchedKeywords
                      ?.slice(0, 5)
                      .join(", ") || "Strong match"}
                  </p>
                </div>
              </div>
              {savedResume.atsAnalysis.missingKeywords?.length > 0 && (
                <span className="text-[11px] text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md">
                  Missing:{" "}
                  {savedResume.atsAnalysis.missingKeywords
                    .slice(0, 3)
                    .join(", ")}
                </span>
              )}
            </div>
          )}

          {/* Visual Document Canvas */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 sm:p-12 max-w-4xl mx-auto min-h-[700px] text-gray-800">
            {/* Header */}
            <div
              className={`pb-4 border-b ${
                selectedTemplate === "modern"
                  ? "border-indigo-500"
                  : selectedTemplate === "classic"
                    ? "border-gray-800 text-center"
                    : selectedTemplate === "professional"
                      ? "border-teal-600"
                      : "border-gray-200"
              }`}
            >
              <h1
                className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                  selectedTemplate === "modern"
                    ? "text-indigo-600"
                    : selectedTemplate === "classic"
                      ? "text-gray-900 font-serif"
                      : selectedTemplate === "professional"
                        ? "text-slate-900"
                        : "text-gray-900"
                }`}
              >
                {currentPreview.personalInfo?.fullName || "Your Full Name"}
              </h1>
              <p className="text-base font-semibold text-gray-600 mt-1">
                {currentPreview.targetRole || "Target Job Title"}
              </p>

              {/* Contact details */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2.5">
                {currentPreview.personalInfo?.email && (
                  <span>{currentPreview.personalInfo.email}</span>
                )}
                {currentPreview.personalInfo?.phone && (
                  <span>• {currentPreview.personalInfo.phone}</span>
                )}
                {currentPreview.personalInfo?.location && (
                  <span>• {currentPreview.personalInfo.location}</span>
                )}
                {currentPreview.personalInfo?.linkedin && (
                  <span>
                    •{" "}
                    <a
                      href={currentPreview.personalInfo.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      LinkedIn
                    </a>
                  </span>
                )}
                {currentPreview.personalInfo?.github && (
                  <span>
                    •{" "}
                    <a
                      href={currentPreview.personalInfo.github}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      GitHub
                    </a>
                  </span>
                )}
                {currentPreview.personalInfo?.portfolio && (
                  <span>
                    •{" "}
                    <a
                      href={currentPreview.personalInfo.portfolio}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      Portfolio
                    </a>
                  </span>
                )}
              </div>
            </div>

            {/* Resume Sections Body */}
            <div className="space-y-6 mt-6 text-sm">
              {/* Summary */}
              {currentPreview.summary && (
                <div>
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider pb-1 mb-2 border-b ${
                      selectedTemplate === "modern"
                        ? "text-indigo-600 border-indigo-100"
                        : selectedTemplate === "classic"
                          ? "text-gray-800 border-gray-300 font-serif"
                          : selectedTemplate === "professional"
                            ? "text-teal-700 border-teal-100"
                            : "text-gray-700 border-gray-150"
                    }`}
                  >
                    Professional Summary
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    {currentPreview.summary}
                  </p>
                </div>
              )}

              {/* Experience */}
              {currentPreview.experience?.length > 0 && (
                <div>
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider pb-1 mb-3 border-b ${
                      selectedTemplate === "modern"
                        ? "text-indigo-600 border-indigo-100"
                        : selectedTemplate === "classic"
                          ? "text-gray-800 border-gray-300 font-serif"
                          : selectedTemplate === "professional"
                            ? "text-teal-700 border-teal-100"
                            : "text-gray-700 border-gray-150"
                    }`}
                  >
                    Experience
                  </h3>
                  <div className="space-y-4">
                    {currentPreview.experience.map((exp, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm">
                          <span className="text-gray-900">
                            <strong className="font-bold text-gray-900">
                              {exp.company || "Company"}
                            </strong>
                            <span className="font-normal text-gray-500">
                              {" "}
                              -{" "}
                            </span>
                            <strong className="font-bold text-gray-900">
                              {exp.role || "Role"}
                            </strong>
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatResumeDate(exp.startDate)} –{" "}
                            {exp.isCurrent
                              ? "Present"
                              : formatResumeDate(exp.endDate) || "Present"}{" "}
                            {exp.location && `| ${exp.location}`}
                          </span>
                        </div>

                        {/* Responsibilities */}
                        {exp.responsibilities?.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 text-xs text-gray-700 pl-1 mt-1">
                            {exp.responsibilities.map((resp, rIdx) => (
                              <li key={rIdx} className="leading-relaxed">
                                {resp}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {currentPreview.projects?.length > 0 && (
                <div>
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider pb-1 mb-3 border-b ${
                      selectedTemplate === "modern"
                        ? "text-indigo-600 border-indigo-100"
                        : selectedTemplate === "classic"
                          ? "text-gray-800 border-gray-300 font-serif"
                          : selectedTemplate === "professional"
                            ? "text-teal-700 border-teal-100"
                            : "text-gray-700 border-gray-150"
                    }`}
                  >
                    Projects
                  </h3>
                  <div className="space-y-3">
                    {currentPreview.projects.map((proj, idx) => {
                      const dateRange = [
                        formatResumeDate(proj.startDate),
                        formatResumeDate(proj.endDate),
                      ]
                        .filter(Boolean)
                        .join(" – ");
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs sm:text-sm">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <span className="font-bold text-gray-900">
                                {proj.name}
                              </span>
                              {proj.technologies?.length > 0 && (
                                <span className="text-xs text-gray-500 font-medium">
                                  | {proj.technologies.join(", ")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs shrink-0">
                              {dateRange && (
                                <span className="text-gray-500">
                                  {dateRange}
                                </span>
                              )}
                              {proj.githubUrl && (
                                <a
                                  href={proj.githubUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-600 hover:underline"
                                >
                                  GitHub
                                </a>
                              )}
                              {proj.liveUrl && (
                                <a
                                  href={proj.liveUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-600 hover:underline"
                                >
                                  Demo
                                </a>
                              )}
                            </div>
                          </div>

                          {proj.responsibilities?.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-700 pl-1">
                              {proj.responsibilities.map((r, rIdx) => (
                                <li key={rIdx} className="leading-relaxed">
                                  {r}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            proj.description && (
                              <p className="text-xs text-gray-700 leading-relaxed">
                                {proj.description}
                              </p>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Education */}
              {currentPreview.education?.length > 0 && (
                <div>
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider pb-1 mb-3 border-b ${
                      selectedTemplate === "modern"
                        ? "text-indigo-600 border-indigo-100"
                        : selectedTemplate === "classic"
                          ? "text-gray-800 border-gray-300 font-serif"
                          : selectedTemplate === "professional"
                            ? "text-teal-700 border-teal-100"
                            : "text-gray-700 border-gray-150"
                    }`}
                  >
                    Education
                  </h3>
                  <div className="space-y-3">
                    {currentPreview.education.map((edu, idx) => {
                      const expandedDegree =
                        expandEducationDegree(edu.degree) || edu.degree;
                      const expandedInstitution =
                        expandEducationInstitution(edu.institution) ||
                        edu.institution;
                      const formattedGrade = formatEducationGrade(edu.grade);
                      const dateRange = [
                        formatResumeDate(edu.startDate),
                        formatResumeDate(edu.endDate),
                      ]
                        .filter(Boolean)
                        .join(" – ");

                      return (
                        <div
                          key={idx}
                          className="space-y-0.5 text-xs sm:text-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                            <div className="font-bold text-gray-900 uppercase tracking-wide">
                              {expandedInstitution}
                              {edu.location && (
                                <span className="font-semibold text-gray-600 normal-case">
                                  , {edu.location}
                                </span>
                              )}
                            </div>
                            {dateRange && (
                              <span className="text-xs text-gray-500 shrink-0 font-medium">
                                {dateRange}
                              </span>
                            )}
                          </div>
                          <div className="text-gray-700 text-xs sm:text-sm">
                            <span>{expandedDegree}</span>
                            {formattedGrade && (
                              <span className="text-gray-600 font-medium">
                                {" "}
                                ({formattedGrade})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Skills */}
              {currentPreview.skills &&
                Object.values(currentPreview.skills).some(
                  (arr) => arr?.length > 0,
                ) && (
                  <div>
                    <h3
                      className={`text-xs font-bold uppercase tracking-wider pb-1 mb-2.5 border-b ${
                        selectedTemplate === "modern"
                          ? "text-indigo-600 border-indigo-100"
                          : selectedTemplate === "classic"
                            ? "text-gray-800 border-gray-300 font-serif"
                            : selectedTemplate === "professional"
                              ? "text-teal-700 border-teal-100"
                              : "text-gray-700 border-gray-150"
                      }`}
                    >
                      Skills
                    </h3>
                    <div className="space-y-1.5 text-xs text-gray-700">
                      {SKILL_CATEGORIES.map((cat) => {
                        const skillList = currentPreview.skills[cat.key];
                        if (!skillList || skillList.length === 0) return null;
                        return (
                          <div
                            key={cat.key}
                            className="flex flex-col sm:flex-row sm:items-baseline gap-1"
                          >
                            <span className="font-semibold text-gray-900 min-w-36">
                              {cat.label}:
                            </span>
                            <span>{skillList.join(", ")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Achievements & Certifications */}
              {(currentPreview.achievements?.length > 0 ||
                currentPreview.certifications?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {currentPreview.achievements?.length > 0 && (
                    <div>
                      <h3
                        className={`text-xs font-bold uppercase tracking-wider pb-1 mb-2 border-b ${
                          selectedTemplate === "modern"
                            ? "text-indigo-600 border-indigo-100"
                            : selectedTemplate === "classic"
                              ? "text-gray-800 border-gray-300 font-serif"
                              : selectedTemplate === "professional"
                                ? "text-teal-700 border-teal-100"
                                : "text-gray-700 border-gray-150"
                        }`}
                      >
                        Achievements
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                        {currentPreview.achievements.map((ach, idx) => (
                          <li key={idx}>
                            <strong>{ach.title}</strong>{" "}
                            {ach.organization && `(${ach.organization})`}{" "}
                            {ach.date && (
                              <span className="text-gray-500">
                                • {formatResumeDate(ach.date)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentPreview.certifications?.length > 0 && (
                    <div>
                      <h3
                        className={`text-xs font-bold uppercase tracking-wider pb-1 mb-2 border-b ${
                          selectedTemplate === "modern"
                            ? "text-indigo-600 border-indigo-100"
                            : selectedTemplate === "classic"
                              ? "text-gray-800 border-gray-300 font-serif"
                              : selectedTemplate === "professional"
                                ? "text-teal-700 border-teal-100"
                                : "text-gray-700 border-gray-150"
                        }`}
                      >
                        Certifications
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                        {currentPreview.certifications.map((cert, idx) => (
                          <li key={idx}>
                            <strong>{cert.name}</strong>{" "}
                            {cert.organization && `— ${cert.organization}`}{" "}
                            {cert.issueDate && (
                              <span className="text-gray-500">
                                ({formatResumeDate(cert.issueDate)})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Download Bar */}
            <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-gray-400">
                Generated with QuickAI Resume Builder
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {downloadingPdf ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ResumeBuilder;
