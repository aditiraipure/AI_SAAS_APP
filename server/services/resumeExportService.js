import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import PDFDocument from "pdfkit";

// Theme styling configurations by template
const TEMPLATE_THEMES = {
  modern: {
    primaryColor: "#2563EB", // Blue 600
    secondaryColor: "#4B5563", // Gray 600
    textColor: "#1F2937", // Gray 800
    lineColor: "#DBEAFE", // Blue 100
    fontFamily: "Helvetica",
  },
  classic: {
    primaryColor: "#1E293B", // Slate 800
    secondaryColor: "#475569", // Slate 600
    textColor: "#0F172A", // Slate 900
    lineColor: "#CBD5E1", // Slate 300
    fontFamily: "Times-Roman",
  },
  minimal: {
    primaryColor: "#000000",
    secondaryColor: "#525252",
    textColor: "#171717",
    lineColor: "#E5E5E5",
    fontFamily: "Helvetica",
  },
  professional: {
    primaryColor: "#0F766E", // Teal 700
    secondaryColor: "#334155", // Slate 700
    textColor: "#111827", // Gray 900
    lineColor: "#CCFBF1", // Teal 100
    fontFamily: "Helvetica",
  },
};

/**
 * Generate PDF buffer from resume data
 */
export const generateResumePdf = async (resume) => {
  return new Promise((resolve, reject) => {
    try {
      const template = resume.template || "modern";
      const theme = TEMPLATE_THEMES[template] || TEMPLATE_THEMES.modern;

      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        bufferPages: true,
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const { personalInfo = {}, targetRole, summary, education = [], experience = [], projects = [], skills = {}, achievements = [], certifications = [] } = resume;

      // Header: Full Name
      doc
        .fontSize(22)
        .fillColor(theme.primaryColor)
        .text(personalInfo.fullName || "Candidate Name", { align: "left" });

      // Target Role
      if (targetRole) {
        doc
          .fontSize(13)
          .fillColor(theme.secondaryColor)
          .text(targetRole, { align: "left" })
          .moveDown(0.2);
      }

      // Contact info row
      const contactParts = [
        personalInfo.email,
        personalInfo.phone,
        personalInfo.location,
        personalInfo.linkedin,
        personalInfo.github,
        personalInfo.portfolio,
      ].filter(Boolean);

      if (contactParts.length > 0) {
        doc
          .fontSize(9)
          .fillColor(theme.secondaryColor)
          .text(contactParts.join(" | "), { align: "left" })
          .moveDown(0.6);
      }

      // Divider line
      doc
        .strokeColor(theme.lineColor)
        .lineWidth(1.5)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke()
        .moveDown(0.6);

      // Section Header Helper
      const renderSectionHeader = (title) => {
        doc.moveDown(0.5);
        doc
          .fontSize(12)
          .fillColor(theme.primaryColor)
          .text(title.toUpperCase(), { underline: false });
        doc
          .strokeColor(theme.lineColor)
          .lineWidth(1)
          .moveTo(40, doc.y + 2)
          .lineTo(555, doc.y + 2)
          .stroke()
          .moveDown(0.4);
      };

      // Summary
      if (summary && summary.trim()) {
        renderSectionHeader("Professional Summary");
        doc
          .fontSize(9.5)
          .fillColor(theme.textColor)
          .text(summary.trim(), { lineGap: 2 });
      }

      // Work Experience
      if (experience.length > 0) {
        renderSectionHeader("Work Experience");
        experience.forEach((exp) => {
          const dateRange = [exp.startDate, exp.isCurrent ? "Present" : exp.endDate].filter(Boolean).join(" - ");
          const roleCompany = `${exp.role || "Role"} | ${exp.company || "Company"}`;

          doc
            .fontSize(10.5)
            .fillColor(theme.textColor)
            .text(roleCompany, { continued: Boolean(dateRange) });

          if (dateRange) {
            doc
              .fontSize(9)
              .fillColor(theme.secondaryColor)
              .text(`  (${dateRange})`, { align: "right" });
          }

          if (exp.location || exp.employmentType) {
            doc
              .fontSize(8.5)
              .fillColor(theme.secondaryColor)
              .text([exp.location, exp.employmentType].filter(Boolean).join(" • "));
          }

          if (Array.isArray(exp.responsibilities) && exp.responsibilities.length > 0) {
            doc.moveDown(0.2);
            exp.responsibilities.forEach((resp) => {
              if (resp && resp.trim()) {
                doc
                  .fontSize(9)
                  .fillColor(theme.textColor)
                  .text(`•  ${resp.trim()}`, { indent: 10, lineGap: 1.5 });
              }
            });
          }

          if (Array.isArray(exp.achievements) && exp.achievements.length > 0) {
            exp.achievements.forEach((ach) => {
              if (ach && ach.trim()) {
                doc
                  .fontSize(9)
                  .fillColor(theme.textColor)
                  .text(`•  Key Result: ${ach.trim()}`, { indent: 10, lineGap: 1.5 });
              }
            });
          }

          if (Array.isArray(exp.technologies) && exp.technologies.length > 0) {
            doc
              .fontSize(8.5)
              .fillColor(theme.secondaryColor)
              .text(`Technologies: ${exp.technologies.join(", ")}`, { indent: 10 })
              .moveDown(0.3);
          } else {
            doc.moveDown(0.3);
          }
        });
      }

      // Projects
      if (projects.length > 0) {
        renderSectionHeader("Projects");
        projects.forEach((proj) => {
          doc
            .fontSize(10.5)
            .fillColor(theme.textColor)
            .text(proj.name || "Project");

          if (proj.description) {
            doc
              .fontSize(9)
              .fillColor(theme.textColor)
              .text(proj.description, { lineGap: 1.5 });
          }

          if (Array.isArray(proj.responsibilities) && proj.responsibilities.length > 0) {
            proj.responsibilities.forEach((r) => {
              if (r && r.trim()) {
                doc
                  .fontSize(9)
                  .fillColor(theme.textColor)
                  .text(`•  ${r.trim()}`, { indent: 10, lineGap: 1.5 });
              }
            });
          }

          if (Array.isArray(proj.technologies) && proj.technologies.length > 0) {
            doc
              .fontSize(8.5)
              .fillColor(theme.secondaryColor)
              .text(`Stack: ${proj.technologies.join(", ")}`, { indent: 10 });
          }

          const links = [proj.githubUrl && `GitHub: ${proj.githubUrl}`, proj.liveUrl && `Live: ${proj.liveUrl}`].filter(Boolean);
          if (links.length > 0) {
            doc
              .fontSize(8.5)
              .fillColor(theme.primaryColor)
              .text(links.join(" | "), { indent: 10 })
              .moveDown(0.3);
          } else {
            doc.moveDown(0.3);
          }
        });
      }

      // Education
      if (education.length > 0) {
        renderSectionHeader("Education");
        education.forEach((edu) => {
          const dateRange = [edu.startDate, edu.endDate].filter(Boolean).join(" - ");
          doc
            .fontSize(10)
            .fillColor(theme.textColor)
            .text(`${edu.degree || "Degree"} — ${edu.institution || "Institution"}`, { continued: Boolean(dateRange) });

          if (dateRange) {
            doc
              .fontSize(8.5)
              .fillColor(theme.secondaryColor)
              .text(`  (${dateRange})`, { align: "right" });
          }

          if (edu.grade || edu.location) {
            doc
              .fontSize(8.5)
              .fillColor(theme.secondaryColor)
              .text([edu.location, edu.grade && `Grade/CGPA: ${edu.grade}`].filter(Boolean).join(" • "));
          }

          if (edu.description) {
            doc
              .fontSize(8.5)
              .fillColor(theme.textColor)
              .text(edu.description);
          }
          doc.moveDown(0.2);
        });
      }

      // Skills
      const skillCategories = [
        { label: "Programming", list: skills.programming },
        { label: "Frontend", list: skills.frontend },
        { label: "Backend", list: skills.backend },
        { label: "Databases", list: skills.database },
        { label: "Cloud & Infrastructure", list: skills.cloud },
        { label: "DevOps", list: skills.devops },
        { label: "Tools", list: skills.tools },
        { label: "Other", list: skills.other },
      ].filter((cat) => Array.isArray(cat.list) && cat.list.length > 0);

      if (skillCategories.length > 0) {
        renderSectionHeader("Skills");
        skillCategories.forEach((cat) => {
          doc
            .fontSize(9)
            .fillColor(theme.textColor)
            .text(`${cat.label}: `, { continued: true, stroke: false })
            .fillColor(theme.secondaryColor)
            .text(cat.list.join(", "), { lineGap: 1.5 });
        });
      }

      // Certifications
      if (certifications.length > 0) {
        renderSectionHeader("Certifications");
        certifications.forEach((cert) => {
          doc
            .fontSize(9)
            .fillColor(theme.textColor)
            .text(`•  ${cert.name || "Certification"} — ${cert.organization || ""}`, { continued: Boolean(cert.issueDate) });

          if (cert.issueDate) {
            doc
              .fontSize(8.5)
              .fillColor(theme.secondaryColor)
              .text(` (${cert.issueDate})`);
          }
        });
      }

      // Achievements
      if (achievements.length > 0) {
        renderSectionHeader("Achievements & Honors");
        achievements.forEach((ach) => {
          doc
            .fontSize(9)
            .fillColor(theme.textColor)
            .text(`•  ${ach.title || "Achievement"}${ach.organization ? ` — ${ach.organization}` : ""}`, { continued: Boolean(ach.date) });

          if (ach.date) {
            doc
              .fontSize(8.5)
              .fillColor(theme.secondaryColor)
              .text(` (${ach.date})`);
          }

          if (ach.description) {
            doc
              .fontSize(8.5)
              .fillColor(theme.secondaryColor)
              .text(`   ${ach.description}`);
          }
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate DOCX buffer from resume data
 */
export const generateResumeDocx = async (resume) => {
  const { personalInfo = {}, targetRole, summary, education = [], experience = [], projects = [], skills = {}, achievements = [], certifications = [] } = resume;

  const docChildren = [];

  // Name
  docChildren.push(
    new Paragraph({
      text: personalInfo.fullName || "Candidate Name",
      heading: HeadingLevel.TITLE,
      spacing: { after: 80 },
    })
  );

  // Target Role
  if (targetRole) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: targetRole, bold: true, size: 24, color: "2563EB" })],
        spacing: { after: 80 },
      })
    );
  }

  // Contact info
  const contactParts = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.github,
    personalInfo.portfolio,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: contactParts.join(" | "), size: 18, color: "4B5563" })],
        spacing: { after: 180 },
      })
    );
  }

  // Section heading helper
  const addSectionHeading = (title) => {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 20, color: "1E293B" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1", space: 2 },
        },
      })
    );
  };

  // Summary
  if (summary && summary.trim()) {
    addSectionHeading("Professional Summary");
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: summary.trim(), size: 20 })],
        spacing: { after: 120 },
      })
    );
  }

  // Experience
  if (experience.length > 0) {
    addSectionHeading("Work Experience");
    experience.forEach((exp) => {
      const dateRange = [exp.startDate, exp.isCurrent ? "Present" : exp.endDate].filter(Boolean).join(" - ");
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${exp.role || "Role"} at ${exp.company || "Company"}`, bold: true, size: 20 }),
            new TextRun({ text: dateRange ? `  (${dateRange})` : "", italics: true, size: 18, color: "6B7280" }),
          ],
          spacing: { before: 100, after: 40 },
        })
      );

      if (exp.location || exp.employmentType) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: [exp.location, exp.employmentType].filter(Boolean).join(" • "), size: 18, color: "6B7280" })],
            spacing: { after: 60 },
          })
        );
      }

      if (Array.isArray(exp.responsibilities)) {
        exp.responsibilities.forEach((r) => {
          if (r && r.trim()) {
            docChildren.push(
              new Paragraph({
                text: r.trim(),
                bullet: { level: 0 },
                spacing: { after: 40 },
              })
            );
          }
        });
      }

      if (Array.isArray(exp.achievements)) {
        exp.achievements.forEach((ach) => {
          if (ach && ach.trim()) {
            docChildren.push(
              new Paragraph({
                children: [new TextRun({ text: "Key Result: ", bold: true }), new TextRun({ text: ach.trim() })],
                bullet: { level: 0 },
                spacing: { after: 40 },
              })
            );
          }
        });
      }
    });
  }

  // Projects
  if (projects.length > 0) {
    addSectionHeading("Projects");
    projects.forEach((proj) => {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: proj.name || "Project", bold: true, size: 20 })],
          spacing: { before: 100, after: 40 },
        })
      );

      if (proj.description) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: proj.description, size: 19 })],
            spacing: { after: 40 },
          })
        );
      }

      if (Array.isArray(proj.responsibilities)) {
        proj.responsibilities.forEach((r) => {
          if (r && r.trim()) {
            docChildren.push(
              new Paragraph({
                text: r.trim(),
                bullet: { level: 0 },
                spacing: { after: 40 },
              })
            );
          }
        });
      }

      if (Array.isArray(proj.technologies) && proj.technologies.length > 0) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: `Technologies: ${proj.technologies.join(", ")}`, italics: true, size: 18, color: "4B5563" })],
            spacing: { after: 60 },
          })
        );
      }
    });
  }

  // Education
  if (education.length > 0) {
    addSectionHeading("Education");
    education.forEach((edu) => {
      const dateRange = [edu.startDate, edu.endDate].filter(Boolean).join(" - ");
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${edu.degree || "Degree"} — ${edu.institution || "Institution"}`, bold: true, size: 20 }),
            new TextRun({ text: dateRange ? `  (${dateRange})` : "", italics: true, size: 18, color: "6B7280" }),
          ],
          spacing: { before: 80, after: 40 },
        })
      );

      if (edu.grade || edu.location) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: [edu.location, edu.grade && `Grade/CGPA: ${edu.grade}`].filter(Boolean).join(" • "), size: 18, color: "4B5563" })],
            spacing: { after: 40 },
          })
        );
      }
    });
  }

  // Skills
  const skillCategories = [
    { label: "Programming", list: skills.programming },
    { label: "Frontend", list: skills.frontend },
    { label: "Backend", list: skills.backend },
    { label: "Databases", list: skills.database },
    { label: "Cloud", list: skills.cloud },
    { label: "DevOps", list: skills.devops },
    { label: "Tools", list: skills.tools },
  ].filter((cat) => Array.isArray(cat.list) && cat.list.length > 0);

  if (skillCategories.length > 0) {
    addSectionHeading("Technical Skills");
    skillCategories.forEach((cat) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${cat.label}: `, bold: true, size: 19 }),
            new TextRun({ text: cat.list.join(", "), size: 19, color: "374151" }),
          ],
          spacing: { after: 40 },
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }, // 0.5 inch margins (720 dxa)
          },
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBuffer(doc);
};
